import React, { useState, useRef, useEffect, useCallback } from "react";

// ── Color System ──────────────────────────────────────────────────────────
const C = {
  bg: "#0a0f1e", bgGrad: "linear-gradient(180deg, #0a0f1e 0%, #060a14 100%)",
  surface: "#1a2235", surfaceHover: "#1f2a3f", elevated: "#243049",
  borderSubtle: "#1e293b", borderDefault: "#2a3650", borderStrong: "#3b4f6e",
  textPrimary: "#f0f4f8", textSecondary: "#94a3b8", textMuted: "#5a6b82",
  blue: "#3b82f6", blueHover: "#2563eb", cyan: "#22d3ee",
  amber: "#f59e0b", green: "#34d399", red: "#f87171",
};

// ── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_TABLES = [
  {
    name: "CLAIMS_DETAIL", type: "BASE TABLE", row_count: 1247832,
    meta: { displayName: "Claims Detail", description: "Line-level claims data for all members attributed to the ACO. One row per claim line. Includes professional, facility, and pharmacy claims.", grainDescription: "One row = one claim line for a single CPT/HCPCS on a single date of service", dataSource: "CMS CCLF files", updateFrequency: "Monthly", commonJoins: '[{"table":"MEMBER_DEMOGRAPHICS","on":"MEMBER_ID = MEMBER_ID","type":"LEFT JOIN"}]', importantNotes: "Pharmacy claims have NULL provider_id — use pharmacy_npi instead." },
    columns: [
      { name: "CLAIM_ID", type: "VARCHAR", nullable: false, meta: { description: "Unique claim line identifier", isPrimaryKey: true, synonyms: '["claim number", "claim"]' } },
      { name: "MEMBER_ID", type: "VARCHAR", nullable: false, meta: { description: "Member/beneficiary identifier", isForeignKey: true, foreignKeyRef: "MEMBER_DEMOGRAPHICS.MEMBER_ID", synonyms: '["patient", "beneficiary", "member"]' } },
      { name: "RENDERING_NPI", type: "VARCHAR", nullable: true, meta: { description: "NPI of the rendering provider", isForeignKey: true, foreignKeyRef: "PROVIDER_DIRECTORY.NPI", synonyms: '["provider", "doctor", "clinician"]' } },
      { name: "SERVICE_DATE", type: "DATE", nullable: false, meta: { description: "Date the service was performed", synonyms: '["date", "claim date", "DOS"]' } },
      { name: "PAID_AMOUNT", type: "NUMBER(12,2)", nullable: false, meta: { description: "Amount paid by payer after adjustments. Does not include member cost-sharing.", synonyms: '["cost", "spend", "payment", "reimbursement"]', unit: "USD", format: "currency" } },
      { name: "BILLED_AMOUNT", type: "NUMBER(12,2)", nullable: false, meta: { description: "Original billed amount before adjustments", synonyms: '["charge", "billed"]', unit: "USD" } },
      { name: "CLAIM_TYPE", type: "VARCHAR", nullable: false, meta: { description: "Type of claim", sampleValues: '["Professional","Inpatient","Outpatient","Pharmacy"]', synonyms: '["type", "category"]' } },
      { name: "POS_CODE", type: "VARCHAR", nullable: true, meta: { description: "Place of Service code", valueMapping: '{"11":"Office","21":"Inpatient Hospital","23":"Emergency Room","31":"Skilled Nursing"}', synonyms: '["place of service", "setting"]' } },
      { name: "CLAIM_STATUS", type: "VARCHAR", nullable: false, meta: { description: "Current claim status", sampleValues: '["PAID","DENIED","PENDING","ADJUSTED"]' } },
      { name: "DX_CODE_1", type: "VARCHAR", nullable: true, meta: { description: "Primary ICD-10 diagnosis code", synonyms: '["diagnosis", "dx", "condition"]' } },
    ],
  },
  {
    name: "MEMBER_DEMOGRAPHICS", type: "BASE TABLE", row_count: 45210,
    meta: { displayName: "Member Demographics", description: "Current demographics for all attributed members including age, gender, county, and attribution status.", grainDescription: "One row = one member", dataSource: "CMS CCLF + enrollment files", updateFrequency: "Monthly" },
    columns: [
      { name: "MEMBER_ID", type: "VARCHAR", nullable: false, meta: { isPrimaryKey: true, description: "Unique member identifier" } },
      { name: "FIRST_NAME", type: "VARCHAR", nullable: true, meta: {} },
      { name: "LAST_NAME", type: "VARCHAR", nullable: true, meta: {} },
      { name: "DATE_OF_BIRTH", type: "DATE", nullable: true, meta: { synonyms: '["DOB", "birthday", "age"]' } },
      { name: "GENDER", type: "VARCHAR", nullable: true, meta: { valueMapping: '{"M":"Male","F":"Female"}' } },
      { name: "COUNTY", type: "VARCHAR", nullable: true, meta: { synonyms: '["location", "area", "region"]' } },
      { name: "ATTRIBUTION_STATUS", type: "VARCHAR", nullable: false, meta: { description: "Whether member is currently attributed to the ACO", sampleValues: '["ATTRIBUTED","PROSPECTIVE","DROPPED"]' } },
    ],
  },
  {
    name: "PROVIDER_DIRECTORY", type: "BASE TABLE", row_count: 8934,
    meta: { displayName: "Provider Directory", description: "All providers in the network with names, specialties, and credentials.", grainDescription: "One row = one provider NPI" },
    columns: [
      { name: "NPI", type: "VARCHAR", nullable: false, meta: { isPrimaryKey: true, description: "National Provider Identifier", synonyms: '["provider id"]' } },
      { name: "PROVIDER_NAME", type: "VARCHAR", nullable: false, meta: { synonyms: '["name", "doctor name"]' } },
      { name: "SPECIALTY", type: "VARCHAR", nullable: true, meta: { synonyms: '["specialty", "type"]', sampleValues: '["Internal Medicine","Cardiology","Family Practice","Orthopedics"]' } },
      { name: "CREDENTIAL", type: "VARCHAR", nullable: true, meta: { sampleValues: '["MD","DO","NP","PA"]' } },
      { name: "TIN", type: "VARCHAR", nullable: true, meta: { description: "Tax Identification Number" } },
    ],
  },
  {
    name: "QUALITY_MEASURES", type: "BASE TABLE", row_count: 156789, meta: {},
    columns: [
      { name: "MEASURE_ID", type: "VARCHAR", nullable: false, meta: {} },
      { name: "MEMBER_ID", type: "VARCHAR", nullable: false, meta: {} },
      { name: "MEASURE_NAME", type: "VARCHAR", nullable: true, meta: {} },
      { name: "NUMERATOR", type: "BOOLEAN", nullable: true, meta: {} },
      { name: "DENOMINATOR", type: "BOOLEAN", nullable: true, meta: {} },
      { name: "PERFORMANCE_YEAR", type: "INTEGER", nullable: false, meta: {} },
    ],
  },
  {
    name: "RISK_SCORES", type: "BASE TABLE", row_count: 44891, meta: {},
    columns: [
      { name: "MEMBER_ID", type: "VARCHAR", nullable: false, meta: {} },
      { name: "HCC_RISK_SCORE", type: "NUMBER(8,4)", nullable: true, meta: {} },
      { name: "SCORE_YEAR", type: "INTEGER", nullable: false, meta: {} },
      { name: "MODEL_VERSION", type: "VARCHAR", nullable: true, meta: {} },
    ],
  },
];

