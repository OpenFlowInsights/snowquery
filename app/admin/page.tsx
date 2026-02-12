// app/admin/page.tsx
// Authentication disabled - admin page not available
import { redirect } from "next/navigation";

export default async function AdminPage() {
  redirect("/query");
}
