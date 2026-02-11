// app/query/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import QueryClient from "./query-client";

export default async function QueryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <QueryClient
      user={{
        name: session.user.name || "User",
        email: session.user.email || "",
        image: session.user.image || "",
        role: session.user.role,
        tenant: session.user.tenant,
      }}
    />
  );
}
