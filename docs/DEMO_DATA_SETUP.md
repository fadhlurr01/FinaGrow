# FINAGROW — Demo Database Setup & Seeding Guide

This guide describes the architecture and execution procedures for seeding the FINAGROW enterprise demo dataset into local PostgreSQL and remote Supabase PostgreSQL databases.

---

## 1. Multi-Tenant Architecture & Isolation Principles

FINAGROW enforces strict multi-tenant isolation via database-level partitioning:
- **Demo Organization:** `Berkah Cahaya Group Corp` (`slug: berkah-cahaya-group`).
- **Demo Entities:**
  - `BC` (BellCorp Indonesia) — Base Currency `IDR`
  - `OB` (OptiBiz Global) — Base Currency `USD`
- **Demo Users:**
  - `demo_admin@fms.com` / `123456` (Role: `ADMIN`)
  - `demo_user@fms.com` / `123456` (Role: `ACCOUNTANT`)
  - `demo@fms.com` / `123456` (Role: `ADMIN`)
  - `admin@finagrow.com` / `123456` (Role: `OWNER`)
- **Real Registrations:** Any user registering via `/register` creates a **NEW isolated Organization**, **NEW Entity**, and starts with **strictly 0 business records** (0 COA accounts, 0 transactions, 0 invoices, etc.) under the **FREE** plan.

> **CRITICAL RULE:** Real registrations NEVER trigger automatic seeding. Demo data resides exclusively in PostgreSQL/Supabase under the designated demo organization ID.

---

## 2. Demo Dataset Contents

When seeded, the demo organization receives:
- **35 Chart of Accounts** (13 Assets, 5 Liabilities, 2 Equity, 5 Revenue, 10 Expenses).
- **Opening & Operational Journal Entries** with mathematically balanced debits and credits.
- **Customers & Sales Invoices** with line items and double-entry integration.
- **Vendors, Purchase Orders & Vendor Bills**.
- **Cash & Bank Accounts** with transaction logs.
- **Multi-Warehouse Inventory Items & Valuations**.
- **Fixed Assets with Automated Depreciation Schedules**.
- **Tax Codes, Transactions & Monthly Reconciliation Periods**.
- **Departmental Budgets & Multi-entity Projects**.
- **Payroll Employees & Periodical Payroll Runs**.

---

## 3. How to Run Demo Seed

### A. Local Development Environment
Ensure your local PostgreSQL database is running and `DATABASE_URL` is set in `backend/.env`.

```bash
cd backend
npx prisma db seed
```
Or:
```bash
cd backend
npx ts-node prisma/seed.ts
```

### B. Remote Supabase Production/Staging Environment
To seed the demo organization dataset to your Supabase PostgreSQL instance:

```bash
cd backend
# Set DATABASE_URL or DIRECT_URL to your Supabase connection string
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true" DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" npx prisma db seed
```

> **Note:** The seed script is completely **idempotent**. It uses Prisma `upsert` and deterministic unique keys (`entityId_code`, `slug`, `email`). Running it multiple times will NOT produce duplicate accounts or transactions.

---

## 4. Cleaning a Contaminated Test Tenant (Development Only)

If a developer previously created a test account with dummy or old data and wants to purge its records without deleting the demo organization:

```bash
cd backend
TARGET_ORG_ID="<ORGANIZATION_UUID>" CONFIRM_PURGE="YES" npx ts-node scripts/cleanup-test-tenant.ts
```

*(The script automatically refuses to run against the demo organization).*
