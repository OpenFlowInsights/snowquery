// prisma/seed.ts
// Run with: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default tenant (Open Flow Insights)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "open-flow-insights" },
    update: {},
    create: {
      name: "Open Flow Insights",
      slug: "open-flow-insights",
      sfAccount: process.env.SNOWFLAKE_ACCOUNT || "CHANGE_ME",
      sfUser: process.env.SNOWFLAKE_USER || "CHANGE_ME",
      sfPassword: process.env.SNOWFLAKE_PASSWORD || "CHANGE_ME",
      sfWarehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
      sfDatabase: process.env.SNOWFLAKE_DATABASE || "ANALYTICS_DB",
      sfSchema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
      sfRole: process.env.SNOWFLAKE_ROLE || "SYSADMIN",
      maxRowsPerQuery: 500,
      queryTimeoutSecs: 30,
      dailyQueryLimit: 500,
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Sign in with Google or Microsoft");
  console.log("2. After first sign-in, run this SQL to promote yourself to OWNER:");
  console.log("");
  console.log(`   UPDATE "User" SET role = 'OWNER', "tenantId" = '${tenant.id}' WHERE email = 'YOUR_EMAIL';`);
  console.log("");
  console.log("3. Or use Prisma Studio: npx prisma studio");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
