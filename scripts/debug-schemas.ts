// Debug script to see what schemas exist in the database
import { executeQuery } from '../lib/snowflake';

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  try {
    console.log('Checking available schemas in DEV_DB...\n');

    const result = await executeQuery(
      tenantId,
      `SELECT SCHEMA_NAME, COMMENT
       FROM DEV_DB.INFORMATION_SCHEMA.SCHEMATA
       ORDER BY SCHEMA_NAME`
    );

    console.log(`Found ${result.rowCount} schemas:\n`);
    for (const row of result.data) {
      console.log(`  - ${row.SCHEMA_NAME}${row.COMMENT ? ` (${row.COMMENT})` : ''}`);
    }

    // Check if staging_analytics has any tables
    console.log('\n\nChecking tables in staging_analytics schema...\n');
    const tablesResult = await executeQuery(
      tenantId,
      `SELECT TABLE_SCHEMA, TABLE_NAME
       FROM DEV_DB.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'staging_analytics'
       LIMIT 10`
    );

    if (tablesResult.rowCount === 0) {
      console.log('  ⚠️  No tables found in staging_analytics schema');
    } else {
      console.log(`  Found ${tablesResult.rowCount} tables:`);
      for (const row of tablesResult.data) {
        console.log(`    - ${row.TABLE_NAME}`);
      }
    }

    // Check if RAW has any tables
    console.log('\n\nChecking tables in RAW schema...\n');
    const rawTablesResult = await executeQuery(
      tenantId,
      `SELECT TABLE_SCHEMA, TABLE_NAME
       FROM DEV_DB.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'RAW'
       LIMIT 10`
    );

    if (rawTablesResult.rowCount === 0) {
      console.log('  ⚠️  No tables found in RAW schema');
    } else {
      console.log(`  Found ${rawTablesResult.rowCount} tables:`);
      for (const row of rawTablesResult.data) {
        console.log(`    - ${row.TABLE_NAME}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
