# Scouting App Development Handbook (Future-Safe Edition)

## Table of Contents

1. [Framework Best Practices](#1-framework-best-practices)
2. [Language & Framework Guidelines](#2-language--framework-guidelines)
3. [Project Organization Best Practices](#3-project-organization-best-practices)
4. [Code Best Practices](#4-code-best-practices)
5. [Testing & QA](#5-testing--qa)
6. [Deployment & Version Control](#6-deployment--version-control)
7. [Event-Time Reliability](#7-event-time-reliability)
8. [Security & Privacy](#8-security--privacy)
9. [Long-Term Maintainability](#9-long-term-maintainability)

---

# 1. Framework Best Practices — Concrete Rules

## 1.1 API Surface: Add Endpoint vs. Expand Existing

**Default**: Prefer *expanding* an endpoint with optional params or new fields **if** the resource and action semantics
don’t change.

**Add a NEW endpoint when:**

- The **resource** or **action** changes (e.g., `/missions/{id}/archive` vs `/missions/{id}`).
- The new behavior would make existing parameters **mutually exclusive** or **conflicting**.
- You need a **different HTTP method** for a distinct command-like action (e.g., `POST /missions/{id}/validate`).
- Response shape requires a **different schema** that can’t be expressed as a strict superset of the current one.
- You must preserve **backward compatibility** and the old behavior can’t remain the default.

**Expand an EXISTING endpoint when:**

- You’re adding **optional filters**, **sorts**, **includes/expands**, or **pagination** to a list/read.
- You’re adding **optional fields** to a payload/response that are **strict supersets** of the current model.
- You’re adding **non-breaking** validation or business rules while keeping previous contracts valid.

**Breaking change policy (hard rule):**

- Never change the **meaning** of existing fields, status codes, or required params.
- If you must break, create **`/v{n}`** (e.g., `/api/v2/...`) or a new path. Deprecate old endpoints with a sunset date.

**Decision matrix:**

| Change Type                                   | New Endpoint | Expand Existing |
|-----------------------------------------------|--------------|-----------------|
| New resource or action                        | ✅            | ❌               |
| Add optional query/body fields (non-breaking) | ❌            | ✅               |
| Mutually-exclusive semantics emerge           | ✅            | ❌               |
| Need different HTTP verb for command          | ✅            | ❌               |
| Response shape not backward-compatible        | ✅            | ❌               |
| Performance-only optimization (same contract) | ❌            | ✅               |

**Naming/verbs:**

- **Collection**: `GET /matches`, `POST /matches`
- **Item**: `GET /matches/{id}`, `PATCH /matches/{id}`, `DELETE /matches/{id}`
- **Sub-resources**: `GET /matches/{id}/scores`
- **Commands (side-effectful)**: `POST /matches/{id}/validate`, `POST /sync/ingest`

---

## 1.2 How FastAPI Works (what to rely on)

**Model:** ASGI app with *path operations* bound to functions. Pydantic models define **request/response schemas**.
Dependency Injection (DI) wires auth, DB sessions, and config into handlers.

**Rules:**

- **Async first**: Handlers are `async def`; DB calls use async drivers/pools.
- **DI mandatory**: Inject DB session, current user, and settings via `Depends(...)`. No global state.
- **Schemas**: Separate `RequestModel`, `ResponseModel`, `InternalModel` when fields differ. Never leak internal fields.
- **Routers**: Group by domain (**matches**, **auth**, **sync**). Mount under prefixes and (if needed) `/api/v{n}`.
- **Validation**: Use Pydantic validators; return `HTTPException(status_code, detail=...)` for client errors.
- **Errors**: Map domain errors to 4xx; unexpected to 5xx with structured error bodies.
- **OpenAPI**: Every route returns typed models. Keep descriptions concise and explicit about fields.
- **Background tasks**: Use `BackgroundTasks` only for short jobs; otherwise dispatch to a worker queue.
- **Middleware**: Logging, CORS, auth context, request IDs.
- **Testing**: Use `TestClient` (sync) or httpx.AsyncClient (async) with dependency overrides.

**Anti-patterns:**

- Doing DB work in global module scope or outside DI.
- Returning untyped dicts; mixing internal and external schemas.
- Long-running work inside request handlers.

---

## 1.3 How PostgreSQL Works (what to rely on)

**Model:** Durable relational DB with strict **ACID** transactions, **isolation**, **indexes**, and **constraints**. Use
migrations for schema evolution.

**Rules:**

- **Transactions**: Wrap each request’s DB work in a transaction. Fail fast; rollback on exceptions.
- **Constraints first**: Use **NOT NULL**, **CHECK**, **UNIQUE**, **FK** to enforce invariants. Don’t push integrity to
  app code.
- **Indexes**: Add for frequent `WHERE`, `JOIN`, `ORDER BY`. Verify with `EXPLAIN ANALYZE`.
- **Migrations**: All schema changes via migration files (forward + reversible). Never mutate prod schema manually.
- **IDs**: Use surrogate keys (`BIGINT` or `UUID`). Natural keys get `UNIQUE`.
- **JSONB**: Allowed for flexible fields, but **never** for core relational data. Index with GIN only when needed.
- **Upserts**: Use `INSERT ... ON CONFLICT ... DO UPDATE` with deterministic conflict targets.
- **Pooling**: Use a connection pool; size based on DB cores and app concurrency. One session per request.
- **Isolation**: Stick to `READ COMMITTED`. Escalate only with hard evidence.
- **Backups**: Nightly full + WAL. Test restores. Keep retention matching event season requirements.
- **Performance**: Prefer fewer queries with proper joins over N+1 patterns. Batch writes when possible.

**Anti-patterns:**

- Storing large blobs in the DB. Use object storage, store URLs/keys in Postgres.
- EAV (“entity-attribute-value”) for core tables.
- Ad-hoc schema edits, missing migrations, or hidden prod changes.

---

## 1.4 How React Works (what to rely on)

**Model:** Declarative UI. State changes trigger re-renders. Data flows down via props; events bubble up.

**Rules:**

- **State locality**: Keep state as low as possible. Lift only when multiple children need it. Global state is last
  resort.
- **Pure components**: Functions read props/state and return JSX. Side effects only in `useEffect`.
- **Effects**: Dependencies must be complete. No data fetching or subscriptions outside effects.
- **Controlled inputs** for form reliability. Debounce expensive updates.
- **Memoization**: `useMemo` for expensive derivations; `useCallback` for stable handlers passed to children;
  `React.memo` for render-heavy children.
- **Keys**: Stable keys for lists (ids, not indices).
- **Error boundaries** for crash containment in critical areas.
- **Data fetching**: Centralize API clients. Handle loading, empty, error, and success states explicitly.
- **Accessibility**: Semantic elements first; ARIA only when necessary. Keyboard paths must exist.

**Anti-patterns:**

- Storing derived data in state (recompute instead).
- Overusing context for ephemeral or local concerns.
- Mutating props/state; using array indices as keys.

---

## 1.5 Frontend vs Backend Responsibility (hard splits)

- **Backend owns**: Validation, authorization, business rules, persistence, canonical IDs, timestamps, side-effects,
  schema.
- **Frontend owns**: Presentation, interaction, local-only UI state, optimistic UX (with rollback), input shaping.
- **Shared models**: Only via explicit, versioned contracts (OpenAPI or typed SDK). No “magic” coupling.

---

## 1.6 Contract Versioning & Change Control

- **Non-breaking**: Add optional fields, add endpoints, widen enums (keep old values), add query params with sane
  defaults.
- **Breaking**: Remove/rename fields, change types/semantics, alter status codes, change required params.
- **Process**: Ship **vNext** endpoints, deprecate old, provide changelog + migration notes, keep both for one full
  season cycle unless security demands earlier removal.

---

## 1.7 Examples

**Expanding existing (non-breaking):**

- `GET /teams?event=xxxx&minElo=1600&include=stats,photos`
- `PATCH /matches/{id}` adding optional `launch_time` and `priority`

**New endpoint (distinct action):**

- `POST /matches/{id}/simulate` → returns simulation report (not the match resource)
- `POST /media:ingest` → async ingestion job with job ID (command, not CRUD)

**FastAPI sketch (router + DI):**

```python
router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=MissionList)
async def list_missions(
        q: MissionQuery = Depends(),
        db: AsyncSession = Depends(get_db),
):
    return await repo.list_missions(db, q)


@router.post("/{id}/simulate", response_model=SimulationReport, status_code=202)
async def simulate_mission(
        id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_user)
):
    job = await svc.enqueue_simulation(db, id, user.id)
    return SimulationReport(job_id=job.id)
```

**PostgreSQL upsert:**

```sql
INSERT INTO team_stats (team_id, event_id, elo)
VALUES ($1, $2, $3)
ON CONFLICT (team_id, event_id)
    DO UPDATE SET elo        = EXCLUDED.elo,
                  updated_at = now();
```

**React data flow (fetch in effect + memoized rows):**

```sql
const [rows, setRows] = useState<Row[]>([]);
useEffect(() => {
  let alive = true;
  api.fetchTeams({ event }).then(d => { if (alive) setRows(d); });
  return () => { alive = false; };
}, [event]);

const columns = useMemo(() => makeColumns(), []);
```

---

## 1.8 Non-Negotiable (summary)

- No breaking changes without a new versioned path.
- No UI-to-DB access; all data via API.
- Every schema change has a migration.
- Every endpoint has typed request/response models and OpenAPI docs.
- React components are pure; effects hold side effects; keys are stable.

---

## 2. Language & Framework Guidelines

1. **Choice of Tools**
    - Use the most stable and maintainable framework/language available for the task.
    - Avoid relying on experimental features unless justified and documented.
2. **Coding Standards**
    - Apply style and formatting rules appropriate to the chosen language (linters, formatters).
    - Always enable type checking if the language supports it (e.g., TypeScript, Python typing).
3. **Portability**
    - Avoid hardcoding framework-specific behaviors that make migration difficult.
    - Wrap framework-dependent logic in separate modules for easier replacement.

---

## 3. Project Organization Best Practices

1. **Group by Responsibility, Not Technology**
    - Keep related files (logic, styles, tests) together in a feature/module folder.
    - Example groups: **data access**, **UI components**, **business logic**, **utilities**, **config**.
2. **Isolation of Concerns**
    - Each folder/module should have a clear single responsibility.
    - Avoid circular dependencies between modules.
3. **Config & Secrets**
    - Keep configuration files separate from code.
    - Store secrets in environment variables or secure vaults, never in source control.

---

## 4. Code Best Practices

1. **Functions & Methods**
    - Extract reusable or complex logic into functions.
    - Keep them focused on a single task.
2. **Naming Conventions**
    - Be consistent within the project (decide casing and stick to it).
    - Names should clearly describe purpose and scope.
3. **Documentation & Comments**
    - Use docstrings or equivalent for functions/classes.
    - Inline comments only for complex, non-obvious logic.
4. **TODO/FIXME**
    - Always include a context or issue reference when adding these.
5. **Error Handling**
    - Handle expected errors gracefully.
    - Avoid silent failures without logging.

---

## 5. Testing & QA

1. **Automated Tests**
    - Maintain unit tests for core logic and integration tests for module interactions.
    - Add regression tests for every bug fix.
2. **Manual QA**
    - Maintain a pre-release checklist.
    - Run simulations before high-stakes use (e.g., competitions).
3. **Test Data**
    - Keep anonymized or synthetic datasets for repeatable testing.

---

## 6. Deployment & Version Control

1. **Branching Strategy**
    - Keep a stable branch for production and a separate branch for active development.
    - Use feature branches for isolated changes.
2. **Commit Conventions**
    - Write descriptive commit messages.
    - Use a consistent commit format (Conventional Commits recommended).
3. **Versioning**
    - Tag releases with semantic versioning (MAJOR.MINOR.PATCH).

---

## 7. Event-Time Reliability

1. **No Risky Changes During Events**
    - Only apply critical fixes during active competitions.
2. **Rollback Plan**
    - Keep a last-known-good build ready.
    - Document how to revert quickly.
3. **Offline Operation**
    - Ensure core functionality works without internet when needed.

---

## 8. Security & Privacy

1. **Data Privacy**
    - Avoid storing personally identifiable information unless necessary and consented to.
2. **Authentication & Authorization**
    - Secure admin or sensitive actions.
    - Validate all input to prevent injection attacks.
3. **Media Handling**
    - Remove metadata from uploaded images and files when not needed.

---

## 9. Long-Term Maintainability

1. **Tech Debt Tracking**
    - Maintain a public list of deferred fixes and refactors.
    - Regularly review and update.
2. **Deprecation Policy**
    - Mark features for deprecation at least one release before removal.
3. **Documentation & Knowledge Transfer**
    - Update docs with every significant change.
    - Hold periodic walkthroughs for new maintainers.
