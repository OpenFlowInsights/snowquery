# SnowQuery — Build Instructions for Claude Code

## Project Overview

SnowQuery is a **multi-tenant natural language database querying app** built with Next.js 15 (App Router). Users ask questions in plain English, Claude translates them to Snowflake SQL, executes the query, and returns formatted results. The app includes OAuth authentication, multi-tenant database isolation, a schema metadata editor, and a mobile-first chat UI.

**Owner:** Tim Janney / Open Flow Insights (healthcare analytics consulting)
**Primary users:** MSSP ACOs, Medicare Advantage plans, healthcare orgs that lack internal analytics

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Auth:** NextAuth v5 (beta) with Google + Microsoft OAuth
- **Database:** PostgreSQL via Prisma ORM (or SQLite for local dev)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for NL→SQL translation
- **Data warehouse:** Snowflake (multi-tenant, one connection per client)
- **Styling:** CSS Modules with custom design system (dark theme)
- **Fonts:** Outfit (display), JetBrains Mono (code)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                     │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  /login   │  │  /query      │  │  /admin (OWNER only)  │ │
│  │  OAuth    │→ │  Chat UI     │  │  Tenant CRUD          │ │
│  └──────────┘  └──────┬───────┘  └────────────────────────┘ │
│                        │                                     │
│  ┌─────────────────────┴─────────────────────────────────┐   │
│  │              API Routes (App Router)                   │   │
│  │  POST /api/query     — NL → SQL → execute             │   │
│  │  GET  /api/schema    — cached schema metadata         │   │
│  │  POST /api/metadata  — CRUD for enriched metadata     │   │
│  │  POST /api/tenants   — tenant management (OWNER)      │   │
│  └──────────┬────────────────────┬───────────────────────┘   │
│             │                    │                            │
│  ┌──────────┴──────┐  ┌─────────┴──────────┐                │
│  │  Claude API     │  │  PostgreSQL         │                │
│  │  (NL → SQL)     │  │  (Prisma ORM)       │                │
│  └─────────────────┘  └────────────────────┘                 │
│                                                              │
│             ┌──────────────────────────┐                     │
│             │  Per-Tenant Snowflake DB │ ← Multi-tenant      │
│             │  (isolated connections)  │   connection routing │
│             └──────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

## Role-Based Access

| Role     | Permissions |
|----------|-------------|
| OWNER    | Full access. Manage all tenants, users, connections. (Tim) |
| ADMIN    | Manage their own tenant's users, metadata, and settings |
| ANALYST  | Run queries against their tenant's database |
| VIEWER   | View schema and saved queries (read-only) |

## File Structure

```
snowquery/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # OAuth handlers
│   │   ├── query/route.ts                # NL → SQL → execute
│   │   ├── schema/route.ts               # Schema metadata (GET)
│   │   ├── schema/refresh/route.ts       # Force schema refresh (POST)
│   │   ├── metadata/route.ts             # Enriched metadata CRUD
│   │   ├── tenants/route.ts              # Tenant CRUD (OWNER)
│   │   └── health/route.ts               # Health check
│   ├── login/
│   │   ├── page.tsx                      # OAuth login (Google + Microsoft)
│   │   └── login.module.css
│   ├── query/
│   │   ├── page.tsx                      # Server wrapper (auth check)
│   │   ├── query-client.tsx              # Main chat UI (client component)
│   │   └── query.module.css
│   ├── schema/
│   │   ├── page.tsx                      # Server wrapper
│   │   └── schema-explorer.tsx           # Schema browser + metadata editor
│   ├── admin/
│   │   ├── page.tsx                      # Server wrapper
│   │   └── admin-client.tsx              # Tenant management UI
│   ├── layout.tsx                        # Root layout (fonts, meta)
│   ├── globals.css                       # Design system (CSS variables)
│   └── page.tsx                          # Redirect to /query or /login
├── lib/
│   ├── auth.ts                           # NextAuth v5 config (Google + Microsoft)
│   ├── prisma.ts                         # Prisma client singleton
│   ├── snowflake.ts                      # Multi-tenant connection manager
│   ├── claude.ts                         # Basic NL → SQL via Claude
│   ├── claude-enhanced.ts                # Enhanced NL → SQL with metadata context
│   └── api-auth.ts                       # Route auth + role helpers
├── prisma/
│   ├── schema.prisma                     # Full data model
│   └── seed.ts                           # Initial setup script
├── middleware.ts                          # Route protection
├── public/manifest.json                  # PWA manifest
├── .env.example
├── package.json
├── tsconfig.json
└── next.config.js
```

