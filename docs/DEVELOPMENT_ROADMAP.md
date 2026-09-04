# CampusOS MVP Development Roadmap

Last updated: 2026-09-04  
Target: AI Build Hackathon MVP  
Status: **persistence foundation complete; runnable application not yet implemented**

## 1. Product objective

Build one locally runnable application with two connected experiences:

1. A dashboard that displays and manages schedules, rooms, events,
   announcements, and assignments.
2. An AI agent that reads the same current data, answers user-specific questions,
   and safely performs room-booking and event-registration actions through real
   tool calling.

The central invariant is:

> The database is the single source of truth. Dashboard routes and agent tools use
> the same business services, so a committed dashboard change is visible to the
> next agent request without re-importing, caching, or restarting.

## 2. MVP architecture

```text
React + TypeScript
  ├── Campus data dashboard
  └── Agent chat
           │
           │ REST /api/v1
           ▼
FastAPI
  ├── API routes and error handling
  ├── Agent orchestrator and tool definitions
  ├── Shared domain services
  ├── Repositories and transactions
  └── Pydantic contracts
           │
           ▼
SQLite database
```

Default technology choices:

- Frontend: React, TypeScript, Vite, TanStack Query
- Backend: FastAPI, Pydantic v2, SQLAlchemy 2, Alembic
- Database: SQLite for reliable local judging
- Python environment: `uv`
- Agent: an LLM provider with native function/tool calling
- Transport: REST; WebSockets are outside the MVP

## 3. Status legend

- `[x]` Completed and verified
- `[ ]` Not implemented
- `[~]` Partially completed or awaiting an integration decision

## 4. Milestone dependency order

```text
M0 Requirements
  → M1 Contracts
    → M2 User relevance
      → M3 Persistence
        → M4 Domain services
          → M5 FastAPI routes
            ├── M6 Agent
            └── M7 Frontend
                  → M8 Integration and QA
                    → M9 Submission readiness
```

The agent and frontend may be developed in parallel after M5. Neither should
define business rules independently.

---

## M0 — Requirements and data audit

Status: **Complete**

### Work completed

- [x] Reviewed `PROBLEM_STATEMENT.md`.
- [x] Reviewed all supplied schemas and sample judging queries.
- [x] Reviewed submission and local-run requirements.
- [x] Inspected every supplied seed dataset.
- [x] Identified the dashboard and agent as equal scoring priorities.
- [x] Established SQLite as the MVP database and FastAPI/React as the application
  boundary.

### Important findings

- Some natural-language weekday labels disagree with their ISO dates. ISO dates
  are authoritative.
- Schedules reference `7C07` and `9A05`, although those rooms do not exist in the
  supplied room inventory.
- Some event `registered` counts exceed the number of supplied registration
  objects. The numeric count is treated as authoritative historical data.
- Assignments contain one `status` despite status normally being user-specific.
  For this single-user MVP it represents the demo student's status.
- The original schema supplied no user-to-course relationship; this has now been
  addressed by the MVP user profile and enrollment contract.

### Exit criteria

- [x] Requirements, risks, assumptions, and MVP boundaries are documented.

---

## M1 — API-first contract foundation

Status: **Complete**

### Work completed

- [x] Created the versioned `/api/v1` contract.
- [x] Defined consistent success, list, deletion, and error payloads.
- [x] Defined CRUD contracts for all five required systems.
- [x] Defined room availability, booking, and cancellation contracts.
- [x] Defined event registration and cancellation contracts.
- [x] Defined agent message, clarification, refusal, failure, and tool-trace
  responses.
- [x] Defined authorization and idempotency expectations.
- [x] Created strict Pydantic v2 request and response models.
- [x] Added a `uv` project and lockfile for reproducible backend dependencies.

### Implemented files

- `docs/API_CONTRACT.md`
- `backend/pyproject.toml`
- `backend/uv.lock`
- `backend/app/schemas/`
- `backend/tests/test_seed_contracts.py`

### Exit criteria

- [x] Every supplied seed record validates against its response model.
- [x] Unknown fields and malformed inputs are rejected.
- [x] Nested bookings and registrations cannot be overwritten by generic patches.

---

## M2 — MVP identity and relevance rules

Status: **Complete**

### Work completed

- [x] Added one trusted demo user, `usr-001` / `20-40532`.
- [x] Added explicit course-section enrollments for the supplied timetable.
- [x] Added a `GET /api/v1/users/me` contract.
- [x] Added personalized schedule, assignment, announcement, and event endpoint
  contracts.
- [x] Removed client-supplied identity and role from agent messages.
- [x] Added deterministic relevance functions shared by future routes and tools.
- [x] Added relevance tests.

### MVP relevance rules

- A class is relevant when both course and section match an enrollment.
- An assignment is relevant when its course matches an enrollment.
- An announcement is relevant while its ISO date range is active.
- An event is discoverable while current/future and not completed or cancelled.
- A registration belongs to the user when its student ID matches the trusted
  current user.
- Rooms are filtered by operational status, time conflicts, capacity, and
  equipment—not enrollment.

