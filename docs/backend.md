# FINAGROW Backend Architecture & Development Guide
**Document Version:** 1.0.0 (Phase 1)  
**Framework:** NestJS (Node.js + TypeScript)  
**Directory:** `backend/`

---

## 1. Overview

The FINAGROW backend is a modular NestJS REST API designed to serve as the core transactional engine for the financial platform. It provides:
- Secure session-based authentication with HttpOnly cookies.
- Strong password hashing (bcrypt / Argon2).
- Role-Based Access Control (RBAC) and Multi-Tenant Organization Isolation.
- Prisma ORM database abstraction layer for PostgreSQL.
- Server-side AI proxy interfacing with Google Gemini 2.5 Flash without exposing API credentials to the browser.
- Immutable audit logging for governance and compliance.

---

## 2. Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # PostgreSQL schema with UUIDs & relations
│   └── seed.ts             # Initial development database seeder
│
├── src/
│   ├── ai/                 # Gemini AI Assistant secure proxy & audit logs
│   ├── audit/              # Centralized immutable audit logging service
│   ├── auth/               # Registration, Login, Logout, SessionGuard
│   ├── common/             # Interceptors, Filters, Decorators, Guards
│   │   ├── decorators/     # @Roles, @CurrentUser, @CurrentTenant
│   │   ├── filters/        # Global HttpExceptionFilter
│   │   ├── guards/         # RolesGuard, TenantGuard
│   │   ├── interceptors/   # Standard TransformInterceptor envelope
│   │   └── interfaces/     # ApiResponse interface
│   ├── config/             # Environment configuration factory
│   ├── entities/           # Corporate branch & subsidiary management
│   ├── organizations/      # Multi-tenant organization boundaries
│   ├── prisma/             # Global PrismaService lifecycle manager
│   ├── users/              # User queries and sanitization
│   ├── app.module.ts       # Root NestJS application module
│   └── main.ts             # Application bootstrapper with CORS & Pipes
│
├── .env.example            # Environment template with zero committed secrets
├── package.json            # Backend dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

---

## 3. Getting Started & Running Locally

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database instance (local or Docker container)

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your PostgreSQL database URL and optional `GEMINI_API_KEY`:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finagrow_db?schema=public"
SESSION_SECRET="your-secure-session-secret-min-32-characters"
GEMINI_API_KEY="your-gemini-api-key-here"
```

### Step 2: Install Dependencies
```bash
cd backend
npm install
```

### Step 3: Run Database Migrations & Seed
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### Step 4: Start the Backend Server
```bash
# Development Mode with Hot Reload
npm run start:dev

# Production Build & Run
npm run build
npm run start:prod
```
The server will start on `http://localhost:4000/api/v1`.

### Step 5: Run Automated Tests
```bash
npm test
```
