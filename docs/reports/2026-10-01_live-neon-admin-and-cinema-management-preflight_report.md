# Smart Cinema Implementation Report

## 1. Task Information

- Task: Verify Live Neon Admin Flow, then Implement Admin Cinema + Hall + Seat Management.
- Date: 2026-10-01.
- Module: Admin / Movie live verification / Cinema-Hall-Seat readiness.
- Type: Verification and gated implementation preflight.
- Status: **PARTIAL: Phase A PASS; Phase B STOPPED at the explicit migration gate.**
- Flyway head: **V10**, unchanged. No application implementation or migration added.
- Repository was clean at task entry. No commit or deployment performed.

## 2. Requested Work

First prove the normal Admin authentication and Movie lifecycle against Neon.
Only after that, implement Admin Cinema/Hall/Seat management with current persistence,
preserving transactional history, whole Seat Units and existing Customer behavior.

The attached task §14 explicitly states: **“If the requested Admin functionality
genuinely requires a schema change: STOP and report why.”** It also forbids changing
V1–V10 and does not authorize V11. Phase B requires modifying protected Seat database
writers/guards, which is database DDL even though existing table columns are sufficient.
The safe response is to report that conflict before implementing the management slice.

## 3. Documents Reviewed

- AGENTS.md, [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  backend workflow, coding, requirement traceability and document rules;
  [project conventions](../development/project-conventions.md).
- Current AI context/handoff, [Admin Foundation report](2026-10-01_admin-foundation-movie-management_report.md),
  [provisioning report](2026-10-01_development-admin-provisioning_report.md),
  [Admin Movie contract](../api/admin-movie-contract-v1.0.md), actual Auth/JWT/current
  database Admin checks and frontend Admin shell/forms.
- [SRS v1.2](../srs/srs-v1.2.md) §§3.1–3.5, 5.4–5.6 and integrity/security sections;
  [BRD v1.2](../brd/brd-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md)
  Cinema/Room/Seat meaning and physical versus Showtime state.
- [Physical dictionary](../db/physical-data-dictionary-v1.0.md) §§3.7–3.11;
  [integrity design](../db/integrity-enforcement-design-v1.0.md) §7 and later
  [V10 addendum](../db/integrity-enforcement-design-v1.2.md).
- [Discovery contract](../api/customer-discovery-contract-v1.0.md),
  [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md), migrations V1–V10,
  deployment-only layout initializers, live Neon guard/privilege metadata and demo seed.

## 4. Requirements Traceability

| Source | Scope | Result |
|---|---|---|
| FR-AUTH-007; NFR-SEC-010/011, SRS v1.2 | Admin role protection, secret-safe verification/errors | PASS for existing Admin surface |
| FR-MOVIE-004/005/006/007 and Admin Movie v1.0 | Create/update/publication and public visibility | PASS live API and browser |
| FR-CINEMA-003/004/005 | Admin Cinema creation/update/status | NOT IMPLEMENTED: Phase B gate |
| FR-CINEMA-006/007/008/009 | Hall ownership/update/status and layout capacity | NOT IMPLEMENTED: Phase B gate |
| FR-SEAT-002/003; SRS data requirements §5.6 | Physical Seat management and whole STANDARD/VIP/COUPLE units | BLOCKED by current immutable guard |
| FR-SEAT-005/006/007/011/012 | Hold ownership/exclusivity/sold protection | Existing regression PASS; no new Admin mutation exercised |
| Attached task A3 and §14 | Phase A first; stop for required schema change without authorization | PASS: Phase A completed, Phase B stopped |

No new BR/FR/UC/NFR identifiers or undocumented business states are introduced.

## 5. Implementation Summary

### Phase A — real Neon API evidence: PASS

The normal backend started against configured Neon PostgreSQL **18.6**, validated
ten Flyway migrations, reported schema V10 current, and completed Hibernate validation.
No fabricated JWT, direct Movie INSERT, service-only bypass or API interception was used.

| Operation | Observed result |
|---|---|
| Normal `POST /api/v1/auth/tokens` | 200; actual existing ADMIN session |
| `GET /api/v1/admin` with issued Bearer token | 200, active ADMIN verified from database |
| `GET /api/v1/admin/movies` | 200 |
| Anonymous `GET /api/v1/admin` | 401 |
| Create exactly one verification Movie | 201, DRAFT, string ID **`12`** |
| DRAFT public detail/catalog | 404 / zero matching catalog items |
| Publish | PUBLISHED; public detail 200 and exactly one matching catalog item |
| Edit description | Public detail returned edited content |
| Unpublish | UNPUBLISHED; public detail 404 and zero matching catalog items |

Verification title: **Admin Verification Movie 20261001-222226**.
Only this Movie was modified; seeded Movies were not changed. Final persisted
status is **UNPUBLISHED**, confirmed again using a read-only database query.
No DELETE or additional Admin account was created.

The existing provisioning command was rerun against Neon to check its idempotency:
result **UNCHANGED**, no new account. Credentials, hashes and tokens were never
written into this report, a tracked file or a verification artifact. Authentication
tokens existed only in memory/the normal ephemeral browser session.

### Phase A — real browser evidence: PASS

Computer Use operated the actual frontend at port 3000 with the normal backend
at port 8080. No mocked session, local-role injection or network interception.

1. Entered local Admin credentials into the real login form; redirected to `/admin`.
2. Opened `/admin/movies` and searched for the same verification Movie.
3. Republished that Movie through the real UI; opened its real edit form.
4. Saved its description as “Edited through the live Admin frontend against Neon.”
5. Opened Customer `/movies/12`; its visible description matched the edit.
6. Unpublished the Movie through Admin UI; Customer detail reloaded to **Movie unavailable**.
7. Captured credential-free local screenshot of the final UNPUBLISHED Admin list,
   signed out normally and closed the verification tabs.

Creation/DRAFT hiding were verified through API; browser creation was not repeated
because the task requests one verification Movie. The browser exercised normal
login, real list/form, publication, edit and unpublication. This live evidence is
separate from the intercepted Playwright regression suite.

### Phase B — requirements/domain audit

| Entity | Existing approved data / enforcement | Administration implications |
|---|---|---|
| Cinema | name ≤150, nonblank address, nullable contact ≤255 and operating information; ACTIVE/TEMPORARILY_CLOSED/INACTIVE | Creation/update/status supported by FR-CINEMA-003/004/005; no approved DELETE; inactive branches cannot receive new eligible bookings |
| Hall | mandatory Cinema, name ≤100, positive people capacity, nonblank configured type ≤50; ACTIVE/MAINTENANCE/INACTIVE | Parent identity must stay fixed; current trigger rejects Cinema/capacity changes after Seat initialization; no approved DELETE |
| Seat | mandatory Hall, nonblank row/number ≤20 each; STANDARD/VIP/COUPLE; ACTIVE/MAINTENANCE/INACTIVE physical status | One record per indivisible unit; unique Hall/row/number; no reparenting or unsafe edits to referenced identity; no approved DELETE |

Capacity is **guest capacity**, not database row count: STANDARD/VIP contribute one,
COUPLE contributes two. Current `initialize_hall_seats` inserts a full empty-Hall
layout atomically and requires its summed guest capacity to equal `halls.capacity`.
It rejects an already initialized layout. It cannot append/edit Seat Units.

V4 has no natural-name uniqueness constraint for Cinema or Hall. SRS defines Seat
uniqueness as Hall + Row + Number. The task's Hall duplicate-identity behavior needs
an explicit contract and serialized writer; do not claim existing DB name uniqueness
or invent global Cinema-name uniqueness. Labels allow values such as `9-10`; their
physical overlap cannot be proven by string uniqueness alone. No coordinates added.

Cinema/Hall persistence currently uses JDBC projections rather than JPA domain
entities. Seat persistence is protected PostgreSQL state. Do not assume missing JPA
classes mean missing tables or replace protected writers with generic repositories.

Customer discovery already reads the same tables. Plain `/api/v1/cinemas` returns
ACTIVE branches; Movie-filtered branches additionally require eligible future
Showtimes. Hall appears within eligible Showtime projections. Seat map requires
eligible Showtime plus explicit `showtime_seats` membership. No Showtime should be
created merely to make new verification hierarchy visible in filtered discovery.

### Phase B — blocking database evidence

Existing [V5 migration](../../backend/src/main/resources/db/migration/V5__create_seats_and_authoritative_holds.sql)
lines 108–124 installs `guard_seat_configuration()` on `seats` and `showtime_seats`:

```sql
IF current_user <> 'smart_cinema_hold_owner' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Protected Seat configuration';
END IF;
IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Seat configuration is immutable in this slice';
END IF;
```

No later V6–V10 migration replaces this guard. **Read-only introspection of actual
Neon confirmed** the same body, an enabled `trg_seats_guard`, no Seat UPDATE grant
for `smart_cinema_hold_runtime`, and no runtime EXECUTE grant on
`initialize_hall_seats(bigint,jsonb)`.

Thus direct JPA/JDBC Seat UPDATE fails for even unreferenced Seats, including a
physical-status-only change. Changing role to the owner cannot make UPDATE pass;
the non-INSERT rejection remains. The deployment initializer is not an approved
Admin mutation boundary. The demo seed's deployment-only role switch must not be
copied into a public runtime API.

The necessary addition is a reviewed forward migration for **guarded Admin Seat
configuration routines, guard authorization and least-privilege execution grants**.
Existing columns suffice; no new business entity is required. This is still schema
DDL and must be tracked by Flyway. Editing V5, replacing functions at startup,
disabling triggers, bypassing guards or granting broad runtime ownership would
violate the task and current integrity design.

Future writers must use current actor → Cinema → Hall-exclusive coordination before
affected Showtime/resource locks, retain history/immutable referenced identities,
maintain complete people capacity and reject unsafe structural changes. Paid sales,
Tickets, QR, monetary snapshots and existing deadlines cannot be rewritten or
implicitly cancelled/refunded. No writer has been implemented or claimed verified.

## 6. Files Created

- This dated report only. Temporary local verification helpers/evidence and ignored
  UI screenshot are not application source or committed credentials.

## 7. Files Modified

- `docs/ai/current-handoff.md`: Phase A actual evidence, V10 head, Phase B blocker,
  latest report and exact required approval/task.
- No backend/frontend application, migration, requirements, seed, historical report
  or historical contract changed. Stable project context remains unchanged.

## 8. Verification

| Check | Result | Evidence / limitation |
|---|---|---|
| Neon normal login → Admin API → Customer Movie visibility | PASS | Actual API lifecycle described above |
| Live frontend/Admin/Customer behavior | PASS | Normal login, same Movie publish/edit/unpublish and public detail visibility; no interception |
| Neon idempotent Admin provisioning | PASS | Existing account UNCHANGED, no new account |
| Live guard/privilege audit | PASS | Read-only Neon metadata and final Movie persistence confirmation |
| Maven verify | PASS | 265 tests, zero failures/errors/skips, PostgreSQL 18.4 isolated regression; build SUCCESS, 22:33:59 +07:00 |
| TypeScript | PASS | `pnpm exec tsc --noEmit` |
| ESLint | PASS | `pnpm lint` |
| Unit tests | PASS | 54/54, `pnpm test` |
| Production build | PASS | `pnpm build` |
| Full Playwright | FAIL | 81/82 PASS, 7.9 minutes; existing Showtime loading-state assertion at `showtime-selection.spec.ts:25` failed; unchanged targeted rerun reproduced the same failure |
| V1–V10 / protected application and historical files | PASS | All ten migration Git objects match HEAD; no backend/frontend/seed/requirements/contracts/historical report changes |
| Documentation/link/whitespace/security | PASS | Current handoff/report: 52 relative links and two anchors resolve; whitespace check passes; no local credentials in new docs; `.env` and screenshot ignored |
| New Cinema/Hall/Seat tests, concurrency and live hierarchy | NOT RUN | Phase B stopped; no new implementation exists |

All automated PostgreSQL fixtures targeted the dedicated local regression database,
not Neon. Neon received only authorized normal Auth operations, the one verification
Movie lifecycle, idempotent provisioning and read-only metadata inspection. No demo
seed rerun, transactional-data fixture, provider request or external charge.

The failing browser assertion waits for a transient loading indicator **after**
waiting for Movie/Cinema context. At failure the DOM already shows seven Showtime
options, so the missing indicator is not evidence of an Admin/Neon error. The local
preview adapter resolves after 350 ms; the test does not control that timing.
Treat this as an unresolved existing regression-test synchronization issue, not
as a passing full suite. No Customer code/test was changed to hide it or expand
the explicitly stopped task. A deterministic loading-state test needs a controlled
pending adapter/timer and a fresh full run in the authorized follow-up.

## 9. Requirement Reconciliation

- **PASS:** all Phase A success conditions, actual API/browser proof, no credentials
  in evidence, no new account, seeded Movie preservation and final UNPUBLISHED state.
- **PARTIAL:** overall task; Phase B stopped before application implementation.
- **NOT IMPLEMENTED:** Cinema/Hall/Seat Admin routes, writes, frontend forms, new
  module authorization/concurrency tests and new live hierarchy. No fake navigation.
- **PASS:** migration prohibition honored; approved Hold/Booking/Payment/Ticket
  guards preserved. Existing regression does not certify nonexistent Admin writers.

## 10. Deviations / Conflicts

The task expects existing persistence to suffice but V5 deliberately made physical
configuration immutable in that slice, reserving guarded administration for later.
Current columns suffice; current write interfaces do not. Task §14 explicitly
requires stopping for this conflict. No approved exception or guard bypass used.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file/document naming | PASS | New dated kebab-case report in docs/reports; current handoff reconciled |
| Code/API/database naming | NOT APPLICABLE | No application code, API or schema added |
| Domain terminology | PASS | Existing Cinema/Hall/Seat statuses; guest-capacity/COUPLE meaning retained |
| History/scope preservation | PASS | No requirement rewrite, migration edit, historical report change or unrelated feature |

## 11. Known Limitations

- Phase B remains unimplemented; approving a migration is not implementation evidence.
- Existing initializer handles a complete empty-Hall layout only. It cannot satisfy
  normal incremental creation, editing or status updates.
- Customer downstream UI adapters remain previews; this task did not integrate them.
- No new Showtime, Booking, Hold, Payment, Ticket or QR was generated.
- VNPAY interoperability, production provisioning/load, broader Admin modules and
  legacy Auth numeric user IDs remain previous separate limitations.
- Existing Showtime preview loading assertion fails on this environment, including
  targeted rerun; full browser regression is not green despite live Admin PASS.

## 12. Next Recommended Step

Obtain explicit authorization for a forward **V11 guarded Admin configuration
migration**, preserving V1–V10. Then implement the requested Cinema → Hall → Seat
backend/frontend slice, document duplicate/layout/edit rules and verify protected
history/capacity/concurrency plus a small live Neon hierarchy. Correct deterministic
loading-state test synchronization and obtain a green full browser regression.
Keep Showtime Management
out of that task. Only after that slice passes should Admin Showtime Management be
considered as a separately authorized next task.
