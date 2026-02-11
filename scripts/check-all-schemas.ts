// Check all schemas for table counts
import { executeQuery } from '../lib/snowflake';

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  try {
    console.log('Checking table counts across all schemas...\n');

    const result = await executeQuery(
      tenantId,
      `SELECT
         TABLE_SCHEMA,
         COUNT(*) AS TABLE_COUNT
       FROM DEV_DB.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
       GROUP BY TABLE_SCHEMA
       ORDER BY TABLE_COUNT DESC`
    );

    console.log('Schema table counts:\n');
    for (const row of result.data) {
      console.log(`  ${row.TABLE_SCHEMA}: ${row.TABLE_COUNT} tables`);
    }

    // Show sample tables from top schemas
    const topSchemas = result.data.slice(0, 3);

    for (const schemaRow of topSchemas) {
      const schemaName = schemaRow.TABLE_SCHEMA;
      console.log(`\n\n📊 Sample tables in ${schemaName}:`);

      const tablesResult = await executeQuery(
        tenantId,
        `SELECT TABLE_NAME, COMMENT
         FROM DEV_DB.INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = '${schemaName}'
         ORDER BY TABLE_NAME
         LIMIT 5`
      );

      for (const table of tablesResult.data) {
        console.log(`  - ${table.TABLE_NAME}`);
        if (table.COMMENT) {
          console.log(`    ${table.COMMENT}`);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
