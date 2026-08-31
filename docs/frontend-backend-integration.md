# FINAGROW — Frontend-to-Backend Integration Architecture

## 1. Architectural Principles

All persistent business domains in FINAGROW follow a strict layered pipeline:

```
[ React 18 UI Component ]
        │
        ▼ (Typed payload & response)
[ Frontend API Service (src/services/api/*.ts) ]
        │
        ▼ (HTTP REST with Bearer Token & Tenant Headers)
[ NestJS Controller (backend/src/*/*.controller.ts) ]
        │  ├── @UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
        │  └── ValidationPipe (DTOs with class-validator)
        ▼
[ NestJS Domain Service (backend/src/*/*.service.ts) ]
        │  ├── Business Invariants & Math (Decimal.js)
        │  ├── Multi-Tenant & Multi-Entity Scoping (WHERE organizationId = :orgId)
        │  └── Audit Log Generation (AuditService)
        ▼
[ Prisma ORM & PostgreSQL 16 ]
```

---

## 2. Standard Client API Pattern

Every module exports a dedicated typed API client located in `src/services/api/<module>Api.ts` leveraging the unified `apiClient` helper from `src/services/api/client.ts`.

### Example: Budgeting API Client (`src/services/api/budgetingApi.ts`)
```typescript
import { apiClient } from './client';

export const budgetingApi = {
  getBudgets: (filter?: { entityId?: string; period?: string }) => { ... },
  createBudget: (dto: CreateBudgetDto) => apiClient<Budget>('/budgets', { method: 'POST', body: JSON.stringify(dto) }),
  updateBudget: (id: string, dto: UpdateBudgetDto) => apiClient<Budget>(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteBudget: (id: string) => apiClient<{ success: boolean }>(`/budgets/${id}`, { method: 'DELETE' }),
};
```

---

## 3. Security & Multi-Tenant Enforcement

1. **Authentication:**
   - Handled via `SessionAuthGuard` extracting user session from bearer token / cookies.
2. **Tenant Isolation:**
   - Enforced via `@CurrentTenant('id') organizationId: string` and `TenantGuard`.
   - Every database query specifies `where: { organizationId }` to ensure zero cross-tenant leakage.
3. **Entity Scope:**
   - Multi-branch accounting operates under `entityId` parameters, ensuring sub-ledgers and journals match the selected business unit.
4. **Role-Based Access Control (RBAC):**
   - Endpoints are gated by `@Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)`.
   - Sensitive operations (deleting entities, changing subscription, modifying team roles) are strictly reserved for `OWNER` and `ADMIN`.

---

## 4. Error Handling & State Lifecycle Standards

- **Zero Silent Fallbacks:** If an API call fails, the UI displays clear, contextual error banners or alerts to the user.
- **Empty States:** When a list is empty, a clean empty state card with quick-action creation buttons is rendered.
- **Loading Indicators:** Spinners or disable-states during asynchronous mutations prevent double-submission.
- **Persistence Guarantees:** Page refreshes consistently reload accurate, live state directly from PostgreSQL.
