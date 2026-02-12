// app/page.tsx
// Authentication disabled - redirect all users to query page
import { redirect } from "next/navigation";

export default async function Home() {
  redirect("/query");
}
