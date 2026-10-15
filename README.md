# PayGate Backend — Transaction Engine & API Service

The core transactional engine of PayGate. Built with **Express**, **TypeScript**, **Drizzle ORM**, **PostgreSQL**, **Redis**, and **BullMQ**. It implements strict financial consistency, idempotency, rate limiting, and asynchronous webhook delivery.

---

## Table of Contents
1. [Core Architectural Modules](#core-architectural-modules)
2. [Financial Guarantees & Math Standards](#financial-guarantees--math-standards)
3. [The Payment State Machine](#the-payment-state-machine)
4. [Idempotency & Tamper Detection Engine](#idempotency--tamper-detection-engine)
5. [Rate Limiting & Quota Architecture](#rate-limiting--quota-architecture)
6. [Outbound HMAC-SHA256 Webhook Pipeline](#outbound-hmac-sha256-webhook-pipeline)
7. [Single-Process Worker Mode](#single-process-worker-mode)
8. [Database Models & Schemas](#database-models--schemas)
9. [REST API Reference](#rest-api-reference)
10. [Environment Variables](#environment-variables)
11. [Running Locally & Scripts](#running-locally--scripts)

---

## Core Architectural Modules

```
backend/src/
├── app.ts                          # Express application setup, security middlewares, CORS
├── index.ts                        # Server entrypoint & in-process worker initialization
├── components/
│   ├── auth/                       # Signup, login, logout, JWT cookies, Argon2 hashing
│   ├── payments/                   # Creation, manual capture, cancel, refund, stats aggregation
│   ├── refunds/                    # Full & partial refund issuance and ledger updates
│   ├── webhook-endpoints/          # Webhook registration, secret generation, sandbox receiver
│   ├── search/                     # Paginated multi-resource search (payments, refunds, audit logs)
│   ├── admin/                      # Merchant tier upgrading (free/paid) and user inspection
│   ├── system/                     # JSON telemetry, Prometheus registry, BullMQ queue stats
│   └── testing/                    # Test triggers and deterministic demo seeder
├── db/
│   ├── index.ts                    # PostgreSQL connection pool (node-postgres + Drizzle ORM)
│   ├── models/                     # Drizzle schema definitions (users, payments, refunds, webhooks, audit)
│   └── migrate.ts                  # Drizzle migration runner
├── lib/
│   ├── state-machine.ts            # Payment FSM transition rules & validator
│   ├── audit.ts                    # Immutable audit logging helper (logAudit)
│   ├── webhook-dispatcher.ts       # Transactional outbox webhook dispatcher
│   ├── bullmq.ts                   # BullMQ queue definitions and Redis connection
│   ├── processors/                 # Processor adapters (DummyProcessor, StripeProcessor)
│   ├── seed-demo.ts                # Deterministic startup seeder for Admin & Merchant
│   ├── metrics.ts                  # Prometheus metrics registry and custom counters
│   └── tracing.ts                  # OpenTelemetry NodeSDK distributed tracing
├── middlewares/
│   ├── auth.ts                     # JWT verification & role validation (admin/user)
│   ├── idempotency.ts              # Redis SHA-256 payload hashing & replay caching
│   ├── rate-limiter.ts             # Redis sliding-window ZSET rate limiter
│   └── quota.ts                    # Monthly transaction volume tier limiter
└── worker/
    ├── index.ts                    # Worker daemon orchestrator
    └── processors/
        ├── outbound-webhook.ts     # HMAC-SHA256 dispatcher with 5-attempt exponential backoff
        └── inbound-stripe.ts       # Inbound processor webhook reconciler
```

---

## Financial Guarantees & Math Standards

### Minor-Unit Currency Standard
All financial amounts are strictly stored, transmitted, and calculated as **positive integers representing minor currency units** (cents or paise):
- `1000` = ₹10.00 or $10.00
- `1099` = ₹10.99 or $10.99
- `50000` = ₹500.00 or $500.00

**Why?**
Using IEEE 754 floating-point numbers (`10.99`) causes rounding inaccuracies in JavaScript (e.g. `0.1 + 0.2 === 0.30000000000000004`). In PayGate:
- In `src/components/payments/schema.ts`, Zod enforces `amount: z.number().int().positive()`.
- Upstream processors (Stripe / Dummy) receive the integer minor unit directly, preventing double-multiplication bugs.

### Deterministic `.99` Decline Rule
To facilitate QA and end-to-end testing without external bank sandboxes:
- Entering an amount ending in `99` (e.g. `1099` = `₹10.99`) triggers a deterministic card decline in `DummyProcessor`.
- Checked via `Math.round(amount) % 100 === 99 || amount.toString().endsWith(".99")`.

---

## The Payment State Machine

All payment lifecycles are governed by an explicit Finite State Machine ([`src/lib/state-machine.ts`](file://src/lib/state-machine.ts)):

```
                     ┌───────────────────────┐
                     │requires_payment_method│
                     └──────────┬────────────┘
                                │
                                ▼
                     ┌───────────────────────┐
                     │      processing       │
                     └────┬─────────────┬────┘
                          │             │
        (Manual Capture)  │             │  (Automatic Capture)
                          ▼             ▼
       ┌───────────────────────┐   ┌───────────────────────┐
       │      authorized       │   │       succeeded       │
       └────┬─────────────┬────┘   └───────────┬───────────┘
            │             │                    │
  (Capture) │   (Cancel)  │                    │ (Refund)
            ▼             ▼                    ▼
       ┌─────────┐   ┌─────────┐          ┌─────────┐
       │succeeded│   │cancelled│          │refunded │
       └─────────┘   └─────────┘          └─────────┘
```

### Transition Matrix
- `requires_payment_method` → `["processing", "authorized", "succeeded", "failed", "cancelled"]`
- `processing` → `["authorized", "succeeded", "failed", "cancelled"]`
- `authorized` → `["processing", "succeeded", "cancelled"]`
- `succeeded` → `["refunded"]`
- `failed`, `cancelled`, `refunded` → **Terminal states** (no outgoing transitions)

---

## Idempotency & Tamper Detection Engine

Implemented in [`src/middlewares/idempotency.ts`](file://src/middlewares/idempotency.ts).

1. When a client sends a mutating request with header `Idempotency-Key: <key>`, the middleware:
   - Computes a SHA-256 hash of the request method, path, and stringified JSON body:
     ```ts
     const requestHash = crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
     ```
   - Checks Redis key `idemp:<userId>:<key>`.
2. **If Key Exists & Hash Matches (Replay)**:
   - Returns the cached HTTP status, headers, and response body immediately (<5ms).
   - Adds header `X-Cache-Lookup: HIT`.
   - **No database writes or payment processor charges occur.**
3. **If Key Exists & Hash Differs (Tamper Detection)**:
   - Rejects the request with `409 Conflict`:
     `"Idempotency key has already been used with a different request payload"`.
4. **If Key Does Not Exist (First Request)**:
   - Sets a temporary 60-second processing lock in Redis.
   - Proceeds through the route handler.
   - Intercepts `res.send()` upon completion and caches the final response in Redis for 24 hours.

---

## Rate Limiting & Quota Architecture

### Sliding-Window Rate Limiter
Implemented in [`src/middlewares/rate-limiter.ts`](file://src/middlewares/rate-limiter.ts):
- Uses Redis Sorted Sets (`ZSET`) where elements are request timestamps.
- Cleans up timestamps older than the sliding 60-second window:
  `ZREMRANGEBYSCORE key 0 (now - windowMs)`.
- Counts remaining entries: `ZCARD key`.
- If requests exceed limits (e.g. 10 req/min for free tier, 100 req/min for paid tier), returns `429 Too Many Requests` with standard RFC headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After`

### Tier Volume Quotas
Implemented in [`src/middlewares/quota.ts`](file://src/middlewares/quota.ts):
- Free Tier: Limited to `₹5,000.00` (500,000 minor units) transaction volume per month.
- Paid Tier: Limited to `₹500,000.00` (50,000,000 minor units) transaction volume per month.
- Redis key: `quota:<userId>:<YYYY-MM>`. Incremented only on successful HTTP 2xx completion.

---

## Outbound HMAC-SHA256 Webhook Pipeline

Implemented in [`src/lib/webhook-dispatcher.ts`](file://src/lib/webhook-dispatcher.ts) and [`src/worker/processors/outbound-webhook.ts`](file://src/worker/processors/outbound-webhook.ts):

1. **Transactional Enqueue**: During state transitions (payment succeeded, captured, refunded), `dispatchWebhookEvents` queries active endpoints and inserts pending records into `webhook_events`.
2. **BullMQ Job**: Enqueues job to BullMQ queue `outbound-webhooks`.
3. **Cryptographic Signature**: Computes standard `Stripe-Signature` header:
   ```
   t=<timestamp>,v1=<HMAC-SHA256(endpointSecret, "${timestamp}.${payload}")>
   ```
4. **Exponential Backoff**: If the destination server returns non-2xx or times out:
   - Job is retried up to **5 times** with exponential backoff (`1s, 2s, 4s, 8s, 16s`).
   - `webhook_events.lastError` and `webhook_events.attempts` are updated in PostgreSQL.
5. **Built-in Sandbox Receiver**:
   - `POST /api/v1/webhook-endpoints/sandbox-receiver/:id` verifies signatures using `crypto.timingSafeEqual` and logs successful receipts.

---

## Single-Process Worker Mode

In traditional microservices architectures, BullMQ background workers run on a separate server or process from the Express web server, doubling hosting costs.

PayGate supports running workers **inside the main Express process**:
- Governed by `RUN_WORKERS_IN_PROCESS=true` in `src/lib/env.ts`.
- In `src/index.ts`:
  ```ts
  if (env.RUN_WORKERS_IN_PROCESS) {
    logger.info("Starting in-process background workers...");
    startWorkers();
  }
  ```
- This allows deploying the entire backend, worker suite, and schedulers to a single container or basic web service instance (e.g. Render, Railway, AWS ECS).

---

## Database Models & Schemas

Defined using Drizzle ORM in `src/db/models/`:

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| `users` | Accounts & merchant settings | `id`, `email`, `password`, `role`, `tier`, `stripeCustomerId`, `createdAt` |
| `payments` | Core financial ledger | `id`, `userId`, `amount`, `currency`, `status`, `processor`, `captureMethod`, `metadata` |
| `refunds` | Refund records linked to payments | `id`, `paymentId`, `amount`, `currency`, `reason`, `status`, `createdAt` |
| `webhook_endpoints` | Registered merchant webhook targets | `id`, `userId`, `url`, `secret`, `isActive`, `description`, `createdAt` |
| `webhook_events` | Webhook delivery logs & payload store | `id`, `endpointId`, `eventType`, `payload`, `attempts`, `status`, `lastError` |
| `audit_logs` | Immutable audit trail | `id`, `userId`, `action`, `resourceType`, `resourceId`, `metadata`, `createdAt` |

---

## REST API Reference

### Authentication (`/api/v1/auth`)
- `POST /login`: Log in with email/password. Issues `token` and `refreshToken` HttpOnly cookies.
- `POST /signup`: Register a new user.
- `POST /logout`: Clear session cookies.
- `GET /me`: Returns the authenticated user session.

### Payments (`/api/v1/payments`)
- `POST /`: Create payment.
  - Headers: `Idempotency-Key` (recommended).
  - Body: `{ amount: 1000, currency: "inr", captureMethod: "automatic" | "manual", description?: string }`
- `GET /`: Search/list payments for the authenticated user.
- `GET /stats`: Real-time SQL aggregation (settled volume, hold volume, success rate, 7-day breakdown).
- `GET /:id`: Fetch payment details by ID.
- `POST /:id/capture`: Capture an `authorized` payment (supports full or partial capture `{ amount?: number }`).
- `POST /:id/cancel`: Cancel an `authorized` or `requires_payment_method` payment.

### Refunds (`/api/v1/refunds`)
- `POST /`: Issue full or partial refund.
  - Body: `{ paymentId: "uuid", amount?: number, reason?: string }`
- `GET /:id`: Fetch refund details.

### Webhook Endpoints (`/api/v1/webhook-endpoints`)
- `GET /`: List registered webhook endpoints.
- `POST /`: Register new webhook endpoint (`{ url: string, description?: string }`).
- `PATCH /:id`: Update endpoint (`{ url?, description?, isActive? }`).
- `DELETE /:id`: Delete endpoint.
- `GET /events`: Fetch latest 50 webhook delivery events.
- `POST /sandbox-receiver/:id`: Built-in sandbox endpoint that validates HMAC signatures.
- `POST /:id/test`: Trigger simulated test delivery (`{ mode: "success" | "fail_3_times" }`).

### Search & Audit (`/api/v1/search`)
- `GET /:resource?q=...&limit=10&offset=0&sort=desc`:
  - Resources: `payments`, `refunds`, `audit-logs`, `users` (admin only).
  - Sort: `desc` (newest first) or `asc` (oldest first).

### System & Telemetry (`/api/v1/system`)
- `GET /telemetry`: JSON metrics (BullMQ queue depths, Redis latency, Postgres latency, Prometheus counters).
- `GET /health`: Healthcheck.

---

## Environment Variables

All variables are validated at startup via Zod in [`src/lib/env.ts`](file://src/lib/env.ts):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://db_user:db_password@localhost:5432/my_database?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing auth tokens | Random 64-char string |
| `JWT_REFRESH_SECRET`| Secret for refresh tokens | Random 64-char string |
| `RUN_WORKERS_IN_PROCESS` | Run BullMQ workers in main process | `true` |
| `STRIPE_SECRET_KEY` | Optional real Stripe secret | `sk_test_dummy` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

---

## Running Locally & Scripts

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start in development mode with live watch
npm run dev

# Run TypeScript compilation check
npm run build
```