const MOCK_RESPONSES = {
  "Show me all tables and row counts": {
    sql: "SELECT TABLE_NAME, ROW_COUNT\nFROM ANALYTICS_DB.INFORMATION_SCHEMA.TABLES\nWHERE TABLE_SCHEMA = 'PUBLIC'\nORDER BY TABLE_NAME",
    explanation: "Lists all tables in the PUBLIC schema with their approximate row counts.",
    assumptions: [], columns: ["TABLE_NAME", "ROW_COUNT"],
    data: [
      { TABLE_NAME: "CLAIMS_DETAIL", ROW_COUNT: 1247832 },
      { TABLE_NAME: "MEMBER_DEMOGRAPHICS", ROW_COUNT: 45210 },
      { TABLE_NAME: "PROVIDER_DIRECTORY", ROW_COUNT: 8934 },
      { TABLE_NAME: "QUALITY_MEASURES", ROW_COUNT: 156789 },
      { TABLE_NAME: "RISK_SCORES", ROW_COUNT: 44891 },
    ],
    row_count: 5, truncated: false, execution_time_ms: 234,
  },
  "Which providers have the highest volume?": {
    sql: 'SELECT p."PROVIDER_NAME", COUNT(c."CLAIM_ID") AS claim_count,\n  SUM(c."PAID_AMOUNT") AS total_paid\nFROM ANALYTICS_DB.PUBLIC."CLAIMS_DETAIL" c\nJOIN ANALYTICS_DB.PUBLIC."PROVIDER_DIRECTORY" p\n  ON c."RENDERING_NPI" = p."NPI"\nGROUP BY p."PROVIDER_NAME"\nORDER BY claim_count DESC\nLIMIT 10',
    explanation: "Top 10 providers ranked by claim volume with total paid amounts.",
    assumptions: ["Joined claims to provider directory", "Ranked by claim count"],
    columns: ["PROVIDER_NAME", "CLAIM_COUNT", "TOTAL_PAID"],
    data: [
      { PROVIDER_NAME: "Regional Medical Group", CLAIM_COUNT: 18432, TOTAL_PAID: 4521000.50 },
      { PROVIDER_NAME: "Dr. Sarah Chen", CLAIM_COUNT: 12891, TOTAL_PAID: 2890100.75 },
      { PROVIDER_NAME: "Valley Health Partners", CLAIM_COUNT: 11204, TOTAL_PAID: 3150200.25 },
      { PROVIDER_NAME: "Community Care Network", CLAIM_COUNT: 9872, TOTAL_PAID: 1890400.00 },
      { PROVIDER_NAME: "Dr. James Miller", CLAIM_COUNT: 8341, TOTAL_PAID: 1650300.50 },
    ],
    row_count: 5, truncated: false, execution_time_ms: 412,
  },
  "How many attributed members do we have?": {
    sql: 'SELECT COUNT(DISTINCT "MEMBER_ID") AS attributed_members\nFROM ANALYTICS_DB.PUBLIC."MEMBER_DEMOGRAPHICS"\nWHERE "ATTRIBUTION_STATUS" = \'ATTRIBUTED\'',
    explanation: "Counts distinct attributed members from the demographics table.",
    assumptions: ["Filtered to ATTRIBUTED status only"],
    columns: ["ATTRIBUTED_MEMBERS"], data: [{ ATTRIBUTED_MEMBERS: 38450 }],
    row_count: 1, truncated: false, execution_time_ms: 89,
  },
  "Total spend by claim type last year": {
    sql: 'SELECT "CLAIM_TYPE",\n  COUNT(*) AS claim_count,\n  SUM("PAID_AMOUNT") AS total_paid,\n  AVG("PAID_AMOUNT") AS avg_paid\nFROM ANALYTICS_DB.PUBLIC."CLAIMS_DETAIL"\nWHERE "SERVICE_DATE" >= DATEADD(year, -1, CURRENT_DATE())\n  AND "CLAIM_STATUS" = \'PAID\'\nGROUP BY "CLAIM_TYPE"\nORDER BY total_paid DESC',
    explanation: "Breaks down total spending by claim type for the past 12 months, including count and average per claim.",
    assumptions: ["Filtered to paid claims only", "Last 12 months from today"],
    columns: ["CLAIM_TYPE", "CLAIM_COUNT", "TOTAL_PAID", "AVG_PAID"],
    data: [
      { CLAIM_TYPE: "Inpatient", CLAIM_COUNT: 45200, TOTAL_PAID: 89100300.75, AVG_PAID: 1971.24 },
      { CLAIM_TYPE: "Outpatient", CLAIM_COUNT: 198340, TOTAL_PAID: 45200100.50, AVG_PAID: 227.85 },
      { CLAIM_TYPE: "Professional", CLAIM_COUNT: 312890, TOTAL_PAID: 28450200.25, AVG_PAID: 90.93 },
      { CLAIM_TYPE: "Pharmacy", CLAIM_COUNT: 213332, TOTAL_PAID: 15890400.00, AVG_PAID: 74.49 },
    ],
    row_count: 4, truncated: false, execution_time_ms: 567,
  },
  "ER visits by month": {
    sql: 'SELECT DATE_TRUNC(\'month\', "SERVICE_DATE") AS month,\n  COUNT(*) AS er_visits,\n  SUM("PAID_AMOUNT") AS total_cost\nFROM ANALYTICS_DB.PUBLIC."CLAIMS_DETAIL"\nWHERE "POS_CODE" = \'23\'\n  AND "SERVICE_DATE" >= DATEADD(month, -12, CURRENT_DATE())\nGROUP BY 1\nORDER BY 1',
    explanation: "Monthly ER visit volume and cost for the past 12 months, using Place of Service code 23.",
    assumptions: ["POS_CODE 23 = Emergency Room", "Last 12 months"],
    columns: ["MONTH", "ER_VISITS", "TOTAL_COST"],
    data: [
      { MONTH: "2025-03-01", ER_VISITS: 1240, TOTAL_COST: 2890000 },
      { MONTH: "2025-04-01", ER_VISITS: 1180, TOTAL_COST: 2750000 },
      { MONTH: "2025-05-01", ER_VISITS: 1310, TOTAL_COST: 3010000 },
      { MONTH: "2025-06-01", ER_VISITS: 1420, TOTAL_COST: 3290000 },
      { MONTH: "2025-07-01", ER_VISITS: 1390, TOTAL_COST: 3180000 },
      { MONTH: "2025-08-01", ER_VISITS: 1280, TOTAL_COST: 2940000 },
    ],
    row_count: 6, truncated: false, execution_time_ms: 345,
  },
};