### Explicit limitation

This is a single-user hackathon mode, not authentication. `DEMO_USER_ID` is trusted
server configuration. Production would replace it with authenticated session
claims and per-user assignment progress.

### Exit criteria

- [x] The LLM never needs to guess which courses or sections belong to “me.”
- [x] Relevance logic is testable without an LLM.

---

## M3 — SQLite persistence and safe seed import

Status: **Complete**

### Tasks

- [x] Add SQLAlchemy 2 and Alembic dependencies.
- [x] Define normalized database models for users, enrollments, schedules, rooms,
  bookings, events, registrations, announcements, and assignments.
- [x] Add foreign keys, unique constraints, indexes, and cascade behavior.
- [x] Store bookings and registrations as tables rather than mutable JSON arrays.
- [x] Implement a transaction-scoped database session dependency.
- [x] Implement seed import that runs only when the database is empty.
- [x] Preserve supplied IDs and generate collision-resistant IDs for new records.
- [x] Ensure application restarts never overwrite edited data.
- [x] Add migration and seed-import tests.

### Required database protections

- Unique room number.
- Unique event registration per `(event_id, student_id)`.
- Booking interval checks in the transactional service layer.
- Registered event count cannot exceed capacity.
- Foreign-key enforcement enabled explicitly for SQLite.
- Database writes rollback completely on failure.

### Exit criteria

- [x] All seed data imports into a new database.
- [x] Restarting with a populated database leaves changes untouched.
- [x] CRUD mutations survive process restart.
- [x] A failed multi-step write leaves no partial data.

---

## M4 — Shared domain and transaction services

Status: **Relevance functions complete; persistence-backed services not started**

### Tasks

- [x] Implement pure user-relevance functions.
- [ ] Implement CRUD services for all five systems.
- [ ] Implement current-user lookup from `DEMO_USER_ID`.
- [ ] Implement room availability across both dated bookings and recurring
  schedules.
- [ ] Use half-open intervals `[start, end)` so back-to-back bookings are valid.
- [ ] Recheck room availability and insert the booking in one transaction.
- [ ] Implement idempotency-key storage for mutation retries.
- [ ] Register for an event transactionally with duplicate and capacity checks.
- [ ] Cancel only the current user's bookings and registrations unless admin.
- [ ] Implement personalized “my schedule,” “my assignments,” and relevant-event
  queries.
- [ ] Add unit tests for collision boundaries, duplicates, full events, missing
  records, and unauthorized actions.

### Exit criteria

- [ ] Routes and agent tools can use the same service functions.
- [ ] No business rule exists only in a route, React component, prompt, or tool.
- [ ] Concurrent/retried actions do not create obvious duplicate mutations.

---

## M5 — FastAPI application and mock boundary

Status: **Not started**

### Tasks

- [ ] Create the FastAPI application factory and settings model.
- [ ] Add `/health` and `/api/v1` routers.
- [ ] Implement all resource CRUD routes from the contract.
- [ ] Implement `/users/me` and personalized read routes.
- [ ] Implement room availability/booking and event registration routes.
- [ ] Convert Pydantic and service errors to the standard error envelope.
- [ ] Configure local CORS for the React development origin.
- [ ] Generate and inspect OpenAPI output.
- [ ] Add API integration tests using an isolated temporary SQLite database.
- [ ] Provide contract-matching mock fixtures for frontend parallel development.

### Exit criteria

- [ ] Every documented endpoint exists and returns the documented shape.
- [ ] OpenAPI references the intended request and response models.
- [ ] Frontend mock fixtures and real API responses are interchangeable.

---

## M6 — AI agent and real tool calling

Status: **Contract complete; implementation not started**

### Tasks

- [ ] Select and configure one tool-calling LLM provider behind a small adapter.
- [ ] Create the CampusOS system prompt and bounded agent loop.
- [ ] Implement read tools for personalized schedules, assignments,
  announcements, events, rooms, and availability.
- [ ] Implement command tools for room booking/cancellation and event
  registration/cancellation.
- [ ] Inject the trusted user and current `Asia/Dhaka` time server-side.
- [ ] Require clarification before mutation when date, time, target, or purpose is
  materially ambiguous.
- [ ] Enforce authorization in services even if the model requests an invalid
  action.
- [ ] Return concise tool traces without prompts, secrets, SQL, or personal data.
- [ ] Add provider timeout, bounded retry, and user-safe failure behavior.
- [ ] Test every published sample query and adversarial variants.

### Required behavioral tests

- [ ] “When is my next class?” accounts for weekday, current time, and active
  announcements that clearly override a class.
- [ ] “Due this week” uses explicit week boundaries in `Asia/Dhaka`.
- [ ] “I am free until 2” combines schedule and event data.
- [ ] Room suggestions satisfy every capacity, equipment, date, and time filter.
- [ ] Vague booking requests ask a question and perform zero writes.
- [ ] Unauthorized mutations are refused by the service layer.
- [ ] A dashboard edit is reflected in the next agent answer.

### Exit criteria