## Reference Files

All source files are in the `reference-files/` directory. These are the **exact implementations** to use. Copy them into the project, don't rewrite from scratch.

### Critical files to use as-is:
- `prisma/schema.prisma` — Full data model (User, Account, Session, Tenant, QueryLog)
- `prisma/schema-additions.prisma` — Metadata models (TableMetadata, ColumnMetadata, BusinessTerm) — **merge into schema.prisma**
- `lib/auth.ts` — NextAuth v5 with Google + Microsoft + Prisma adapter
- `lib/snowflake.ts` — Multi-tenant Snowflake connection pool + schema introspection
- `lib/claude-enhanced.ts` — Enhanced NL→SQL with rich metadata context builder
- `lib/api-auth.ts` — Route auth helper with role hierarchy
- `app/api/query/route.ts` — Main query endpoint (auth → rate limit → Claude → Snowflake → log)
- `app/api/metadata/route.ts` — CRUD for table/column metadata and business glossary
- `middleware.ts` — Route protection (public vs protected vs admin)

### UI reference:
- `ui-preview.jsx` — **This is the target UI design.** It's a self-contained React preview showing the full app with:
  - Mobile-first chat interface
  - ☰ button → conversation history sidebar (left slide-in, stores last 10 conversations)
  - ⛁ button → schema explorer as **full-screen overlay** (NOT a side panel — phone screens are too small)
  - Clicking a table in schema → detail view **pops over on top** with "← Back to tables" navigation
  - User avatar dropdown with role badge
  - Suggestion chips on empty state
  - Sortable result tables, collapsible SQL blocks, assumption badges
  - Loading animation with pulsing dots
  - Dark theme matching the design system

## Build Steps

### Phase 1: Project Setup

```bash
mkdir snowquery && cd snowquery
npm init -y
```

1. Copy `package.json` from reference-files (has all dependencies)
2. Run `npm install`
3. Copy `tsconfig.json`, `next.config.js` from reference-files
4. Copy `.env.example` → `.env` (fill in real values later)

### Phase 2: Database + Auth

1. Copy `prisma/schema.prisma` from reference-files
2. **Merge** `prisma/schema-additions.prisma` into schema.prisma:
   - Add the `TableMetadata`, `ColumnMetadata`, and `BusinessTerm` models
   - Add relations to the `Tenant` model: `tableMetadata TableMetadata[]` and `businessTerms BusinessTerm[]`
3. Copy `prisma/seed.ts`
4. Copy `lib/prisma.ts`, `lib/auth.ts`, `lib/api-auth.ts`
5. Copy `middleware.ts`
6. Copy `app/api/auth/[...nextauth]/route.ts`
7. Run: `npx prisma db push && npx prisma generate`

### Phase 3: Core Backend

1. Copy `lib/snowflake.ts` — Multi-tenant Snowflake connection manager
2. Copy `lib/claude.ts` — Basic NL→SQL (used as fallback)
3. Copy `lib/claude-enhanced.ts` — Enhanced NL→SQL with metadata context
4. Copy these API routes:
   - `app/api/query/route.ts` — Main query endpoint
   - `app/api/schema/route.ts` — Get schema
   - `app/api/schema/refresh/route.ts` — Force refresh
   - `app/api/metadata/route.ts` — Metadata CRUD
   - `app/api/tenants/route.ts` — Tenant management
   - `app/api/health/route.ts` — Health check
