// app/query/query-client.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./query.module.css";

// ── Types ─────────────────────────────────────────────────────────────────

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

interface Conversation {
  id: string;
  title: string;
  time: string;
  preview: string;
  msgCount: number;
}

interface TableSchema {
  name: string;
  type: string;
  row_count: number;
  comment?: string;
  meta?: any;
  columns: ColumnSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  meta?: any;
}

// ── API Calls ─────────────────────────────────────────────────────────────

async function apiQuery(
  question: string,
  conversationHistory: Message[]
): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      execute: true,
      conversationHistory: conversationHistory.slice(-6), // Last 3 Q&A pairs
    }),
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

async function apiSchema(): Promise<{ tables: TableSchema[] }> {
  const res = await fetch("/api/schema");
  if (!res.ok) throw new Error("Failed to load schema");
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

function getTableScore(meta: any): { score: number; color: string; label: string } {
  if (!meta?.description) return { score: 0, color: "var(--accent-red)", label: "Needs metadata" };
  const fields = ["description", "grainDescription", "dataSource", "updateFrequency", "commonJoins", "importantNotes"];
  const filled = fields.filter(f => meta[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  const color = pct >= 80 ? "var(--accent-green)" : pct >= 40 ? "var(--accent-amber)" : "var(--accent-red)";
  const label = pct >= 80 ? "Well documented" : pct >= 40 ? "Partial" : "Needs metadata";
  return { score: pct, color, label };
}

function getColScore(meta: any): { color: string } {
  if (!meta) return { color: "var(--accent-red)" };
  const fields = ["description", "synonyms", "sampleValues"];
  const filled = fields.filter(f => meta[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  return { color: pct >= 67 ? "var(--accent-green)" : pct >= 33 ? "var(--accent-amber)" : "var(--accent-red)" };
}

// ── Result Table ──────────────────────────────────────────────────────────

function ResultTable({ columns, data, truncated, rowCount }: {
  columns: string[];
  data: Record<string, any>[];
  truncated: boolean;
  rowCount: number;
}) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableScroll}>
        <table className={styles.resultTable}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className={styles.th} onClick={() => toggleSort(col)}>
                  {col.length > 16 ? col.slice(0, 16) + "…" : col}
                  {sortCol === col && (
                    <span className={styles.sortIcon}>{sortDir === "asc" ? " ↑" : " ↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                {columns.map(col => (
                  <td key={col} className={styles.td}>
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        {rowCount} row{rowCount !== 1 ? "s" : ""}{truncated ? " (limited)" : ""}
      </div>
    </div>
  );
}

// ── SQL Block ─────────────────────────────────────────────────────────────

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.sqlBlock}>
      <div className={styles.sqlHeader} onClick={() => setOpen(!open)}>
        <span className={styles.sqlLabel}>
          <span className={`${styles.sqlChevron} ${open ? styles.sqlChevronOpen : ""}`}>›</span>
          SQL
        </span>
        <button className={styles.sqlCopyBtn} onClick={handleCopy}>
          {copied ? "✓" : "⎘"}
        </button>
      </div>
      {open && <pre className={styles.sqlCode}>{sql}</pre>}
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.type === "user") {
    return (
      <div className={styles.messageUser}>
        <div className={styles.userBubble}>{msg.text}</div>
      </div>
    );
  }

  const r = msg.response;
  if (!r) return null;

  return (
    <div className={styles.messageAssistant}>
      <div className={styles.assistantBubble}>
        {r.error && (
          <div className={styles.errorBox}>{r.error}</div>
        )}
        {r.explanation && !r.error && (
          <p className={styles.explanation}>{r.explanation}</p>
        )}
        {r.assumptions && r.assumptions.length > 0 && (
          <div className={styles.assumptions}>
            <span className={styles.assumptionsLabel}>Assumptions:</span>
            {r.assumptions.map((a, i) => (
              <span key={i} className={styles.assumptionBadge}>{a}</span>
            ))}
          </div>
        )}
        {r.sql && <SqlBlock sql={r.sql} />}
        {r.data && r.data.length > 0 && (
          <ResultTable
            columns={r.columns}
            data={r.data}
            truncated={r.truncated}
            rowCount={r.row_count}
          />
        )}
        {r.execution_time_ms && (
          <div className={styles.execTime}>{r.execution_time_ms}ms</div>
        )}
      </div>
    </div>
  );
}

// ── Column Row (Schema Detail) ────────────────────────────────────────────

function ColumnRow({ col }: { col: ColumnSchema }) {
  const [expanded, setExpanded] = useState(false);
  const { meta } = col;
  const score = getColScore(meta);

  let synonyms: string[] = [];
  let samples: string[] = [];
  let valueMap: Record<string, string> | null = null;

  try { synonyms = JSON.parse(meta?.synonyms || "[]"); } catch { }
  try { samples = JSON.parse(meta?.sampleValues || "[]"); } catch { }
  try { valueMap = JSON.parse(meta?.valueMapping || "null"); } catch { }

  return (
    <div className={styles.columnRow}>
      <div className={styles.columnHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.columnHeaderLeft}>
          <span className={`${styles.columnChevron} ${expanded ? styles.columnChevronOpen : ""}`}>›</span>
          <span className={styles.columnName}>{col.name}</span>
          <span className={styles.columnType}>{col.type}</span>
          {meta?.isPrimaryKey && <span className={styles.badgePk}>PK</span>}
          {meta?.isForeignKey && <span className={styles.badgeFk}>FK</span>}
        </div>
        <div className={styles.docDot} style={{ background: score.color }} />
      </div>
      {expanded && (
        <div className={styles.columnDetail}>
          {meta?.description && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Description:</span>
              <span className={styles.metaValue}>{meta.description}</span>
            </div>
          )}
          {synonyms.length > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Synonyms:</span>
              <div className={styles.chipList}>
                {synonyms.map((s, i) => (
                  <span key={i} className={styles.chipBlue}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {valueMap && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Value Mapping:</span>
              <div className={styles.valueMapList}>
                {Object.entries(valueMap).slice(0, 5).map(([k, v]) => (
                  <div key={k} className={styles.valueMapItem}>
                    <code className={styles.valueMapKey}>{k}</code> = {v}
                  </div>
                ))}
              </div>
            </div>
          )}
          {samples.length > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Sample Values:</span>
              <div className={styles.chipList}>
                {samples.slice(0, 6).map((s, i) => (
                  <code key={i} className={styles.chipCyan}>{s}</code>
                ))}
              </div>
            </div>
          )}
          {meta?.foreignKeyRef && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>References:</span>
              <code className={styles.metaValue}>{meta.foreignKeyRef}</code>
            </div>
          )}
          {meta?.unit && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Unit:</span>
              <span className={styles.metaValue}>{meta.unit}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schema Detail Overlay ─────────────────────────────────────────────────

function SchemaDetailOverlay({ table, onClose }: { table: TableSchema | null; onClose: () => void }) {
  if (!table) return null;

  const score = getTableScore(table.meta);
  let commonJoins: any[] = [];
  try { commonJoins = JSON.parse(table.meta?.commonJoins || "[]"); } catch { }

  return (
    <div className={styles.schemaDetailOverlay}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onClose}>
          ← Back to tables
        </button>
      </div>
      <div className={styles.detailContent}>
        <div className={styles.detailTitle}>
          <div>
            <h2 className={styles.detailTableName}>
              {table.meta?.displayName || table.name}
            </h2>
            {table.meta?.displayName && (
              <code className={styles.detailRawName}>{table.name}</code>
            )}
          </div>
          <div className={styles.detailScore} style={{ color: score.color }}>
            {score.score}%
          </div>
        </div>

        <div className={styles.detailStats}>
          <span className={styles.detailStat}>{table.type}</span>
          <span className={styles.detailStat}>{table.columns.length} columns</span>
          <span className={styles.detailStat}>{table.row_count.toLocaleString()} rows</span>
        </div>

        {table.meta?.description && (
          <div className={styles.metaCard}>
            <div className={styles.metaCardTitle}>Description</div>
            <div className={styles.metaCardValue}>{table.meta.description}</div>
          </div>
        )}

        {table.meta?.grainDescription && (
          <div className={styles.metaCard}>
            <div className={styles.metaCardTitle}>Grain</div>
            <div className={styles.metaCardValue}>{table.meta.grainDescription}</div>
          </div>
        )}

        {table.meta?.dataSource && (
          <div className={styles.metaCard}>
            <div className={styles.metaCardTitle}>Source</div>
            <div className={styles.metaCardValue}>{table.meta.dataSource}</div>
          </div>
        )}

        {table.meta?.updateFrequency && (
          <div className={styles.metaCard}>
            <div className={styles.metaCardTitle}>Update Frequency</div>
            <div className={styles.metaCardValue}>{table.meta.updateFrequency}</div>
          </div>
        )}

        {commonJoins.length > 0 && (
          <div className={styles.metaCard}>
            <div className={styles.metaCardTitle}>Common Joins</div>
            <div className={styles.joinList}>
              {commonJoins.map((j, i) => (
                <code key={i} className={styles.joinItem}>
                  {j.type || "JOIN"} {j.table} ON {j.on}
                </code>
              ))}
            </div>
          </div>
        )}

        {table.meta?.importantNotes && (
          <div className={`${styles.metaCard} ${styles.noteCard}`}>
            <div className={styles.metaCardTitle}>⚠ Important Notes</div>
            <div className={styles.metaCardValue}>{table.meta.importantNotes}</div>
          </div>
        )}

        <div className={styles.columnsSection}>
          <h3 className={styles.columnsSectionTitle}>Columns</h3>
          <div className={styles.columnsList}>
            {table.columns.map(col => (
              <ColumnRow key={col.name} col={col} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Schema Overlay (Full Screen) ──────────────────────────────────────────

function SchemaOverlay({ open, onClose, schema }: {
  open: boolean;
  onClose: () => void;
  schema: TableSchema[];
}) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const table = schema.find(t => t.name === selectedTable) || null;

  if (!open) return null;

  return (
    <>
      <div className={styles.schemaOverlay}>
        <div className={styles.schemaHeader}>
          <div>
            <h2 className={styles.schemaTitle}>⛁ Schema</h2>
            <span className={styles.schemaSubtitle}>
              {schema.length} tables
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.schemaList}>
          {schema.map(t => {
            const score = getTableScore(t.meta);
            return (
              <button
                key={t.name}
                className={styles.tableCard}
                onClick={() => setSelectedTable(t.name)}
              >
                <div className={styles.tableCardHeader}>
                  <div className={styles.tableCardLeft}>
                    <span className={styles.tableIcon}>
                      {t.type === "VIEW" ? "👁" : "⊞"}
                    </span>
                    <div>
                      <div className={styles.tableDisplayName}>
                        {t.meta?.displayName || t.name}
                      </div>
                      {t.meta?.displayName && (
                        <code className={styles.tableRawName}>{t.name}</code>
                      )}
                    </div>
                  </div>
                  <span className={styles.tableChevron}>›</span>
                </div>
                <div className={styles.tableCardStats}>
                  <span className={styles.tableStat}>
                    {t.columns.length} columns · {t.row_count.toLocaleString()} rows
                  </span>
                  <div className={styles.scoreBar}>
                    <div className={styles.scoreBarBg}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${score.score}%`, background: score.color }}
                      />
                    </div>
                    <span className={styles.scorePercent} style={{ color: score.color }}>
                      {score.score}%
                    </span>
                  </div>
                </div>
                {t.meta?.description && (
                  <p className={styles.tableDesc}>
                    {t.meta.description.slice(0, 120)}
                    {t.meta.description.length > 120 ? "…" : ""}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <SchemaDetailOverlay table={table} onClose={() => setSelectedTable(null)} />
    </>
  );
}

// ── History Sidebar ───────────────────────────────────────────────────────

function HistorySidebar({ open, onClose, conversations, onSelect, activeId }: {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelect: (conv: Conversation | null) => void;
  activeId: string | null;
}) {
  if (!open) return null;

  return (
    <>
      <div className={styles.historyBackdrop} onClick={onClose} />
      <div className={styles.historySidebar}>
        <div className={styles.historyHeader}>
          <h2 className={styles.historyTitle}>Conversations</h2>
          <button className={styles.historyCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.historyNewBtn}>
          <button
            className={styles.newConvBtn}
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            + New Conversation
          </button>
        </div>
        <div className={styles.historyList}>
          {conversations.map(conv => (
            <button
              key={conv.id}
              className={`${styles.convItem} ${activeId === conv.id ? styles.convItemActive : ""}`}
              onClick={() => {
                onSelect(conv);
                onClose();
              }}
            >
              <div className={styles.convTitle}>{conv.title}</div>
              <div className={styles.convPreview}>{conv.preview}</div>
              <div className={styles.convMeta}>
                <span>{conv.time}</span>
                <span>{conv.msgCount} messages</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── User Menu ─────────────────────────────────────────────────────────────

function UserMenu({ open, onClose, user }: {
  open: boolean;
  onClose: () => void;
  user: UserInfo;
}) {
  if (!open) return null;

  return (
    <>
      <div className={styles.menuBackdrop} onClick={onClose} />
      <div className={styles.userMenu}>
        <div className={styles.userMenuProfile}>
          <strong className={styles.userName}>{user.name}</strong>
          <div className={styles.userEmail}>{user.email}</div>
          <span className={styles.roleBadge}>{user.role}</span>
        </div>
        <div className={styles.menuDivider} />
        <div className={styles.menuItem} onClick={() => window.location.href = "/admin"}>
          ⚙ Admin Panel
        </div>
        <div className={styles.menuItem} onClick={() => window.location.href = "/api/auth/signout"}>
          ↩ Sign Out
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN APP ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export default function QueryClient({ user }: { user: UserInfo }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load schema on mount
  useEffect(() => {
    apiSchema()
      .then(data => setSchema(data.tables))
      .catch(err => console.error("Schema load failed:", err));
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input after message
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;

    setInput("");
    const userMessage: Message = { type: "user", text: q };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Pass conversation history for context
      const response = await apiQuery(q, messages);
      setMessages(prev => [...prev, { type: "assistant", response }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          type: "assistant",
          response: {
            question: q,
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
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectConv = (conv: Conversation | null) => {
    if (!conv) {
      setMessages([]);
      setActiveConv(null);
      return;
    }
    setActiveConv(conv.id);
    // TODO: Load actual conversation from backend
    setMessages([]);
  };

  const suggestions = [
    "Show me all tables and row counts",
    "Which providers have the highest volume?",
    "Total spend by claim type last year",
    "How many attributed members do we have?",
    "ER visits by month",
  ];

  return (
    <div className={styles.app}>
      {/* ── Header ────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.menuBtn} onClick={() => setHistoryOpen(true)}>
            ☰
          </button>
          <div>
            <div className={styles.logoText}>❄ SnowQuery</div>
            <div className={styles.tenantBadge}>{user.tenant?.name}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.schemaBtn} onClick={() => setSchemaOpen(true)} title="Schema">
            ⛁
          </button>
          <div style={{ position: "relative" }}>
            <button className={styles.avatarBtn} onClick={() => setMenuOpen(!menuOpen)}>
              {user.name[0].toUpperCase()}
            </button>
            <UserMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} />
          </div>
        </div>
      </header>

      {/* ── Chat Area ─────────────────────────────────────────── */}
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
                  <span className={styles.suggestionIcon}>✦</span> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className={styles.messageAssistant}>
            <div className={styles.loadingBubble}>
              <div className={styles.loadingDots}>
                <span className={styles.dot} />
                <span className={styles.dot} style={{ animationDelay: "0.2s" }} />
                <span className={styles.dot} style={{ animationDelay: "0.4s" }} />
              </div>
              <span className={styles.loadingText}>Querying…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* ── Input Bar ─────────────────────────────────────────── */}
      <div className={styles.inputBar}>
        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={loading}
            className={styles.input}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────────── */}
      <SchemaOverlay open={schemaOpen} onClose={() => setSchemaOpen(false)} schema={schema} />
      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        onSelect={handleSelectConv}
        activeId={activeConv}
      />
    </div>
  );
}
