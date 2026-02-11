// lib/api-auth.ts
// Helper to protect API routes with auth + role checks

import { auth } from "./auth";
import { NextRequest, NextResponse } from "next/server";

type Role = "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  ANALYST: 2,
  VIEWER: 1,
};

/**
 * Wraps an API route handler with auth + role check.
 * Returns the session user if authorized.
 */
export async function requireAuth(minRole: Role = "VIEWER") {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = session.user.role as Role;
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (!session.user.tenantId) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "No tenant assigned. Contact your administrator." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    user: session.user,
    tenantId: session.user.tenantId,
  };
}