5. **Update** `app/api/query/route.ts` to use `enhancedNlToSql` from `lib/claude-enhanced.ts` instead of the basic `naturalLanguageToSql`

### Phase 4: Frontend — Main Chat UI

This is the most complex part. Use `ui-preview.jsx` as the **exact design reference** and implement it as proper Next.js pages with CSS Modules.

1. Copy `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
2. Copy `app/login/page.tsx`, `app/login/login.module.css`
3. **Rebuild** `app/query/query-client.tsx` based on the ui-preview.jsx design:

**Key UI requirements (from ui-preview.jsx):**

#### Header
- Left: ☰ hamburger button (opens history sidebar) + ❄ SnowQuery logo + tenant name
- Right: ⛁ schema button + user avatar (clickable dropdown)

#### Conversation History (☰ button)
- Left-slide sidebar overlay with backdrop
- "New Conversation" button at top (blue gradient)
- List of last 10 conversations showing: title, preview text, timestamp, message count
- Active conversation highlighted
- Conversations stored in state (later: persist to QueryLog grouping or localStorage)
- **Width:** `min(300px, 82vw)` for mobile

#### Chat Area
- Empty state: floating ❄ icon, "Ask your database anything" heading, suggestion chips
- User messages: blue gradient bubbles, right-aligned, rounded corners (18px 18px 4px 18px)
- Assistant messages: dark surface bubbles, left-aligned, containing:
  - Explanation text
  - Assumption badges (amber chips)
  - Collapsible SQL block (click header to toggle, copy button)
  - Sortable result table (click headers to sort, sticky header, alternating rows)
  - Execution time
  - Error box (red tint) if query failed

#### Schema Explorer (⛁ button)
- Opens as **full-screen overlay** (position: fixed, inset: 0) — NOT a side panel
- Header with "⛁ Schema" title, table count, close ✕ button
- Scrollable list of table cards showing:
  - Table icon (⊞ for tables, 👁 for views)
  - Display name + raw name
  - Column count, row count
  - Documentation completeness bar + percentage (green ≥80%, amber ≥40%, red <40%)
  - Description preview (truncated to 120 chars)
  - Chevron → indicates clickable
- **Clicking a table** → detail view slides over on top (another full-screen overlay):
  - "← Back to tables" link
  - Table name + type + stats
  - Score percentage (large, colored)
  - Metadata cards: description, grain, source, update frequency
  - Common joins (cyan monospace)
  - Important notes (amber warning box)
  - Column list (expandable rows):
    - Column name (monospace) + type + PK/FK badges
    - Documentation dot (green/amber/red)
    - Expand → description, synonyms (blue chips), value mappings (amber), sample values (cyan), FK ref, unit

#### Documentation Completeness Scoring
Table score counts filled fields among: description, grainDescription, dataSource, updateFrequency, commonJoins, importantNotes
Column score counts filled fields among: description, synonyms, sampleValues
- ≥80% / ≥67% = green
- ≥40% / ≥33% = amber
- <40% / <33% = red

#### Input Bar
- Sticky bottom with safe-area-inset-bottom padding
- Frosted glass background (blur + semi-transparent)
- Rounded input container with blue gradient send button
- Disabled while loading

### Phase 5: Schema Explorer Page

Build a dedicated `/schema` page for editing metadata (the full schema-explorer with inline editing). This is for ADMIN+ users to manage table descriptions, column synonyms, value mappings, etc.

Reference: `reference-files/ui-preview.jsx` (SchemaOverlay and SchemaDetailOverlay components) for the read-only browser. The editing UI adds:
- Click-to-edit fields on table metadata (description, grain, source, frequency, joins, notes)
- Click-to-edit on column metadata (description, synonyms, sample values, value mapping, FK ref, unit)
- Add/remove business glossary terms
- All saves go to `POST /api/metadata` with the appropriate action

### Phase 6: Admin Panel

1. Copy `app/admin/page.tsx` and `app/admin/admin-client.tsx` from reference-files
2. Features: stats overview, tenant list with connection details, "Add Tenant" form, user list per tenant

### Phase 7: PWA + Polish

1. Copy `public/manifest.json`
2. Add PWA icons (192x192, 512x512)
3. Test safe-area-inset on iOS Safari
4. Ensure all overlays have proper z-index stacking (history=90, schema=100, detail=200)
5. Add animations: fadeIn, slideUp, slideRight, pulseDot

## Design System

All colors, fonts, spacing defined in `app/globals.css`:

```css
/* Colors */
--bg-primary: #0a0f1e;
--bg-surface: #1a2235;
--bg-elevated: #243049;
--border-subtle: #1e293b;
--border-default: #2a3650;
--text-primary: #f0f4f8;
--text-secondary: #94a3b8;
--text-muted: #5a6b82;
--accent-blue: #3b82f6;
--accent-cyan: #22d3ee;
--accent-amber: #f59e0b;
--accent-green: #34d399;

