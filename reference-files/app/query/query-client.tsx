// app/query/query-client.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./query.module.css";

interface UserInfo {
  name: string;
  email: string;
  image: string;
  role: string;
  tenant: { id: string; name: string; slug: string } | null;
}

interface QueryResponse {
  question: string;
  sql: string | null;
  explanation: string | null;
  assumptions: string[];
  error?: string | null;
  columns: string[];
  data: Record<string, any>[];
  row_count: number;
  truncated: boolean;
  execution_time_ms?: number;
}

interface Message {
  type: "user" | "assistant";
  text?: string;
  response?: QueryResponse;
}

// ── API Calls ─────────────────────────────────────────────────────────────
async function apiQuery(question: string): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, execute: true }),
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiSchema(): Promise<any> {
  const res = await fetch("/api/schema");
  if (!res.ok) throw new Error("Failed to load schema");
  return res.json();
}

// ── Formatters ────────────────────────────────────────────────────────────
function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

// ── Sub-Components ────────────────────────────────────────────────────────

function ResultTable({ columns, data, truncated, rowCount }: {
  columns: string[]; data: Record<string, any>[]; truncated: boolean; rowCount: number;
}) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className={styles.th} onClick={() => toggleSort(col)}>
                  {col.length > 20 ? col.slice(0, 20) + "…" : col}
                  {sortCol === col && (
                    <span className={styles.sortArrow}>{sortDir === "asc" ? " ↑" : " ↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                {columns.map((col) => (
                  <td key={col} className={styles.td}>{formatValue(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        {rowCount} row{rowCount !== 1 ? "s" : ""}
        {truncated ? " (limited)" : ""}
      </div>
    </div>
  );
}

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.sqlBlock}>
      <div className={styles.sqlHeader} onClick={() => setOpen(!open)}>
        <span className={styles.sqlLabel}>
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>›</span>
          SQL Query
        </span>
        <button className={styles.copyBtn} onClick={copy}>
          {copied ? "✓" : "⎘"}
        </button>
      </div>
      {open && <pre className={styles.sqlCode}>{sql}</pre>}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.type === "user") {
    return (
      <div className={styles.msgRowUser}>
        <div className={styles.userBubble}>{msg.text}</div>
      </div>
    );
  }

  const r = msg.response!;
  return (
    <div className={styles.msgRowAssistant}>
      <div className={styles.assistantBubble}>
        {r.explanation && <p className={styles.explanation}>{r.explanation}</p>}

        {r.assumptions?.length > 0 && (
          <div className={styles.assumptions}>
            <span className={styles.assumptionsLabel}>Assumptions:</span>
            {r.assumptions.map((a, i) => (
              <span key={i} className={styles.chip}>{a}</span>
            ))}
          </div>
        )}

        {r.sql && <SqlBlock sql={r.sql} />}

        {r.error && <div className={styles.errorBox}>⚠ {r.error}</div>}

        {r.data?.length > 0 && (
          <ResultTable columns={r.columns} data={r.data} truncated={r.truncated} rowCount={r.row_count} />
        )}

        {!r.error && r.sql && r.data?.length === 0 && (
          <div className={styles.noResults}>Query returned no results.</div>
        )}

        {r.execution_time_ms != null && (
          <div className={styles.timing}>{r.execution_time_ms.toLocaleString()}ms</div>
        )}
      </div>
    </div>
  );
}

function SchemaDrawer({ schema, open, onClose }: { schema: any; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>⛁ Schema</h2>
          <button className={styles.drawerClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.drawerBody}>
          {schema?.tables?.map((t: any) => (
            <details key={t.name} className={styles.schemaTable}>
              <summary className={styles.schemaTableName}>
                {t.name}
                <span className={styles.schemaRowCount}>{t.row_count?.toLocaleString()} rows</span>
              </summary>
              <div className={styles.schemaColumns}>
                {t.columns.map((c: any) => (
                  <div key={c.name} className={styles.schemaCol}>
                    <span className={styles.schemaColName}>{c.name}</span>
                    <span className={styles.schemaColType}>{c.type}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
          {(!schema?.tables || schema.tables.length === 0) && (
            <p className={styles.schemaEmpty}>No tables found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function QueryClient({ user }: { user: UserInfo }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    apiSchema().then(setSchema).catch(() => {});
  }, []);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const question = (text || input).trim();
      if (!question || loading) return;

      setInput("");
      setMessages((prev) => [...prev, { type: "user", text: question }]);
      setLoading(true);

      try {
        const response = await apiQuery(question);
        setMessages((prev) => [...prev, { type: "assistant", response }]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            response: {
              question,
              sql: null,
              explanation: null,
              assumptions: [],
              error: err.message,
              columns: [],
              data: [],
              row_count: 0,
              truncated: false,
            },
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading]
  );

  const suggestions = [
    "Show me all tables and row counts",
    "What are the top 10 most recent records?",
    "Summarize totals by category",
    "Which providers have the highest volume?",
  ];

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logoIcon}>❄</span>
          <div>
            <span className={styles.logoText}>SnowQuery</span>
            {user.tenant && (
              <span className={styles.tenantBadge}>{user.tenant.name}</span>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconBtn} onClick={() => setDrawerOpen(true)} title="Schema">
            ⛁
          </button>
          <div className={styles.userMenu}>
            <button
              className={styles.avatarBtn}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {user.image ? (
                <img src={user.image} alt="" className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>
                  {user.name?.[0] || "?"}
                </div>
              )}
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <strong>{user.name}</strong>
                  <span className={styles.dropdownEmail}>{user.email}</span>
                  <span className={styles.roleBadge}>{user.role}</span>
                </div>
                <div className={styles.dropdownDivider} />
                {user.role === "OWNER" && (
                  <a href="/admin" className={styles.dropdownItem}>
                    ⚙ Admin Panel
                  </a>
                )}
                <a href="/api/auth/signout" className={styles.dropdownItem}>
                  ↩ Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat */}
      <main className={styles.chatArea}>
        {messages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>❄</div>
            <h2 className={styles.emptyTitle}>Ask your database anything</h2>
            <p className={styles.emptySubtitle}>
              Type a question in plain English and get instant results from Snowflake.
            </p>
            <div className={styles.suggestions}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className={styles.suggestionChip}
                  onClick={() => handleSubmit(s)}
                >
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className={styles.msgRowAssistant}>
            <div className={styles.loadingBubble}>
              <div className={styles.loadingDots}>
                <span className={styles.dot} style={{ animationDelay: "0s" }} />
                <span className={styles.dot} style={{ animationDelay: "0.2s" }} />
                <span className={styles.dot} style={{ animationDelay: "0.4s" }} />
              </div>
              <span className={styles.loadingText}>Translating & querying…</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Input */}
      <div className={styles.inputBar}>
        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Ask a question about your data…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            style={{ opacity: input.trim() && !loading ? 1 : 0.35 }}
          >
            ↗
          </button>
        </div>
      </div>

      {/* Schema Drawer */}
      <SchemaDrawer schema={schema} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Click-away for menu */}
      {menuOpen && <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