- [ ] All reads and writes occur through real registered tools.
- [ ] No campus record is copied into the system prompt or hardcoded response.
- [ ] Tool failure never becomes a falsely reported success.

---

## M7 — React dashboard and chat experience

Status: **Not started**

### Tasks

- [ ] Scaffold React + TypeScript with Vite.
- [ ] Add a typed API client derived from or checked against OpenAPI.
- [ ] Add TanStack Query for server state and mutation invalidation.
- [ ] Build navigation and responsive application shell.
- [ ] Build clear views for all five required systems.
- [ ] Implement add, edit, and delete interactions for each system.
- [ ] Implement room booking/cancellation and event registration/cancellation.
- [ ] Build the agent chat interface with loading, clarification, refusal, and
  failure states.
- [ ] Display validation and conflict errors without losing form input.
- [ ] Add empty, loading, and retry states.
- [ ] Verify keyboard access, labels, focus behavior, and mobile layout.

### State-management rule

TanStack Query owns backend data. Components must not maintain a second long-lived
copy of resource collections. After mutation, update or invalidate the relevant
queries so the UI reflects committed backend state immediately.

### Exit criteria

- [ ] All five systems are visible and usable.
- [ ] Every required CRUD action updates immediately and survives reload.
- [ ] Agent chat is usable without inspecting developer tools.

---

## M8 — End-to-end integration, stress testing, and security review

Status: **Not started**

### Tasks

- [ ] Run all sample judging queries against a fresh seeded database.
- [ ] Edit data in the dashboard and immediately query it through the agent.
- [ ] Test exact booking boundaries and overlapping intervals.
- [ ] Test repeated clicks, duplicate requests, and reused idempotency keys.
- [ ] Test full, cancelled, completed, and duplicate event registrations.
- [ ] Test malformed IDs, dates, times, empty bodies, and unknown fields.
- [ ] Test unauthorized cancellation and official-data mutations.
- [ ] Verify secrets never enter Git, browser bundles, logs, or tool traces.
- [ ] Verify LLM/provider failure does not damage database state.
- [ ] Run backend tests, frontend tests, type checking, and production builds.

### Exit criteria

- [ ] Fresh setup passes the judging flow without manual database repair.
- [ ] No known high-severity correctness or authorization issue remains.
- [ ] The main demo works when the LLM or network responds slowly.

---

## M9 — Documentation, packaging, and submission readiness

Status: **Partially started**

### Tasks

- [x] Keep real `.env` files ignored.
- [x] Document expected MVP environment variables in `.env.example`.
- [~] Maintain the repository overview and structure in `README.md`.
- [ ] Add exact `uv` backend installation and run commands.
- [ ] Add exact frontend installation and run commands.
- [ ] Add database initialization behavior and troubleshooting notes.
- [ ] Document the selected LLM and required API key.
- [ ] Document example agent questions and supported actions.
- [ ] Add a one-command or two-command local startup path.
- [ ] Clone into a clean directory and rehearse setup from the README.
- [ ] Confirm the repository is public before the deadline.
- [ ] Confirm no secret or local database file is committed.

### Exit criteria

- [ ] A judge can clone, configure, and run the complete application without help.
- [ ] The repository satisfies every item in `SUBMISSION.md`.

---

## 5. Definition of MVP complete

CampusOS is MVP-complete only when all of the following are true:

- [ ] All five seed systems are persisted and visible.
- [ ] Add, edit, and delete work for every required system.
- [ ] Room booking/cancellation and event registration/cancellation work safely.
- [ ] Changes survive reload and restart.
- [ ] The agent uses genuine tool calling against current database state.
- [ ] The agent correctly answers the supplied lookup and multi-source questions.
- [ ] Ambiguous requests do not trigger mutations.
- [ ] Unauthorized requests are refused by backend policy.
- [ ] The UI is clear, responsive, and handles errors.
- [ ] Setup instructions work from a clean clone.

## 6. Explicitly outside the MVP

Unless all MVP acceptance criteria are already passing, do not spend time on:

- Full login, password reset, OAuth, or multi-tenant identity management
- PostgreSQL, Redis, queues, or microservices
- WebSockets for ordinary CRUD updates
- Vector databases or RAG over the small structured dataset
- Voice input, push notifications, calendars, maps, or mobile applications
- Automatic interpretation of arbitrary announcement prose into schedule mutations
- Complex recommendation models or learned personalization
- Production deployment infrastructure

These may be added as bonuses only after the judged workflow is stable.

## 7. Current test baseline

At the time this roadmap was created:

```text
20 tests passed
```

The tests currently cover seed-schema compatibility, strict validation, invalid
time ranges, empty patches, demo-user enrollment relevance, assignment relevance,
active announcements, discoverable events, and user-specific event registration.
They now cover persistence migrations, seed imports, restart safety, constraints,
and transaction rollback. They do not yet test HTTP routes, frontend behavior, or
an LLM.

## 8. Immediate next milestone

Proceed with **M4 — Shared domain and transaction services**. Routes and agent
tools must use those services rather than defining business rules independently.
