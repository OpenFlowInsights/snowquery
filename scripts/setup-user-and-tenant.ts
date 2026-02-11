import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting updates...\n');

  // 1. Update user to OWNER role
  console.log('1️⃣ Promoting user to OWNER...');
  const user = await prisma.user.update({
    where: { email: 'thudgins90@gmail.com' },
    data: {
      role: 'OWNER',
      tenantId: 'cmlgub8es0000pdjnxhps93kv',
    },
  });
  console.log('✓ User updated successfully\n');

  // 2. Update tenant with Snowflake credentials
  console.log('2️⃣ Updating tenant Snowflake credentials...');
  const tenant = await prisma.tenant.update({
    where: { id: 'cmlgub8es0000pdjnxhps93kv' },
    data: {
      sfAccount: 'RRISPXQ-JUC46944',
      sfDatabase: 'DEV_DB',
      sfSchema: 'MARTS',
      sfWarehouse: 'DEV_WH',
      sfUser: 'APP_SERVICE',
      sfPassword: 'jaldkDr72JDSDF1',
      sfRole: 'ACCOUNTADMIN',
    },
  });
  console.log('✓ Tenant updated successfully\n');

  // 3. Print records
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 UPDATED USER RECORD');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(user, null, 2));
  console.log('\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 UPDATED TENANT RECORD');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(tenant, null, 2));
  console.log('\n');

  console.log('✅ All updates completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
