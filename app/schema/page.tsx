// app/schema/page.tsx
// Authentication disabled - provide default admin user
import SchemaEditor from "./schema-editor";

export default async function SchemaPage() {
  return (
    <SchemaEditor
      user={{
        name: "Guest Admin",
        email: "admin@snowquery.com",
        image: "",
        role: "ADMIN",
        tenant: null,
      }}
    />
  );
}
