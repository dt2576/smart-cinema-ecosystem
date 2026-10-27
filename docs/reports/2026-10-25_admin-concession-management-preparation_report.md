# Phase 5A — ADMIN Concession Management: requirements audit and implementation plan

## 1. Task Information

- Date: **2026-10-25**, Asia/Saigon. Type: repository audit, requirements reconciliation, proposed contract and implementation planning.
- Decision: **READY WITH APPROVALS REQUIRED**. Core ADMIN catalog requirements are sufficient; the proposed HTTP/privilege/audit contract and future migration require approval. Frontend additionally needs an approved ADMIN Concession design.
- No production code, migration, database, environment, Stitch resource or historical report was changed. No service, test suite, Flyway, database connection, VNPAY, deployment, staging or commit was run.
- Source HEAD: `702838561bfe0fd128d7741a8591efccc1eafb9d`. Incoming Phase4F/progress-report changes are preserved. V14 remains source migration head.

## 2. Requested Work and Documents Reviewed

Prepare the smallest compatible ADMIN catalog-management slice, reusing current Customer consumption and protected catalog persistence. **All routes, DTOs and routines labelled proposed below do not exist yet and are not approved contracts.** The report is not authorization to implement them.

Read [AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Backend/Frontend/Review workflows and applicable convention, requirement-traceability, document, coding and UI rules; [project conventions](../development/project-conventions.md), frontend-local AGENTS and [report template](templates/TASK_REPORT_TEMPLATE.md).

Context: [current handoff](../ai/current-handoff.md), [progress assessment](2026-10-23_project-progress-production-readiness_report.md), [Project Scope v1.0](<../project-scope/project-scope v1.0.md>), relevant [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1 §29A](../business-analysis/business-analysis-v2.1.md), System Analysis & Design v1.1, [database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary §§3.15–3.16](../db/physical-data-dictionary-v1.0.md) and integrity design.

Contracts: [Concession v1.0](../api/concession-composition-contract-v1.0.md), Booking [v1.0](../api/booking-contract-v1.0.md)/[v1.1](../api/booking-contract-v1.1.md)/[v1.2](../api/booking-contract-v1.2.md)/[v1.3](../api/booking-contract-v1.3.md), [Promotion delta v1.1](../api/promotion-composition-contract-v1.1.md), ADMIN Cinema/Movie/Showtime contracts and implementation patterns. Examined actual Java/JDBC/SQL, security/advice, frontend adapters/routes/components, tests and seed entry point. Read [backend Concession report](2026-09-29_concession-composition-backend_report.md), [Customer Concession report](2026-10-05_customer-concession-composition-frontend_report.md)/[guide](../development/customer-concession-composition-frontend.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md), cached design inventory and live Stitch reads.

Source precedence: later V8/V9/V10 contracts and actual code supersede historical “Promotion disabled/no Payment” statements in the V7 Concession report/contract. Project Scope v1.0's optional Combo/Food wording is superseded by explicit Concession requirements in BRD/SRS v1.2. Historical documents were not rewritten.

## 3. Existing Implementation Inventory

Classification **IMPLEMENTED AND VERIFIED** means inspected code plus cited historical test evidence, not a fresh execution on25/10. **IMPLEMENTED BUT UNVERIFIED** means the identified capability lacks the relevant approved ADMIN/live verification. Other classifications describe the actual remaining capability, not the existence of a filename.

| Capability | Actual evidence | Classification / limit |
|---|---|---|
| Catalog domain persistence | V7 `concession_items`; JDBC, not a JPA entity | IMPLEMENTED AND VERIFIED; do not introduce a duplicate ORM model just to add ADMIN |
| Booking line persistence | V7 `booking_concessions`, immutable item/name/category/unit-price snapshots, quantity/total, FK NO ACTION | IMPLEMENTED AND VERIFIED |
| Categories/status/amount constraints | POPCORN/DRINK/COMBO; ACTIVE/INACTIVE; numeric(19,4), nonnegative and <10^15 | IMPLEMENTED AND VERIFIED |
| Description/image representation | Nullable text and varchar(2048); projected as `description`/`imageUrl` | IMPLEMENTED BUT UNVERIFIED for ADMIN editing/media lifecycle; storage/read fields already exist |
| Deployment-only catalog write | `configure_concession_item(id,name,description,category,price,image,status)` | IMPLEMENTED AND VERIFIED under isolated DB tests; not an ADMIN-authorized application command |
| Catalog guard and ACL | `guard_concession_catalog`: NOLOGIN hold owner only, no DELETE, immutable id/created_at; runtime SELECT only | IMPLEMENTED AND VERIFIED |
| Public catalog API | GET `/api/v1/concession-items`, ACTIVE only, no query, no-store, array | IMPLEMENTED AND VERIFIED |
| Customer add/update/remove | POST/PATCH/DELETE existing Booking Concession routes | IMPLEMENTED AND VERIFIED in isolated DB/HTTP and fixture-backed browser tests; full live new-Booking write previously unavailable |
| Exact snapshot/totals/ownership/deadline protection | SQL guards, aggregate assertions, Booking/Concession repositories/services; first-attempt freeze V9 | IMPLEMENTED AND VERIFIED; reuse unchanged |
| Promotion recalculation on composition | V8 and subsequent deltas; old V7 “discount0” is historical | IMPLEMENTED AND VERIFIED in historical suites; not an ADMIN Promotion feature |
| ADMIN list/detail/create/edit/status HTTP | No matching controller/request/DTO/service routes in current source | MISSING |
| ADMIN actor-aware protected catalog routine | Existing deployment function has no actor parameter or current ADMIN check | MISSING |
| Catalog-specific durable audit | Existing `audit_records` table V10; no catalog-specific insert in deployment writer | PARTIALLY IMPLEMENTED: infrastructure exists; FR-AUDIT-006 catalog events missing |
| ADMIN frontend workspace/navigation/adapters | Existing five-link AdminShell has no Concession link; no admin Concession routes/components | MISSING |
| Real Customer frontend | `/bookings/[bookingId]/concessions`, owned screen/hook/API; Summary link | IMPLEMENTED AND VERIFIED in historical frontend suite and limited live read-only checks |
| Preview frontend | `/bookings/preview/concessions`, mock service/provider/scenarios | IMPLEMENTED AND VERIFIED as preview only; not a reusable production data source |
| Catalog content seed | `DemoSeedService.seedConcessions` uses deployment function; five-item demo catalog | IMPLEMENTED AND VERIFIED as historical demo tooling; never run it for this task or test preparation |
| Local ADMIN catalog tests | No dedicated ADMIN Concession suite | MISSING |
| Custom category administration/recipe components | No category/combo-composition entity, relationships or contract | OUT OF APPROVED SCOPE for minimal slice; vocabulary expansion requires decision |
| Cinema-specific catalog/availability | Chain-wide catalog, no cinema_id or item/Cinema association | OUT OF APPROVED SCOPE; not implied by ACTIVE status |
| Inventory/warehouse/supplier/kitchen/POS | Explicit exclusions in current approved analysis | OUT OF APPROVED SCOPE |
| Upload/crop/storage provider | No Concession media endpoint/service | MISSING mechanism; REQUIRES DECISION before inclusion, not required by minimal catalog slice |

### Source map

- Backend [ConcessionController](../../backend/src/main/java/com/smartcinema/concession/ConcessionController.java), [ConcessionService](../../backend/src/main/java/com/smartcinema/concession/ConcessionService.java), [ConcessionRepository](../../backend/src/main/java/com/smartcinema/concession/ConcessionRepository.java), [ConcessionRequest](../../backend/src/main/java/com/smartcinema/concession/ConcessionRequest.java), [ConcessionItemResponse](../../backend/src/main/java/com/smartcinema/concession/ConcessionItemResponse.java).
- [V7](../../backend/src/main/resources/db/migration/V7__create_concession_composition.sql), V8 promotion evolution, V9 freeze, V10 settlement/audit, source migrations throughV14. Concession master DDL remains V7; later Booking/finalization layers do not create an ADMIN catalog API.
- [BookingRepository](../../backend/src/main/java/com/smartcinema/booking/BookingRepository.java) returns stored lines; [BookingExceptionHandler](../../backend/src/main/java/com/smartcinema/booking/BookingExceptionHandler.java) handles Concession controller errors through scoped advice. Staff admission reads purchased names/category/quantities from the same snapshots.
- [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java): public catalog GET, CUSTOMER-only composition writes, generic `/api/v1/admin/**` ADMIN matcher. [AdminAccessService](../../backend/src/main/java/com/smartcinema/admin/AdminAccessService.java) independently locks/rechecks current ACTIVE ADMIN.
- [concession-api.ts](../../frontend/src/features/concession/concession-api.ts), [owned-concession-screen.tsx](../../frontend/src/features/concession/owned-concession-screen.tsx), [use-concession-composition.ts](../../frontend/src/features/concession/use-concession-composition.ts), composition service; `concession.types.ts`/preview service/provider remain demonstration types, including numeric preview prices.
- [ConcessionRequestTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionRequestTests.java), [ConcessionPostgresTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionPostgresTests.java), [ConcessionMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionMigrationPostgresTests.java); existing PaymentPostgresTests covers frozen composition. Frontend [adapter tests](../../frontend/src/features/concession/concession-api.test.ts), [real-contract browser fixtures](../../frontend/test/e2e/customer-concession-composition.spec.ts), preview tests and `helpers/customer-concessions.ts`.

### Existing HTTP contract — preserve exactly

| Method/resource | Authorization | Input → result |
|---|---|---|
| GET `/api/v1/concession-items` | Public; supplied invalid Bearer still401 | No query/body →200 `ConcessionItemResponse[]` |
| POST `/api/v1/bookings/{bookingId}/concessions` | Owning current ACTIVE CUSTOMER | `{itemId:string,quantity:integer}` →200 BookingResponse |
| PATCH `/api/v1/bookings/{bookingId}/concessions/{lineId}` | Same | `{quantity:integer}` →200 BookingResponse |
| DELETE same line | Same | No body →200 BookingResponse; missing line404 |

Public item: `{id,name,description,category,sellingPrice,imageUrl}`; nullable description/imageUrl, string bigint ID and four-decimal amount. No catalog status/timestamps/branch/stock fields. Fixed category rank POPCORN,DRINK,COMBO, then `name COLLATE "C"`, numeric ID; duplicate display names stay distinct.

Current request validation requires string IDs and positive JSON integer quantity1..2147483647, rejects extra authority/price fields. Current ProblemDetail mapping is400 validation,401 authentication,403 wrong/inactive Customer,404 unavailable owned resource,409 eligibility/item/amount/contention,503 infrastructure. The existing advice's Customer-specific messages must not be reused verbatim for ADMIN. POST creates separate lines and has no idempotency key or automatic merge.

## 4. Requirements Reconciliation

| Verified source / exact ID | Obligation | Proposed treatment |
|---|---|---|
| BRD v1.2 BR-002/004; SRS §6 RBAC, FR-AUTH-007/008 | Role/current account/scope enforcement; catalog management ADMIN only | Chain-wide ADMIN only; CUSTOMER/STAFF/MANAGER denied management; public view stays public |
| BRD BR-065; SRS FR-CONCESSION-001, FR-BOOKING-013 | Select available ACTIVE add-ons | Preserve existing catalog and new-add gates |
| SRS FR-CONCESSION-002 | Admin creates valid item | Add audited ADMIN create, reuse existing table/writer |
| SRS FR-CONCESSION-003/005; BRD BR-066 | Edit catalog, selling price≥0 without rewriting history | Master-only rename/description/category/price update |
| SRS FR-CONCESSION-004, §8.7 SR-CONCESSION-01/02 | Enable/disable; inactive cannot be added; old lines preserved | Explicit ACTIVE/INACTIVE control; no DELETE/DRAFT introduced |
| SRS FR-CONCESSION-006 | Valid category POPCORN/DRINK/COMBO or approved vocabulary | First slice uses the three currently constrained tokens only |
| SRS §5.9 | Name/Description/Category/Selling Price/Image/Status/timestamps | Existing fields suffice; image reference transport/hosting decision still needed for editing |
| SRS FR-BOOKING-014–018; SR-CONCESSION-03/04; DR-016–018 | Snapshots, exact totals, quantity rules, immutable finalized composition | Preserve all guards, current backend arithmetic and earlier first-attempt freeze contract |
| BRD BR-067; SRS FR-PAYMENT-002, NFR-UX-005 | Backend total authority and clear Summary | No frontend calculation/repricing or Payment changes |
| SRS FR-AUDIT-001/006; NFR-OBS-006 | Sensitive administration audit; price/status changes; audit distinct from technical logs | Atomic persistent catalog audit, not only after-commit log messages |
| System Analysis v1.1 UC-ADM-010/011/012/013 | Manage/list, create, update, change Concession status | Minimal five HTTP endpoints below; no new use cases invented |
| System Analysis BRULE-CON-001–006; Business Analysis §29A | ACTIVE, positive quantity, snapshots, backend totals, no inventory | Existing Customer behavior preserved; no stock/POS/kitchen model |
| SRS NFR-SEC-002/003/006/010/011; NFR-UX-004 | Auth, validation, safe logs/errors, Vietnamese feedback | Reuse security/shell/primitives with feature-local typed adapter and safe advice |

Supported operations: list all ACTIVE/INACTIVE items, create, edit name/description/category/price, enable/disable, and create/edit a **flat COMBO item**. COMBO is not a computed bundle: current storage has no ingredients, constituent quantities, substitutions or bundle-price arithmetic.

**REQUIRES DECISION:** image reference write policy (URL/path/asset source, safe schemes/hosts and clearing); custom category vocabulary expansion; any proposed Cinema-specific availability. Full category CRUD, recipe/configurable bundle management, inventory, POS and destructive deletion are not included in the approved minimal feature. No claim that Image in the data model authorizes uploads/cloud integration. No upload API is proposed here.

## 5. Proposed Backend Contract — Awaiting Approval

### 5.1 Minimal resource set

Base `/api/v1/admin/concession-items`. Every operation requires valid Bearer ADMIN and current database ACTIVE ADMIN. Subject supplies actor; no actor/user/role/cinema override. Successful responses and safe application errors should be no-store. No pagination/filter/search/sort/query parameter in the first minimal contract, following existing complete-array configuration resources; reject unknown/repeated queries rather than silently accepting them.

| Proposed operation | Request DTO | Success / response | Transaction and database effect |
|---|---|---|---|
| GET collection | No body/query |200 `AdminConcessionItem[]`, including inactive, deterministic current category/name-C/ID order | Logical read; current ADMIN check and catalog read in one REPEATABLE_READ transaction; no catalog/audit mutation |
| GET `/{itemId}` | Canonical positive-bigint string path; no body/query |200 `AdminConcessionItem`; unavailable404 | Same logical-read authorization/snapshot boundary |
| POST collection | `CreateAdminConcessionItemRequest` below |201 `AdminConcessionItem`, Location pointing to the proposed detail resource | READ_COMMITTED; lock current ADMIN, protected create + audit, read receipt in same transaction; commit before response |
| PUT `/{itemId}` | `UpdateAdminConcessionItemRequest` below |200 `AdminConcessionItem`; unavailable404 | READ_COMMITTED; ADMIN SHARE then item UPDATE; edit allowed master fields only + audit |
| PUT `/{itemId}/status` | `{status:"ACTIVE"|"INACTIVE"}` exactly |200 `AdminConcessionItem`; unavailable404 | Same lock/commit boundary; preserve all item content/image and id/created_at; audit actual status change |

No DELETE, bulk import, category endpoint, media upload, per-Cinema endpoint, Customer mutation alias or audit-viewer endpoint. A list/detail split supports explicit GET recovery even when the UI uses dialogs. Future pagination is a separately versioned contract decision after actual volume evidence, not silent truncation.

**Authorization implementation note:** existing `AdminAccessService.requireAdmin` uses `SELECT ... FOR SHARE`. Therefore the proposed GETs are logically read-only but must not be annotated with PostgreSQL-enforced `readOnly=true` while reusing that method; PostgreSQL disallows locking reads in such transactions. Reuse its short normal transaction as existing Admin configuration does, or separately review a nonlocking read authorizer before promising strict read-only transactions. Do not silently alter shared auth to fit this report.

### 5.2 Request/response fields

Proposed minimal create body:

```json
{"name":"Bắp rang","description":null,"category":"POPCORN","sellingPrice":"55000.0000","status":"ACTIVE"}
```

Proposed update body (all four fields required, nullable description allowed):

```json
{"name":"Bắp caramel","description":"Phần bắp caramel","category":"POPCORN","sellingPrice":"65000.1234"}
```

Image is **read-only in the minimal slice pending image-policy approval**: creation stores null; update/status preserve the current image. This is the recommended narrow scope, not removal of the Image requirement. Optional later write extension could accept a nullable bounded `imageUrl` reference after approved schemes/hosts/relative-path policy; no remote fetching, upload, MIME verification or storage provider is implied.

`AdminConcessionItem` proposed fields: `id:string`, `name:string`, `description:string|null`, `category:POPCORN|DRINK|COMBO`, `sellingPrice:string` with exactly four decimals, `imageUrl:string|null`, `status:ACTIVE|INACTIVE`, `createdAt:string`, `updatedAt:string` (UTC ISO instants). Reuse current camelCase `imageUrl`, mapping existing DB column `image`; do not add a second image column. No stock/Cinema/availability counts, currency field, external audit data or row-version field is invented.

### 5.3 Proposed validation

- Exact body key sets; reject additional IDs/timestamps/price snapshots/role/stock/Cinema fields. JSON duplicate-key handling must be explicitly strict in the new request parser without changing existing controllers globally.
- ID: canonical ASCII `[1-9][0-9]{0,18}`, range1..9223372036854775807. JSON/path identity stays string; no JavaScript Number conversion. Normalization/rejection is part of this new proposed contract, not a rewrite of older Customer parsers that accept leading zeros.
- Name: string, strip surrounding whitespace, nonblank, at most150 Unicode code points; reject NUL. Display names are **not unique**: table and existing catalog explicitly permit duplicates. Do not add case-insensitive uniqueness or duplicate-name409.
- Description: null to clear or nonblank string after surrounding whitespace normalization; PostgreSQL text has no approved business length maximum. Do not invent a500/1000-character domain limit. Technical request-body bounds must be explicit if introduced; render text, never raw HTML.
- Category/status: exact current uppercase tokens. Create requires an explicit selected status, with no undocumented default, DRAFT or auto-activation rule. FR-CONCESSION-004 enable/disable supports proposing both transitions despite the abbreviated one-way lifecycle diagram; confirm this in the approved new contract.
- Price: plain decimal JSON **string**, up to15 integer digits and at most4 fractional digits, no sign/exponent/whitespace/group separators; `0` valid, negative/NaN/Infinity/≥10^15 invalid. Proposed canonical lexical form disallows leading zeros except0. Parse BigDecimal and pass **unconstrained numeric** into the guarded routine before any typmod coercion; reject overprecision before storage can round. Return exact four-decimal string. No whole-VND or positive-only Payment submission restriction is imported into catalog pricing.
- `imageUrl` remains returned as stored, nullable, bound by existing varchar2048. Do not modify or eagerly fetch a legacy reference when changing price/status. The Customer already has safe-reference/failure fallback presentation; this is not proof of a media hosting policy.

### 5.4 Errors and uncertain results

Proposed fixed ProblemDetail `{title,status,detail,errors?}`; safe field messages only, no SQL diagnostics or supplied payload echo. Use dedicated advice or explicitly include the new controller in reviewed ADMIN advice; current advice is scoped and does not automatically apply.

| HTTP | Proposed meaning / handling |
|---|---|
|400|Malformed/duplicate/extra/missing keys, invalid IDs/category/status/decimal/text/query; reject before mutation |
|401|Missing/invalid/expired authentication via existing security |
|403|CUSTOMER/STAFF/MANAGER, current BLOCKED/non-ADMIN/deleted actor; HTTP layer and protected command both enforce |
|404|Missing ADMIN catalog item; never repurpose Customer catalog visibility to hide INACTIVE from ADMIN |
|409|Bounded lock/contention/serialization or genuine constraint conflict; reload/review, no automatic retry. Duplicate names alone are not conflicts |
|503|Infrastructure/unexpected failure; safe unavailable response; client must treat a write response as uncertain where commit cannot be excluded |
|429|Handle safely if infrastructure actually supplies it; honor valid Retry-After. No new per-minute limit or limiter guarantee is proposed |

Map known validation SQL states separately from contention; unknown privilege/schema failures should fail closed without exposing internals. Do not map every23514 or42501 blindly to an invented “duplicate item” business rule.

POST is not idempotent: repeated valid creation may create two equal-name items with different IDs. No deduplication key or name lookup can prove command completion. For a lost/malformed POST receipt, stop further writes and let ADMIN inspect the complete list; do not auto-replay or guess an ID. For known-ID PUT/status uncertainty use detail GET and explicit review. A GET reports observed state, not which browser caused it, and cannot exclude a delayed commit. If exact cross-tab create-once behavior is later required, it needs a separate approved idempotency contract.

### 5.5 Concurrency, audit and least privilege

1. Reuse current guarded catalog persistence; do **not** grant runtime EXECUTE on raw deployment-only `configure_concession_item`, grant table DML, use migration credentials in Spring requests, or disable triggers.
2. Proposed actor-aware protected wrapper, e.g. `admin_configure_concession_item`, validates CREATE/UPDATE/STATUS inputs, locks current ACTIVE ADMIN User SHARE first, then the one catalog row UPDATE (new create has no existing row). Use existing NOLOGIN `smart_cinema_hold_owner`, because the catalog trigger explicitly checks that owner. New owners cannot bypass this guard by ordinary table grants.
3. Preserve current image/status while processing a content edit, and preserve content while processing status, using the **locked row** inside the command. Do not read outside the transaction then overwrite another ADMIN's unrelated status/image change.
4. Call the existing configuration routine only inside the wrapper; same transaction inserts a minimal `audit_records` row. Reuse existing table, actor FK, server timestamp, action/resource identifiers and JSON metadata. Proposed action names `CONCESSION_CREATED`, `CONCESSION_UPDATED`, `CONCESSION_STATUS_CHANGED` are implementation labels awaiting approval, not requirement IDs or existing values.
5. Audit stores actor/item/time and safe exact before/after sellingPrice/status plus changed-field names; no credentials, raw URLs, arbitrary descriptions or full request bodies. Fail the whole mutation if audit fails. Technical after-commit logging alone, as used by some older Admin modules, is insufficient evidence for the proposed persistent FR-AUDIT-006 implementation.
6. Proposed no-op update/status returns the unchanged resource without a new timestamp/audit; actual changes audit atomically. Approve this together with the HTTP contract. No audit read UI or new retention policy is introduced.
7. Existing Customer ADD locks parent Booking resources then catalog SHARE. Catalog management must **never** subsequently lock Showtime/Booking/Hold resources after taking the catalog lock. Thus add-versus-reprice/status serializes to a coherent old or new snapshot; an inactive winning state rejects the new add. No background propagation to Booking lines.
8. ADMIN writes on one item serialize; proposed minimal behavior is **last accepted write wins for the content edit**, matching existing configuration practice. No optimistic version/ETag/CAS is promised; a dialog's fresh GET and manual review cannot prevent all cross-tab lost updates. If stale-form409 is required, approve a version contract first rather than pretending updatedAt is already a concurrency token.
9. Reuse bounded lock/statement timeouts and short READ_COMMITTED writes. No network/media/provider call under locks. Same-state requests do not replay Customer add-ons or payment operations.

## 6. Database / Migration Assessment

**No new domain table or catalog/Booking column is necessary for the proposed minimal scope.** Existing numeric precision, nullable description/image, status/category constraints, FK protection and timestamps suffice. No name-unique constraint, category table, recipe table, Cinema mapping, audit viewer table or soft-delete flag is needed.

A **forward migration is nevertheless required for protected commands/EXECUTE grants and durable catalog audit**, because the present runtime intentionally cannot call the deployment writer. Tentative next source version is **V15**, e.g. `V15__guard_admin_concession_catalog.sql`, only if V14 is still head when implementation begins. This is a proposal; no migration file was created/applied. Preserve V1–V14 byte-for-byte and require migration approval before implementation.

Use fixed safe search_path and actual schema-qualified objects; revoke PUBLIC wrapper execution; grant only its narrow EXECUTE to the existing runtime grant role. Do not expose internal deployment function or broad owner membership. Audit table V10 already belongs to the protected owner; verify effective local privileges and receipt SELECT permissions in future tests.

The isolated local environment uses database-scoped copied privileges rather than shared runtime-role inheritance. Future tooling must deliberately grant only the new function inside that database using approved migration/deployment authority. Existing [LocalTestEnvironment.java](../../backend/scripts/LocalTestEnvironment.java) explicitly rejects source/history aboveV14; updating its audited head expectation and dedicated ACL verification is a necessary future test-tool task, **not** permission to loosen isolation or re-enable temporary superuser/bootstrap/reset commands.

Upgrade tests must prove V14→new head preserves actual existing catalog IDs/content/timestamps and Booking snapshots, checksums V1–V14, role restrictions and Customer behavior; install routines only, no seed/backfill/data repair. Migration failure stops implementation verification; no checksum repair or old migration editing.

## 7. Frontend Workspace and Design Plan

Reuse [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), `useAdmin`, existing auth/logout/backend identity verification and feature request patterns. Add only a future approved `/admin/concession-items` destination labelled **Bắp nước**. A single workspace with create/edit/status dialogs is sufficient; no separate detail/new/edit route is required solely for a mockup. GET detail still supports fresh dialog reads and recovery.

Proposed layout: heading **Quản lý bắp nước**, explicit **Thêm món**, list of ID/name/category/exact selling price/status, edit/status actions and optional existing image thumbnail with neutral fallback. No stock, purchase cost, tax, kitchen, revenue or global KPI columns. Category/status filtering may operate locally on the complete server array without new query parameters. Keep equal names as separate rows identified by ID. Image edit is omitted pending policy, not replaced with a fake uploader.

Create/edit form: name, description, the three category choices, decimal text input with decimal inputmode and no Number coercion; create has explicit status. Existing stored status is a badge/read-only in content edit; a separate status action avoids accidental stale status overwrite. Category changes are allowed on the master only; existing purchased category/name/price stays unchanged. Confirm **Ngừng bán món** with concise text that existing Booking items remain; propose **Bán lại món** for reactivation after the contract approval. Price-change confirmation/review shows old/new exact value and explains existing saved lines retain their snapshot. Do not show all demo state boards simultaneously.

Required actual states: initial skeleton, complete empty catalog, no local-filter matches, readable error/recheck, field validation, success announcement, item404/removal of stale dialog,401 session expiry,403 access loss,409 refresh/review,503/offline/malformed/uncertain write and optional429 wait. One in-flight command gate prevents duplicate click; no automatic POST/PUT on mount, refresh, login or retry. Prefer the existing Staff review pattern; if a new per-tab hint is justified it contains only untrusted item ID/review nonce, never catalog authority or private payload. No optimistic master change or automatic Customer price recalculation.

Reuse SurfaceCard/FormField/Button/StatusBadge/StatusFeedback/Skeleton and [Dialog](../../frontend/src/components/ui/dialog.tsx), semantic tokens/fonts from `.stitch/DESIGN.md` and current globals. Test390/768/1440: mobile/tablet cards or stacked controls and desktop rows; wrap long Vietnamese labels/IDs/decimal amounts, no horizontal overflow/header overlap. Native form labels, error associations/live announcements, first-error focus, visible focus,44px controls, dialog Tab/Shift+Tab/Escape/trigger-focus restoration, busy-close protection and reduced motion. No claim of completed visual/device QA in this preparation task.

### Live Stitch evidence and missing design

Read-only MCP `get_project`, `list_screens`, three `get_screen`, three HTML `download_file` and one screenshot `download_file` succeeded for project `1208499799798658711` (**Smart Cinema Ecosystem**). Project metadata updateTime returned `2026-10-13T22:29:14.961583Z`; inventory returned **48 resources**,30 with device metadata and18 untyped resources. These are not48 completed unique UI screens. A listing/preview does not establish job completion or design approval.

| Current returned reference | Actual inspection / use |
|---|---|
| `602baa042d22404d8b31d461351aa42d` — Food & Drinks | get_screen + HTML + screenshot inspected; Customer basket/catalog selection, not ADMIN management |
| `1017f7c1f77943579d9bb1bee37f7718` — Food & Drinks (Seat Hold Expired) | get_screen + HTML inspected; Customer expiry variant, not ADMIN management |
| `a76b3e182457474ab63a874b18b5d5e7` — ADMIN Staff List | get_screen + HTML inspected; reuse AdminShell visual direction/list/states only, not Staff fields or permanent prototype state board |

All seven returned ADMIN-labelled resources are Staff designs: List `a76b3e182457474ab63a874b18b5d5e7`, Detail `3e0264b3d0d44bed9fb08e37e56a253c`, Create `ac7d4f2d4a8a461e8fed0064ddb0eef7`, Assignments `3d1c054f04e544639ce2c57d4558718a`, Account dialogs `c55feb9b893242c2a8a4bd1177aeaded`, Add assignment `cfb33f1500e245f6bcef2c6767778334`, Assignment dialogs `b7fbb4d0249b4e7aad51441ef4aef531`. No dedicated ADMIN Concession resource or approval was found in the returned inventory/repository approvals.

Food photography resources include `cd77377730824fbcba1b9f12e4e4c784`/`82d34150a46a467a90ea4f0933b1e249` popcorn, `d194632f74d04fb3b8b46e0631b8c0f7` cola, `98e0897836c840a09132c20bc2023d3a` soda, `081f444b338947afad9e66d06a8d8f12` water and `f145e703600c491bb9fc5b2d9cbafbf4` combo photography. They are asset references, not ADMIN pages, product records or approved image-hosting policy. Cached `.stitch/SITE.md` counts are historical; no cache was rewritten.

**Design work before frontend implementation:** request/approve ADMIN catalog workspace, create/edit form, status/price review dialogs and conditional state variants at mobile/tablet/desktop, reusing Staff shell/Nocturne. Keep copy Vietnamese and the approved fields/statuses above; exclude Customer checkout/timer/stock/KPI/unsupported navigation. The old Food HTML contains row-delivery/kitchen/8-minute/security/instant-issuance copy unsupported by this contract; do not carry it forward. Backend work can proceed independently after contract/migration approval; no Stitch generation/edit occurred here.

## 8. Test Acceptance Matrix — Future Work, Not Run

**Every future DB integration operation must target only `127.0.0.1:5432/smartcinema_phase4e_test`**, using the documented isolated environment. No Neon, remote fallback or historical alternative QA database. Isolate automated fixtures in approved generated schemas inside that same database with no reset of existing data; review existing test cleanup and actual credentials/ACL first. Do not run root dev/seed/admin commands. Preparation did not open any DB connection.

| Acceptance area | Required evidence |
|---|---|
| Route/auth matrix | Every proposed ADMIN endpoint: anonymous401, real CUSTOMER/STAFF/MANAGER403, current blocked/role-changed/deleted ADMIN403 despite stale JWT; ACTIVE ADMIN allowed. No catalog/audit mutation on denial |
| List/detail | ACTIVE and INACTIVE, deterministic order, empty[], duplicate names distinct, missing404, canonical huge string IDs; no accidental public exposure of status/timestamps |
| Create |201/Location/coherent DTO, explicit initial status, exact persisted decimals/UTC/server IDs, protected audit same transaction; no direct DML/raw configuration privilege |
| Content edit | Name/description/category/price persist; id/created_at/image/status preserved; returned updatedAt server-issued; missing404; same-value no-op per approved contract |
| Status | ACTIVE→INACTIVE and reverse per approval; public visibility changes, no destructive deletion, content/history preserved; same-state no-op; audit actual change |
| Validation | Required/excess/duplicate keys, numeric/zero/negative/overflow/leading-zero IDs; empty/oversize name, null/blank description, invalid category/status; unknown query; image field rejected while read-only |
| Exact prices |0,15-digit maximum integer,4 decimals and fractional values survive; negative/10^15/exponent/NaN/Infinity/JSON number/>4 decimals reject without rounding or partial audit |
| Duplicate data | Two equal-name creates yield distinct IDs as existing model permits; repeated clicks gated; uncertain POST never auto-replayed; no invented duplicate-name409 |
| Snapshot integrity | Change master name/category/price/status after a real supported pre-Payment selection; existing line quantities use original snapshots; new active add captures new master; inactive new-add409; zero-line Booking valid |
| Frozen/terminal history | Existing Payment initiation freeze and terminal/Paid guard regressions retained; master edit never alters line/Booking/Payment/Seat/Hold snapshots, finalAmount, paymentStartedAt or original expiresAt |
| Concurrency | ADD versus reprice/deactivate results in coherent old/new snapshot or rejection; no mixed fields/deadlock inversion; two ADMIN edits/status commands preserve unrelated fields and documented serialization; bounded waits roll back mutation+audit |
| Audit | Actor/item/time and exact safe price/status delta, no secrets/full payload; simulated audit failure rolls back catalog; no duplicate audit on approved no-op; runtime cannot UPDATE/DELETE audit |
| DB/migration | Existing guarded DML/TRUNCATE/raw configure denied; only wrapper EXECUTE allowed; blocked actor denied inside wrapper; V14 upgrade/data/old checksums preserved; no new table/column or broad role membership |
| Customer API compatibility | Same four existing endpoints/status/errors/order/nullable fields; active-only catalog, exact four-decimal strings and no metadata leakage; Promotion recalculation/freeze unchanged |
| Frontend adapters | Typed ADMIN DTO/status/identity/price validation; mismatched/malformed receipts uncertain; safe400/401/403/404/409/503/429 handling and no-store/abort/stale-response protection |
| Frontend E2E | Clearly labelled HTTP fixtures for UI states; create/edit/status, duplicate click, reload/direct entry/login, unknown create receipt, offline/5xx/malformed/late GET, two tabs, keyboard/dialogs,390/768/1440 |
| Actual local integration | Separate real backend/browser evidence with explicitly approved synthetic ADMIN/items; supported API creates/changes only; read-only snapshots/protected audit evidence via authorized diagnostics. Fixtures do not establish actual commits |
| Regression | Future `mvn verify` with reviewed dedicated local profile/flags; frontend typecheck/lint/unit/build + focused and full Playwright with no skips/retry masking. Update five-link Admin navigation assertions to include only the newly approved sixth resource |

Isolated synthetic test fixtures, if needed for historical PAID guards, must remain explicitly labelled test-only and cannot count as real VNPAY/issuance proof. Positive unpaid catalog/snapshot tests do not require starting VNPAY or fabricating financial success. Exact final counts must be recorded by the implementation task, not predicted here.

## 9. Decisions / Approvals and Blockers

| Decision | Recommendation / impact |
|---|---|
| Approve proposed API and minimum behavior | Five resources, complete array, explicit create status, duplicate names allowed, exact prices, no DELETE, separate status, logical read authorizer, documented last-write-wins/no idempotency |
| Approve protected migration/audit | New actor-aware wrapper/atomic audit/narrow database-scoped execution; probableV15, preserveV1–V14. Needed before any write API implementation |
| Approve minimal image scope or decide image write policy | First backend slice returns existing imageUrl and preserves it; creation null. Asset reference editing needs policy; upload/cloud media remains separate |
| Approve dedicated ADMIN Concession design | Missing; required before frontend visual implementation. Current Customer Food screen is not approval of an ADMIN workflow |
| Custom categories/recipe combos/Cinema availability | No current contract/model; REQUIRES DECISION plus separate approved scope if desired. Omit without blocking core three-category catalog |
| Strong stale-edit/create-once guarantee, if desired | Requires explicit version/idempotency contract; current proposal truthfully lacks these guarantees. No invented409/duplicate rules |

Core approved requirements are adequate, so this is **not BLOCKED BY REQUIREMENTS**. Contract/migration/design approvals remain; no approval question or implementation is initiated by this report. Payment Phase4F's legitimate issuance blocker is independent of ADMIN catalog preparation and does not justify fake settlement or delay backend catalog-only work.

## 10. Ordered Implementation Tasks

1. **Phase5B-1 — backend catalog contract and audited APIs:** obtain approval for the minimal scope/contract/migration above, then publish a new ADMIN Concession contract before source implementation. Recheck HEAD/migration head and applicable workflows; preserve current pending work.
2. Add forward-only protected wrapper/atomic audit/ACL migration and focused isolated upgrade/security tests. Review isolated launcher head/ACL changes before applying only through approved local workflow; no bootstrap, reset or repair.
3. Add proposed `AdminConcessionController`, request/response validation, service/repository and scoped safe exception mapping under existing `com.smartcinema.admin`; reuse AdminAccessService, existing catalog guard/configure routine and exact money. Add narrow CSRF matcher for new Bearer ADMIN writes; existing generic ADMIN role gate remains authoritative.
4. Complete local HTTP/DB acceptance including new APIs, price/status audit, Customer snapshot/concurrency compatibility, existing Payment freeze; execute meaningful backend regression and report actual results. This backend phase has no new frontend visual prerequisite.
5. **Design preparation:** create/review missing ADMIN catalog/form/dialog states using current Nocturne/AdminShell and approved contract. Separate authorized design task; no designs generated here.
6. **Frontend implementation after design approval:** proposed `/admin/concession-items`, new feature-local `admin-concession-api/types/service/screen` and tests; reuse generic primitives. Add navigation and positively update its existing tests. Do not repurpose numeric-price preview services.
7. Run frontend regressions and actual isolated backend/browser smoke; record fixture versus real persistence separately. Update guide/handoff and new implementation reports with exact results/limitations; stop at authorized phase.

Candidate future files are a plan, not created files. No changes to Customer routes, Booking state machines, VNPAY, Ticket issuance, unrelated ADMIN modules or global theme are needed. Audit requirements must be implemented for this feature without refactoring historical Admin auditing wholesale.

## 11. Verification, Files and Requirement Reconciliation

Actual checks: source/contract/SQL/test inventory and live read-only Stitch metadata/HTML/screenshot inspection **PASS** for this preparation scope. No new business functionality was executed. Historical evidence: Concession backend milestone163/163 PASS with19 new Concession/request/migration cases; Customer frontend milestone94/94 unit,130/130 browser and294 backend PASS, with full live new-Booking write **NOT RUN**. Those dated counts are not current test results and do not prove ADMIN capability.

TypeScript/lint/unit/build/Playwright/backend tests/Flyway/live local DB/Neon/provider: **NOT RUN** in Phase5A; analysis/documentation only. No local database readiness or current deployed catalog content is claimed. Test source gates and historical cleanup point at other QA setups; future harness must be reviewed/repointed to the exact authorized isolated target before execution, not copied blindly.

Files created: this dated preparation report only. File modified: [current handoff](../ai/current-handoff.md), additive Phase5A entry preserving incoming edits/history. No files moved. Final SHA-256 comparison of804 baseline repository files found only the intended handoff change; the preparation report is the sole new file. All45 report links resolve. Existing production source, migrations, requirements, historical contracts/reports, Stitch and incoming Phase4F tooling remain unchanged; `git diff --check` passed, index/HEAD unchanged. Git's LF→CRLF advisory for the existing handoff is not a whitespace-check failure.

Requirement reconciliation: **PASS** preparation inventory/traceability/scope/security/snapshot analysis; **PARTIAL** overall ADMIN Concession feature because implementation is deliberately absent. No new BR/FR/UC/NFR/Business Rule ID or business policy was silently adopted. Existing convention conflicts are historical filenames and stale design/contract narratives; preserved and identified, not mass-renamed or rewritten.

## Convention Compliance

Checked against [canonical conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/report naming | PASS | `docs/reports/2026-10-25_admin-concession-management-preparation_report.md`, additive existing handoff |
| Proposed source/API naming | PASS proposal | PascalCase Java, kebab-case frontend/resource paths, camelCase fields, canonical uppercase statuses; no files/endpoints implemented |
| Domain/requirements | PASS | Concession/Booking/Cinema terms, exact existing requirement IDs, proposals separated from facts |
| Database/security | PASS planning | No connection/mutation; future-only forward migration, protected owner/ACL/audit compatibility, isolated local tests |
| Documentation/history | PASS | New report and additive handoff only; preserve source/contracts/requirements/history/incoming changes |
| Runtime routes/imports | NOT APPLICABLE change | Existing components inspected only; future implementation must read installed Next guides first |

No new convention exception. Remaining limits: absence of approved ADMIN Concession design/image-write policy/new HTTP contract, no current runtime verification, and explicit version/idempotency limits of the proposed minimal contract.

## 12. Final Outcome and Smallest Safe Follow-up

**READY WITH APPROVALS REQUIRED.** Smallest safe next task: **Phase5B-1 — approve/publish the minimal ADMIN Concession API contract, then implement protected backend list/detail/create/content-update/status APIs with atomic catalog audit and isolated local regression**. Keep image writes, dynamic categories, recipe combos, Cinema mapping and frontend visual work outside that slice until separately decided/approved. Do not start automatically.
