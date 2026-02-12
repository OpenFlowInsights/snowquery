// app/api/schema/route.ts
// Authentication disabled - using default tenant for public access
import { NextResponse } from "next/server";
import { getSchemaContext } from "@/lib/snowflake";

export async function GET() {
  // Use default tenant for public access
  const tenantId = process.env.DEFAULT_TENANT_ID || "default";

  try {
    const tables = await getSchemaContext(tenantId);
    return NextResponse.json({ tables });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
