// Update tenant Snowflake credentials
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  console.log(`Updating Snowflake credentials for tenant: ${tenantId}`);

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      sfAccount: 'RRISPXQ-JUC46944',
      sfDatabase: 'DEV_DB',
      sfSchema: 'staging_analytics',
      sfWarehouse: 'DEV_WH',
      sfUser: 'APP_SERVICE',
      sfPassword: 'jaldkDr72JDSDF1',
      sfRole: 'ACCOUNTADMIN',
      schemaCache: null, // Clear cache to force refresh
      schemaCachedAt: null
    }
  });

  console.log('✅ Tenant updated successfully:');
  console.log(`  Account: ${updated.sfAccount}`);
  console.log(`  Database: ${updated.sfDatabase}`);
  console.log(`  Schema: ${updated.sfSchema}`);
  console.log(`  Warehouse: ${updated.sfWarehouse}`);
  console.log(`  User: ${updated.sfUser}`);
  console.log(`  Role: ${updated.sfRole}`);
}

main()
  .catch((e) => {
    console.error('Error updating tenant:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