const DEFAULT_MOCK = {
  sql: 'SELECT category, COUNT(*) AS total_count,\n  SUM(amount) AS total_amount\nFROM ANALYTICS_DB.PUBLIC."CLAIMS_DETAIL"\nGROUP BY category\nORDER BY total_count DESC',
  explanation: "Aggregated summary by category with counts and total amounts.",
  assumptions: ["Grouped by the category column"],
  columns: ["CATEGORY", "TOTAL_COUNT", "TOTAL_AMOUNT"],
  data: [
    { CATEGORY: "Outpatient", TOTAL_COUNT: 523410, TOTAL_AMOUNT: 45200100.50 },
    { CATEGORY: "Inpatient", TOTAL_COUNT: 198200, TOTAL_AMOUNT: 89100300.75 },
    { CATEGORY: "Professional", TOTAL_COUNT: 312890, TOTAL_AMOUNT: 28450200.25 },
    { CATEGORY: "Pharmacy", TOTAL_COUNT: 213332, TOTAL_AMOUNT: 15890400.00 },
  ],
  row_count: 4, truncated: false, execution_time_ms: 312,
};

// Saved conversations for history
const SAVED_CONVERSATIONS = [
  { id: "c1", title: "Provider volume analysis", time: "2 hours ago", preview: "Which providers have the highest volume?", msgCount: 4 },
  { id: "c2", title: "ER utilization trends", time: "Yesterday", preview: "ER visits by month", msgCount: 3 },
  { id: "c3", title: "Attributed member count", time: "Yesterday", preview: "How many attributed members do we have?", msgCount: 2 },
  { id: "c4", title: "Claim type breakdown", time: "2 days ago", preview: "Total spend by claim type last year", msgCount: 5 },
  { id: "c5", title: "Risk score distribution", time: "3 days ago", preview: "Show risk score distribution by decile", msgCount: 3 },
  { id: "c6", title: "Top diagnosis codes", time: "4 days ago", preview: "What are the most common diagnosis codes?", msgCount: 6 },
  { id: "c7", title: "Quality measure gaps", time: "Last week", preview: "Which quality measures have the lowest rates?", msgCount: 4 },
  { id: "c8", title: "Monthly PMPM trend", time: "Last week", preview: "Show PMPM by month for the last 2 years", msgCount: 3 },
  { id: "c9", title: "Network adequacy check", time: "Last week", preview: "How many PCPs per 1000 members by county?", msgCount: 2 },
  { id: "c10", title: "Table overview", time: "2 weeks ago", preview: "Show me all tables and row counts", msgCount: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

function getTableScore(meta) {
  if (!meta?.description) return { score: 0, color: C.red, label: "Needs metadata" };
  const fields = ["description","grainDescription","dataSource","updateFrequency","commonJoins","importantNotes"];
  const pct = Math.round((fields.filter(f => meta[f]).length / fields.length) * 100);
  return { score: pct, color: pct >= 80 ? C.green : pct >= 40 ? C.amber : C.red, label: pct >= 80 ? "Well documented" : pct >= 40 ? "Partial" : "Needs metadata" };
}

function getColScore(meta) {
  if (!meta) return { color: C.red };
  const pct = Math.round((["description","synonyms","sampleValues"].filter(f => meta[f]).length / 3) * 100);
  return { color: pct >= 67 ? C.green : pct >= 33 ? C.amber : C.red };
}

// ── Result Table ──────────────────────────────────────────────────────────
function ResultTable({ columns, data, truncated, rowCount }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const sorted = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (va == vb) return 0;
      if (va == null) return 1; if (vb == null) return -1;
      const c = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? c : -c;
    });
  }, [data, sortCol, sortDir]);

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.borderDefault}` }}>
      <div style={{ overflowX: "auto", maxHeight: 260 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>
          <thead><tr>
            {columns.map(col => (
              <th key={col} onClick={() => { sortCol===col ? setSortDir(d=>d==="asc"?"desc":"asc") : (setSortCol(col),setSortDir("asc")); }}
                style={{ position: "sticky", top: 0, background: C.elevated, padding: "8px 12px", textAlign: "left", color: C.textSecondary, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer", borderBottom: `1px solid ${C.borderDefault}`, zIndex: 1 }}>
                {col.length > 16 ? col.slice(0,16)+"…" : col}{sortCol===col && <span style={{ color: C.blue, fontSize: 10 }}>{sortDir==="asc"?" ↑":" ↓"}</span>}
              </th>
            ))}
          </tr></thead>
          <tbody>{sorted.map((row, i) => (
            <tr key={i} style={{ background: i%2===0 ? "rgba(10,15,30,0.4)" : "rgba(26,34,53,0.25)" }}>
              {columns.map(col => <td key={col} style={{ padding: "7px 12px", color: C.textSecondary, borderBottom: "1px solid rgba(30,41,59,0.3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(row[col])}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ padding: "6px 12px", fontSize: 11, color: C.textMuted, background: "rgba(42,54,80,0.15)", borderTop: `1px solid ${C.borderDefault}` }}>
        {rowCount} row{rowCount!==1?"s":""}{truncated?" (limited)":""}
      </div>
    </div>
  );
}

// ── SQL Block ─────────────────────────────────────────────────────────────
function SqlBlock({ sql }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.borderDefault}`, background: C.bg }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", cursor: "pointer", background: "rgba(42,54,80,0.3)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: open?"rotate(90deg)":"none", marginRight: 4 }}>›</span>SQL
        </span>
        <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(sql); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
          style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>{copied?"✓":"⎘"}</button>
      </div>
      {open && <pre style={{ padding: 12, margin: 0, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.cyan, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{sql}</pre>}
    </div>
  );
}

