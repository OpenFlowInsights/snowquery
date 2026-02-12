// lib/snowflake.ts
// Multi-tenant Snowflake connection manager

import snowflake from "snowflake-sdk";
import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

// Connection pool: tenantId → connection
const connectionPool = new Map<string, snowflake.Connection>();

// In-memory schema cache for public mode
const schemaCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get private key from file or environment variable
 */
function getPrivateKey(): string | undefined {
  // Try reading from file first (for local/server builds)
  const keyPath = path.join(process.cwd(), 'rsa_key.p8');

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }

  // Fall back to environment variable (for Vercel)
  if (process.env.SNOWFLAKE_PRIVATE_KEY) {
    return process.env.SNOWFLAKE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  return undefined;
}

interface TenantConfig {
  sfAccount: string;
  sfUser: string;
  sfPassword?: string;
  sfPrivateKey?: string;
  sfWarehouse: string;
  sfDatabase: string;
  sfSchema: string;
  sfSchemas?: string[]; // Support multiple schemas
  sfRole: string;
  maxRowsPerQuery: number;
  queryTimeoutSecs: number;
}

/**
 * Get or create a Snowflake connection for a tenant
 */
function getConnection(tenantId: string, config: TenantConfig): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    // Reuse existing connection if valid
    const existing = connectionPool.get(tenantId);
    if (existing && existing.isUp()) {
      return resolve(existing);
    }

    // Support both password and JWT authentication
    const connectionConfig: any = {
      account: config.sfAccount,
      username: config.sfUser,
      warehouse: config.sfWarehouse,
      database: config.sfDatabase,
      schema: config.sfSchema,
      role: config.sfRole,
    };

    if (config.sfPrivateKey) {
      // JWT authentication
      connectionConfig.authenticator = 'SNOWFLAKE_JWT';
      connectionConfig.privateKey = config.sfPrivateKey;
    } else if (config.sfPassword) {
      // Password authentication
      connectionConfig.password = config.sfPassword;
    } else {
      return reject(new Error('Either sfPassword or sfPrivateKey must be provided'));
    }

    const conn = snowflake.createConnection(connectionConfig);

    conn.connect((err) => {
      if (err) {
        reject(new Error(`Snowflake connection failed: ${err.message}`));
      } else {
        connectionPool.set(tenantId, conn);
        resolve(conn);
      }
    });
  });
}

/**
 * Get tenant config from database or environment variables
 */
async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);

  if (tenant && tenant.isActive) {
    return tenant as TenantConfig;
  }

  // Fallback to environment variables for public access
  if (
    process.env.SNOWFLAKE_ACCOUNT &&
    (process.env.SNOWFLAKE_USER || process.env.SNOWFLAKE_USERNAME) &&
    process.env.SNOWFLAKE_WAREHOUSE &&
    process.env.SNOWFLAKE_DATABASE &&
    process.env.SNOWFLAKE_SCHEMA
  ) {
    const privateKey = getPrivateKey();

    // Parse schemas - support comma-separated list
    const schemaEnv = process.env.SNOWFLAKE_SCHEMA || "";
    const schemas = schemaEnv.split(',').map(s => s.trim()).filter(s => s);

    return {
      sfAccount: process.env.SNOWFLAKE_ACCOUNT,
      sfUser: process.env.SNOWFLAKE_USER || process.env.SNOWFLAKE_USERNAME || "",
      sfPassword: process.env.SNOWFLAKE_PASSWORD,
      sfPrivateKey: privateKey,
      sfWarehouse: process.env.SNOWFLAKE_WAREHOUSE,
      sfDatabase: process.env.SNOWFLAKE_DATABASE,
      sfSchema: schemas[0], // Default schema
      sfSchemas: schemas, // All schemas
      sfRole: process.env.SNOWFLAKE_ROLE || "PUBLIC",
      maxRowsPerQuery: parseInt(process.env.MAX_ROWS_PER_QUERY || "1000"),
      queryTimeoutSecs: parseInt(process.env.QUERY_TIMEOUT_SECS || "60"),
    };
  }

  return null;
}

/**
 * Execute a SQL query against a tenant's Snowflake
 */
export async function executeQuery(
  tenantId: string,
  sql: string
): Promise<{ columns: string[]; data: Record<string, any>[]; rowCount: number; truncated: boolean }> {
  const config = await getTenantConfig(tenantId);
  if (!config) throw new Error("Snowflake configuration not found");

  // Safety: only SELECT / WITH
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    throw new Error("Only SELECT queries are allowed.");
  }

  const dangerKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
    "TRUNCATE", "EXEC", "EXECUTE", "GRANT", "REVOKE",
  ];
  for (const kw of dangerKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(sql)) {
      throw new Error(`Query contains forbidden keyword: ${kw}`);
    }
  }

  const conn = await getConnection(tenantId, config);

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: `ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = ${config.queryTimeoutSecs}`,
      complete: () => {
        conn.execute({
          sqlText: sql,
          complete: (err, stmt, rows) => {
            if (err) return reject(new Error(`Query error: ${err.message}`));

            const columns = stmt?.getColumns()?.map((c: any) => c.getName()) || [];
            const data = (rows || []).slice(0, config.maxRowsPerQuery);
            const truncated = (rows || []).length >= config.maxRowsPerQuery;

            // Serialize dates and other non-JSON types
            const serialized = data.map((row: any) => {
              const record: Record<string, any> = {};
              for (const col of columns) {
                let val = row[col];
                if (val instanceof Date) val = val.toISOString();
                else if (Buffer.isBuffer(val)) val = val.toString("hex");
                record[col] = val;
              }
              return record;
            });

            resolve({
              columns,
              data: serialized,
              rowCount: serialized.length,
              truncated,
            });
          },
        });
      },
    });
  });
}

