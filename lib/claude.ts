// lib/claude.ts
// Natural language → Snowflake SQL via Claude API

import Anthropic from "@anthropic-ai/sdk";
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

const SYSTEM_PROMPT = `You are a SQL expert assistant that translates natural language questions into Snowflake SQL queries.

You have access to the following database schema:

{schema}

Rules:
1. ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, or any DDL/DML.
2. Always qualify table names with the database and schema: {database}.{schema_name}."TABLE_NAME"
3. Use double quotes around table and column names.
4. Limit results to {max_rows} rows unless the user specifies otherwise.
5. For aggregations, include meaningful column aliases.
6. If the question is ambiguous, make reasonable assumptions and note them.
7. If you cannot answer the question with the available schema, explain why.

CRITICAL: Respond with ONLY a JSON object. Do not include any text before or after the JSON. Do not wrap in markdown code blocks. Do not add explanations outside the JSON structure.

Format for successful queries:
{
    "sql": "YOUR SQL QUERY HERE",
    "explanation": "Brief explanation of what the query does",
    "assumptions": ["any assumptions made"],
    "error": null
}

Format when you cannot generate a valid query:
{
    "sql": null,
    "explanation": null,
    "assumptions": [],
    "error": "Explanation of why"
}

Example valid response:
{"sql": "SELECT * FROM {database}.{schema_name}.\"TABLE\" LIMIT {max_rows}", "explanation": "Retrieves all records", "assumptions": [], "error": null}`;

export async function naturalLanguageToSql(
  question: string,
  schemaContext: string,
  database: string,
  schemaName: string,
  maxRows: number
): Promise<NlToSqlResult> {
  const system = SYSTEM_PROMPT
    .replace("{schema}", schemaContext)
    .replace("{database}", database)
    .replace("{schema_name}", schemaName)
    .replace("{max_rows}", String(maxRows));

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096, // Increased from 2048 to avoid cutoff
      temperature: 0,   // Deterministic for consistent JSON
      system: attempt === 1 ? system : system + "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a JSON object with no other text, explanations, or markdown formatting.",
      messages: [{ role: "user", content: question }],
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
  throw new Error("Unexpected code path in naturalLanguageToSql");
}
