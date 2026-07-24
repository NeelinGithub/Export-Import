# Exim Doc Pro

> A multi-tenant, AI-assisted documentation, quoting, and shipment-management platform for Indian export businesses.

Exim Doc Pro is a full-stack web application that helps exporters build accurate rate sheets, generate commercial invoices and packing lists, manage buyer enquiries, track shipments, and collaborate across teams. It supports **19 commodity modules** (grains, sugar, spices, RCN, oil, chemicals, tiles, and more) with industry-specific calculators, while sharing a common workflow for approvals, payments, and container tracking.

The project is deployed on **Oracle Cloud Infrastructure (OCI)** via a Docker image built in GitHub Actions. All data is persisted in **Firebase / Firestore** with multi-tenant isolation enforced by security rules.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Environment Variables](#environment-variables)
  - [Available Scripts](#available-scripts)
- [Industry Modules](#industry-modules)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [AI Features (Gemini)](#ai-features-gemini)
- [Firestore Security Rules](#firestore-security-rules)
- [Deployment (OCI)](#deployment-oci)
- [Project Conventions](#project-conventions)
- [License](#license)

---

## Features

### Quoting & Documentation
- **Per-industry rate calculators** with a unified React component interface
- **CFS / Transport cost builders** that auto-apply to FCL or per-bill-of-lading
- **Bag pricing & inventory** with supplier lead-times and PI deductions
- **Quote / Proforma Invoice (PI) generators** with HTML preview, PDF export, and revision tracking
- **Commercial Invoice & Packing List** rendering for final shipment
- **HS Code lookup** (cached locally + synced from Firestore) for accurate customs classification
- **Doha import cost builder** with duty & FCL math for re-exports via Qatar

### Shipment Management
- **Document workflow** with PI approval, file uploads (chunked), and stage-by-stage audit trail
- **Container tracking** with B/L-based lookup, ETA, and location updates
- **Payment tracker** (expected / received, FX rate at shipment vs. payment, overdue alerts)
- **Checklist engine** for document completeness per shipment

### Inventory & Operations
- **Grain inventory** — paddy stock, processed rice, milling process types, silo / bag split
- **Inventory orders** — pending / in-transit / received status with expected delivery
- **Inventory manager** dashboard for rice millers

### Tenant & Licensing
- **Licence (tenant) management** — each export business gets its own workspace (`tenantId`)
- **User membership** mapping — Google sign-in users are linked to one or more tenants
- **Owner / member role** distinction; admin email override
- **Onboarding flow** that picks the right industry module on first login

### Intelligence & Marketing
- **Trade Intelligence** — port/commodity signals
- **Vessel Schedule Explorer** — shipping line & route lookups
- **AI-driven audit, goods description, cover letter, and packaging suggestions** via Google Gemini
- **Auto-import** — parse buyer emails into structured line items
- **Marketing materials** (posters, social-rate boards, public landing page)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React 19 SPA, Vite, Tailwind v4)               │
│  - 19 industry modules share 4 base components           │
│  - Local persistence via localStorage + IndexedDB cache  │
│  - Realtime sync via Firestore onSnapshot                │
└──────────────────────────────────────────────────────────┘
                │                              │
                │ /api/gemini/* (Gemini)       │ Firestore SDK
                │ /api/admin/notify-* (SMTP)   │
                ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│  Express + Vite SSR      │    │  Firebase / Firestore   │
│  server.ts (tsx in dev,  │    │  - user_memberships     │
│  esbuild bundle in prod) │    │  - licences             │
└──────────────────────────┘    │  - tenant_profiles      │
                │               │  - quotes               │
                │ Docker        │  - hs_codes             │
                ▼               │  - uploaded_files       │
        OCI Container Instance  └─────────────────────────┘
```

- **Frontend** is a Vite + React 19 SPA. The same Vite dev server is mounted as Express middleware in dev for HMR-free development.
- **Backend** is a minimal Express server (`server.ts`) that hosts the Gemini proxy, admin email notifications, and serves the built static bundle in production.
- **Persistence** is fully serverless on Firestore. No SQL database.
- **Auth** is Google Sign-In via Firebase Auth; access tokens are cached for the session.

---

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| UI           | React 19, Tailwind CSS v4, Motion (Framer), Lucide icons, Recharts |
| Build        | Vite 6, esbuild, tsx |
| Backend      | Express 4, TypeScript, Node.js 22 |
| Auth         | Firebase Auth (Google Sign-In) |
| Database     | Firestore (with `persistentLocalCache` + `persistentMultipleTabManager`) |
| AI           | Google Gemini via `@google/genai` (server-side proxy) |
| Email        | Nodemailer (SMTP, falls back to Ethereal for previews) |
| Maps         | `@vis.gl/react-google-maps` (with `GOOGLE_MAPS_PLATFORM_KEY`) |
| Export       | jsPDF, html2canvas, html-to-image, QRCode |
| Deploy       | Docker → OCIR → OCI Container Instance (via GitHub Actions) |

---

## Repository Structure

```
exim-doc-pro/
├── server.ts                     # Express server (Gemini, SMTP, static)
├── index.html                    # Vite entry
├── package.json
├── tsconfig.json
├── vite.config.ts
├── firebase-applet-config.json   # Firebase web client config
├── firebase-blueprint.json       # Firestore schema reference
├── firestore.rules               # Production security rules
├── .github/workflows/deploy.yml  # OCI deploy pipeline
│
├── public/                       # Static assets & downloadable source archives
│
└── src/
    ├── main.tsx                  # React root
    ├── App.tsx                   # Top-level router / state
    ├── firebase.ts               # Firestore init + error handling
    ├── storage.ts                # localStorage persistence
    ├── utils.ts                  # Date, currency, string helpers
    ├── constants.ts              # Seed data (commodities, ports, terms…)
    ├── types.ts                  # Shared TypeScript interfaces
    ├── ModuleLoader.ts           # Per-industry component registry
    │
    ├── components/               # Shared UI (Sidebar, Settings, Auth, …)
    │   ├── AuthScreen.tsx
    │   ├── Sidebar.tsx
    │   ├── DashboardView.tsx
    │   ├── DocumentWorkspace.tsx
    │   ├── DocumentDrive.tsx
    │   ├── PaymentTracker.tsx
    │   ├── ContainerTracker.tsx
    │   ├── TradeIntelligence.tsx
    │   ├── ProfitLossMetrics.tsx
    │   ├── RateListBoard.tsx
    │   ├── SocialRateBoard.tsx
    │   ├── MarketingMaterials.tsx
    │   ├── LandingPage.tsx
    │   ├── OnboardingFlow.tsx
    │   ├── LicenceManager.tsx
    │   ├── OtpSecurityGate.tsx
    │   ├── BackupReminder.tsx
    │   ├── … and more
    │
    ├── modules/                  # 19 industry-specific modules
    │   ├── grain/
    │   ├── sugar/
    │   ├── spices/
    │   ├── salts/
    │   ├── rcn/                  # Raw Cashew Nuts
    │   ├── nuts/
    │   ├── chemicals/
    │   ├── tiles/
    │   ├── vegetables_fruits/
    │   ├── cotton_yarn/
    │   ├── coffee_tea/
    │   ├── timber/
    │   ├── metal/
    │   ├── oil/
    │   ├── pharma/
    │   ├── apparel/
    │   ├── air_cargo/
    │   ├── packaging/
    │   └── generic/
    │       └── (each module exports RateCalculator,
    │        CfsTransport, BagPriceAndStock, QuoteSheet)
    │
    ├── services/
    │   └── db.ts                 # Firestore queries, subscriptions, batches
    │
    └── utils/
        ├── hscode.ts             # HS code resolution
        ├── portsDatabase.ts      # Built-in port directory
        ├── currency.ts
        ├── customPrompt.ts
        ├── location.ts
        └── backup.ts
```

> The `scripts/` directory in this repo contains one-off migration / patch helpers used during early development. They are excluded from version control and not required to run the app.

---

## Getting Started

### Prerequisites

- **Node.js 20+** (project is tested on Node 22)
- **npm** (or pnpm / bun — `package-lock.json` is included)
- A **Firebase project** with Authentication (Google provider) and Firestore enabled
- A **Google Gemini API key** for AI features

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/exim-doc-pro.git
cd exim-doc-pro

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env.local
# …then fill in the values (see below)

# 4. Make sure your Firebase project has Authentication (Google) and
#    Firestore enabled, then deploy the security rules:
firebase deploy --only firestore:rules   # or paste firestore.rules manually

# 5. Run the dev server (Express + Vite middleware)
npm run dev
```

Open http://localhost:3000.

### Environment Variables

The server reads these from `.env.local` (or your hosting platform):

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key. Server-side only — never expose to the client. |
| `APP_URL` | No | Public URL of the deployment. Used for self-referential links. |
| `ADMIN_EMAIL` | No | Email granted admin bypass in Firestore rules. Defaults to the hard-coded value. |
| `SMTP_HOST` | No | SMTP server hostname. If unset with `SMTP_USER` / `SMTP_PASS`, the join-notification flow falls back to an **Ethereal** test inbox. |
| `SMTP_PORT` | No | SMTP port. Defaults to `587`. |
| `SMTP_USER` | No | SMTP username. |
| `SMTP_PASS` | No | SMTP password. |
| `GOOGLE_MAPS_PLATFORM_KEY` | No | Injected at build-time for the Vessel Schedule Explorer map. |
| `PORT` | No | Express port. Defaults to `3000`. |

> **Never commit `.env.local`.** It is already covered by `.gitignore`.

### Available Scripts

```bash
npm run dev      # Run server.ts with tsx (Express + Vite middleware)
npm run build    # Build client (vite build) and bundle server (esbuild → dist/server.cjs)
npm run start    # Run the production bundle (NODE_ENV=production node dist/server.cjs)
npm run preview  # Vite preview server (static build only, no API)
npm run clean    # Remove dist/ and server.js
npm run lint     # tsc --noEmit (type-check only)
```

---

## Industry Modules

Every module under `src/modules/<industry>/` exports the same four components, allowing the app to swap its workflow per tenant:

| Component            | Responsibility |
|----------------------|----------------|
| `<Industry>RateCalculator`  | Build the rate line: ex-mill, packing, transport, freight, margin |
| `<Industry>CfsTransport`    | CFS / CHA charges, transport from mill to port |
| `<Industry>BagPriceAndStock`| Brand × size pricing and live warehouse stock |
| `<Industry>QuoteSheet`      | Render the final quote / PI / invoice in HTML |

The 19 supported industries are: `grain`, `sugar`, `spices`, `salts`, `rcn`, `nuts`, `chemicals`, `tiles`, `vegetables_fruits`, `cotton_yarn`, `coffee_tea`, `timber`, `metal`, `oil`, `pharma`, `apparel`, `air_cargo`, `packaging`, `generic`.

---

## Multi-Tenancy Model

A **tenant** is one export business. The flow is:

1. A user signs in with Google (Firebase Auth).
2. `getOrCreateUserMembership` (in `src/services/db.ts`) creates a `user_memberships/{uid}` document with a `tenantId` (a licence key).
3. All tenant-scoped data — commodities, stocks, rates, quotes — is namespaced by `tenantId`:
   - `tenant_profiles/{tenantId}` — shared configuration
   - `quotes/{quoteId}` — every saved quote carries a `tenantId` field
4. `firestore.rules` enforces the isolation: a non-admin user can only read/write documents whose `tenantId` matches their own.
5. A user can be a member of multiple tenants (e.g. an agent handling two mills) via `companyATenantId` / `companyBTenantId`.

Public buyer tracking uses `public_tracking/{blNo}` with `allow get` open by B/L code but `allow list: false` to prevent enumeration.

---

## AI Features (Gemini)

The Express server exposes a single endpoint, `POST /api/gemini/analyze`, with a `mode` discriminator:

| Mode                    | Use case |
|-------------------------|----------|
| `audit`                 | Audit an in-progress invoice / PI for compliance gaps |
| `goods_description`     | Generate a customs-grade "Description of Goods" string |
| `cover_letter`          | Draft a shipping cover letter to the buyer |
| `packaging_suggestions` | Suggest packaging categories, sizes, and market prices |
| `auto_import`           | Parse a buyer email / RFQ into structured line items |

The Gemini key is server-side only — the client never sees it.

---

## Firestore Security Rules

`firestore.rules` implements:

- **Default-deny** catch-all on the database.
- `isAdmin()` checks both the `email` claim and a `user_memberships/{uid}` lookup.
- `isValidId()` restricts document IDs to alphanumerics + `_-:.@`.
- Per-collection rules for `user_memberships`, `licences`, `tenant_profiles`, `quotes`, `public_tracking`, `user_logins`, `document_generations`, `hs_codes_*`, and `uploaded_files`.
- Read/write isolation by `tenantId` for tenant-scoped collections.

Deploy with:

```bash
firebase deploy --only firestore:rules
```

---

## Deployment (OCI)

The repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds a Docker image on every push to `main`, pushes it to **Oracle Cloud Infrastructure Registry (OCIR)**, and force-restarts the OCI Container Instance to pull the new `:latest` tag.

Required GitHub secrets:

| Secret | Purpose |
|--------|---------|
| `OCI_REGISTRY_URL`     | e.g. `lhr.ocir.io` |
| `OCI_TENANCY_NAMESPACE`| OCIR tenancy namespace |
| `OCI_USERNAME`         | OCIR username |
| `OCI_AUTH_TOKEN`       | OCIR auth token |
| `OCI_REPO_NAME`        | OCIR repository name |
| `OCI_USER_OCID`        | OCI user OCID |
| `OCI_FINGERPRINT`      | API key fingerprint |
| `OCI_TENANCY_OCID`     | OCI tenancy OCID |
| `OCI_REGION`           | e.g. `us-ashburn-1` |
| `OCI_PRIVATE_KEY`      | API key PEM contents |
| `OCI_CONTAINER_INSTANCE_ID` | OCID of the running container instance |

A `Dockerfile` is required at the repo root to use this pipeline. It is intentionally not committed — drop in a minimal one based on `node:22-alpine` and `npm run build` / `npm run start` if you want to use the workflow as-is.

---

## Project Conventions

- **TypeScript everywhere** (frontend + server). The build emits no JS until `npm run build`.
- **Tailwind v4** is loaded via the Vite plugin (`@tailwindcss/vite`) — no `tailwind.config.js` is needed.
- **State management** is `useState` + `useEffect` with explicit localStorage hydration. No Redux / Zustand.
- **Realtime sync** uses Firestore `onSnapshot` subscriptions, wired in `src/services/db.ts`.
- **Self-healing presets** — `src/storage.ts` merges newly-shipped default commodities / ports / conditions into existing local data without overwriting user edits.
- **Path alias** — `@/*` resolves to the project root (`tsconfig.json` + `vite.config.ts`).
- **Print styles** are scoped to `.no-print` and `.page-number-text` in `src/index.css`.

---

## License

Private / unlicensed unless a `LICENSE` file is added. Add one before publishing to a public repository.
