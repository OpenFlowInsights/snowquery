// app/schema/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SchemaEditor from "./schema-editor";

export default async function SchemaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check if user has ADMIN or OWNER role
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "OWNER") {
    redirect("/query");
  }

  return (
    <SchemaEditor
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