/**
 * Introspect a tenant's Snowflake schema and cache it
 */
export async function refreshSchemaCache(tenantId: string): Promise<any[]> {
  const config = await getTenantConfig(tenantId);
  if (!config) throw new Error("Snowflake configuration not found");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
  const conn = await getConnection(tenantId, config);

  // Get all schemas to introspect
  const schemasToQuery = config.sfSchemas || [config.sfSchema];
  const tableMetadata: any[] = [];

  // Introspect each schema
  for (const schemaName of schemasToQuery) {
    const tables: any[] = await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: `
          SELECT TABLE_NAME, TABLE_TYPE, COMMENT, TABLE_SCHEMA, ROW_COUNT
          FROM ${config.sfDatabase}.INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = '${schemaName}'
          ORDER BY TABLE_NAME
        `,
        complete: (err, _, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      });
    });

    // Fetch all columns in parallel for better performance
    const columnPromises = tables.map(table => {
      const tableName = table.TABLE_NAME;
      const tableSchema = table.TABLE_SCHEMA;

      return new Promise<any>((resolve, reject) => {
        conn.execute({
          sqlText: `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COMMENT
            FROM ${config.sfDatabase}.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '${tableSchema}' AND TABLE_NAME = '${tableName}'
            ORDER BY ORDINAL_POSITION
          `,
          complete: (err, _, rows) => {
            if (err) return reject(err);
            resolve({
              table,
              columns: rows || []
            });
          },
        });
      });
    });

    const results = await Promise.all(columnPromises);

    for (const { table, columns } of results) {
      const rowCount = table.ROW_COUNT || 0;

      tableMetadata.push({
        name: table.TABLE_NAME,
        schema: table.TABLE_SCHEMA,
        type: table.TABLE_TYPE,
        comment: table.COMMENT || "",
        row_count: rowCount,
        columns: columns.map((c: any) => ({
          name: c.COLUMN_NAME,
          type: c.DATA_TYPE,
          nullable: c.IS_NULLABLE === "YES",
          comment: c.COMMENT || "",
        })),
      });
    }
  }

  // Cache in database (skip if no tenant record)
  if (tenant) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        schemaCache: JSON.stringify(tableMetadata),
        schemaCachedAt: new Date(),
      },
    }).catch(() => {});
  }

  return tableMetadata;
}

/**
 * Get cached schema or refresh if stale
 */
export async function getSchemaContext(tenantId: string): Promise<any[]> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);

  // Check in-memory cache first (for public mode)
  if (!tenant) {
    const cached = schemaCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Using in-memory schema cache");
      return cached.data;
    }

    console.log("Refreshing schema cache...");
    const data = await refreshSchemaCache(tenantId);
    schemaCache.set(tenantId, { data, timestamp: Date.now() });
    return data;
  }

  // Use database cache for tenants
  const ONE_HOUR = 60 * 60 * 1000;
  const isStale =
    !tenant.schemaCache ||
    !tenant.schemaCachedAt ||
    Date.now() - tenant.schemaCachedAt.getTime() > ONE_HOUR;

  if (isStale) {
    return await refreshSchemaCache(tenantId);
  }

  return JSON.parse(tenant.schemaCache!);
}

/**
 * Format schema metadata as a prompt context string for Claude
 */
export function formatSchemaForPrompt(
  tables: any[],
  database: string,
  schema: string
): string {
  const lines = [`Database: ${database}`, "", "Available tables:", ""];

  // Group tables by schema
  const tablesBySchema = new Map<string, any[]>();
  for (const table of tables) {
    const tableSchema = table.schema || schema;
    if (!tablesBySchema.has(tableSchema)) {
      tablesBySchema.set(tableSchema, []);
    }
    tablesBySchema.get(tableSchema)!.push(table);
  }

  // Format each schema's tables
  for (const [schemaName, schemaTables] of tablesBySchema) {
    lines.push(`## Schema: ${schemaName}`, "");
    for (const table of schemaTables) {
      const tablePath = table.schema ? `${table.schema}.${table.name}` : table.name;
      lines.push(`### ${tablePath} (${table.type}, ~${table.row_count.toLocaleString()} rows)`);
      if (table.comment) lines.push(`  Description: ${table.comment}`);
      for (const col of table.columns) {
        const nullable = col.nullable ? "NULL" : "NOT NULL";
        const desc = col.comment ? ` -- ${col.comment}` : "";
        lines.push(`  - ${col.name} (${col.type}, ${nullable})${desc}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Destroy a tenant's connection (for cleanup or credential rotation)
 */
export function destroyConnection(tenantId: string): void {
  const conn = connectionPool.get(tenantId);
  if (conn) {
    conn.destroy(() => {});
    connectionPool.delete(tenantId);
  }
}
