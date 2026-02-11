// app/api/schema/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSchemaContext } from "@/lib/snowflake";

export async function GET() {
  const authResult = await requireAuth("VIEWER");
  if (!authResult.authorized) return authResult.response;

  try {
    const tables = await getSchemaContext(authResult.tenantId);
    return NextResponse.json({ tables });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
