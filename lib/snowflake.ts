// lib/snowflake.ts
// Multi-tenant Snowflake connection manager

import snowflake from "snowflake-sdk";
import { prisma } from "./prisma";

// Connection pool: tenantId → connection
const connectionPool = new Map<string, snowflake.Connection>();

interface TenantConfig {
  sfAccount: string;
  sfUser: string;
  sfPassword: string;
  sfWarehouse: string;
  sfDatabase: string;
  sfSchema: string;
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

    const conn = snowflake.createConnection({
      account: config.sfAccount,
      username: config.sfUser,
      password: config.sfPassword,
      warehouse: config.sfWarehouse,
      database: config.sfDatabase,
      schema: config.sfSchema,
      role: config.sfRole,
    });

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
    process.env.SNOWFLAKE_USER &&
    process.env.SNOWFLAKE_PASSWORD &&
    process.env.SNOWFLAKE_WAREHOUSE &&
    process.env.SNOWFLAKE_DATABASE &&
    process.env.SNOWFLAKE_SCHEMA
  ) {
    return {
      sfAccount: process.env.SNOWFLAKE_ACCOUNT,
      sfUser: process.env.SNOWFLAKE_USER,
      sfPassword: process.env.SNOWFLAKE_PASSWORD,
      sfWarehouse: process.env.SNOWFLAKE_WAREHOUSE,
      sfDatabase: process.env.SNOWFLAKE_DATABASE,
      sfSchema: process.env.SNOWFLAKE_SCHEMA,
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

  const tables: any[] = await new Promise((resolve, reject) => {
    conn.execute({
      sqlText: `
        SELECT TABLE_NAME, TABLE_TYPE, COMMENT
        FROM ${config.sfDatabase}.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${config.sfSchema}'
        ORDER BY TABLE_NAME
      `,
      complete: (err, _, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    });
  });

  const tableMetadata = [];

  for (const table of tables) {
    const tableName = table.TABLE_NAME;

    const columns: any[] = await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: `
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COMMENT
          FROM ${config.sfDatabase}.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = '${config.sfSchema}' AND TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `,
        complete: (err, _, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      });
    });

    const rowCount: number = await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: `SELECT COUNT(*) AS CNT FROM ${config.sfDatabase}.${config.sfSchema}."${tableName}"`,
        complete: (err, _, rows) => {
          if (err) return resolve(0);
          resolve(rows?.[0]?.CNT || 0);
        },
      });
    });

    tableMetadata.push({
      name: tableName,
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
 * Get cached schema or refresh if stale (>1 hour)
 */
export async function getSchemaContext(tenantId: string): Promise<any[]> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);

  // If no tenant record (public access), always refresh
  if (!tenant) {
    return await refreshSchemaCache(tenantId);
  }

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
  const lines = [`Database: ${database}`, `Schema: ${schema}`, "", "Available tables:", ""];

  for (const table of tables) {
    lines.push(`### ${table.name} (${table.type}, ~${table.row_count.toLocaleString()} rows)`);
    if (table.comment) lines.push(`  Description: ${table.comment}`);
    for (const col of table.columns) {
      const nullable = col.nullable ? "NULL" : "NOT NULL";
      const desc = col.comment ? ` -- ${col.comment}` : "";
      lines.push(`  - ${col.name} (${col.type}, ${nullable})${desc}`);
    }
    lines.push("");
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
