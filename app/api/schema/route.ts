// app/api/schema/route.ts
// Serves static schema from pre-generated JSON file for instant loading
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Read pre-generated schema from static file
    const schemaPath = path.join(process.cwd(), "public", "schema.json");

    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json(
        { error: "Schema file not found. Run 'npm run fetch-schema' to generate it." },
        { status: 404 }
      );
    }

    const schemaData = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

    return NextResponse.json({
      tables: schemaData.tables,
      database: schemaData.database,
      schemas: schemaData.schemas,
      generated_at: schemaData.generated_at
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
