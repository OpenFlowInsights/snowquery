// Refresh schema cache for a tenant
import { refreshSchemaCache } from '../lib/snowflake';

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  console.log(`Refreshing schema cache for tenant: ${tenantId}`);
  console.log('This will introspect all tables and columns from Snowflake...\n');

  try {
    const schema = await refreshSchemaCache(tenantId);

    console.log('✅ Schema introspection complete!');
    console.log(`\nDiscovered ${schema.length} tables:\n`);

    for (const table of schema) {
      console.log(`📊 ${table.name} (${table.type})`);
      console.log(`   Columns: ${table.columns.length}, Rows: ~${table.row_count.toLocaleString()}`);
      if (table.comment) {
        console.log(`   Description: ${table.comment}`);
      }
    }

    console.log('\n✅ Schema cache saved to database');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
