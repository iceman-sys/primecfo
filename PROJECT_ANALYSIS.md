# PrimeCFO.ai — Project Analysis & Documentation

**Date:** February 18, 2026  
**Purpose:** Internal application for Prime Accounting Solutions, LLC — client management and QuickBooks Online (QBO) integration for AI-powered financial insights.

---

## 1. Project Overview

| Item | Details |
|------|---------|
| **Name** | primecfoai (PrimeCFO.ai) |
| **Version** | 0.1.0 |
| **Stack** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase, Intuit QuickBooks OAuth |
| **Repo** | Git at `D:/work/primecfoai/v-1` |

The application allows internal staff to:

- Manage clients (create, view, tag, notes).
- Connect each client to QuickBooks Online via OAuth 2.0.
- View a per-client CFO-style dashboard (overview, treasury, assets, analytics, documents, alerts, notes).
- Sync and display QBO customer data (e.g. customer record, placeholder for invoices/payments).

---

## 2. Technology Stack

### 2.1 Core

- **Next.js** `^16.1.6` — App Router, API routes, server components.
- **React** `19.2.0` / **React DOM** `19.2.0`.
- **TypeScript** `^5`.
- **Tailwind CSS** `^4` with **@tailwindcss/postcss** `^4`.

### 2.2 Backend & Data

- **Supabase** `@supabase/supabase-js` `^2.81.1` — PostgreSQL database, service role and anon key for server and client.
- **intuit-oauth** `^4.2.2` — QuickBooks Online OAuth 2.0 (authorize, token exchange, refresh).

### 2.3 UI

- **lucide-react** `^0.553.0` — Icons across admin and marketing-style pages.

### 2.4 Dev / Tooling

- **ESLint** with `eslint-config-next` (core-web-vitals, TypeScript).
- **next.config.ts** — minimal (no custom config).
- **tsconfig.json** — path alias `@/*` → project root; includes `types/**/*.d.ts` for module declarations.

---

## 3. Database Schema (Inferred from Code)

Supabase is used with at least three tables; no migration files were found in the repo. Schema is inferred from API and dashboard usage.

### 3.1 `clients`

- **client_id** (PK, UUID or text)
- **client_name**, **company_name**, **email**, **phone**, **notes**
- **tags** (array)
- **client_type**, **is_active**
- **qbo_customer_id** (optional — used in main `/api/clients` POST flow)

### 3.2 `client_qbo_connections`

- **id** (PK)
- **client_id** (FK → clients)
- **company_id** (QBO company/realm ID)
- **realm_id** (same as company_id in callback)
- **customer_id** (QBO customer ID, optional)
- **status** (e.g. `'connected'`, `'pending'`)
- **sync_enabled**, **sandbox_mode**
- **connected_at**, **notes**

### 3.3 `qbo_tokens`

- **id** (PK)
- **client_id** (FK)
- **company_id** (QBO company ID)
- **access_token**, **refresh_token**
- **expires_at**

Relations: `clients` ← `client_qbo_connections`, `clients` ← `qbo_tokens`. Dashboard and API use `client_qbo_connections` and `qbo_tokens` joined to `clients`.

---

## 4. Application Structure

### 4.1 Routes (Pages)

| Path | Purpose |
|------|---------|
| `/` | Default Next.js placeholder home (unchanged from create-next-app). |
| `/connect` | Public “Connect QuickBooks” marketing-style page. **Issue:** Links to `/api/auth/quickbooks` which does not exist; actual auth route is `/api/quickbooks/auth`. |
| `/disconnect` | “Disconnect QuickBooks” confirmation and success. **Issue:** Calls `POST /api/auth/quickbooks/disconnect`, which is not implemented. |
| `/privacy` | Internal application privacy policy (QuickBooks, data use, no external sharing). |
| `/eula` | Internal Use License Agreement (restricted use, confidentiality). |
| `/admin/dashboard` | Main CFO client dashboard (client selector, QBO data, assets, treasury, analytics, documents, alerts, notes). **Protected** by `AdminAuth`. |
| `/admin/clients/add` | Add new client and optionally start QBO OAuth for that client. **Protected** by `AdminAuth`. |
| `/admin/clients` | Referenced in “Back” / “Close” from add-client flow; **no `page.tsx` found** under `app/admin/clients/` — only `app/admin/clients/add/page.tsx` exists. Links may 404 unless a clients list page is added. |

