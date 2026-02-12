// app/query/page.tsx
// Authentication disabled - provide default user
import QueryClient from "./query-client";

export default async function QueryPage() {
  return (
    <QueryClient
      user={{
        name: "Guest User",
        email: "guest@snowquery.com",
        image: "",
        role: "VIEWER",
        tenant: null,
      }}
    />
  );
}
