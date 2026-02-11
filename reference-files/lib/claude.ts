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

Respond ONLY with a JSON object in this exact format:
{
    "sql": "YOUR SQL QUERY HERE",
    "explanation": "Brief explanation of what the query does",
    "assumptions": ["any assumptions made"],
    "error": null
}

If you cannot generate a valid query:
{
    "sql": null,
    "explanation": null,
    "assumptions": [],
    "error": "Explanation of why"
}`;

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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: question }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.split("\n", 2)[1] || cleaned;
      cleaned = cleaned.replace(/```\s*$/, "");
    }
    return JSON.parse(cleaned);
  } catch {
    return {
      sql: null,
      explanation: null,
      assumptions: [],
      error: `Failed to parse Claude response: ${text.slice(0, 300)}`,
    };
  }
}