// ── Chat Message ──────────────────────────────────────────────────────────
function Message({ msg }) {
  if (msg.type === "user") return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueHover})`, borderRadius: "18px 18px 4px 18px", padding: "10px 16px", maxWidth: "88%", fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{msg.text}</div>
    </div>
  );
  const r = msg.response;
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ background: C.surface, borderRadius: "18px 18px 18px 4px", padding: 14, maxWidth: "95%", width: "100%", border: `1px solid ${C.borderSubtle}`, display: "flex", flexDirection: "column", gap: 10 }}>
        {r.explanation && <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>{r.explanation}</p>}
        {r.assumptions?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Assumptions:</span>
            {r.assumptions.map((a,i) => <span key={i} style={{ fontSize: 11, color: C.amber, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "2px 8px" }}>{a}</span>)}
          </div>
        )}
        {r.sql && <SqlBlock sql={r.sql} />}
        {r.data?.length > 0 && <ResultTable columns={r.columns} data={r.data} truncated={r.truncated} rowCount={r.row_count} />}
        {r.execution_time_ms && <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right" }}>{r.execution_time_ms}ms</div>}
      </div>
    </div>
  );
}

// ── Column Row (for schema detail) ────────────────────────────────────────
function ColumnRow({ col }) {
  const [expanded, setExpanded] = useState(false);
  const { meta } = col;
  const score = getColScore(meta);
  let synonyms = []; try { synonyms = JSON.parse(meta?.synonyms||"[]"); } catch {}
  let samples = []; try { samples = JSON.parse(meta?.sampleValues||"[]"); } catch {}
  let valueMap = null; try { valueMap = JSON.parse(meta?.valueMapping||"null"); } catch {}

  return (
    <div style={{ border: `1px solid ${C.borderSubtle}`, borderRadius: 8, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", cursor: "pointer", gap: 8, background: C.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C.textMuted, transition: "transform 0.2s", transform: expanded?"rotate(90deg)":"none" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: C.textPrimary }}>{col.name}</span>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted }}>{col.type}</span>
          {meta?.isPrimaryKey && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(245,158,11,0.15)", color: C.amber }}>PK</span>}
          {meta?.isForeignKey && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(59,130,246,0.15)", color: C.blue }}>FK</span>}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: score.color, flexShrink: 0 }} />
      </div>
      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.borderSubtle}`, display: "flex", flexDirection: "column", gap: 10, background: "rgba(10,15,30,0.4)" }}>
          {meta?.description && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Description</div><p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, margin: 0 }}>{meta.description}</p></div>}
          {synonyms.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Synonyms</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{synonyms.map((s,i) => <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: C.blue }}>{s}</span>)}</div></div>}
          {valueMap && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Value Mapping</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{Object.entries(valueMap).map(([k,v]) => <span key={k} style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)", color: C.amber }}>{k}={v}</span>)}</div></div>}
          {!valueMap && samples.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sample Values</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{samples.map((s,i) => <span key={i} style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", padding: "2px 6px", borderRadius: 4, background: "rgba(34,211,238,0.08)", color: C.cyan }}>{s}</span>)}</div></div>}
          {meta?.foreignKeyRef && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Foreign Key</div><span style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: C.blue }}>→ {meta.foreignKeyRef}</span></div>}
          {meta?.unit && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Unit</div><span style={{ fontSize: 12, color: C.textSecondary }}>{meta.unit}{meta.format ? ` (${meta.format})` : ""}</span></div>}
          {!meta?.description && !synonyms.length && <p style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic", margin: 0 }}>No metadata yet — edit to add descriptions and synonyms.</p>}
        </div>
      )}
    </div>
  );
}