### 4.2 API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/quickbooks/auth` | Start QBO OAuth. Query: `clientId` (required), `returnTo` (optional, `'add'` \| `'dashboard'`). Redirects to Intuit with state `{ clientId, returnTo }`. |
| GET | `/api/quickbooks/callback` | OAuth callback. Exchanges `code` for tokens, upserts `qbo_tokens`, inserts `client_qbo_connections`, redirects to add or dashboard with `?connected=true` or `?error=connection_failed`. |
| GET | `/api/quickbooks/customer` | Fetch QBO customer data for a client. Query: `clientId`; uses `companyId`/`customerId` from DB. Refreshes token if expired, then calls QBO `Customer` query. Returns customer + placeholder invoices/payments structure. |
| POST | `/api/clients` | Create client. Body: client fields + optional `qbo_customer_id`, `qbo_company_id`, etc. Inserts into `clients`; optionally creates `client_qbo_connections` and `qbo_tokens` placeholder. Returns full client with relations. |
| GET | `/api/clients` | Health/test: DB connection and client count. |
| POST | `/api/clients/add` | Alternate client creation. Same flow as POST `/api/clients` but **does not** persist `qbo_customer_id` on the client record (client payload omits it). |

**Missing or inconsistent:**

- **`/api/auth/quickbooks`** — Used by `/connect` page; not present. Should redirect to `/api/quickbooks/auth` (with a default or no `clientId` if connect is global).
- **`/api/auth/quickbooks/disconnect`** — Called by `/disconnect` page; **not implemented**. Disconnect would need to revoke token (Intuit revoke) and update/delete `client_qbo_connections` and optionally `qbo_tokens`.

### 4.3 Key Components

- **`app/components/AdminAuth.tsx`** — Password gate for admin area. Uses `NEXT_PUBLIC_ADMIN_PASSWORD` or fallback `'primecfo2024'`; stores success in `sessionStorage` as `admin_authenticated`.
- **`app/components/AddClientForm.tsx`** — Full client form (name, company, email, phone, type, tags, notes, optional `qbo_customer_id`). On success shows “Connect QuickBooks” and redirects to `/api/quickbooks/auth?clientId=<newClientId>`. Handles `?connected=true` and `?error=connection_failed` from callback.

### 4.4 Type Definitions

- **`types/intuit-oauth.d.ts`** — Declares `intuit-oauth` module: `OAuthClient` constructor, `scopes` (Accounting, OpenId, Payment), `authorizeUri`, `createToken`, `setToken`, `getToken`, `refresh`, `revoke`, `isAccessTokenValid`.

---

## 5. QuickBooks OAuth Flow (As Implemented)

1. **Start**  
   User goes to “Connect QuickBooks” from:
   - **Add Client:** after creating a client, click “Connect QuickBooks” → `GET /api/quickbooks/auth?clientId=<id>` (returnTo defaults to add).
   - **Dashboard:** “Connect QuickBooks” on a client card → `GET /api/quickbooks/auth?clientId=<id>&returnTo=dashboard`.

2. **Auth route** (`app/api/quickbooks/auth/route.ts`)  
   Builds state `{ clientId, returnTo }`, calls `oauthClient.authorizeUri()` with scopes `Accounting` and `OpenId`, redirects browser to Intuit.

3. **Callback** (`app/api/quickbooks/callback/route.ts`)  
   Intuit redirects with `code`, `state`, `realmId`.  
   - Parses `state` for `clientId` and `returnTo`.  
   - Exchanges `code` via `oauthClient.createToken(request.url)`.  
   - Upserts `qbo_tokens` (client_id, company_id, access_token, refresh_token, expires_at).  
   - Inserts into `client_qbo_connections` (client_id, company_id, realm_id, status `'connected'`, connected_at).  
   - Redirects to:
     - `NEXT_PUBLIC_URL/admin/dashboard?connected=true` if `returnTo === 'dashboard'`, else  
     - `NEXT_PUBLIC_URL/admin/clients/add?connected=true`.  
   On error, redirects with `?error=connection_failed`.

4. **Using QBO data**  
   Dashboard loads clients from Supabase (with `client_qbo_connections`). For a client with a connection, it calls `GET /api/quickbooks/customer?clientId=...&customerId=...&companyId=...&timeFrame=...`.  
   The customer API route loads token from `qbo_tokens`, refreshes if expired, then queries QBO `Customer` and returns customer + placeholder invoice/payment structure.

---

## 6. Environment Variables (Referenced in Code)

| Variable | Used In | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase usage | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase, fallback in some API routes | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes (callback, customer, clients) | Server-side DB with elevated privileges |
| `QBO_CLIENT_ID` | QuickBooks auth/callback/customer | Intuit app client ID |
| `QBO_CLIENT_SECRET` | QuickBooks auth/callback/customer | Intuit app client secret |
| `QBO_REDIRECT_URI` | QuickBooks auth/callback | OAuth redirect (must match Intuit app config) |
| `QBO_ENVIRONMENT` | Callback (hardcoded `production` in auth), customer route | `'production'` or sandbox |
| `NEXT_PUBLIC_URL` | Callback redirects | Base URL for redirects after OAuth |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | AdminAuth | Admin panel password (optional; fallback `primecfo2024`) |

