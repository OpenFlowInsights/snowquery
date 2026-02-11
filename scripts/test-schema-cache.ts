// Test that schema cache is working
import { getSchemaContext, formatSchemaForPrompt } from '../lib/snowflake';

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  console.log('Testing schema cache retrieval...\n');

  const schema = await getSchemaContext(tenantId);

  console.log(`✅ Retrieved ${schema.length} tables from cache\n`);

  // Show summary
  console.log('Tables:');
  for (const table of schema) {
    console.log(`  • ${table.name} (${table.columns.length} columns, ~${table.row_count.toLocaleString()} rows)`);
  }

  // Show formatted prompt context (first 2000 chars)
  console.log('\n\n--- Schema formatted for Claude prompt (preview) ---\n');
  const formatted = formatSchemaForPrompt(schema, 'DEV_DB', 'STAGING_ANALYTICS');
  console.log(formatted.substring(0, 2000));
  if (formatted.length > 2000) {
    console.log(`\n... (${formatted.length - 2000} more characters)`);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