// ── Schema Detail Overlay (full screen) ───────────────────────────────────
function SchemaDetailOverlay({ table, onClose }) {
  if (!table) return null;
  const score = getTableScore(table.meta);
  let joins = []; try { joins = JSON.parse(table.meta?.commonJoins||"[]"); } catch {}

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: C.bg, animation: "slideUp 0.25s ease" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: `1px solid ${C.borderSubtle}`, background: "rgba(10,15,30,0.95)", backdropFilter: "blur(16px)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500, marginBottom: 4, display: "block" }}>← Back to tables</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{table.meta?.displayName || table.name}</h2>
          <span style={{ fontSize: 12, color: C.textMuted }}>{table.type} · {table.row_count.toLocaleString()} rows · {table.columns.length} cols</span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: score.color, display: "block", letterSpacing: -1 }}>{score.score}%</span>
          <span style={{ fontSize: 10, color: C.textMuted }}>{score.label}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Table metadata cards */}
        {table.meta?.description && (
          <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>{table.meta.description}</p>
          </div>
        )}

        {(table.meta?.grainDescription || table.meta?.dataSource || table.meta?.updateFrequency) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {table.meta?.grainDescription && (
              <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, gridColumn: "1/-1" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Grain</div>
                <div style={{ fontSize: 13, color: C.textSecondary }}>{table.meta.grainDescription}</div>
              </div>
            )}
            {table.meta?.dataSource && (
              <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Source</div>
                <div style={{ fontSize: 13, color: C.textSecondary }}>{table.meta.dataSource}</div>
              </div>
            )}
            {table.meta?.updateFrequency && (
              <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Updated</div>
                <div style={{ fontSize: 13, color: C.textSecondary }}>{table.meta.updateFrequency}</div>
              </div>
            )}
          </div>
        )}

        {joins.length > 0 && (
          <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Common Joins</div>
            {joins.map((j,i) => (
              <div key={i} style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: C.cyan, padding: "4px 0" }}>
                {j.type} {j.table} ON {j.on}
              </div>
            ))}
          </div>
        )}

        {table.meta?.importantNotes && (
          <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.15)`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.amber, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>⚠ Notes</div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{table.meta.importantNotes}</div>
          </div>
        )}

        {/* Columns */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", paddingBottom: 6, borderBottom: `1px solid ${C.borderSubtle}` }}>
            Columns ({table.columns.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {table.columns.map(col => <ColumnRow key={col.name} col={col} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Schema Table List (full screen overlay) ───────────────────────────────
function SchemaOverlay({ open, onClose }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const table = MOCK_TABLES.find(t => t.name === selectedTable);

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", background: C.bg, animation: "slideUp 0.2s ease" }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: `1px solid ${C.borderSubtle}`, background: "rgba(10,15,30,0.95)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>⛁ Schema</h2>
            <span style={{ fontSize: 12, color: C.textMuted }}>{MOCK_TABLES.length} tables · Open Flow Insights</span>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.borderDefault}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSecondary, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Table list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {MOCK_TABLES.map(t => {
            const score = getTableScore(t.meta);
            return (
              <button key={t.name} onClick={() => setSelectedTable(t.name)} style={{
                width: "100%", textAlign: "left", padding: 14, background: C.surface,
                border: `1px solid ${C.borderSubtle}`, borderRadius: 12, cursor: "pointer",
                fontFamily: "inherit", color: "inherit", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 18, opacity: 0.5 }}>{t.type === "VIEW" ? "👁" : "⊞"}</span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: C.textPrimary, display: "block" }}>{t.meta?.displayName || t.name}</span>
                      {t.meta?.displayName && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>{t.name}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: C.textMuted, flexShrink: 0 }}>›</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>{t.columns.length} columns · {t.row_count.toLocaleString()} rows</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 48, height: 4, background: C.borderSubtle, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${score.score}%`, height: "100%", borderRadius: 2, background: score.color }} />
                    </div>
                    <span style={{ fontSize: 11, color: score.color, fontWeight: 600 }}>{score.score}%</span>
                  </div>
                </div>
                {t.meta?.description && <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4, margin: 0 }}>{t.meta.description.slice(0, 120)}{t.meta.description.length > 120 ? "…" : ""}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table detail overlay sits ON TOP of the table list */}
      <SchemaDetailOverlay table={table} onClose={() => setSelectedTable(null)} />
    </>
  );
}

