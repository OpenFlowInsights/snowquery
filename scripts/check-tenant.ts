import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: 'cmlgub8es0000pdjnxhps93kv' }
  });

  console.log('Current tenant record:');
  console.log(JSON.stringify(tenant, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
