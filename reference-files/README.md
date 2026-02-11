# ❄ SnowQuery — Multi-Tenant NL Database Querying

A Next.js app that lets authenticated users query their Snowflake database using natural language. Built for Open Flow Insights with multi-tenant support for client deployments.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel / AWS)                  │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Login    │  │  /query      │  │  /admin                  │  │
│  │  Google/  │→ │  Chat UI     │  │  Tenant CRUD             │  │
│  │  Microsoft│  │  (protected) │  │  User Management (OWNER) │  │
│  └──────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                        │                                         │
│  ┌─────────────────────┴─────────────────────────────────────┐  │
│  │              API Routes (Next.js App Router)               │  │
│  │  POST /api/query     — NL → SQL → execute                 │  │
│  │  GET  /api/schema    — cached schema metadata              │  │
│  │  POST /api/tenants   — tenant management (OWNER)           │  │
│  └──────────┬──────────────────────┬─────────────────────────┘  │
│             │                      │                             │
│  ┌──────────┴────────┐  ┌─────────┴──────────┐                 │
│  │  Claude API        │  │  PostgreSQL         │                 │
│  │  (NL → SQL)        │  │  (Users, Tenants,   │                 │
│  │                    │  │   Sessions, Logs)    │                 │
│  └───────────────────┘  └────────────────────┘                  │
│                                                                  │
│             ┌──────────────────────────┐                        │
│             │  Tenant A: Snowflake DB  │                        │
│             ├──────────────────────────┤                        │
│             │  Tenant B: Snowflake DB  │  ← Multi-tenant        │
│             ├──────────────────────────┤    connection routing   │
│             │  Tenant C: Snowflake DB  │                        │
│             └──────────────────────────┘                        │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Clone and install

```bash
cd snowquery-nextjs
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:
- **DATABASE_URL** — PostgreSQL connection string (or SQLite for local dev)
- **NEXTAUTH_SECRET** — Generate with `openssl rand -base64 32`
- **Google OAuth** — Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- **Microsoft OAuth** — Create at [Azure Portal → App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
  - Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
- **ANTHROPIC_API_KEY** — Your Claude API key

### 3. Set up database

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed with your default tenant
npx tsx prisma/seed.ts
```

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

### 5. First-time setup

1. Sign in with Google or Microsoft
2. Open Prisma Studio: `npx prisma studio`
3. Find your User record, set:
   - `role` → `OWNER`
   - `tenantId` → (the tenant ID from seed output)
4. Refresh the app — you now have full access + admin panel

## Multi-Tenant Model

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access. Manage all tenants, users, connections. (You) |
| **ADMIN** | Manage their own tenant's users and settings |
| **ANALYST** | Run queries against their tenant's database |
| **VIEWER** | View schema and saved queries (read-only) |

Each tenant has:
- Isolated Snowflake connection credentials
- Independent schema cache
- Configurable query limits (max rows, timeout, daily cap)
- Audit log of all queries

### Adding a Client

1. Go to `/admin` → "Add Tenant"
2. Enter their Snowflake credentials
3. Have the client sign in with Google/Microsoft
4. Assign them to the tenant via Prisma Studio (or build a UI for it)

## Key Features

- **OAuth login** — Google + Microsoft, no passwords to manage
- **Multi-tenant isolation** — each client queries only their own database
- **Claude NL→SQL** — powered by Claude with full schema context
- **Safety guardrards** — SELECT-only, keyword blocking, query timeouts, rate limits
- **Audit logging** — every query logged with user, tenant, SQL, timing
- **Schema browser** — slide-out drawer showing all tables/columns
- **PWA installable** — add to home screen on iOS/Android
- **Admin panel** — manage tenants, view stats (OWNER only)

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard
# Add PostgreSQL via Vercel Postgres or external provider
```

**Important:** Add your production domain to OAuth redirect URIs:
- Google: `https://yourdomain.com/api/auth/callback/google`
- Microsoft: `https://yourdomain.com/api/auth/callback/microsoft-entra-id`

### AWS (EC2/ECS)

```bash
# Build
npm run build

# Start production server
npm start

# Or use Docker (add Dockerfile)
```

## Project Structure

```
snowquery-nextjs/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # OAuth handlers
│   │   ├── query/route.ts                # NL → SQL → execute
│   │   ├── schema/route.ts               # Schema metadata
│   │   ├── schema/refresh/route.ts       # Force schema refresh
│   │   ├── tenants/route.ts              # Tenant CRUD (OWNER)
│   │   └── health/route.ts               # Health check
│   ├── login/
│   │   ├── page.tsx                      # OAuth login page
│   │   └── login.module.css
│   ├── query/
│   │   ├── page.tsx                      # Server wrapper
│   │   ├── query-client.tsx              # Chat UI (client component)
│   │   └── query.module.css
│   ├── admin/
│   │   ├── page.tsx                      # Server wrapper
│   │   └── admin-client.tsx              # Tenant management
│   ├── layout.tsx                        # Root layout
│   ├── globals.css                       # Design system
│   └── page.tsx                          # Redirect to /query or /login
├── lib/
│   ├── auth.ts                           # NextAuth v5 config
│   ├── prisma.ts                         # Prisma client singleton
│   ├── snowflake.ts                      # Multi-tenant connection manager
│   ├── claude.ts                         # NL → SQL via Claude
│   └── api-auth.ts                       # Route auth helpers
├── prisma/
│   ├── schema.prisma                     # Data model
│   └── seed.ts                           # Initial setup script
├── middleware.ts                          # Route protection
├── public/
│   └── manifest.json                     # PWA manifest
├── .env.example
├── next.config.js
├── tsconfig.json
└── package.json
```

## Security Notes

- **Snowflake passwords** are stored in the database. For production, encrypt them with a KMS key (AWS KMS, Vault, etc.) and decrypt at runtime.
- **Rate limiting** is per-tenant per day. Add IP-based rate limiting via middleware or Vercel's built-in protection for production.
- **HTTPS required** for OAuth and PWA installation on mobile.
- **SQL injection protection** — Claude generates SQL, but it's validated server-side (SELECT-only, keyword blocklist) before execution.
