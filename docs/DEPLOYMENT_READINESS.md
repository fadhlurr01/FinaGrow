# FINAGROW — Deployment Readiness & Production Guide

**Infrastructure, Environment & Operational Runbook**  
*Date:* August 31, 2026  
*Version:* 2.0.0

---

## 1. System Architecture Overview

```
[ Client Browser ]
        │
        ▼ (HTTPS / TLS 1.3)
[ Reverse Proxy (Nginx / Caddy / Cloudflare) ]
        │
        ├─── Static Assets (/) ──────────────► [ Frontend dist/ (Vite HTML/JS/CSS) ]
        │
        └─── API Requests (/api/v1/*) ──────► [ NestJS Backend (Node.js 18+) ]
                                                      │
                                                      ▼ (Connection Pool / Prisma)
                                              [ PostgreSQL 16 Database ]
```

---

## 2. Environment Variables

### Backend (`backend/.env`)
```bash
# Application Environment
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://app.finagrow.com

# Database Connection (PostgreSQL 16)
DATABASE_URL="postgresql://finagrow_user:SecurePassword123!@localhost:5432/finagrow_db?schema=public&connection_limit=20"

# Session & Security
SESSION_SECRET="super-secret-cryptographic-key-min-32-chars-long"
SESSION_TTL_HOURS=24
COOKIE_DOMAIN=".finagrow.com"
COOKIE_SECURE=true
COOKIE_SAME_SITE="lax"

# AI Integration (Optional / Server-side only)
GEMINI_API_KEY="your-google-gemini-api-key"
```

### Frontend (`.env.production`)
```bash
# REST API Endpoint
VITE_API_URL="https://api.finagrow.com/api/v1"
```

---

## 3. Database Initialization & Migrations

For production deployment:
```bash
# 1. Navigate to backend
cd backend

# 2. Install production dependencies
npm ci --only=production

# 3. Apply database migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. (Optional) Run initial seed for fresh database
npm run seed
```

> [!IMPORTANT]
> Never run `npx prisma db push` in production. Always apply verified migration files using `npx prisma migrate deploy`.

---

## 4. Building for Production

### Frontend
```bash
# Root directory
npm install
npm run build
# Output will be located in dist/
```

### Backend
```bash
cd backend
npm install
npm run build
# Output will be located in backend/dist/
```

---

## 5. Starting Production Services

```bash
# Start backend using compiled Node bundle
cd backend
node dist/main.js
# Or with PM2 / Docker
# pm2 start dist/main.js --name "finagrow-api"
```

---

## 6. Health & Liveness Probe

The system provides a standardized, unauthenticated health endpoint for load balancers and orchestrators:

- **Endpoint:** `GET /api/v1/health` (or `GET /health`)
- **Sample 200 OK Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-08-31T06:07:00.000Z",
  "version": "2.0.0"
}
```

---

## 7. Security Best Practices Checklist

- [x] **HttpOnly Session Cookies:** Authentication cookies are marked `HttpOnly`, `SameSite=Lax`, and `Secure=true` in production.
- [x] **Zero Client Secrets:** No database credentials, JWT secrets, or Gemini API keys are bundled into frontend assets.
- [x] **Tenant Scoping:** All database queries enforce tenant isolation via `SessionAuthGuard` and `TenantGuard`.
- [x] **CORS Whitelisting:** Backend only accepts credentials from the configured `FRONTEND_ORIGIN`.
- [x] **Audit Trail:** Critical operations are logged to the `audit_logs` table.
