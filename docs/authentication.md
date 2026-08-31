# FINAGROW Secure Authentication Specification
**Document Version:** 1.0.0 (Phase 1)  
**Security Level:** Enterprise Grade (Zero-Trust Session Architecture)  

---

## 1. Authentication Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as NestJS AuthController
    participant AuthSvc as AuthService
    participant DB as PostgreSQL (Users & Sessions)
    participant Audit as AuditService

    Note over User,DB: Registration Flow
    User->>API: POST /api/v1/auth/register { email, password, fullName, orgName }
    API->>AuthSvc: Validate DTO & hash password with bcrypt (cost 10)
    AuthSvc->>DB: Atomic Transaction: User + Org + Member(OWNER) + Entity + Session
    AuthSvc->>Audit: Log USER_REGISTERED
    AuthSvc-->>API: Return User profile & raw 32-byte crypto token
    API-->>User: Set-Cookie: finagrow_session=<token>; HttpOnly; SameSite=Lax; Path=/

    Note over User,DB: Login Flow
    User->>API: POST /api/v1/auth/login { email, password }
    API->>AuthSvc: Look up user by email & bcrypt.compare
    AuthSvc->>DB: Create Session record (token_hash, expires_at: +30d)
    AuthSvc->>Audit: Log USER_LOGIN
    API-->>User: Set-Cookie: finagrow_session=<token>; HttpOnly
    API-->>User: Return 200 OK { user, activeOrganization, activeRole }

    Note over User,DB: Session Verification Flow (Guarded Routes)
    User->>API: GET /api/v1/auth/me (Cookie attached automatically)
    API->>API: SessionAuthGuard: Hash cookie token -> Find in sessions table
    API->>DB: Fetch user profile & active memberships
    API-->>User: Return 200 OK { user }

    Note over User,DB: Logout Flow
    User->>API: POST /api/v1/auth/logout
    API->>DB: DELETE session record from database
    API->>Audit: Log USER_LOGOUT
    API-->>User: Clear-Cookie: finagrow_session; Return 200 OK
```

---

## 2. Key Security Principles Implemented

1. **HttpOnly Cookie Policy:**
   Session tokens are stored exclusively in HttpOnly cookies with `SameSite=Lax` and `Path=/`. JavaScript running in the browser cannot access or read the cookie value, mitigating Cross-Site Scripting (XSS) session theft.
2. **Hashed Database Tokens:**
   The database never stores the raw session token. It stores `token_hash = SHA256(rawToken)`. Even if the database were dumped, active sessions cannot be spoofed.
3. **Password Security:**
   Passwords are hashed using `bcrypt` with salt rounds = 10. Plaintext passwords never leave the request cycle.
4. **Zero-Trust Client Roles:**
   User roles are never read from client storage. Every guarded API request looks up the user's role directly from `organization_members` in the database.
5. **Session Revocation:**
   Logging out deletes the session row from PostgreSQL, invalidating the session immediately across all devices.
