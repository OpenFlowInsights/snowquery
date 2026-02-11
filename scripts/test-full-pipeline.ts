// Test full NL→SQL→Snowflake pipeline
import { enhancedNlToSql } from '../lib/claude-enhanced';
import { executeQuery } from '../lib/snowflake';

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  // Test queries
  const testQueries = [
    "How many members are there?",
    "What are the top 5 ACOs by total savings?",
    "Show me total drug spending by category"
  ];

  console.log('🧪 Testing Full NL→SQL→Snowflake Pipeline\n');
  console.log('=' .repeat(80));

  for (const question of testQueries) {
    console.log(`\n\n📝 Question: "${question}"\n`);

    try {
      // Step 1: NL → SQL via Claude
      console.log('⏳ Step 1: Translating to SQL with Claude...');
      const nlResult = await enhancedNlToSql(question, tenantId);

      if (nlResult.error || !nlResult.sql) {
        console.log(`❌ Translation failed: ${nlResult.error}`);
        continue;
      }

      console.log('✅ SQL generated:');
      console.log('─'.repeat(80));
      console.log(nlResult.sql);
      console.log('─'.repeat(80));

      if (nlResult.explanation) {
        console.log(`\n💡 Explanation: ${nlResult.explanation}`);
      }

      if (nlResult.assumptions && nlResult.assumptions.length > 0) {
        console.log('\n⚠️  Assumptions:');
        for (const assumption of nlResult.assumptions) {
          console.log(`   - ${assumption}`);
        }
      }

      // Step 2: Execute SQL against Snowflake
      console.log('\n⏳ Step 2: Executing query against Snowflake...');
      const start = Date.now();
      const result = await executeQuery(tenantId, nlResult.sql);
      const elapsed = Date.now() - start;

      console.log(`✅ Query executed successfully in ${elapsed}ms`);
      console.log(`   Rows returned: ${result.rowCount}${result.truncated ? ' (truncated)' : ''}`);
      console.log(`   Columns: ${result.columns.join(', ')}`);

      // Show first few rows
      if (result.data.length > 0) {
        console.log('\n📊 Sample results:');
        console.log('─'.repeat(80));
        const preview = result.data.slice(0, 3);
        for (let i = 0; i < preview.length; i++) {
          console.log(`\nRow ${i + 1}:`);
          for (const [key, value] of Object.entries(preview[i])) {
            let displayValue = value;
            if (typeof value === 'number') {
              displayValue = value.toLocaleString();
            }
            console.log(`  ${key}: ${displayValue}`);
          }
        }
        console.log('─'.repeat(80));
      }

    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n✅ Pipeline test complete!\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
