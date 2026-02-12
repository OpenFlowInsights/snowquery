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

const conn = snowflake.createConnection(config);

conn.connect(async (err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }

  console.log('✓ Connected to Snowflake');

  // Show all schemas in the database
  conn.execute({
    sqlText: `SHOW SCHEMAS IN DATABASE ${config.database}`,
    complete: (err, stmt, rows) => {
      if (err) {
        console.error('Error showing schemas:', err);
        conn.destroy(() => {});
        return;
      }
      console.log('\nAvailable schemas:');
      rows?.forEach((row: any) => {
        console.log(`  - ${row.name}`);
      });

      // Show tables in STAGING_MARTS
      conn.execute({
        sqlText: `SHOW TABLES IN SCHEMA ${config.database}.STAGING_MARTS`,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Error showing tables:', err);
          } else {
            console.log('\nTables in STAGING_MARTS:');
            if (rows && rows.length > 0) {
              rows.forEach((row: any) => {
                console.log(`  - ${row.name}`);
              });
            } else {
              console.log('  (no tables found)');
            }
          }
          conn.destroy(() => {});
        },
      });
    },
  });
});
