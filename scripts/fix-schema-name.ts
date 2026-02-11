// Fix schema name to uppercase
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmlgub8es0000pdjnxhps93kv';

  console.log('Updating schema name to uppercase STAGING_ANALYTICS...');

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      sfSchema: 'STAGING_ANALYTICS'
    }
  });

  console.log(`✅ Updated schema to: ${updated.sfSchema}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