// ── History Sidebar ───────────────────────────────────────────────────────
function HistorySidebar({ open, onClose, onSelect, activeId }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, animation: "fadeIn 0.15s ease" }} />
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(300px, 82vw)", background: C.bg, borderRight: `1px solid ${C.borderSubtle}`, zIndex: 91, display: "flex", flexDirection: "column", animation: "slideRight 0.2s ease" }}>
        <div style={{ padding: "14px 16px", paddingTop: "max(14px, env(safe-area-inset-top))", borderBottom: `1px solid ${C.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Conversations</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 20, cursor: "pointer", padding: "2px 6px" }}>✕</button>
        </div>
        <div style={{ padding: "8px 8px", borderBottom: `1px solid ${C.borderSubtle}` }}>
          <button onClick={() => { onSelect(null); onClose(); }} style={{
            width: "100%", padding: "10px 12px", background: `linear-gradient(135deg, ${C.blue}, ${C.blueHover})`,
            border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
          }}>
            + New Conversation
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {SAVED_CONVERSATIONS.map(conv => (
            <button key={conv.id} onClick={() => { onSelect(conv); onClose(); }} style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              background: activeId === conv.id ? C.elevated : "transparent",
              border: activeId === conv.id ? `1px solid ${C.borderDefault}` : "1px solid transparent",
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit", color: "inherit",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.preview}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{conv.time}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{conv.msgCount} messages</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── User Menu Dropdown ────────────────────────────────────────────────────
function UserMenu({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
      <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 200, background: C.surface, border: `1px solid ${C.borderDefault}`, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: 30, overflow: "hidden", animation: "fadeIn 0.12s ease" }}>
        <div style={{ padding: "12px 16px" }}>
          <strong style={{ fontSize: 14 }}>Tim Janney</strong>
          <div style={{ fontSize: 12, color: C.textMuted }}>tim@openflowinsights.com</div>
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 8px", borderRadius: 4, marginTop: 4, background: "rgba(59,130,246,0.15)", color: C.blue }}>OWNER</span>
        </div>
        <div style={{ height: 1, background: C.borderSubtle }} />
        <div style={{ padding: "8px 16px", fontSize: 13, color: C.textSecondary, cursor: "pointer" }}>⚙ Admin Panel</div>
        <div style={{ padding: "8px 16px", fontSize: 13, color: C.textSecondary, cursor: "pointer" }}>↩ Sign Out</div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN APP ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleSubmit = useCallback((text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { type: "user", text: q }]);
    setLoading(true);
    setTimeout(() => {
      const response = MOCK_RESPONSES[q] || DEFAULT_MOCK;
      setMessages(prev => [...prev, { type: "assistant", response: { ...response, question: q } }]);
      setLoading(false);
    }, 500 + Math.random() * 900);
  }, [input, loading]);

  const handleSelectConv = (conv) => {
    if (!conv) { setMessages([]); setActiveConv(null); return; }
    setActiveConv(conv.id);
    // Simulate loading a past conversation
    const q = conv.preview;
    const r = MOCK_RESPONSES[q] || DEFAULT_MOCK;
    setMessages([
      { type: "user", text: q },
      { type: "assistant", response: { ...r, question: q } },
    ]);
  };

  const suggestions = [
    "Show me all tables and row counts",
    "Which providers have the highest volume?",
    "Total spend by claim type last year",
    "How many attributed members do we have?",
    "ER visits by month",
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bgGrad, fontFamily: "'Outfit',-apple-system,sans-serif", color: C.textPrimary, position: "relative" }}>
      {/* ── Header ────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", paddingTop: "max(8px, env(safe-area-inset-top))",
        borderBottom: `1px solid ${C.borderSubtle}`, background: "rgba(10,15,30,0.92)",
        backdropFilter: "blur(16px)", zIndex: 20, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* History toggle */}
          <button onClick={() => setHistoryOpen(true)} style={{
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            background: C.surface, border: `1px solid ${C.borderDefault}`, borderRadius: 8,
            color: C.textSecondary, fontSize: 16, cursor: "pointer",
          }}>☰</button>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5 }}>❄ SnowQuery</span>
            <span style={{ display: "block", fontSize: 10, color: C.cyan, fontWeight: 500, opacity: 0.8 }}>Open Flow Insights</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setSchemaOpen(true)} style={{
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            background: C.surface, border: `1px solid ${C.borderDefault}`, borderRadius: 8,
            color: C.textSecondary, fontSize: 16, cursor: "pointer",
          }} title="Schema">⛁</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              width: 34, height: 34, borderRadius: "50%", border: `2px solid ${C.borderDefault}`,
              cursor: "pointer", background: C.elevated, padding: 0, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.blue,
            }}>T</button>
            <UserMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      </header>

      {/* ── Chat Area ─────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && !loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>❄</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Ask your database anything</h2>
            <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 300, lineHeight: 1.5, marginBottom: 24 }}>
              Type a question in plain English and get instant results from Snowflake.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 380 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSubmit(s)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 10,
                  color: C.textSecondary, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}>
                  <span style={{ color: C.blue, flexShrink: 0 }}>✦</span> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: C.surface, borderRadius: "18px 18px 18px 4px", padding: "12px 16px", border: `1px solid ${C.borderSubtle}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0,0.2,0.4].map((d,i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, animation: `pulseDot 1.2s ${d}s infinite ease-in-out`, display: "inline-block" }} />)}
              </div>
              <span style={{ fontSize: 13, color: C.textMuted }}>Querying…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* ── Input Bar ─────────────────────────────────────── */}
      <div style={{
        padding: "8px 12px", paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        borderTop: `1px solid ${C.borderSubtle}`, background: "rgba(10,15,30,0.92)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: C.surface, borderRadius: 14,
          border: `1px solid ${C.borderDefault}`, padding: "4px 4px 4px 14px",
        }}>
          <input
            ref={inputRef}
            style={{ flex: 1, background: "none", border: "none", color: C.textPrimary, fontSize: 15, padding: "8px 0", outline: "none", fontFamily: "inherit" }}
            placeholder="Ask about your data…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            disabled={loading}
          />
          <button onClick={() => handleSubmit()} disabled={!input.trim() || loading}
            style={{
              background: `linear-gradient(135deg, ${C.blue}, ${C.blueHover})`, border: "none",
              borderRadius: 10, width: 38, height: 38, color: "#fff", fontSize: 18,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, opacity: input.trim() && !loading ? 1 : 0.35,
            }}>↗</button>
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────── */}
      <HistorySidebar open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={handleSelectConv} activeId={activeConv} />
      <SchemaOverlay open={schemaOpen} onClose={() => setSchemaOpen(false)} />

      {/* ── Global Styles ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideRight { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes pulseDot { 0%,80%,100% { opacity:.3; transform:scale(.8) } 40% { opacity:1; transform:scale(1) } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        ::-webkit-scrollbar { width: 4px; height: 4px } ::-webkit-scrollbar-track { background: transparent } ::-webkit-scrollbar-thumb { background: #2a3650; border-radius: 2px }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