/* Fonts */
--font-display: "Outfit", sans-serif;
--font-mono: "JetBrains Mono", monospace;

/* Radii */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 18px;
```

## Metadata System — How It Improves Query Accuracy

The metadata system is the single biggest lever for NL→SQL accuracy. The `lib/claude-enhanced.ts` file builds a rich context for Claude that includes:

1. **Business Glossary** — Maps domain terms to SQL (e.g., "attributed lives" → `COUNT(DISTINCT MEMBER_ID) FROM MEMBER_DEMOGRAPHICS WHERE ATTRIBUTION_STATUS = 'ATTRIBUTED'`)
2. **Table Descriptions + Grain** — Prevents wrong table selection and double-counting
3. **Column Synonyms** — Users say "cost" but column is `PAID_AMOUNT`. Without synonyms, Claude guesses wrong.
4. **Value Mappings** — Maps codes to meanings (e.g., POS_CODE "23" = Emergency Room)
5. **Common Joins** — Explicit join paths for multi-table queries
6. **Example Queries** — Few-shot learning with question→SQL pairs

### Priority for documenting metadata:
1. Column synonyms (highest impact)
2. Column descriptions
3. Value mappings / sample values
4. Table descriptions + grain
5. Common joins
6. Business glossary
7. Example queries
8. Common filters / notes

## Conversation History Implementation

The history sidebar shows the last 10 conversations. Implementation approach:

**Phase 1 (MVP):** Store conversations in React state. Group messages into conversations with auto-generated titles (first user message, truncated). New conversations get a UUID. Persist the list to `localStorage` for cross-session retention.

**Phase 2 (Full):** Store conversations server-side using a new `Conversation` model:
```prisma
model Conversation {
  id        String     @id @default(cuid())
  tenantId  String
  userId    String
  title     String     // Auto-generated from first question
  messages  QueryLog[] // Existing query logs grouped by conversation
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  
  @@index([userId, updatedAt])
}
```
Add `conversationId` to the existing `QueryLog` model. The API returns recent conversations with message counts. The sidebar loads conversation history on mount.

## Security Notes

- Snowflake passwords stored in DB — encrypt with KMS in production
- SQL injection protection: SELECT-only validation + keyword blocklist in `lib/snowflake.ts`
- Rate limiting: per-tenant daily query cap in `app/api/query/route.ts`
- HTTPS required for OAuth callbacks in production
- CORS handled by Next.js defaults
- Session strategy: database-backed sessions via Prisma adapter

## Environment Variables

See `.env.example` for the full list. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` — Microsoft OAuth
- `ANTHROPIC_API_KEY` — Claude API key
- `CLAUDE_MODEL` — defaults to claude-sonnet-4-20250514

## First-Time Setup After Build

1. `npm run dev`
2. Sign in with Google or Microsoft at `/login`
3. Open Prisma Studio: `npx prisma studio`
4. Find your User record → set `role` = `OWNER`, `tenantId` = (tenant ID from seed)
5. Refresh app — you now have full access + admin panel
6. Go to `/schema` to start documenting your tables
