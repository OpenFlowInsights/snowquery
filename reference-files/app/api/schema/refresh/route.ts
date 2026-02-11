// app/api/schema/refresh/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { refreshSchemaCache } from "@/lib/snowflake";

export async function POST() {
  const authResult = await requireAuth("ADMIN");
  if (!authResult.authorized) return authResult.response;

  try {
    const tables = await refreshSchemaCache(authResult.tenantId);
    return NextResponse.json({ status: "ok", table_count: tables.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
