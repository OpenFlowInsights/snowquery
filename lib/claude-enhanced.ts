// lib/claude-enhanced.ts
// Enhanced NL→SQL with rich metadata context

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { formatSchemaForPrompt } from "./snowflake";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

interface NlToSqlResult {
  sql: string | null;
  explanation: string | null;
  assumptions: string[];
  error: string | null;
}

/**
 * Robust JSON extraction from Claude responses.
 * Handles: raw JSON, markdown code blocks, conversational wrappers.
 */
function extractJson(text: string): NlToSqlResult | null {
  if (!text || text.trim().length === 0) return null;

  let cleaned = text.trim();

  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    lines.shift(); // Remove opening ```json or ```
    if (lines[lines.length - 1].trim() === "```") {
      lines.pop(); // Remove closing ```
    }
    cleaned = lines.join("\n").trim();
  }

  // Try to extract JSON object from text that might have preamble/postamble
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate the structure
    if (
      typeof parsed === "object" &&
      ("sql" in parsed || "error" in parsed) &&
      "explanation" in parsed &&
      "assumptions" in parsed
    ) {
      return {
        sql: parsed.sql || null,
        explanation: parsed.explanation || null,
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
        error: parsed.error || null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Build a rich context string from Snowflake schema + custom metadata.
 * This is the key to getting Claude to generate accurate SQL.
 */
export async function buildEnrichedContext(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);

  // Get raw schema from Snowflake cache or direct query
  let rawSchema: any[] = [];
  if (tenant && tenant.schemaCache) {
    rawSchema = JSON.parse(tenant.schemaCache);
  } else {
    // Public mode - get schema from Snowflake directly
    const { getSchemaContext } = await import("./snowflake");
    rawSchema = await getSchemaContext(tenantId);
  }

  // Get enriched metadata (skip if no tenant)
  const tableMetadata = tenant ? await prisma.tableMetadata.findMany({
    where: { tenantId },
    include: { columns: true },
  }).catch(() => []) : [];

  const businessTerms = tenant ? await prisma.businessTerm.findMany({
    where: { tenantId },
  }).catch(() => []) : [];

  // Build a metadata lookup
  const metaByTable = new Map<string, any>();
  for (const tm of tableMetadata) {
    const colsByName = new Map<string, any>();
    for (const col of tm.columns) {
      colsByName.set(col.columnName, col);
    }
    metaByTable.set(tm.tableName, { ...tm, columnMap: colsByName });
  }

  // ── Assemble the context ────────────────────────────────────────────────
  const database = tenant?.sfDatabase || process.env.SNOWFLAKE_DATABASE || "DEV_DB";
  const schema = tenant?.sfSchema || process.env.SNOWFLAKE_SCHEMA?.split(',')[0] || "PUBLIC";

  const lines: string[] = [
    `Database: ${database}`,
    `Schema: ${schema}`,
    "",
  ];

  // ── Business Glossary ───────────────────────────────────────────────────
  if (businessTerms.length > 0) {
    lines.push("## Business Glossary");
    lines.push("These are domain-specific terms the user may use. Map them to the correct SQL.");
    lines.push("");
    for (const term of businessTerms) {
      lines.push(`**${term.term}**`);
      if (term.definition) lines.push(`  Definition: ${term.definition}`);
      if (term.sqlMapping) lines.push(`  SQL: ${term.sqlMapping}`);
      if (term.relatedTables) {
        try {
          const tables = JSON.parse(term.relatedTables);
          lines.push(`  Tables: ${tables.join(", ")}`);
        } catch {}
      }
      lines.push("");
    }
  }

  // ── Table Details ───────────────────────────────────────────────────────
  lines.push("## Available Tables");
  lines.push("");

  for (const table of rawSchema) {
    const meta = metaByTable.get(table.name);
    const displayName = meta?.displayName || table.name;
    const rowCount = table.row_count?.toLocaleString() || "?";

    lines.push(`### ${displayName} (${table.name}) — ${table.type}, ~${rowCount} rows`);

    // Table description
    if (meta?.description) {
      lines.push(`**Description:** ${meta.description}`);
    } else if (table.comment) {
      lines.push(`**Description:** ${table.comment}`);
    }

    // Grain
    if (meta?.grainDescription) {
      lines.push(`**Grain:** ${meta.grainDescription}`);
    }

    // Data source & freshness
    if (meta?.dataSource) lines.push(`**Source:** ${meta.dataSource}`);
    if (meta?.updateFrequency) lines.push(`**Updated:** ${meta.updateFrequency}`);

    // Important notes / caveats
    if (meta?.importantNotes) {
      lines.push(`**⚠ Notes:** ${meta.importantNotes}`);
    }

    // Common joins
    if (meta?.commonJoins) {
      try {
        const joins = JSON.parse(meta.commonJoins);
        if (joins.length > 0) {
          lines.push(`**Common Joins:**`);
          for (const j of joins) {
            lines.push(`  - ${j.type || "JOIN"} ${j.table} ON ${j.on}`);
          }
        }
      } catch {}
    }

    // Common filters
    if (meta?.commonFilters) {
      try {
        const filters = JSON.parse(meta.commonFilters);
        if (filters.length > 0) {
          lines.push(`**Common Filters:** ${filters.join(" | ")}`);
        }
      } catch {}
    }

    // Columns
    lines.push("");
    lines.push("| Column | Type | Description | Synonyms | Sample Values |");
    lines.push("|--------|------|-------------|----------|---------------|");

    for (const col of table.columns) {
      const colMeta = meta?.columnMap?.get(col.name);
      const nullable = col.nullable ? "NULL" : "NOT NULL";

      let desc = colMeta?.description || col.comment || "";
      if (colMeta?.unit) desc += ` (${colMeta.unit})`;
      if (colMeta?.computedLogic) desc += ` [Computed: ${colMeta.computedLogic}]`;
      if (colMeta?.isPrimaryKey) desc = "🔑 PK. " + desc;
      if (colMeta?.isForeignKey) desc = `🔗 FK→${colMeta.foreignKeyRef}. ` + desc;

      let synonyms = "";
      if (colMeta?.synonyms) {
        try { synonyms = JSON.parse(colMeta.synonyms).join(", "); } catch {}
      }

      let samples = "";
      if (colMeta?.valueMapping) {
        try {
          const mapping = JSON.parse(colMeta.valueMapping);
          samples = Object.entries(mapping).map(([k, v]) => `${k}=${v}`).join(", ");
        } catch {}
      } else if (colMeta?.sampleValues) {
        try { samples = JSON.parse(colMeta.sampleValues).join(", "); } catch {}
      }

      lines.push(
        `| ${col.name} | ${col.type} ${nullable} | ${desc} | ${synonyms} | ${samples} |`
      );
    }

    // Sample queries for this table
    if (meta?.sampleQueries) {
      try {
        const examples = JSON.parse(meta.sampleQueries);
        if (examples.length > 0) {
          lines.push("");
          lines.push("**Example queries:**");
          for (const ex of examples) {
            lines.push(`  Q: "${ex.question}"`);
            lines.push(`  SQL: ${ex.sql}`);
          }
        }
      } catch {}
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Enhanced system prompt that leverages rich metadata
 */
function buildSystemPrompt(
  enrichedContext: string,
  database: string,
  schemaName: string,
  maxRows: number,
): string {
  return `You are an expert SQL analyst that translates natural language questions into Snowflake SQL queries.
You deeply understand the business context and data model described below.

${enrichedContext}

## Rules

1. ONLY generate SELECT statements. Never INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, or any DDL/DML.
2. Always qualify table names: ${database}.${schemaName}."TABLE_NAME"
3. Use double quotes around identifiers.
4. Limit results to ${maxRows} rows unless the user specifies otherwise.
5. Use meaningful column aliases for aggregations (e.g. total_cost, member_count).
6. When the user uses business terms or synonyms, map them to the correct columns using the metadata above.
7. Respect the documented table grain — don't accidentally double-count by ignoring join cardinality.
8. Apply common filters when contextually appropriate (e.g. filter to PAID claims unless user asks for all).
9. Use the documented join paths when combining tables.
10. If a question is ambiguous, use the business glossary and column descriptions to make the best interpretation, and note your assumptions.
11. If you genuinely cannot answer with the available schema, explain why.

## Response Format

CRITICAL: Respond with ONLY a JSON object. Do not include any text before or after the JSON. Do not wrap in markdown code blocks. Do not add explanations outside the JSON structure.

Format for successful queries:
{
    "sql": "YOUR SQL QUERY",
    "explanation": "Brief explanation in plain English",
    "assumptions": ["any assumptions you made"],
    "error": null
}

Format when you cannot generate SQL:
{
    "sql": null,
    "explanation": null,
    "assumptions": [],
    "error": "Why the query cannot be generated"
}

Example valid response:
{"sql": "SELECT COUNT(*) as member_count FROM DATABASE.SCHEMA.\"MEMBERS\" LIMIT 100", "explanation": "Counts total members", "assumptions": ["All members in table"], "error": null}`;
}

/**
 * Enhanced NL→SQL with full metadata context + conversation history
 */
export async function enhancedNlToSql(
  question: string,
  tenantId: string,
  conversationHistory: any[] = [],
): Promise<NlToSqlResult> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);

  const enrichedContext = await buildEnrichedContext(tenantId);

  // Use tenant values or fall back to environment variables
  const database = tenant?.sfDatabase || process.env.SNOWFLAKE_DATABASE || "DEV_DB";
  const schema = tenant?.sfSchema || process.env.SNOWFLAKE_SCHEMA?.split(',')[0] || "PUBLIC";
  const maxRows = tenant?.maxRowsPerQuery || parseInt(process.env.MAX_ROWS_PER_QUERY || "1000");

  const system = buildSystemPrompt(
    enrichedContext,
    database,
    schema,
    maxRows,
  );

  // Build conversation history for Claude
  const messages: Anthropic.MessageParam[] = [];

  // Add previous conversation turns (last 3 Q&A pairs = 6 messages max)
  for (const msg of conversationHistory.slice(-6)) {
    if (msg.type === "user" && msg.text) {
      messages.push({ role: "user", content: msg.text });
    } else if (msg.type === "assistant" && msg.response) {
      // Format assistant response to include SQL and results for context
      const r = msg.response;
      let assistantContext = "";

      if (r.error) {
        assistantContext = `I encountered an error: ${r.error}`;
      } else if (r.sql) {
        assistantContext = `I generated this SQL:\n${r.sql}`;
        if (r.explanation) {
          assistantContext += `\n\nExplanation: ${r.explanation}`;
        }
        if (r.row_count !== undefined) {
          assistantContext += `\n\nQuery returned ${r.row_count} row${r.row_count !== 1 ? 's' : ''}.`;
        }
      }

      if (assistantContext) {
        messages.push({ role: "assistant", content: assistantContext });
      }
    }
  }

  // Add current question
  messages.push({ role: "user", content: question });

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096, // Increased from 2048 to avoid cutoff
      temperature: 0,   // Deterministic for consistent JSON
      system: attempt === 1 ? system : system + "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a JSON object with no other text, explanations, or markdown formatting.",
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJson(text);

    if (parsed) return parsed;

    // If this was our last attempt, return the error
    if (attempt === maxAttempts) {
      return {
        sql: null,
        explanation: null,
        assumptions: [],
        error: `Failed to parse response after ${maxAttempts} attempts. Last response: ${text.slice(0, 500)}`,
      };
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("Unexpected code path in enhancedNlToSql");
}
