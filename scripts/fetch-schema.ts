// scripts/fetch-schema.ts
// Fetch schema from Snowflake and save to static file

import 'dotenv/config';
import snowflake from 'snowflake-sdk';
import fs from 'fs';
import path from 'path';

const getPrivateKey = (): string => {
  const keyPath = path.join(process.cwd(), 'rsa_key.p8');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  return (process.env.SNOWFLAKE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
};

const config = {
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  authenticator: 'SNOWFLAKE_JWT' as const,
  privateKey: getPrivateKey(),
  database: process.env.SNOWFLAKE_DATABASE!,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
  role: process.env.SNOWFLAKE_ROLE!,
};

async function fetchSchema() {
  const schemas = (process.env.SNOWFLAKE_SCHEMA || '').split(',').map(s => s.trim());
  const allTables: any[] = [];

  return new Promise((resolve, reject) => {
    const conn = snowflake.createConnection(config);
    
    conn.connect(async (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('✓ Connected to Snowflake');

      for (const schemaName of schemas) {
        console.log(`Fetching tables from ${schemaName}...`);

        const tables: any = await new Promise((res, rej) => {
          conn.execute({
            sqlText: `SHOW TABLES IN SCHEMA ${config.database}.${schemaName}`,
            complete: (err, _, rows) => {
              if (err) return rej(err);
              res(rows || []);
            },
          });
        });

        console.log(`  Found ${tables.length} tables`);

        for (const table of tables) {
          const tableName = table.name;
          const tableSchema = table.schema_name || schemaName;

          const columns: any = await new Promise((res, rej) => {
            conn.execute({
              sqlText: `DESCRIBE TABLE ${config.database}.${tableSchema}.${tableName}`,
              complete: (err, _, rows) => {
                if (err) return rej(err);
                res(rows || []);
              },
            });
          });

          allTables.push({
            name: tableName,
            schema: tableSchema,
            type: table.kind || 'TABLE',
            comment: table.comment || '',
            row_count: table.rows || 0,
            columns: columns.map((c: any) => ({
              name: c.name,
              type: c.type,
              nullable: c['null?'] === 'Y',
              comment: c.comment || '',
            })),
          });
        }
      }

      conn.destroy(() => {});

      const output = {
        schemas,
        database: config.database,
        tables: allTables,
        generated_at: new Date().toISOString(),
      };

      const outputPath = path.join(process.cwd(), 'public', 'schema.json');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

      console.log(`\n✓ Schema saved to ${outputPath}`);
      console.log(`  Total tables: ${allTables.length}`);
      resolve(output);
    });
  });
}

fetchSchema().catch(console.error);
