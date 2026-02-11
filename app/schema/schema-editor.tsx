// app/schema/schema-editor.tsx
"use client";

import React, { useState, useEffect } from "react";
import styles from "./schema.module.css";

// ── Types ─────────────────────────────────────────────────────────────────

interface UserInfo {
  name: string;
  email: string;
  image: string;
  role: string;
  tenant: { id: string; name: string; slug: string } | null;
}

interface TableSchema {
  name: string;
  type: string;
  row_count: number;
  comment?: string;
  meta?: TableMeta;
  columns: ColumnSchema[];
}

interface TableMeta {
  displayName?: string;
  description?: string;
  businessOwner?: string;
  dataSource?: string;
  updateFrequency?: string;
  grainDescription?: string;
  commonFilters?: string;
  commonJoins?: string;
  importantNotes?: string;
  sampleQueries?: string;
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  meta?: ColumnMeta;
}

interface ColumnMeta {
  displayName?: string;
  description?: string;
  synonyms?: string;
  sampleValues?: string;
  valueMapping?: string;
  unit?: string;
  format?: string;
  isRequired?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: string;
  computedLogic?: string;
}

interface BusinessTerm {
  id?: string;
  term: string;
  definition?: string;
  sqlMapping?: string;
  relatedTables?: string;
}

// ── API Calls ─────────────────────────────────────────────────────────────

async function apiSchema(): Promise<{ tables: TableSchema[] }> {
  const res = await fetch("/api/schema");
  if (!res.ok) throw new Error("Failed to load schema");
  return res.json();
}

async function apiMetadata(): Promise<{ tableMetadata: any[]; businessTerms: BusinessTerm[] }> {
  const res = await fetch("/api/metadata");
  if (!res.ok) throw new Error("Failed to load metadata");
  return res.json();
}

