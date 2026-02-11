// app/query/layout.tsx
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function QueryLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <>{children}</>;
}
