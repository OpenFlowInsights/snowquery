// app/api/metadata/route.ts
// CRUD for table metadata, column metadata, and business glossary

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ── Schemas ───────────────────────────────────────────────────────────────

const TableMetadataSchema = z.object({
  tableName: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  businessOwner: z.string().optional(),
  dataSource: z.string().optional(),
  updateFrequency: z.string().optional(),
  grainDescription: z.string().optional(),
  commonFilters: z.string().optional(),
  commonJoins: z.string().optional(),
  importantNotes: z.string().optional(),
  sampleQueries: z.string().optional(),
});

const ColumnMetadataSchema = z.object({
  columnName: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  synonyms: z.string().optional(),
  sampleValues: z.string().optional(),
  valueMapping: z.string().optional(),
  unit: z.string().optional(),
  format: z.string().optional(),
  isRequired: z.boolean().optional(),
  isPrimaryKey: z.boolean().optional(),
  isForeignKey: z.boolean().optional(),
  foreignKeyRef: z.string().optional(),
  computedLogic: z.string().optional(),
});

const BusinessTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().optional(),
  sqlMapping: z.string().optional(),
  relatedTables: z.string().optional(),
});

// ── GET: Retrieve all metadata for the tenant ─────────────────────────────

export async function GET(req: NextRequest) {
  const authResult = await requireAuth("VIEWER");
  if (!authResult.authorized) return authResult.response;

  const { tenantId } = authResult;

  const tableMetadata = await prisma.tableMetadata.findMany({
    where: { tenantId },
    include: { columns: { orderBy: { columnName: "asc" } } },
    orderBy: { tableName: "asc" },
  });

  const businessTerms = await prisma.businessTerm.findMany({
    where: { tenantId },
    orderBy: { term: "asc" },
  });

  return NextResponse.json({ tableMetadata, businessTerms });
}

// ── POST: Create or update metadata ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await requireAuth("ADMIN");
  if (!authResult.authorized) return authResult.response;

  const { tenantId } = authResult;
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      // ── Table metadata ────────────────────────────────
      case "upsertTable": {
        const data = TableMetadataSchema.parse(body.data);
        const result = await prisma.tableMetadata.upsert({
          where: { tenantId_tableName: { tenantId, tableName: data.tableName } },
          create: { tenantId, ...data },
          update: data,
        });
        return NextResponse.json(result);
      }

      // ── Column metadata ───────────────────────────────
      case "upsertColumn": {
        const { tableName, ...colData } = body.data;
        const parsed = ColumnMetadataSchema.parse(colData);

        // Find or create parent table metadata
        let tableMeta = await prisma.tableMetadata.findUnique({
          where: { tenantId_tableName: { tenantId, tableName } },
        });
        if (!tableMeta) {
          tableMeta = await prisma.tableMetadata.create({
            data: { tenantId, tableName },
          });
        }

        const result = await prisma.columnMetadata.upsert({
          where: {
            tableMetadataId_columnName: {
              tableMetadataId: tableMeta.id,
              columnName: parsed.columnName,
            },
          },
          create: { tableMetadataId: tableMeta.id, ...parsed },
          update: parsed,
        });
        return NextResponse.json(result);
      }

      // ── Business term ─────────────────────────────────
      case "upsertTerm": {
        const data = BusinessTermSchema.parse(body.data);
        const result = await prisma.businessTerm.upsert({
          where: { tenantId_term: { tenantId, term: data.term } },
          create: { tenantId, ...data },
          update: data,
        });
        return NextResponse.json(result);
      }

      // ── Delete ────────────────────────────────────────
      case "deleteTable": {
        const { tableName } = body;
        await prisma.tableMetadata.deleteMany({
          where: { tenantId, tableName },
        });
        return NextResponse.json({ deleted: true });
      }

      case "deleteColumn": {
        const { id } = body;
        await prisma.columnMetadata.delete({ where: { id } });
        return NextResponse.json({ deleted: true });
      }

      case "deleteTerm": {
        const { term } = body;
        await prisma.businessTerm.deleteMany({
          where: { tenantId, term },
        });
        return NextResponse.json({ deleted: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
