// app/admin/admin-client.tsx
"use client";

import React, { useState } from "react";

export default function AdminClient({ tenants: initialTenants }: { tenants: any[] }) {
  const [tenants] = useState(initialTenants);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", slug: "", sfAccount: "", sfUser: "", sfPassword: "",
    sfWarehouse: "", sfDatabase: "", sfSchema: "PUBLIC", sfRole: "SYSADMIN",
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create tenant");
      }
    } finally {
      setSaving(false);
    }
  };

  const s = styles;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>⚙ Admin Panel</h1>
          <p style={s.subtitle}>Manage tenants and database connections</p>
        </div>
        <a href="/query" style={s.backLink}>← Back to Query</a>
      </header>

      <main style={s.main}>
        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statValue}>{tenants.length}</div>
            <div style={s.statLabel}>Tenants</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{tenants.reduce((s, t) => s + t._count.users, 0)}</div>
            <div style={s.statLabel}>Users</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>
              {tenants.reduce((s, t) => s + t._count.queryLogs, 0).toLocaleString()}
            </div>
            <div style={s.statLabel}>Queries</div>
          </div>
        </div>

        {/* Tenant List */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Tenants</h2>
            <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Add Tenant"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.formGrid}>
                {[
                  { key: "name", label: "Tenant Name", placeholder: "Acme ACO" },
                  { key: "slug", label: "Slug", placeholder: "acme-aco" },
                  { key: "sfAccount", label: "Snowflake Account", placeholder: "abc123.us-east-1" },
                  { key: "sfUser", label: "SF Username", placeholder: "ANALYTICS_USER" },
                  { key: "sfPassword", label: "SF Password", placeholder: "••••••••", type: "password" },
                  { key: "sfWarehouse", label: "Warehouse", placeholder: "COMPUTE_WH" },
                  { key: "sfDatabase", label: "Database", placeholder: "ANALYTICS_DB" },
                  { key: "sfSchema", label: "Schema", placeholder: "PUBLIC" },
                  { key: "sfRole", label: "Role", placeholder: "SYSADMIN" },
                ].map((f) => (
                  <div key={f.key} style={s.formField}>
                    <label style={s.label}>{f.label}</label>
                    <input
                      style={s.input}
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      value={(formData as any)[f.key]}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      required={["name", "slug", "sfAccount", "sfUser", "sfPassword", "sfWarehouse", "sfDatabase"].includes(f.key)}
                    />
                  </div>
                ))}
              </div>
              <button type="submit" style={s.submitBtn} disabled={saving}>
                {saving ? "Creating…" : "Create Tenant"}
              </button>
            </form>
          )}

          {tenants.map((t) => (
            <div key={t.id} style={s.tenantCard}>
              <div style={s.tenantHeader}>
                <div>
                  <h3 style={s.tenantName}>{t.name}</h3>
                  <span style={s.tenantSlug}>/{t.slug}</span>
                </div>
                <span style={{
                  ...s.statusBadge,
                  background: t.isActive ? "rgba(52, 211, 153, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: t.isActive ? "#34d399" : "#f87171",
                }}>
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div style={s.tenantDetails}>
                <span>❄ {t.sfDatabase}.{t.sfSchema}</span>
                <span>👤 {t._count.users} users</span>
                <span>📊 {t._count.queryLogs.toLocaleString()} queries</span>
                <span>{t.hasSchemaCache ? "✓ Schema cached" : "⚠ No cache"}</span>
              </div>
              {t.users.length > 0 && (
                <div style={s.userList}>
                  {t.users.map((u: any) => (
                    <div key={u.id} style={s.userRow}>
                      <span style={s.userName}>{u.name || u.email}</span>
                      <span style={s.userRole}>{u.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1e",
    color: "#f0f4f8",
    fontFamily: "'Outfit', sans-serif",
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #1e293b",
    position: "sticky",
    top: 0,
    background: "rgba(10, 15, 30, 0.95)",
    backdropFilter: "blur(12px)",
    zIndex: 10,
  },
  title: { fontSize: 20, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: "#5a6b82", margin: 0 },
  backLink: { fontSize: 14, color: "#3b82f6", textDecoration: "none" },
  main: { padding: 24, maxWidth: 900, margin: "0 auto" },

  // Stats
  statsRow: { display: "flex", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, padding: "16px 20px", background: "#1a2235",
    border: "1px solid #1e293b", borderRadius: 12,
  },
  statValue: { fontSize: 28, fontWeight: 700, letterSpacing: -1 },
  statLabel: { fontSize: 12, color: "#5a6b82", textTransform: "uppercase" as const, letterSpacing: 0.5 },

  // Section
  section: {},
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 600, margin: 0 },
  addBtn: {
    padding: "8px 16px", background: "#3b82f6", border: "none",
    borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },

  // Form
  form: { background: "#1a2235", border: "1px solid #2a3650", borderRadius: 12, padding: 20, marginBottom: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  formField: { display: "flex", flexDirection: "column" as const, gap: 4 },
  label: { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
  input: {
    padding: "8px 12px", background: "#111827", border: "1px solid #2a3650",
    borderRadius: 8, color: "#f0f4f8", fontSize: 14, fontFamily: "inherit",
  },
  submitBtn: {
    marginTop: 16, padding: "10px 24px", background: "#3b82f6", border: "none",
    borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },

  // Tenant Card
  tenantCard: {
    background: "#1a2235", border: "1px solid #1e293b", borderRadius: 12,
    padding: 16, marginBottom: 12,
  },
  tenantHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  tenantName: { fontSize: 16, fontWeight: 600, margin: 0 },
  tenantSlug: { fontSize: 12, color: "#5a6b82", fontFamily: "'JetBrains Mono', monospace" },
  statusBadge: {
    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
    textTransform: "uppercase" as const, letterSpacing: 0.5,
  },
  tenantDetails: {
    display: "flex", flexWrap: "wrap" as const, gap: 16, marginTop: 12,
    fontSize: 13, color: "#94a3b8",
  },
  userList: { marginTop: 12, borderTop: "1px solid #1e293b", paddingTop: 10 },
  userRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 },
  userName: { color: "#cbd5e1" },
  userRole: { color: "#5a6b82", fontSize: 11, textTransform: "uppercase" as const },
};
