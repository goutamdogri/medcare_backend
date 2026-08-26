# MedCare Backend — Pharma Supply Chain Control Tower API

Express + TypeScript REST API serving the MedCare React SPA. Read-mostly over a PostgreSQL `medcare` database populated daily by a Python ML pipeline. Every response is a thin, parameterized SQL projection over a consistent `asOf` snapshot.

> **Spec source:** `docs/backend-spec.md` (Spring Boot references ignored — this implementation is Express). Schema: `db/schema/schema_postgres.sql`.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the API](#running-the-api)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Endpoints](#endpoints)
- [Conventions](#conventions)
- [Validation & Early Error Detection](#validation--early-error-detection)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Deployment & Health](#deployment--health)

---

## Architecture

```
Kaggle/synthetic ingest → [ML pipeline: Python] ──writes──► medcare (PostgreSQL)
                                ▲                              │
                    daily rollover + monthly retrain           │ read-only
                                                               ▼
   React SPA ──HTTP──► Express API ◄───────────────────────┘
                          │
                          └── PATCH /api/alerts/:id/acknowledge (only WRITE in v1)
```

- **Data flows one way.** The API never calls Python directly.
- All `OUTPUT` tables carry `as_of_date` — the UI can “time travel” and always sees a consistent snapshot. The API resolves `?asOf=` to the latest successful run when omitted (`rolling_run_log.status='success'`).
- Master tables (`sku_master`, `locations`, `lanes`) are cached in-memory for 1 hour and served with `Cache-Control: public, max-age=3600`.

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js ≥22, TypeScript 5.8, ESM | `strict` + `noUncheckedIndexedAccess` |
| HTTP | Express 5 | `trust proxy`, `compression`, `cors` |
| DB | PostgreSQL 16 via `pg` (node-postgres) Pool | `DATE` type parser returns raw `yyyy-MM-dd` strings |
| Validation | Zod 3 | Every query / path / body parsed through a schema; `.strict()` rejects unknown keys |
| Docs | `@asteasolutions/zod-to-openapi` + `swagger-ui-express` | Single source of truth: Zod schemas generate the OpenAPI 3.0 document |
| Logging | `pino` + `pino-http` | Request-id correlation (`X-Request-Id` style via `req.id`), level via env |
| Tests | Vitest 3 + Supertest 7 | Smoke suite against the real local DB |
| Tooling | ESLint (typescript-eslint flat config) + Prettier |  |

---

## Prerequisites

- Node.js 22+ (`node --version`) and npm 10+
- PostgreSQL 16 with a database named `medcare` (see [Database Setup](#database-setup))
- The `medcare` database populated from `db/schema/schema_postgres.sql` or the `pharma_sc_*.sql` dumps under `med_care_db_data/`

---

## Installation

```bash
git clone <repo> && cd MedCare_backend
npm install
cp .env.example .env   # then edit DATABASE_URL / CORS_ORIGIN / PORT as needed
```

---

## Configuration

All variables are validated at boot with Zod — the process exits with a clear message when anything is missing or malformed (**fail fast**).

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development \| test \| production` — controls log redaction and error detail |
| `PORT` | `3000` | HTTP listen port |
| `DATABASE_URL` | `postgresql://postgres:1828@localhost:5432/medcare` | Postgres connection string (`postgresql://` or `postgres://`) |
| `DB_POOL_MAX` | `10` | `pg.Pool` max connections |
| `DB_STATEMENT_TIMEOUT_MS` | `15000` | Per-statement timeout |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | Time to wait for a pooled connection |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins for `/api/**` |
| `LOG_LEVEL` | `info` | `fatal \| error \| warn \| info \| debug \| trace` |
| `MASTER_CACHE_TTL_MS` | `3600000` | TTL for `GET /api/master/*` in-memory cache |

`cp .env.example .env` is gitignored; `.env.test` is committed for the Vitest suite (uses the same local DB with `LOG_LEVEL=silent`).

---

## Database Setup

```bash
# create the database (once)
createdb -h localhost -U postgres medcare

# apply schema + dumps
psql -h localhost -U postgres -d medcare -f db/schema/schema_postgres.sql
# or via the helper:
# PGPASSWORD=1828 psql -h localhost -U postgres -d medcare -f med_care_db_data/medcare-pg/pharma_sc_*.sql
```

Startup performs two self-checks **before** the port opens:

1. `SELECT 1` connectivity probe.
2. `information_schema` assertion that all 15 required tables exist (clear error naming any missing table).

---

## Running the API

```bash
npm run dev      # tsx watch — reloads on change
npm run build    # tsc -p tsconfig.build.json → dist/
npm start        # node dist/server.js
npm run typecheck
npm run lint
npm run lint:fix
npm run format        # prettier --write
```

Health probe (CI / load balancer):

```bash
curl http://localhost:3000/health
# {"status":"ok","db":"up","env":"development","uptimeSeconds":42,"timestamp":"..."}
```

Root `/` redirects to the interactive docs (`/api-docs`).

---

## Project Structure

```
src/
  server.ts                 # bootstrap: early error handlers, DB self-check, graceful shutdown
  app.ts                    # Express factory (testable without binding a port)
  config/
    env.ts                  # Zod-validated env (fail fast)
    database.ts             # pg Pool, DATE parser, assertSchema(), closeDatabase()
    logger.ts               # pino root logger
  shared/
    errors/api-errors.ts    # ApiError hierarchy + RunNotFoundError
    http/async-handler.ts   # wraps async handlers so rejections reach the error middleware
    middleware/error-handler.ts  # central JSON envelope renderer + malformed-JSON detection
    pagination/pagination.ts     # paginationQuerySchema, PageEnvelope<T>, buildPage()
    asof/asof.ts            # asOfQuerySchema + resolveAsOf() (spec §3.1)
    cache/ttl-cache.ts      # generic in-memory TTL cache (master endpoints)
    utils/mapping.ts        # toNum, toIsoTimestamp, snakeToCamel, csvToArray, etc.
    utils/dates.ts          # parseIsoDate / formatIsoDate (UTC-safe)
  docs/
    components.ts           # shared registry, ErrorResponseSchema, jsonOk() helper
    openapi.ts              # assembles OpenAPI 3.0 document from per-module registrations
  modules/
    meta/                   # GET /api/meta
    kpi/                    # GET /api/kpi (+ /daily-curves, /writeoff-cumulative)
    forecasts/              # GET /api/forecasts
    demand/                 # GET /api/demand/history + GET /api/flu
    replenishment/          # GET /api/replenishment (+ /summary)
    allocation/             # GET /api/transfers + GET /api/writeoffs
    inventory/              # GET /api/inventory/aging
    alerts/                 # GET /api/alerts + PATCH /api/alerts/:id/acknowledge
    digest/                 # GET /api/digest
    runs/                   # GET /api/runs
    master/                 # GET /api/master/{skus|locations|lanes} (cached)
    pipeline/               # 501 stubs for POST /rollover, POST /retrain, GET /status/:runId
    system/                 # GET /health
    # each module: <name>.schemas.ts, <name>.repository.ts, <name>.service.ts,
    #              <name>.controller.ts, <name>.routes.ts, <name>.docs.ts
  types/http.d.ts           # augments http.IncomingMessage with req.id (pino-http)

tests/
  setup.ts                  # loads .env.test + afterAll(closeDatabase)
  helpers.ts
  system.test.ts
  meta-kpi.test.ts
  pagination-demand.test.ts
  alerts.test.ts
  modules.test.ts
```

`controller → service → repository` layering per `docs/backend-spec.md §5`: controllers only parse/validate and delegate; services own business rules (`resolveAsOf`, improvement deltas, range caps, alert acknowledgment); repositories own SQL.

---

## API Documentation

- **Swagger UI:** `http://localhost:3000/api-docs`
- **Raw OpenAPI JSON:** `http://localhost:3000/api/openapi.json`

The document is generated from the same Zod schemas validated at runtime (`zod-to-openapi`), so validation and docs never drift. Every endpoint lists its parameters, request/response schemas, and error envelopes.

---

## Endpoints

All paths are mounted under `/api` except `/health` and `/` (redirect).

| Method | Path | Description | Source table(s) |
|---|---|---|---|
| GET | `/api/meta` | Bootstrap payload — `asOf`, latest run meta, all 32 SKUs, 6 regions | `rolling_run_log`, `sku_master`, `locations` |
| GET | `/api/kpi` | Headline KPI comparison + computed `improvement` deltas | `kpi_summary` |
| GET | `/api/kpi/daily-curves` | 42×2 aggregated daily series | `simulation_daily` (GROUP BY) |
| GET | `/api/kpi/writeoff-cumulative` | Cumulative expired value per policy per day | `simulation_daily` window SUM |
| GET | `/api/forecasts` | Paginated forecasts; `horizonMax` filters `horizon <= N` | `forecasts_final` + `rolling_run_log` (modelMix) |
| GET | `/api/demand/history` | Actual sales; grouped by date unless `skuId` + `region` both given | `demand_history` |
| GET | `/api/flu` | ILI burden index series | `disease_burden_index` |
| GET | `/api/replenishment` | Paginated reorder plan; `sort=dos` NULLS LAST; default criticality→dos | `replenishment_orders` |
| GET | `/api/replenishment/summary` | Counts + value by status/criticality | `replenishment_orders` |
| GET | `/api/transfers` | Transfer plan (+ carrier via `lanes` join); `reason` filter; summary | `transfer_plan` |
| GET | `/api/writeoffs` | Residual expiry exposure + totals | `writeoff_risk` |
| GET | `/api/inventory/aging` | Expiry-bucket heatmap + per-location rollup + status split | `inventory_batches` (newest snapshot ≤ asOf) |
| GET | `/api/alerts` | Escalation feed; `severity`, `type`, `unackOnly` filters; `facts` keys camelCased | `alerts` |
| PATCH | `/api/alerts/:id/acknowledge` | **Only write in v1** — `{user}` → `is_acknowledged/by/at` | `alerts` |
| GET | `/api/digest` | AI daily brief; `surgeRegions` split to array | `alert_digest` |
| GET | `/api/runs` | Pipeline audit trail (`?limit=` alias for `size`) | `rolling_run_log` |
| GET | `/api/master/skus` | Full SKU dump (cached 1h) | `sku_master` |
| GET | `/api/master/locations` | Full location dump (cached 1h) | `locations` |
| GET | `/api/master/lanes` | Full lane dump (cached 1h) | `lanes` |
| POST | `/api/pipeline/rollover` | **501 stub** — contract reserved for FastAPI sidecar | — |
| POST | `/api/pipeline/retrain` | **501 stub** | — |
| GET | `/api/pipeline/status/:runId` | **501 stub** | — |
| GET | `/health` | Liveness + DB reachability (CI deploy check) | — |
| GET | `/` | Redirects to `/api-docs` | — |

---

## Conventions

- **`asOf` (spec §3.1):** optional `?asOf=yyyy-MM-dd`. Default is `MAX(as_of_date)` of successful runs. Unknown dates return `404 RUN_NOT_FOUND` with the standard envelope — never a stack trace. The resolved value is echoed as `"asOf"` in every run-scoped response.
- **Pagination (spec §3.3):** `?page=0&size=50` (0-based page; size default 50, max 500). List responses are `{ content: [...], page, size, totalElements, totalPages }`. Out-of-bounds pages return `{ content: [], page, size, totalElements, totalPages }` (totalElements is still accurate).
- **Dates & numbers:** dates serialize as `yyyy-MM-dd` (via `pg` DATE parser returning raw strings); timestamps as ISO-8601 UTC; `NUMERIC`/`BIGINT` columns are coerced to JS numbers at the repository boundary.
- **Field names:** lowerCamelCase on the wire (mapped from snake_case columns; alert `facts` keys are camelCased recursively).
- **CORS:** `CORS_ORIGIN` restricts `/api/**`.
- **Compression & ETag:** enabled by default; master endpoints add `Cache-Control: public, max-age=3600`.

---

## Validation & Early Error Detection

The guiding principle is **catch errors early, fail loudly:**

- **Environment.** Zod validates every env var at import time; startup prints each offending path and exits `1`.
- **Database.** `checkDatabase()` + `assertSchema()` run before the port opens — a missing table lists every missing name and refuses to start.
- **Process.** `uncaughtException` / `unhandledRejection` are trapped at the very top of `server.ts`; any stray rejection is logged with `logger.fatal` and the process exits instead of hanging. Pool `error` events are logged (idle-client deaths no longer vanish).
- **Requests.** Every handler parses through a `.strict()` Zod schema, so typos like `?as_of=` or `?bogus=1` are `400 VALIDATION_ERROR` with `{ path, message }` details rather than being silently ignored. `express.json({ limit: '100kb' })` guards payload size; malformed JSON is `400 INVALID_JSON` (not a stack trace). Pagination guards reject `size > 500` and negative pages. Demand/flu windows are capped at 400 days — wider ranges are `400` with an explanatory message.
- **SQL.** Only parameterized queries (`$1`, `$2`…) reach Postgres. Sort keys are mapped through a whitelist — user input never becomes SQL text.
- **Graceful degradation.** `/health` answers `503 SERVICE_UNAVAILABLE` when the DB is unreachable (instead of a generic 500), so orchestrators can distinguish infra faults.

---

## Error Handling

One envelope for every failure:

```json
{
  "status": 404,
  "error": "RUN_NOT_FOUND",
  "message": "No run found for asOf=2019-05-01",
  "path": "/api/kpi?asOf=2019-05-01",
  "requestId": "77a0a6e8-…",
  "timestamp": "2026-08-24T15:00:00.000Z",
  "details": [{ "path": "size", "message": "size must be <= 500" }]
}
```

- `ApiError` subclasses carry a stable `error` code; Zod failures surface as `VALIDATION_ERROR` with per-field details; malformed JSON as `INVALID_JSON`; unknown routes as `ROUTE_NOT_FOUND`.
- Unexpected faults are logged with full context server-side and sanitized to `500 INTERNAL_ERROR` on the wire (full message only when `NODE_ENV !== 'production'`).
- Every error includes `requestId` (via `pino-http`) for log correlation.

---

## Testing

```bash
npm test              # vitest run (uses .env.test, LOG_LEVEL=silent)
npm run test:watch    # watch mode
```

The suite (34 assertions) covers the acceptance checklist (`docs/backend-spec.md §8`):

- `GET /api/meta` returns 32 SKUs + 6 regions + resolved `asOf`
- All list endpoints paginate and honor `asOf`
- `kpi/daily-curves` returns 42×2 aggregated points (not raw 32k rows)
- Alert acknowledge persists and `unackOnly=true` filtering reflects it (row restored after the test)
- Future `asOf` → clean `404` envelope, not a stack trace
- Pipeline stubs return `501 NOT_IMPLEMENTED` yet still validate their bodies

Tests run against the real local `medcare` DB — **ensure it is populated** before `npm test`.

---

## Deployment & Health

- `GET /health` is the deploy gate (CI hits it). It pings the DB and answers `503` when unreachable.
- Graceful shutdown: `SIGTERM`/`SIGINT` stops accepting connections, drains in-flight requests, closes the pool, exits — force-exits after 10 s.

---

## License

UNLICENSED — internal hackathon artifact.
