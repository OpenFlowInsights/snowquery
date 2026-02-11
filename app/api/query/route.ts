// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { enhancedNlToSql } from "@/lib/claude-enhanced";
import { executeQuery } from "@/lib/snowflake";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth("ANALYST");
  if (!authResult.authorized) return authResult.response;

  const { user, tenantId } = authResult;
  const start = Date.now();

  try {
    const body = await req.json();
    const { question, execute = true, conversationHistory = [] } = body;

    if (!question || typeof question !== "string" || question.length > 2000) {
      return NextResponse.json(
        { error: "Invalid question (must be 1-2000 characters)" },
        { status: 400 }
      );
    }

    // Validate conversation history if provided
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "conversationHistory must be an array" },
        { status: 400 }
      );
    }

    // Rate limiting: check daily query count
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayQueries = await prisma.queryLog.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    });

    if (todayQueries >= tenant.dailyQueryLimit) {
      return NextResponse.json(
        { error: `Daily query limit reached (${tenant.dailyQueryLimit}). Resets at midnight.` },
        { status: 429 }
      );
    }

    // Step 1: NL → SQL via Claude (enhanced with metadata + conversation context)
    const nlResult = await enhancedNlToSql(question, tenantId, conversationHistory);

    if (nlResult.error || !nlResult.sql) {
      // Log failed translation
      await prisma.queryLog.create({
        data: {
          tenantId,
          userId: user.id,
          question,
          error: nlResult.error || "No SQL generated",
        },
      });

      return NextResponse.json({
        question,
        sql: null,
        explanation: null,
        assumptions: [],
        error: nlResult.error,
        columns: [],
        data: [],
        row_count: 0,
        truncated: false,
      });
    }

    // Step 3: Execute (if requested)
    if (!execute) {
      return NextResponse.json({
        question,
        sql: nlResult.sql,
        explanation: nlResult.explanation,
        assumptions: nlResult.assumptions,
        columns: [],
        data: [],
        row_count: 0,
        truncated: false,
      });
    }

    try {
      const result = await executeQuery(tenantId, nlResult.sql);
      const elapsed = Date.now() - start;

      // Log successful query
      await prisma.queryLog.create({
        data: {
          tenantId,
          userId: user.id,
          question,
          generatedSql: nlResult.sql,
          explanation: nlResult.explanation,
          rowCount: result.rowCount,
          executionMs: elapsed,
        },
      });

      return NextResponse.json({
        question,
        sql: nlResult.sql,
        explanation: nlResult.explanation,
        assumptions: nlResult.assumptions,
        columns: result.columns,
        data: result.data,
        row_count: result.rowCount,
        truncated: result.truncated,
        execution_time_ms: elapsed,
      });
    } catch (execErr: any) {
      // Log execution error
      await prisma.queryLog.create({
        data: {
          tenantId,
          userId: user.id,
          question,
          generatedSql: nlResult.sql,
          error: execErr.message,
        },
      });

      return NextResponse.json({
        question,
        sql: nlResult.sql,
        explanation: nlResult.explanation,
        assumptions: nlResult.assumptions,
        error: execErr.message,
        columns: [],
        data: [],
        row_count: 0,
        truncated: false,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
