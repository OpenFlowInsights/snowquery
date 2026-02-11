// app/admin/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") redirect("/query");

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, queryLogs: true } },
      users: { select: { id: true, name: true, email: true, role: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const safeTenants = tenants.map(({ sfPassword, schemaCache, ...t }) => ({
    ...t,
    hasSchemaCache: !!schemaCache,
  }));

  return <AdminClient tenants={safeTenants} />;
}