async function apiSaveMetadata(action: string, data: any): Promise<void> {
  const res = await fetch("/api/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Save failed" }));
    throw new Error(err.error || "Failed to save");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getTableScore(meta: any): { score: number; color: string } {
  if (!meta?.description) return { score: 0, color: "var(--accent-red)" };
  const fields = ["description", "grainDescription", "dataSource", "updateFrequency", "commonJoins", "importantNotes"];
  const filled = fields.filter(f => meta[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  const color = pct >= 80 ? "var(--accent-green)" : pct >= 40 ? "var(--accent-amber)" : "var(--accent-red)";
  return { score: pct, color };
}

function getColScore(meta: any): { color: string } {
  if (!meta) return { color: "var(--accent-red)" };
  const fields = ["description", "synonyms", "sampleValues"];
  const filled = fields.filter(f => meta[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  return { color: pct >= 67 ? "var(--accent-green)" : pct >= 33 ? "var(--accent-amber)" : "var(--accent-red)" };
}

// ── Editable Field ────────────────────────────────────────────────────────

function EditableField({ value, onSave, placeholder, multiline = false, className = "" }: {
  value: string;
  onSave: (val: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={`${styles.editableField} ${className}`}
        onClick={() => setEditing(true)}
      >
        {value || <span className={styles.placeholder}>{placeholder}</span>}
      </div>
    );
  }

  if (multiline) {
    return (
      <div className={styles.editingField}>
        <textarea
          className={styles.textarea}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
          rows={4}
        />
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={handleSave}>Save</button>
          <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editingField}>
      <input
        className={styles.input}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={e => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <div className={styles.editActions}>
        <button className={styles.saveBtn} onClick={handleSave}>Save</button>
        <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Column Editor ─────────────────────────────────────────────────────────

function ColumnEditor({ col, tableName, onUpdate }: {
  col: ColumnSchema;
  tableName: string;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = col.meta || {};
  const score = getColScore(meta);

  const handleSave = async (field: string, value: string) => {
    try {
      await apiSaveMetadata("upsertColumnMetadata", {
        tableName,
        columnName: col.name,
        [field]: value,
      });
      onUpdate();
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }
  };

  let synonyms: string[] = [];
  let samples: string[] = [];
  let valueMap: Record<string, string> | null = null;

  try { synonyms = JSON.parse(meta.synonyms || "[]"); } catch { }
  try { samples = JSON.parse(meta.sampleValues || "[]"); } catch { }
  try { valueMap = JSON.parse(meta.valueMapping || "null"); } catch { }

  return (
    <div className={styles.columnRow}>
      <div className={styles.columnHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.columnHeaderLeft}>
          <span className={`${styles.columnChevron} ${expanded ? styles.columnChevronOpen : ""}`}>›</span>
          <span className={styles.columnName}>{col.name}</span>
          <span className={styles.columnType}>{col.type}</span>
          {meta.isPrimaryKey && <span className={styles.badgePk}>PK</span>}
          {meta.isForeignKey && <span className={styles.badgeFk}>FK</span>}
        </div>
        <div className={styles.docDot} style={{ background: score.color }} />
      </div>
      {expanded && (
        <div className={styles.columnDetail}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Description:</span>
            <EditableField
              value={meta.description || ""}
              onSave={val => handleSave("description", val)}
              placeholder="Click to add description..."
              multiline
            />
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Synonyms (JSON array):</span>
            <EditableField
              value={meta.synonyms || "[]"}
              onSave={val => handleSave("synonyms", val)}
              placeholder='["cost", "payment", "amount"]'
            />
          </div>
          {synonyms.length > 0 && (
            <div className={styles.chipList}>
              {synonyms.map((s, i) => (
                <span key={i} className={styles.chipBlue}>{s}</span>
              ))}
            </div>
          )}
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Sample Values (JSON array):</span>
            <EditableField
              value={meta.sampleValues || "[]"}
              onSave={val => handleSave("sampleValues", val)}
              placeholder='["PAID", "DENIED", "PENDING"]'
            />
          </div>
          {samples.length > 0 && (
            <div className={styles.chipList}>
              {samples.map((s, i) => (
                <code key={i} className={styles.chipCyan}>{s}</code>
              ))}
            </div>
          )}
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Value Mapping (JSON object):</span>
            <EditableField
              value={meta.valueMapping || ""}
              onSave={val => handleSave("valueMapping", val)}
              placeholder='{"1": "Inpatient", "2": "Outpatient"}'
            />
          </div>
          {valueMap && (
            <div className={styles.valueMapList}>
              {Object.entries(valueMap).slice(0, 8).map(([k, v]) => (
                <div key={k} className={styles.valueMapItem}>
                  <code className={styles.valueMapKey}>{k}</code> = {v}
                </div>
              ))}
            </div>
          )}
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Foreign Key Reference:</span>
            <EditableField
              value={meta.foreignKeyRef || ""}
              onSave={val => handleSave("foreignKeyRef", val)}
              placeholder="TABLE_NAME.COLUMN_NAME"
            />
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Unit:</span>
            <EditableField
              value={meta.unit || ""}
              onSave={val => handleSave("unit", val)}
              placeholder="USD, days, kg, etc."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table Editor ──────────────────────────────────────────────────────────

function TableEditor({ table, onClose, onUpdate }: {
  table: TableSchema;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const meta = table.meta || {};
  const score = getTableScore(meta);

  const handleSave = async (field: string, value: string) => {
    try {
      await apiSaveMetadata("upsertTableMetadata", {
        tableName: table.name,
        [field]: value,
      });
      onUpdate();
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }
  };

  let commonJoins: any[] = [];
  try { commonJoins = JSON.parse(meta.commonJoins || "[]"); } catch { }

  return (
    <div className={styles.tableEditor}>
      <div className={styles.editorHeader}>
        <button className={styles.backBtn} onClick={onClose}>← Back to tables</button>
      </div>
      <div className={styles.editorContent}>
        <div className={styles.editorTitle}>
          <div>
            <h2 className={styles.tableName}>{meta.displayName || table.name}</h2>
            <code className={styles.rawName}>{table.name}</code>
          </div>
          <div className={styles.scoreDisplay} style={{ color: score.color }}>
            {score.score}%
          </div>
        </div>

        <div className={styles.tableStats}>
          <span className={styles.stat}>{table.type}</span>
          <span className={styles.stat}>{table.columns.length} columns</span>
          <span className={styles.stat}>{table.row_count.toLocaleString()} rows</span>
        </div>

        <div className={styles.metaSection}>
          <h3 className={styles.sectionTitle}>Table Metadata</h3>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Display Name</label>
            <EditableField
              value={meta.displayName || ""}
              onSave={val => handleSave("displayName", val)}
              placeholder="Human-friendly name (e.g., Claims Detail)"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Description</label>
            <EditableField
              value={meta.description || ""}
              onSave={val => handleSave("description", val)}
              placeholder="What this table represents in business terms..."
              multiline
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grain Description</label>
            <EditableField
              value={meta.grainDescription || ""}
              onSave={val => handleSave("grainDescription", val)}
              placeholder="What one row represents (e.g., One row = one claim line)"
              multiline
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Data Source</label>
            <EditableField
              value={meta.dataSource || ""}
              onSave={val => handleSave("dataSource", val)}
              placeholder="Where data comes from (e.g., CMS CCLF files)"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Update Frequency</label>
            <EditableField
              value={meta.updateFrequency || ""}
              onSave={val => handleSave("updateFrequency", val)}
              placeholder="How often refreshed (e.g., Monthly)"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Common Joins (JSON array)</label>
            <EditableField
              value={meta.commonJoins || "[]"}
              onSave={val => handleSave("commonJoins", val)}
              placeholder='[{"table":"OTHER_TABLE","on":"ID = ID","type":"LEFT JOIN"}]'
              multiline
            />
          </div>

          {commonJoins.length > 0 && (
            <div className={styles.joinPreview}>
              {commonJoins.map((j, i) => (
                <code key={i} className={styles.joinItem}>
                  {j.type || "JOIN"} {j.table} ON {j.on}
                </code>
              ))}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Important Notes</label>
            <EditableField
              value={meta.importantNotes || ""}
              onSave={val => handleSave("importantNotes", val)}
              placeholder="Caveats, known issues, edge cases..."
              multiline
            />
          </div>
        </div>

        <div className={styles.columnsSection}>
          <h3 className={styles.sectionTitle}>Columns ({table.columns.length})</h3>
          <div className={styles.columnsList}>
            {table.columns.map(col => (
              <ColumnEditor
                key={col.name}
                col={col}
                tableName={table.name}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Business Glossary ─────────────────────────────────────────────────────

function BusinessGlossary({ terms, onUpdate }: {
  terms: BusinessTerm[];
  onUpdate: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: "", definition: "", sqlMapping: "", relatedTables: "[]" });

  const handleAdd = async () => {
    try {
      await apiSaveMetadata("upsertBusinessTerm", newTerm);
      setNewTerm({ term: "", definition: "", sqlMapping: "", relatedTables: "[]" });
      setAdding(false);
      onUpdate();
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }
  };

  const handleDelete = async (term: string) => {
    if (!confirm(`Delete business term "${term}"?`)) return;
    try {
      await apiSaveMetadata("deleteBusinessTerm", { term });
      onUpdate();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className={styles.glossary}>
      <div className={styles.glossaryHeader}>
        <h3 className={styles.glossaryTitle}>Business Glossary ({terms.length})</h3>
        <button className={styles.addBtn} onClick={() => setAdding(true)}>+ Add Term</button>
      </div>

      {adding && (
        <div className={styles.glossaryForm}>
          <input
            className={styles.input}
            placeholder="Term (e.g., attributed lives)"
            value={newTerm.term}
            onChange={e => setNewTerm({ ...newTerm, term: e.target.value })}
          />
          <textarea
            className={styles.textarea}
            placeholder="Definition"
            value={newTerm.definition}
            onChange={e => setNewTerm({ ...newTerm, definition: e.target.value })}
            rows={2}
          />
          <textarea
            className={styles.textarea}
            placeholder="SQL Mapping (how to calculate it)"
            value={newTerm.sqlMapping}
            onChange={e => setNewTerm({ ...newTerm, sqlMapping: e.target.value })}
            rows={3}
          />
          <input
            className={styles.input}
            placeholder='Related Tables (JSON array, e.g., ["MEMBER_DEMOGRAPHICS"])'
            value={newTerm.relatedTables}
            onChange={e => setNewTerm({ ...newTerm, relatedTables: e.target.value })}
          />
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleAdd}>Add</button>
            <button className={styles.cancelBtn} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.termsList}>
        {terms.map(t => (
          <div key={t.term} className={styles.termCard}>
            <div className={styles.termHeader}>
              <strong className={styles.termName}>{t.term}</strong>
              <button className={styles.deleteBtn} onClick={() => handleDelete(t.term)}>✕</button>
            </div>
            {t.definition && <p className={styles.termDef}>{t.definition}</p>}
            {t.sqlMapping && (
              <pre className={styles.termSql}>{t.sqlMapping}</pre>
            )}
            {t.relatedTables && (
              <div className={styles.termTables}>
                Tables: {t.relatedTables}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN SCHEMA EDITOR ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export default function SchemaEditor({ user }: { user: UserInfo }) {
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [metadata, setMetadata] = useState<any>({ tableMetadata: [], businessTerms: [] });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [view, setView] = useState<"tables" | "glossary">("tables");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schemaData, metaData] = await Promise.all([apiSchema(), apiMetadata()]);

      // Merge metadata into schema
      const metaMap = new Map(metaData.tableMetadata.map((tm: any) => [tm.tableName, tm]));
      const enrichedSchema = schemaData.tables.map(t => {
        const tableMeta = metaMap.get(t.name);
        if (!tableMeta) return t;

        // Map column metadata
        const colMap = new Map(tableMeta.columns?.map((c: any) => [c.columnName, c]) || []);
        const enrichedColumns = t.columns.map(col => ({
          ...col,
          meta: colMap.get(col.name) || {},
        }));

        return {
          ...t,
          meta: tableMeta,
          columns: enrichedColumns,
        };
      });

      setSchema(enrichedSchema);
      setMetadata(metaData);
    } catch (err) {
      console.error("Load failed:", err);
      alert("Failed to load schema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const table = schema.find(t => t.name === selectedTable) || null;

  if (loading) {
    return (
      <div className={styles.app}>
        <div className={styles.loading}>Loading schema...</div>
      </div>
    );
  }

  if (table) {
    return (
      <div className={styles.app}>
        <TableEditor table={table} onClose={() => setSelectedTable(null)} onUpdate={loadData} />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>⛁ Schema Management</h1>
          <p className={styles.subtitle}>{user.tenant?.name}</p>
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.tabBtn} ${view === "tables" ? styles.tabBtnActive : ""}`}
            onClick={() => setView("tables")}
          >
            Tables ({schema.length})
          </button>
          <button
            className={`${styles.tabBtn} ${view === "glossary" ? styles.tabBtnActive : ""}`}
            onClick={() => setView("glossary")}
          >
            Glossary ({metadata.businessTerms.length})
          </button>
          <a href="/query" className={styles.backLink}>← Back to Query</a>
        </div>
      </header>

      <main className={styles.main}>
        {view === "tables" && (
          <div className={styles.tableGrid}>
            {schema.map(t => {
              const score = getTableScore(t.meta);
              return (
                <button
                  key={t.name}
                  className={styles.tableCard}
                  onClick={() => setSelectedTable(t.name)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardLeft}>
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
                    <span className={styles.chevron}>›</span>
                  </div>
                  <div className={styles.cardStats}>
                    <span className={styles.cardStat}>
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
                    <p className={styles.cardDesc}>
                      {t.meta.description.slice(0, 120)}
                      {t.meta.description.length > 120 ? "…" : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {view === "glossary" && (
          <BusinessGlossary terms={metadata.businessTerms} onUpdate={loadData} />
        )}
      </main>
    </div>
  );
}