No `.env.example` was found; these should be documented and kept out of version control.

---

## 7. UI / Theming

- **Root layout** (`app/layout.tsx`): Geist and Geist Mono fonts, default metadata “Create Next App”.
- **Global CSS** (`app/globals.css`): Tailwind 4 with `@import "tailwindcss"`; CSS variables for background/foreground; dark mode via `prefers-color-scheme`.
- **Connect/Disconnect pages**: Dark theme `#0a0a0f`, emerald accent, PrimeCFO.ai branding, links to `/privacy` and `/eula`.
- **Admin (dashboard, add client)**: Light theme (gray/white), blue accents, standard form and table styling.

---

## 8. Notable Implementation Details

- **Dual client-creation APIs:** `POST /api/clients` (saves `qbo_customer_id` on client) vs `POST /api/clients/add` (does not). Add Client form uses `POST /api/clients`; any use of `/api/clients/add` will not store `qbo_customer_id` on the client row.
- **Callback connection row:** Uses `.insert()` for `client_qbo_connections` (no upsert). If the same client/company is reconnected, duplicate rows or constraint errors may occur unless DB has a unique constraint and upsert is used.
- **Customer API:** Uses a generic `select * from Customer`; `customerId`/`companyId` from query params are not yet used to filter the single customer in the response (returns first customer). Dashboard still passes `customerId` and `companyId` for future use.
- **Connect/Disconnect pages:** Intended for a “global” connect/disconnect experience but point to non-existent `/api/auth/quickbooks` and `/api/auth/quickbooks/disconnect`. Current working flow is per-client from Add Client or Dashboard.

---

## 9. Summary of What Was Done (Features Implemented)

1. **Next.js app** — App Router, TypeScript, Tailwind 4, ESLint.
2. **Supabase** — Client and QBO connection data stored in `clients`, `client_qbo_connections`, `qbo_tokens`.
3. **Client CRUD** — Create client via form; optional `qbo_customer_id`; optional QBO connection and token placeholder when `qbo_company_id` is provided.
4. **QuickBooks OAuth** — Initiate (with clientId + returnTo), callback (tokens + connection row), token refresh in customer API.
5. **Admin dashboard** — Password-protected; client dropdown; per-client overview, treasury, assets, transactions, analytics, documents, alerts, notes; “Connect QuickBooks” and “Open in QuickBooks” links; notes editable and saved to `clients`.
6. **Add Client flow** — Form → create client → optional “Connect QuickBooks” → redirect to QBO auth → callback back to add or dashboard.
7. **Public pages** — Connect and Disconnect QuickBooks (UI only; API paths wrong or missing), Privacy and EULA.
8. **TypeScript** — `intuit-oauth` module declaration so OAuth client is typed across the app.

---

## 10. Recommendations

1. **Fix Connect page:** Point “Connect to QuickBooks” to an endpoint that either redirects to `/api/quickbooks/auth` with a chosen/default client, or implement a dedicated flow (e.g. create a “global” or “my company” connection) and corresponding `/api/quickbooks/auth` behavior.
2. **Implement disconnect:** Add `POST /api/quickbooks/disconnect` (or `/api/auth/quickbooks/disconnect`) that revokes the token with Intuit, then updates or deletes `client_qbo_connections` and `qbo_tokens` for the relevant client/company. Update disconnect page to call it (and pass client/connection identifier if multi-connection).
3. **Align client creation:** Prefer a single endpoint (e.g. `POST /api/clients`) and ensure it always persists `qbo_customer_id` when provided; deprecate or remove duplicate logic in `POST /api/clients/add`.
4. **Callback connection upsert:** Use Supabase upsert (e.g. on `client_id` + `company_id`) for `client_qbo_connections` in the callback to avoid duplicates on re-auth.
5. **Customer API:** Filter QBO Customer by ID when `customerId` is provided (e.g. `query=select * from Customer where Id = '<id>'`) so dashboard shows the correct customer.
6. **Admin clients list:** Add `app/admin/clients/page.tsx` (or redirect `/admin/clients` to dashboard) so “Back to clients” from Add Client does not 404.
7. **Security:** Remove hardcoded admin password fallback; require `NEXT_PUBLIC_ADMIN_PASSWORD` in production. Consider moving admin auth to Supabase Auth or a proper session.
8. **Docs:** Add `.env.example` with all required variables (no secrets) and update README with setup, Supabase schema outline, and QBO app configuration steps.

This document reflects the state of the codebase as of the analysis date. For schema details, run Supabase migrations or inspect the project in the Supabase dashboard.
