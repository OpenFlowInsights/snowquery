// app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TenantCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  sfAccount: z.string().min(1),
  sfUser: z.string().min(1),
  sfPassword: z.string().min(1),
  sfWarehouse: z.string().min(1),
  sfDatabase: z.string().min(1),
  sfSchema: z.string().default("PUBLIC"),
  sfRole: z.string().default("SYSADMIN"),
  maxRowsPerQuery: z.number().int().min(10).max(10000).default(500),
  queryTimeoutSecs: z.number().int().min(5).max(120).default(30),
  dailyQueryLimit: z.number().int().min(10).max(10000).default(200),
});

// List all tenants (OWNER only)
export async function GET() {
  const authResult = await requireAuth("OWNER");
  // Owner can see all tenants even without one assigned
  const session = await (await import("@/lib/auth")).auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, queryLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Strip passwords from response
  const safe = tenants.map(({ sfPassword, schemaCache, ...t }) => ({
    ...t,
    hasSchemaCache: !!schemaCache,
  }));

  return NextResponse.json(safe);
}

// Create a new tenant (OWNER only)
export async function POST(req: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = TenantCreateSchema.parse(body);

    const tenant = await prisma.tenant.create({ data });

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
