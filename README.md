# FINAGROW — Multi-Entity Financial Management System

FINAGROW is an enterprise financial management and accounting platform built for multi-tenant, multi-entity corporate consolidation.

## Architecture

```
[ React 18 Frontend (Vite + TypeScript) ]
                │
                ▼ (Typed REST API Layer: src/services/api/*.ts)
[ NestJS 10 Backend (Modular Controllers & Services) ]
                │
                ▼ (Prisma ORM Client v6)
[ PostgreSQL 16 Database (Multi-Tenant & Multi-Entity) ]
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18+ or v20+
- **PostgreSQL**: v15+ or v16+
- **npm** or **pnpm**

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and adjust your PostgreSQL DATABASE_URL
cp .env.example .env

# Generate Prisma Client & apply migrations
npx prisma generate
npx prisma migrate dev

# (Optional) Seed development database with initial accounts and master data
npm run seed

# Start NestJS development server (Runs on http://localhost:4000)
npm run start:dev
```

---

### 2. Frontend Setup

```bash
# From root directory
npm install

# Start Vite development server (Runs on http://localhost:5173)
npm run dev
```

---

### 3. Testing & Verification

```bash
# Backend test suite (17 suites / 121 tests)
cd backend
npx jest

# Backend TypeScript compilation check
npx tsc --noEmit

# Frontend production build check
cd ..
npm run build
```

---

### 4. Production Deployment

```bash
# Build frontend bundle (dist/)
npm run build

# Build backend bundle (backend/dist/)
cd backend
npm run build

# Start production server
node dist/main.js
```

---

## Health Check

- **URL:** `http://localhost:4000/api/v1/health`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-08-31T06:07:00.000Z",
    "version": "2.0.0"
  }
  ```

---

## Documentation

- [FINAL_E2E_MATRIX.md](docs/FINAL_E2E_MATRIX.md) — 22-Module Master E2E Verification Matrix
- [SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) — Single Source of Truth Specification
- [DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md) — Production Deployment Guide
- [LEGACY_CLEANUP_AUDIT.md](docs/LEGACY_CLEANUP_AUDIT.md) — Audit of Legacy Storage & Context
