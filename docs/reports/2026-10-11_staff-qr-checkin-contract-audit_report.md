# Phase 4A — Staff Booking QR Resolution & Ticket Check-in Contract Audit

## 1. Task Information

- Date thực hiện: **2026-10-12, Asia/Saigon**. Tên file mang ngày 2026-10-11 được giữ đúng đường dẫn người dùng yêu cầu; đây không phải ngày thực hiện giả định.
- Type: read-only technical audit; chỉ tạo báo cáo, không triển khai Phase 4.
- Module: Staff authorization, Cinema assignment, Booking QR resolution, independent Ticket Check-in.
- Status: **AUDIT COMPLETE; IMPLEMENTATION BLOCKED ON CONTRACT/POLICY APPROVAL**.
- Entry HEAD: `b8a4d21d8d1774a3bb79ba7335a46420568af1fc` — Phase 3C.
- Entry working tree: một báo cáo Phase 3A untracked, được giữ nguyên; index rỗng.

**Kết luận:** backend đã có issuance được bảo vệ, một Booking QR ổn định và một Ticket cho mỗi purchased Seat Unit. Tuy nhiên, chưa có bảng phân công Cinema trong V1–V12, Staff scope service, Staff QR resolver, Check-in API hoặc protected Ticket transition writer. `trg_tickets_guard` đang cấm UPDATE/DELETE. Khung giờ admission được yêu cầu nhưng chưa định nghĩa. Không thể triển khai Check-in thật chỉ bằng cách sử dụng enum `CHECKED_IN` hoặc giao diện Stitch.

Đề xuất nhỏ nhất: hiện thực assignment theo physical design đã có; ba Staff resources cho scope, QR resolution và selected Ticket Check-in; protected writer và guard/audit assertions trong một migration tiến tới sau V12. Một Staff Booking GET là bổ sung tùy chọn cho direct-entry/recovery không lưu QR. Tất cả endpoint/DTO/transition mechanism đề xuất bên dưới **chưa tồn tại và chưa được triển khai/phê duyệt thành API contract**.

## 2. Requested Work

Kiểm tra capabilities thật, RBAC/scope, exact opaque UTF-8 QR transport, Ticket guards/audit/grants, eligibility, repeated scans, duplicate/concurrent requests và rollback. Đề xuất hợp đồng nhỏ nhất, đánh giá migration, đối chiếu ba live Stitch HTML/PNG và lập thứ tự triển khai/test. Không thay đổi backend/frontend/database/migrations/API contracts/Stitch; không commit/deploy, không bắt đầu Phase 4B.

## 3. Documents Reviewed / Evidence

| Reference | Nội dung đã kiểm tra |
|---|---|
| [AGENTS.md](../../AGENTS.md), [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [conventions](../development/project-conventions.md), [review workflow](../../.agent/workflows/REVIEW_WORKFLOW.md) | Traceability, scope, naming, preservation, report template và hậu kiểm |
| [Requirement rules](../../.agent/rules/REQUIREMENT_TRACEABILITY.md), [document rules](../../.agent/rules/DOCUMENT_RULES.md), [convention pointer](../../.agent/rules/PROJECT_CONVENTIONS.md), [coding rules](../../.agent/rules/CODING_RULES.md), [UI rules](../../.agent/rules/UI_UX_RULES.md), [backend](../../.agent/workflows/BACKEND_WORKFLOW.md)/[frontend workflows](../../.agent/workflows/FRONTEND_WORKFLOW.md), [frontend instructions](../../frontend/AGENTS.md) | Chỉ audit; không viết framework code. Không có `backend/AGENTS.md` |
| [Phase 3A](2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md), [Phase 3B](2026-10-11_customer-booking-history-ticket-qr-backend_report.md), [Phase 3C](2026-10-11_customer-my-bookings-ticket-qr-frontend_report.md) | Phân biệt historical capability với implementation hiện tại; giới hạn live/fixture evidence |
| [Customer read contract v1.0](../api/customer-booking-history-ticket-qr-contract-v1.0.md), [current handoff](../ai/current-handoff.md) | Exact UTF-8 QR, paid aggregate consistency, independent read recovery; prior handoff sections còn wording preview lịch sử |
| [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md) | BR-002–004, 043–053, 055, 062; FR-AUTH, FR-TICKET, FR-CHECKIN, FR-ORG, FR-AUDIT; NFR concurrency/security |
| [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), §§33–39, 44, 47–49 | One Booking QR, mixed Ticket states, scope, independent arrivals, Check-in audit |
| [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), §§5.2.3, 5.3.10, 5.5 Ticket rules, 5.9 sequence | DOCX XML semantic inspection: UC-STF-001–009, UC-STF-004 flow/alternatives, BRULE-TICKET-001–009; no fixed minute window found |
| [Historical project scope](<../project-scope/project-scope v1.0.md>), §5.9 | Per-Ticket QR wording is superseded by BRD/SRS v1.2; not silently rewritten |
| [Logical ERD](../db/erd/smart-cinema-logical-erd.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), §§3.3/4/5, [database decisions](../db/database-design-decisions-v1.0.md), §3 | Assignment is a design proposal, not a deployed table; COUPLE is one whole unit/one Ticket/two guests |
| [Integrity v1.0](../db/integrity-enforcement-design-v1.0.md), §§4/7; [v1.1](../db/integrity-enforcement-design-v1.1.md), §1; [v1.2](../db/integrity-enforcement-design-v1.2.md) | Corrected runtime lock order, protected writer, paid assertions, Check-in design versus V10 implementation |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [Booking v1.3](../api/booking-contract-v1.3.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md) | Financial authority/freeze/expiry unchanged; Nocturne and one Booking QR model |
| Actual migrations V1–V12, Java controllers/security/auth/Booking/Payment readers, PostgreSQL tests, frontend routes/navigation/QR renderer | Verified source inventory; no reliance on design enums to infer working APIs |

Local ignored audit evidence: `frontend/target/staff-qr-checkin-audit-2026-10-12/`. It contains downloaded design exports, preservation baseline/checks and sanitized metadata; no live Customer QR or credentials. Source citations below identify actual files and named functions so findings remain reviewable without these generated artifacts.

## 4. Requirements Traceability

| Actual requirement / document section | Verified meaning | Audit result |
|---|---|---|
| BRD BR-002–004; SRS FR-AUTH-007/008; NFR-SEC-002/003 | Backend Role + Cinema Scope; no frontend authority | Role framework exists; Staff scope is missing |
| BR-043–047; FR-TICKET-001–009; BRULE-TICKET-001–003/007/008 | Protected issuance; one QR, one Ticket per purchased unit; rescan does not consume QR | Issuance/Customer reads exist; Staff resolver missing |
| BR-048/049; FR-TICKET-005/006; FR-CHECKIN-001–004/006/010/013; UC-STF-002/003/005/007 | Resolve Booking, PAID/scope validation, current Ticket list and safe result | Missing operational Staff API |
| BR-050/053/055; FR-ORG-002/004/005; BRULE-TICKET-006; BA INV-09/12 | Current authorized Staff Cinema assignment | Design exists; no runtime assignment table/service/writer |
| FR-CHECKIN-005; System Analysis §5.3.10; BA §35 | Server-time admission-window policy | **Unresolved product decision**; no approved concrete interval/configuration |
| BR-051; FR-CHECKIN-007–009/012; NFR-CONC-003/005/007; BRULE-TICKET-004/009 | Selected VALID Tickets, partial Booking usage, at most one success per Ticket | Requires protected transition, ordered locks and tests |
| FR-TICKET-010; BRULE-TICKET-005 | CANCELLED/EXPIRED Tickets cannot Check-in | States exist, operational rejection/writers absent |
| BR-052/062; FR-CHECKIN-011; FR-AUDIT-004 | Operator/time on Ticket and immutable Check-in audit | Columns/audit storage exist; no Check-in writer/assertion |
| NFR-SEC-005/006/009–012; NFR-OBS-004/006 | TLS, strict validation, QR/log redaction, safe errors, sensitive-endpoint rate limiting, distinct audit | Required acceptance/security work; no Staff-specific limiter found |
| NFR-PERF-004; BRD KPI-11 | P95 QR validation target ≤2 seconds | Future load/acceptance measurement; not measured here |
| UC-STF-001/009 | Staff Login/Logout | Shared authentication exists; no Staff destination |
| UC-STF-006/008; SRS §6.2 | Manual Booking lookup (Should), Check-in history (Could) | Separate optional contracts; not implied by scanner core |

IDs above exist in the cited documents. Proposed HTTP result codes, DTO names and database objects are engineering proposals, not new requirement IDs. BA INV numbering is cited from BA specifically; similarly numbered SRS invariants are not assumed identical.

## 5. Audit Findings and Proposed Design

### 5.1. Verified current capabilities and missing backend functionality

| Area | Verified current source | Boundary / missing capability |
|---|---|---|
| Staff role | [UserRole](../../backend/src/main/java/com/smartcinema/user/UserRole.java); [V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) | STAFF/MANAGER/CUSTOMER/ADMIN are valid roles; no separate Staff entity/table |
| Account state | [AccountStatus](../../backend/src/main/java/com/smartcinema/user/AccountStatus.java), [User](../../backend/src/main/java/com/smartcinema/user/User.java) | Application has ACTIVE/BLOCKED. V1 SQL only requires nonblank status, not an ACTIVE/BLOCKED CHECK |
| Login/renewal | [LoginService](../../backend/src/main/java/com/smartcinema/auth/LoginService.java), [TokenRenewalService](../../backend/src/main/java/com/smartcinema/auth/TokenRenewalService.java) | Current ACTIVE users of existing roles can authenticate; token issuance does not establish assignment |
| Principal | [AccessTokenService](../../backend/src/main/java/com/smartcinema/auth/AccessTokenService.java); [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java) | JWT subject is User ID; role claim maps to ROLE_ authorities. No Cinema assignment claim/scope resolver; current database status/role must be rechecked by future Staff service |
| Account provisioning | [User](../../backend/src/main/java/com/smartcinema/user/User.java), controllers inventory | Public registration creates CUSTOMER; development CLI supports ADMIN. No Staff creation/assignment management HTTP API found |
| Cinema hierarchy | [V4](../../backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql) | Booking → Showtime → Hall → Cinema is the actual scope relationship; never infer scope from a Ticket code or client branch label |
| Assignment | All V1–V12 CREATE TABLE statements; [dictionary §3.3](../db/physical-data-dictionary-v1.0.md) | **No `cinema_assignments` table, FK, grants, Staff assignment repository/service or scope middleware**. Logical/physical design is not implementation |
| Issuance | [V10 `record_vnpay_result` / `assert_paid_aggregate`](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql) | Trusted eligible settlement creates PAID + sold snapshots + consumed Holds + one QR + Tickets + audit atomically. SUCCESS alone may remain unfulfilled/unpaid |
| QR | [V6](../../backend/src/main/resources/db/migration/V6__create_pending_bookings.sql), `uq_bookings_qr`; V10 writer | Stable unique nullable varchar(128), current writer produces 64 lowercase hex characters from two UUIDs. Not SHA-256/signature/rotating token |
| Ticket reads | [BookingReadService](../../backend/src/main/java/com/smartcinema/booking/BookingReadService.java), [repository](../../backend/src/main/java/com/smartcinema/booking/BookingReadRepository.java) | ACTIVE owning Customer only; complete aggregate validation. No supported Staff reuse of that ownership route |
| Ticket transitions | V10 `guard_payment_record`, `trg_tickets_guard` | INSERT only under `smart_cinema_hold_owner`; UPDATE/DELETE rejected, including owner UPDATE. No operational Check-in, expiry or cancellation writer |
| Runtime privileges | V10 permissions block; V5–V12 owners/grants | `smart_cinema_hold_runtime` can SELECT Tickets; not UPDATE. `smart_cinema_payment_system` invokes trusted result/query functions, not Staff admission |
| Audit | V10 `audit_records`, `trg_audit_records_guard` | Append-only, attributable user/system actor. Current SALE_FINALIZED/PAYMENT_OBSERVED events do not prove Ticket Check-in audit |

No live Staff account, assignment count, applied production schema or eligibility was queried. Statements about database structure refer to checked migration source and prior isolated integration evidence, not a new Neon inspection.

### 5.2. Existing HTTP inventory relevant to Staff

| Existing endpoint | Actual access/behavior | Staff suitability |
|---|---|---|
| POST `/api/v1/auth/tokens`; POST `/api/v1/auth/token-renewals`; POST `/api/v1/auth/token-revocations` | Shared login/renew/revoke; current ACTIVE check on login/renewal | Reuse authentication; no employee-code/card login |
| GET/PATCH `/api/v1/profile` | Explicit CUSTOMER security matcher | Not a Staff profile/scope endpoint |
| GET `/api/v1/bookings`; GET `/api/v1/bookings/{bookingId}`; GET `/api/v1/bookings/{bookingId}/tickets` | Explicit CUSTOMER, current ACTIVE role and owner check; no-store | Staff cannot use these as operational reads. Do not broaden owner APIs as a shortcut |
| GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | Known-attempt owned CUSTOMER lookup | Not a Staff resolver; unnecessary provider/financial identity dependency |
| GET public Movies/Cinemas/Showtimes/Seat map/Concessions | Public discovery/catalog projections and readiness filters | Not assignment, admission validation, paid Booking operational view or Check-in |
| `/api/v1/admin/**` | ADMIN-only; Movie/Cinema/Hall/Seat/Showtime authoring | No Staff assignment/Check-in implementation; no automatic MANAGER/STAFF inheritance |
| GET VNPAY return/IPN | Provider transport/verification boundary | Not Staff admission; no callback/signature changes |
| Staff QR resolution, selected Ticket Check-in, assignment list, operational Booking recovery/history | **No mapped endpoints found** | Missing; all paths in §5.7 are proposals |

Sources: [BookingController](../../backend/src/main/java/com/smartcinema/booking/BookingController.java), [BookingReadController](../../backend/src/main/java/com/smartcinema/booking/BookingReadController.java), [VnpayController](../../backend/src/main/java/com/smartcinema/payment/VnpayController.java), [security configuration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), controller mapping search across main Java source. `.anyRequest().authenticated()` is a fallback, not operational Staff authorization and does not create routes. New Staff resources need explicit method/path role rules and deliberate Bearer/CSRF integration consistent with the existing architecture; do not disable CSRF globally.

### 5.3. Staff Cinema authorization model

**Verified:** User has one role; no `cinema_id` field or runtime assignment relationship. Multiple assignments are **not supported operationally today**. [Logical ERD](../db/erd/smart-cinema-logical-erd.md) proposes User 0..N → Cinema Assignment; a hardcoded single Cinema, a Movie/Hall association or the JWT role cannot substitute for that relationship.

**Minimum proposal:** implement the already documented `cinema_assignments`: `id`, `user_id`, `cinema_id`, `assignment_type` (STAFF/MANAGER), `status` (ACTIVE/INACTIVE), `effective_at`; User/Cinema FKs, preserved deactivation rows, active-scope partial uniqueness `(user_id, cinema_id, assignment_type) WHERE status='ACTIVE'` and dictionary supporting indexes. These encodings come from physical design, not current SQL. No shift, gate, HR schedule or new effective-until field is necessary for the minimal slice; overlapping future schedules remain deferred.

At every Staff read/command, require JWT STAFF **and** current database ACTIVE/STAFF, then current ACTIVE STAFF assignment with `effective_at <= serverTime`. Resolve actual Cinema through Booking/Showtime/Hall and compare it with the explicitly chosen operating Cinema; verify both are in current scope. Client `cinemaId` expresses intended context, never grants permission. A Staff with multiple approved assignments may select among them; physical gate location is not authenticated by that selection and is outside this contract.

Assignment creation/deactivation must use a protected, attributed Admin/appropriately scoped Manager operation. No self-assignment, runtime direct UPDATE or inferred/demo assignment. User/assignment administration must acquire target User UPDATE first, then Cinema and assignment rows in consistent order; Check-in holds actor User SHARE so revocation/block and Check-in serialize. Once admission locks are obtained, revalidate role/status, membership, parents and authoritative time. Do not retroactively invalidate historical Check-in audit when an operator is later blocked or unassigned.

**Dependency:** no supported provisioning path currently exists for real Staff accounts/assignments. Separately approve minimal protected provisioning/assignment administration before live admission; full Admin/Manager management UI is not required for scanner core and is not proposed automatically here.

SRS §7.2 additionally permits ADMIN Check-in and MANAGER “scope if permitted.” Initial Staff endpoints may be STAFF-only for this task; this is a scoped implementation proposal, not a claim that SRS prohibits Admin. Admin operation and conditional Manager permission require separate explicit contracts; do not silently grant either a new Staff role or wildcard Cinema access.

### 5.4. QR resolution security

1. Treat the QR as confidential bearer-like lookup material, **not authorization**. Possession never substitutes for Staff identity/current Cinema scope. The exact persisted token is the payload; no public resolver, Customer scanner permission, browser financial validation or frontend token signing.
2. Send exact token in a TLS authenticated JSON POST body, never URL path/query/fragment. Use parameterized lookup against `bookings.booking_qr_token`; no LIKE, suffix/code/phone lookup, trim, lowercase, Unicode normalization, URI fetching or format-dependent hex/hash parsing. Test exact spaces/Unicode bytes and lookup collation; applied database collation was not checked here.
3. Match approved Customer representation: nonblank intact UTF-8, at most 128 Unicode code points, no ISO controls or unpaired surrogates. Reject malformed JSON/encoding, duplicate JSON properties, unknown fields, missing/null/blank token and over-limit input with fixed safe 400. The 128-code-point upper bound needs at most 512 UTF-8 payload bytes; JSON escaping/request envelope needs a separate technical body-size bound, not an invented shorter token rule.
4. Authenticate/check current Staff first; look up and return only an aggregate within the Staff's active scope and chosen Cinema. Well-formed unknown token, foreign-Cinema token and inaccessible resource should share a safe **404** response with no Booking/Ticket/Customer details. Syntax errors can be 400 without echoing input. Generic Vietnamese guidance can mention checking the assigned Cinema without confirming that a foreign Booking exists. System Analysis's WRONG_CINEMA alternative does not justify leaking foreign Booking data.
5. Successful resolution is a **logical read**, despite POST for confidential transport: read-only REPEATABLE_READ, one snapshot/serverTime, no audit implying admission, no status/expiry/token mutation. Repeated scans return current committed statuses on each new request; they do not consume QR or automatically Check-in.
6. Apply no-store on success and safe errors, no service-worker/persistent cache, no QR body in logs, exception `toString()`, SQL diagnostics, APM/session replay/analytics, screenshots or persisted scan history. Inspect reverse-proxy/request-body logging during future deployment; absence of application logging is not proof of infrastructure redaction.
7. Return minimal operational fields and complete validated Ticket aggregate. Omit Customer name/email/phone/membership, raw QR, Payment IDs/provider references/signatures, prices/totals/Promotion, Hold origins and Staff audit identities. Purchased Concession name/category/quantity can be displayed as immutable composition; never claim pickup/fulfillment.
8. Rate-limit confidential lookups/commands per actor using approved technical limits; make 429/Retry-After behavior explicit. Existing Staff limiter was not found. Do not invent throughput thresholds or claim measured rate protection.

The paid aggregate must be validated before exposure, including one Ticket per purchased Booking Seat Unit, unique IDs/codes, snapshot type/guest count and issued/sold/paid timestamps. Reuse validation principles from the Customer read, with Staff scope instead of Customer ownership. Do not invoke an internal ID-only helper without authorization. QR is not returned to Staff, rotated or regenerated.

### 5.5. Ticket state machine, concurrency and rollback

[V10 Tickets](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql) has unique `booking_seat_id`, unique `ticket_code`, `status`, finite `issued_at`, nullable `checked_in_at` and User FK `checked_in_by_user_id`. Existing CHECK requires operator/time for CHECKED_IN and null audit columns otherwise, with `checked_in_at >= issued_at`. It does **not** prove Staff role/scope, a finite Check-in timestamp, one matching immutable Check-in audit or authorization of a status transition. The current append-only trigger prevents the update entirely.

| Existing serialized Ticket state | Resolution presentation | Proposed command behavior |
|---|---|---|
| VALID | “Chưa sử dụng”; selectable only if server admission policy permits | Only authorized transition: VALID → CHECKED_IN |
| CHECKED_IN | “Đã check-in”; non-selectable | ALREADY_USED result/conflict; no second success, timestamp/operator overwrite or duplicate audit |
| EXPIRED | “Hết hạn”; non-selectable | Reject; no automatic expiry writer in this task |
| CANCELLED | “Đã hủy”; non-selectable | Reject; no cancellation/refund writer in this task |

CHECKED_IN is terminal in physical design; do not persist USED as an alias. One COUPLE Ticket covers two guests and **one** unit-level transition; two occupants cannot check in separately. Partial admission is between different Tickets: checking selected units leaves all unselected units untouched. Booking remains PAID; sold markers, consumed Holds, QR, prices, Promotion/Concession freeze and original deadline remain unchanged.

**Recommended batch policy, requiring contract approval:** all selected Tickets validate before any write, then commit the selected set plus per-Ticket audit atomically. A foreign/missing Ticket, non-VALID state or ineligible Booking/Showtime causes the **whole selected batch** to fail; do not partially succeed inside a batch. Partial Booking usage still works via separate selections/requests. This choice resolves the API-design option left open by integrity v1.0 §7; it is not an existing backend behavior.

Concurrency must follow integrity **v1.1's corrected order**, not v1.0's earlier Promotion/Hold ordering: actor User SHARE → Cinema SHARE → Hall SHARE → Showtime UPDATE → Movie SHARE → Hall Seats ordered SHARE → Showtime Seat pairs ordered UPDATE → Showtime Bookings ordered UPDATE → Holds ordered UPDATE → any truly required later resource → selected Tickets ordered UPDATE → append audit. Check-in does not reprice Concessions, consume Promotion or update Payment; omit those mutation-specific later locks when not needed. Do not take a Ticket/Booking lock first and then wait for its parent gate.

V5 `lock_hold_context(showtime, staffId)` would reject STAFF because its nonnull actor branch requires ACTIVE CUSTOMER. A protected Staff entry must validate/lock Staff itself and use a safe internal lock-only adapter for the existing parent gate; do not pass the Customer owner or treat a NULL/system actor as Staff authorization. V6 `lock_booking_resources` supplies the existing broad Showtime pairs/Bookings/Holds lock order. Helpers are not publicly executable and must not be broadly granted to runtime.

After all waits, use fresh READ_COMMITTED reads and database `clock_timestamp()` for assignment/window/Ticket checks and one authoritative transition time. Use configured lock/statement/transaction timeouts; existing bounded-timeout patterns are in [SeatRepository](../../backend/src/main/java/com/smartcinema/seat/SeatRepository.java) and [VnpaySystemRepository](../../backend/src/main/java/com/smartcinema/payment/VnpaySystemRepository.java). Map contention safely; no infinite retry or hidden command replay.

- Same Ticket, concurrent Staff: first transaction succeeds; second sees CHECKED_IN after lock wait and fails safely. Exactly one event/operator/time persists.
- Different Tickets, same Booking: both may succeed sequentially without consuming each other's unit; broad Showtime gate currently serializes writes and needs latency/load validation.
- Overlapping selected batches: with the proposed all-or-nothing policy, a losing batch changes none of its otherwise unused Tickets; Staff re-reads/reselects explicitly.
- Duplicate POST/repeated click/lost success response: second command cannot succeed again. Return current conflict/state and resolve/read again; no automatic POST on mount/rescan/refresh/focus. State-effect idempotency does not promise identical HTTP responses.
- Any assertion/audit/constraint/database failure: rollback the complete selected transition and audits. Response becomes uncertain/unavailable, never a fabricated success. A read failure after commit must not be described as proof that mutation failed; recover via authoritative read/rescan.
- Repeated scan before/after another Staff commit: each complete snapshot may be older/newer; scan is advisory, final command revalidates. Ignore old/out-of-order browser results using actor/context/request identity; no frontend Ticket mutation as authority.

### 5.6. Admission eligibility and unresolved decisions

| Check | Evidence / actual meaning | Decision or implementation gap |
|---|---|---|
| Booking PAID and complete issued aggregate | BR-049, FR-CHECKIN-003, V6/V10 | Mandatory; Payment SUCCESS or a visible QR alone is insufficient |
| Selected Ticket VALID and part of this Booking | FR-CHECKIN-007/008, FR-TICKET-010 | Mandatory; command must bind Ticket → Booking Seat → Booking |
| Correct assigned Cinema | BR-050/053, FR-CHECKIN-004, FR-ORG-005 | Mandatory; runtime assignment absent |
| Actual Showtime identity | BR-049; hierarchy FKs | Derive from Booking; do not accept client replacement or assume current scanner context matches |
| Server admission time window | FR-CHECKIN-005; BA §35; UC-STF-004 | **BLOCKER:** exact opening/closing boundaries, inclusive/exclusive semantics and storage/configuration not approved |
| CANCELLED or unavailable Showtime/resources | SRS §8.6; validation intent | Recommend deny unavailable/cancelled operational context; exact allowed Showtime states and Cinema/Hall/Seat inactivity policy need approval |
| STARTED/ENDED progression | V4 states; V12 supported authoring values | No automatic progression found. Do not require STARTED if normal stored Showtimes remain OPEN_FOR_BOOKING after start; no browser lifecycle synthesis |
| Cinema/Hall inactive, Movie unpublished after sale | V4 status; historical owned reads; integrity §7 | Catalog visibility is not admission policy. Do not reuse public-discovery filters or payment-sale eligibility unchanged; decide operational closures separately |
| Original Booking expiresAt | Customer contract §3; V6 paid invariant | Pre-sale deadline only. Paid admission cannot be rejected solely because original expiresAt has passed |
| Ticket automatic expiry | State vocabulary only; no writer found | Not implemented/approved here; no clock-based frontend EXPIRED, no hidden batch expiry |
| Customer blocked after purchase | Existing issuance/Customer ownership distinctions | Check Staff's current status. Customer ACTIVE must not be silently reused as an admission veto; any such rule needs product approval |

V12 `configure_showtime` currently refuses edit/cancellation once Hold/Booking history exists or Showtime has started/ended. Therefore a cancelled paid Showtime is an important future rejection/test fixture case, **not evidence of a supported ordinary paid-showtime cancellation command**. No refund, reschedule or cancellation lifecycle change is proposed.

Stitch's “16:30–16:55”, “còn 25 phút”, room opening, 120-minute employee inactivity timeout and “hợp lệ vào rạp” samples are not approved admission policy. Until policy is approved, future code must fail closed for admission; resolution may display validated Booking/Ticket state with “Chưa thể xác định điều kiện vào rạp” and disabled Check-in, rather than treating VALID as admission permission.

### 5.7. Proposed minimal typed HTTP contracts — NOT EXISTING

All proposals require explicit approval before publication/implementation. Use `/api/v1/staff/`, explicit STAFF method matchers, valid Bearer JWT plus current database role/status/scope; no customerId/staffId overrides. All responses and errors no-store, all IDs canonical decimal **strings** on output, timestamps UTC ISO instants, counts JSON integers. Inputs reuse the positive-bigint range/parser (1–9223372036854775807; leading-zero strings normalize as current Booking parser does); deduplicate after numeric normalization. No query parameters except the optional recovery resource's declared Cinema context.

| Proposed endpoint | Input / response | Authentication, errors, semantics |
|---|---|---|
| **GET `/api/v1/staff/cinema-assignments`** | No query/body. `StaffCinemaAssignmentsResponse { serverTime, assignments: StaffCinemaAssignment[] }`; item `{ id, cinemaId, cinemaName, effectiveAt }`, only currently effective ACTIVE STAFF assignments | Current ACTIVE/STAFF. Empty array means no assignment, not fabricated Cinema. Read-only REPEATABLE_READ; no state transition. 400 unexpected query, 401 auth, 403 role/account, 503 unavailable; 429 if limiter applies. Repeat reads re-evaluate current scope |
| **POST `/api/v1/staff/booking-qr-resolutions`** | Exact `StaffBookingQrResolutionRequest { cinemaId: string, bookingQr: string }`; no query. Returns `StaffBookingResponse` below | Current ACTIVE/STAFF + valid chosen assignment + actual Booking Cinema match. Logical read-only REPEATABLE_READ; scan never checks in. 400 strict input, 401, 403 account/role or unavailable chosen scope, generic 404 unknown/inaccessible QR, 503 corrupt/unavailable aggregate, 429. Same token can be resolved repeatedly; no durable resolution-session entity |
| **POST `/api/v1/staff/bookings/{bookingId}/check-ins`** | Exact `StaffTicketCheckInRequest { cinemaId: string, ticketIds: string[] }`; nonempty, normalized unique IDs, all belonging to Booking. No query, no QR, user override, target state or client time. `StaffTicketCheckInResponse { checkedInTicketIds: string[], booking: StaffBookingResponse }` | Current ACTIVE/STAFF + current Cinema assignment; protected READ_COMMITTED command/locks. Proposed 200 only after commit of new transitions and audit. 400 syntax/duplicates, 401/403, generic 404 inaccessible Booking or foreign/missing selected Ticket, 409 state/eligibility/already-used conflict, 429, safe 503 transient database/timeout/policy unavailable. Atomic selected batch; no duplicate effects on replay |

POST resolution is justified by token confidentiality; `booking-qr-resolutions` and `check-ins` are plural resources, not `/doCheckin` action shortcuts. Check-in success is created by the backend writer only. Resolver has no financial or Ticket side effects. Customer cannot invoke these commands. Typed request DTOs require strict unknown/duplicate-property rejection, finite input bounds and redacted `toString()`; binding/ProblemDetail must never reflect QR values.

Proposed common response:

```text
StaffBookingResponse:
  bookingId, bookingCode, bookingStatus
  movieId, movieTitle, cinemaId, cinemaName, hallId, hallName, showtimeId
  startsAt, endsAt, showtimeStatus, serverTime
  admissionAllowed: boolean
  admissionReason: string | null
  tickets: StaffTicket[]
  concessions: StaffBookingConcession[]

StaffTicket:
  id, bookingSeatId, seatId, ticketCode
  row, number, seatType, guestCount
  status, checkedInAt: UTC instant | null
  canCheckIn: boolean

StaffBookingConcession:
  name, category, quantity
```

Existing serialized Booking/Ticket/Showtime states only; no new domain SUCCESS/USED/admission lifecycle. `admissionAllowed`, `canCheckIn`, `admissionReason` and command result names are **proposed computed fields**, not fields in current DTOs. Their exact reason vocabulary must be finalized with policy; `ALREADY_USED`, `NOT_PAID` alternatives come from UC-STF-004, and a reason is not a persisted Ticket state. `canCheckIn` is read-time guidance and is revalidated under locks.

Use purchased Seat type snapshot and guestCount (COUPLE=2), current permitted seat labels/catalog references, immutable Concession name/category/quantity. `endsAt`/Showtime status exist in persistence but require the proposed DTO. Omit raw token, Customer PII, issued payment metadata, prices, QR image, checkedInByUserId and unrelated operational counters. Persist operator internally; Staff only needs authoritative per-Ticket state/time for repeat feedback. Complete aggregate validation prevents partial/inconsistent Ticket responses; nonpaid optional ID recovery returns no issued entitlement.

**Optional additive recovery GET:** `GET /api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` returns the same `StaffBookingResponse`, with exact single allowed parameter, current ACTIVE/STAFF and assignment/actual-Cinema checks, no-store/read-only REPEATABLE_READ, 400/401/403/generic 404/503/429. Booking ID/Cinema navigation hints are untrusted and reveal no QR. This allows reload/direct entry and status recovery after lost Check-in response without retaining QR in storage. Without approval of this fourth resource, clear sensitive state on reload/login/context loss and ask Staff to rescan or re-enter the **exact QR token**; do not call Customer GET or silently cache QR.

**Conflict response proposal:** safe application/problem+json with fixed `title/status/detail` and, only for already authorized resource, optional typed `conflicts: [{ ticketId, reason }]`. No foreign Booking facts, raw inputs, QR, SQL or internal signatures. 409 for already used/non-VALID/known ineligible window; 503 for uncertain policy/service/timeout; re-read before next explicit selection. Explicitly document `Retry-After`/429 and request/body/Ticket-list technical limits in the final contract; do not impose a guessed business limit based on a demo Booking.

No Idempotency-Key storage is necessary for the recommended state-effect guarantee: CHECKED_IN + immutable audit uniqueness rejects duplicate admission. A repeated POST may return 409 rather than the original 200. If identical-response replay is required, approve a separate durable request-identity contract first. No automatic POST retry is proposed.

Manual Booking-code lookup, employee-code login, phone/suffix search, Check-in history/global counts and Admin/Manager admission APIs are **not** included. Their requirement/design presence does not create a callable contract. Additional APIs should be justified separately rather than added to make every Stitch control clickable.

### 5.8. Migration and protected-writer assessment

**A new forward migration is required for real Phase 4B**: assignment persistence is absent, and Ticket updates currently cannot pass their trigger. Source head remains **V12** in this audit. Proposed next head would be V13 after independent approval and rechecking repository head; no V13 file is created/applied, and V1–V12 must remain byte-identical.

Recommended protected design, subject to implementation review:

1. Add designed `cinema_assignments`, FKs/indexes/active-scope uniqueness, restricted reads and protected attributed assignment writer. No seeded assignment or account promotion. Enforce User → Cinema ordering for grant/revoke so admission and revocation races have a defined outcome.
2. Add a dedicated NOLOGIN `smart_cinema_checkin_owner`, with only necessary operational reads, selected Ticket status/audit column updates and controlled audit insertion. Runtime gets EXECUTE on an approved `check_in_tickets` command, **not** direct Ticket/assignment/audit UPDATE or INSERT, owner membership, provider-writer privileges or public helper EXECUTE. Actor comes from validated principal; function rechecks current ACTIVE/STAFF/scope. As with existing protected functions, the backend/database runtime login is a trusted service identity and must never be exposed to Customer clients.
3. Use a private schema-qualified SECURITY DEFINER lock-only adapter owned by the existing hold owner where the broad gate needs existing lock privileges; grant it only to the Check-in owner. Preserve current User/parent/order barriers and recheck discovered IDs. Do not grant broad financial table updates to the new owner merely to take existing locks.
4. Replace **only Ticket trigger routing** with a dedicated narrow guard: retain settlement INSERT under existing hold owner with issuance/paid assertions; deny DELETE; allow only Check-in owner UPDATE from VALID to CHECKED_IN, changing exactly `status`, `checked_in_at`, `checked_in_by_user_id`. All identity/code/booking_seat/issued_at fields immutable; finite database time ≥ issued_at; no transitions from or overwrites of CHECKED_IN/EXPIRED/CANCELLED. The protected command revalidates paid aggregate, actual membership and approved policy. No caller-writable GUC/verified flag is authority.
5. Preserve `guard_payment_record` behavior for evidence/reconciliations and existing financial audit. Use a dedicated append-only audit guard for `audit_records` that retains existing hold-owner insertion and permits the Check-in owner **only** canonical proposed `TICKET_CHECKED_IN` events for the matching transitioned Ticket/current actor. Do not add a broad new-role INSERT exception to all tables sharing the original function.
6. Append one Check-in audit per Ticket, not one ambiguous Booking event: actor_user_id, action, resource_type TICKET, Ticket resource_id, authoritative occurred_at and minimal Booking/Cinema/Showtime IDs. No token/Customer/provider/financial metadata. Add a narrowly scoped unique event constraint/index for that Ticket/action and a deferred per-Ticket assertion requiring matching immutable actor/time/audit. Validate associated audit insert against the Ticket transition; an audit-only fake success must fail. Historical events must remain valid after later operator deactivation.
7. Keep V10 paid-aggregate constraint triggers enabled. Existing assertions check issuance/sold/paid/Hold consistency; permitted Check-in must preserve all those fields. No new Booking status, QR regeneration, sale-marker clearance, Seat availability release or refund. Audit/transition failure rolls back the selected set completely.
8. Schema-qualified objects, safe search_path, PUBLIC EXECUTE revocation, NOLOGIN ownership, least privileges and schema-isolated migration handling must follow V5–V12 conventions. Check upgrade V12→next and clean install, existing-owner/managed migration privileges and runtime ACL before claiming deployability.

This is a design recommendation, not executable SQL or authority to mutate guards. Exact function signatures, constraint names, grant matrix and assignment administration contract must be reviewed before implementation. Existing restricted runtime read grants suffice for Customer retrieval; they **do not** suffice for Check-in. Development migration login may be more privileged than production runtime, so test actual restricted roles rather than relying on the datasource owner.

### 5.9. Live Stitch-to-frontend mapping and unsupported actions

Read-only `get_project` confirmed **Smart Cinema Ecosystem**, `projects/1208499799798658711`. Three `get_screen` calls succeeded; all three actual HTML and PNG files downloaded and inspected. Returned design dimensions below are export metadata, not CSS viewport measurements. MCP exposes no generation-job completion status; accessible exports do not certify job completion or implemented backend behavior.

Screenshot download URLs returned scaled PNG previews: respectively **512×464**, **449×512** and **171×512**. Their PNG headers and content were inspected; all design text/actions were also checked in the full HTML exports. Full-resolution PNG and pixel-level fidelity were not verified in this contract audit. Metadata dimensions must not be represented as the downloaded image dimensions. Asset hashes and both dimension sets are recorded in the ignored `stitch-evidence.json`.

| Live screen / ID | Available design | Existing real route | Proposed mapping |
|---|---|---|---|
| Quét mã vé & Xác minh Booking — `05a2ad0f96cd4502ba97662d5f0a2e12` | DESKTOP 2560×2318; HTML/PNG accessible; camera panel, manual input, Booking/Ticket selection, permission/network/result variants | **MISSING** Staff route | Proposed `/staff/qr-scan`: scanner + authorized result/selected Tickets; reuse Phase 1 feedback/button/card primitives |
| Bàn làm việc nhân viên soát vé — `713c9e3fae5f4ef7a907102243ebff5c` | DESKTOP 2560×2916; HTML/PNG accessible; scope/session feedback, workspace, sample KPI/Showtime/live history | **MISSING** Staff workspace | Proposed `/staff`: current account/assigned Cinema selector + scanner link; rich metrics/history deferred |
| Quét mã QR soát vé Mobile — `851e390ea6f64946b1c3e9814de03d63` | MOBILE 780×2334; HTML/PNG accessible; camera controls, stacked Booking/Ticket result, selection CTA, manual modal | **MISSING** Staff route | Responsive version of `/staff/qr-scan`, not a second product flow |

Actual [Next.js routes](../../frontend/src/app), [header](../../frontend/src/components/layout/site-header.tsx), [account menu](../../frontend/src/features/auth/customer-account-menu.tsx), [login form](../../frontend/src/features/auth/login-form.tsx) and [return allowlist](../../frontend/src/features/auth/auth-return.ts) have no Staff/Manager navigation destination. STAFF/MANAGER login currently lands on `/`; only ADMIN lands on `/admin`, while narrow Customer resume applies to CUSTOMER. Customer-only links are already hidden for other authenticated roles. Proposed Staff navigation/resume must be role-scoped, canonical/allowlisted and implemented separately; no token in returnTo and no arbitrary redirect. Current auth/session source remains unchanged by this audit.

Unsupported or uncontracted live design actions, checked in actual HTML as well as PNG:

| Design content | Required adaptation / missing contract |
|---|---|
| “SmartTick™ SHA-256”, “Hợp lệ vào rạp”, fixed opening/closing times | Remove signature claim; show paid/Ticket states distinctly. Admission wording only after backend-approved policy validation |
| Offline emergency scan/local cache, “đồng bộ tức thì”, auto gate opening | No offline admission, cached authority or gate integration. Network loss disables mutation; explicit authoritative recovery |
| Customer name, masked phone, Gold membership, phone/suffix search | Omit PII and lookup shortcuts. Exact-token fallback only for core; Booking-code lookup needs separate operational contract |
| 10-digit/barcode/manual sample Booking code entry | Actual QR is opaque UTF-8, not 10 digits. Do not relabel Booking code as QR token or send it to Customer detail endpoints |
| Shift/employee codes, staff card login, 120-minute inactivity reset, duty-manager extension | No current contracts. Use existing account authentication and real current scope; no fabricated shifts/contact/session rule |
| Room/gate selection, “mở phòng trước giờ”, room unlock/lock session | No gate/room admission command. Derive actual Hall/Showtime from Booking; do not mutate schedule/room state |
| Shift ticket/guest totals, occupancy/throughput, “live feed”, history/search, exception processing | No operational counter/history API. Defer workspace dashboard portions; never derive global metrics from one Booking |
| Printed ticket stub; “đã nhận tại quầy Bar/F&B” | No printing/fulfillment contract. Show purchased Concession snapshot only; no pickup confirmation |
| Hardcoded speed/60 FPS/HDR/4K/Flash, hardware reader labels | Camera/device controls only when browser/device supports them; no performance/hardware promise or external integration inferred |
| Prototype state switches/“giả lập trạng thái”/demo success toast | Remove from real routes. Loading/error/success UI driven solely by authenticated backend results; HTTP fixtures remain test-only |

Future frontend acceptance: Vietnamese Nocturne/amber design; responsive 390/768/1440; camera started by explicit user action with permission/denied/no-device/device-error states; supported device switch/torch only after capability check. Stop media tracks when navigating, hiding/unmounting or losing session. Decode locally to exact opaque text; reject URL/wrapped/preview payloads without opening or fetching them. No new scanner library selected in this audit; current `qrcode` is an encoder and `jsqr` is a development/test decoder, not implemented Staff camera integration.

Manual fallback, if approved: labeled **“Nhập nội dung mã QR đặt vé”**, exact-token paste or keyboard scanner input; preserve Unicode/spaces, never trim/transform. No persistent scan history. Show scope selection/loading/no assignment/BLOCKED/session expired, invalid/unavailable QR, no eligible Tickets, mixed checked-in/VALID, selection/guest counts, explicit confirmation, already-used conflict, 429/5xx/network uncertain result and safe re-read guidance. Keep selection off for non-VALID/ineligible units; server still validates all commands. Camera repeat frames should pause/coalesce into one in-flight logical read; never repeatedly POST Check-in. Context/account/token changes abort/ignore old results and clear sensitive data/selection. A changed Cinema requires new validation.

Use native buttons/checkbox labels, visible focus, live status/alert feedback, 44px targets, keyboard paste/select/confirm, focus recovery, long Vietnamese seat/film names, high-contrast distinctions beyond color and reduced-motion. Include “Đang kiểm tra mã QR”, “Chưa được phân công rạp”, “Vé đã check-in”, “Không thể kiểm tra lúc này”, “Kiểm tra lại trạng thái”; “Check-in thành công” only follows a committed backend transition. Do not assert two guests equals two Tickets for COUPLE.

### 5.10. Required security/concurrency tests after approval

| Area | Required acceptance evidence |
|---|---|
| Current authorization | Anonymous/invalid JWT; CUSTOMER denied; scoped initial STAFF-only access; stale JWT after database BLOCKED/role change; invalid subject; no role hierarchy bypass; Admin/Manager deferred permissions explicit |
| Assignment | No assignment, inactive/not-yet-effective membership, multi-Cinema membership, wrong chosen Cinema, revocation vs Check-in/block vs Check-in; correct User-first locking and historical audit retention |
| QR exactness/privacy | Issued UTF-8 token → actual rendered Customer QR → decoder → authenticated resolver byte/text equality; spaces, Unicode/non-normalized variants, case mismatch, malformed/blank/control/oversized/wrapped/preview/URL tokens; no raw token in URL/log/APM/error/cache/storage |
| HTTP validation | Unknown/duplicate body properties; wrong media type/malformed JSON; no query injection; bigint > JS-safe range/overflow/sign/number inputs; duplicate normalized Ticket IDs; empty selection; rate/body/selection bounds; safe no-store 400/401/403/404/409/429/503 |
| Scoped projection | Foreign/missing token or Ticket nondisclosure; no Customer PII/provider details; complete seats/Tickets/Concession snapshots; corrupt partial paid aggregate → safe unavailable; no GET/logical-read mutations |
| Eligibility | Nonpaid/financial SUCCESS without PAID; VALID/CHECKED_IN/EXPIRED/CANCELLED; actual Cinema/Hall/Showtime; policy boundaries and time-after-lock wait; missing policy fail closed; cancelled/inactive contexts per approved policy; original pre-sale expiry must not be used as paid admission expiry |
| Whole-unit invariants | STANDARD/VIP one guest; COUPLE one Ticket/two guests/one success; mixed Booking states; unselected Tickets untouched; one stable Booking QR after any Check-in |
| Concurrency | Two Staff same Ticket exactly one success/audit; duplicate same-body delivery; overlapping batches all-or-nothing; different selected Tickets remain usable; concurrent read sees complete old/new snapshot; configuration/assignment changes cannot race through scope/policy checks |
| Protected ACL/guards | Runtime direct UPDATE/INSERT/DELETE and SET ROLE owner denied; public/untrusted helper/function access denied; forged actor/current-status flag not authority; new owner cannot mutate Payment/Booking/sold/freeze/QR; Ticket identity/time/operator tampering denied; financial/evidence/reconciliation guard regression |
| Audit/rollback | Injected second Ticket failure/audit failure/deferred-assertion failure leaves no partial batch; unique per-Ticket admission event; exact actor/time attribution; fake audit-only success denied; historical audit preserved after Staff deactivation |
| Recovery/failure | Lost command response, read-after-commit failure, network/5xx/timeout/429, explicit re-read/rescan, no auto POST, rapid repeated frames/clicks, account/Cinema/tab changes, stale/aborted responses and direct entry only through approved read or mandatory rescan |
| Browser UX | Desktop/mobile camera allow/deny/unavailable; manual exact token input; keyboard/focus/labels; disabled/reduced-motion/loading/error/mixed/already-used/uncertain states; 390/768/1440 overflow and guest/Ticket labels; no production outcome simulator |
| Migration/regression | Fresh install and V12 upgrade, V1–V12 checksums, restricted roles/managed migrator, unchanged settlement issuance/payment/Customer retrieval/freeze; approved local PostgreSQL only; full backend/frontend regressions without skips/retry masking |

Relevant existing source tests: [VnpayPostgresTests](../../backend/src/test/java/com/smartcinema/payment/VnpayPostgresTests.java) covers whole COUPLE/one QR, concurrent success, restricted runtime and issuance rollback; [BookingReadPostgresTests](../../backend/src/test/java/com/smartcinema/booking/BookingReadPostgresTests.java) covers owned HTTP reads, complete aggregate/snapshot consistency and runtime Ticket UPDATE rejection. These are **not** operational Check-in tests. Mixed-state HTTP fixtures and isolated signed provider fixtures are not live admission or merchant evidence.

## 6. Files Created

- This report: `docs/reports/2026-10-11_staff-qr-checkin-contract-audit_report.md`.
- Ignored inspection artifacts only under `frontend/target/staff-qr-checkin-audit-2026-10-12/`: three HTML, three PNG, sanitized design evidence, preservation/link/structure checks. No source/config/test/migration created.

## 7. Files Modified

**None.** Existing untracked Phase 3A report preserved. No current-handoff/API contract/requirement/history rewrite, staging, commit, deployment, database connection/mutation or Stitch modification.

## 8. Verification

| Check | Actual result / limitation |
|---|---|
| Git/source inventory | PASS — baseline HEAD/index and 701 protected files fingerprinted; final preservation check confirms unchanged |
| Mandatory source/contract/requirements inspection | PASS — capabilities and proposals separated, real requirement IDs and source references |
| Live Stitch MCP | PASS — project metadata and all three supplied get_screen resources accessible, HTML/PNG fetched and inspected read-only |
| Stitch generation-job status | UNABLE TO VERIFY — MCP exposes no completion field; no completion claim |
| Markdown UTF-8, links, template, naming, whitespace | PASS — report checked; local file links resolve; no pre-existing report overwrite |
| TypeScript / lint / build / frontend tests / Playwright | NOT RUN — documentation-only audit; no application changes |
| Backend `mvn verify` / migrations / database tests | NOT RUN — audit only; no database commands or test schemas created |
| Historical regression evidence | Phase 3B **317/317 backend**; Phase 3C **151/151 frontend unit**, **272/272 Playwright**, tsc/lint/build PASS as recorded in their reports. Not rerun and not new Phase 4 evidence |
| Neon/applied schema/current Staff accounts/assignments | NOT RUN — no live database access; source migration head V12 verified, deployed state not re-certified |
| Actual VNPAY return/signed callback/Payment SUCCESS/Booking PAID | NOT RUN — no live provider/financial operation; prior fixtures do not establish external interoperability |
| Actual Staff scan/Check-in/concurrency/admission | NOT RUN — missing approved API/writer/scope/policy; no simulated successful admission |

Inspection tooling limitations: `python` resolves to a missing Windows Store alias; DOCX was read via .NET Zip/XML instead. Initial wildcard-path `rg` invocations are unsupported by Windows path handling; folder-based searches and targeted reads provided the actual inventory. The first documentation-check script had an unmatched regex parenthesis; the corrected script passed with 62 valid local links and 701 unchanged original files. Missing `backend/AGENTS.md` is recorded rather than assumed. None of these caused application/configuration changes or omitted the required design/source analysis.

## 9. Requirement Reconciliation

| Audit deliverable / constraint | Result |
|---|---|
| Verified capabilities, actual endpoints and missing functionality | PASS — §5.1/5.2 |
| Staff authorization, absent assignment and multiple-assignment distinction | PASS — §5.3; implementation gap explicit |
| Confidential exact QR resolution, minimum response and errors | PASS for audit/proposal — §5.4/5.7 |
| Ticket states, guard/ACL, duplicates, partial use, concurrency/rollback | PASS for audit — §5.5/5.8; no production transition claim |
| Admission requirement traceability and unresolved time/inactivity policy | PASS — §5.6; blocking decisions retained |
| Minimal endpoint/DTO/migration recommendations | PASS as proposals, not callable contracts — §5.7/5.8 |
| Three live Stitch exports, frontend mapping/unsupported actions | PASS — §5.9 |
| Required tests, risks and ordered implementation | PASS — §5.10/11/12 |
| Existing source/data/contracts/design preservation; no commit/Phase 4B | PASS |
| Product Staff resolution/Check-in requirements today | PARTIAL — roles/storage/issuance exist, operational assignment/resolver/writer/policy missing |

PASS denotes completed audit work, not implemented Staff functionality or acceptance of proposed business policy.

## 10. Deviations / Conflicts

- Requested report path is dated October 11; actual audit date is October 12. Preserve requested filename and record the real date explicitly; no historical report overwritten.
- Older Project Scope per-Ticket QR, SRS lifecycle “CHECKED_IN / USED”, and current physical CHECKED_IN vocabulary differ. Follow current one-Booking-QR and actual persisted CHECKED_IN; do not create another QR/state.
- Logical/physical assignments and integrity Check-in plan exist but are not V12 capabilities. Current guards intentionally prevent the future transition until a coherent additive migration is approved.
- SRS requires an admission-window policy; no minute interval was found. Stitch sample hours, pre-sale expiry and public booking readiness do not resolve that decision.
- SRS Admin/conditional Manager admission and manual/history screens are wider than this minimal Staff slice. Keep requirements intact and report deferred APIs instead of granting roles or expanding scope silently.
- Existing Convention Conflicts: historical spaced scope filename and legacy DOCX name remain unchanged. No new convention exception required. Historical handoff preview descriptions remain historical; newer Phase 3C source/report governs current Customer frontend.

## Convention Compliance

Checked before creation and after report verification against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Requested `YYYY-MM-DD_staff-qr-checkin-contract-audit_report.md` under existing docs/reports; ignored evidence under target |
| Documentation convention | PASS | Template sections, real date, actual requirement IDs, verified/proposed boundary, exact evidence/limitations and no historical overwrite |
| Domain/status terminology | PASS | Staff, Cinema Assignment, Booking QR, Seat Unit, Ticket, Check-in; actual serialized values only |
| API convention | PASS for proposal | `/api/v1/staff/` plural resources, purpose of confidential-body POST documented; no actual contract edits |
| Database convention | PASS for proposal | Existing designed snake_case assignments/columns, proposed protected objects/roles clearly labeled; no migration/data edit |
| Frontend route/component/import convention | PASS for route proposal; code NOT APPLICABLE | Proposed lowercase `/staff/qr-scan`; existing Phase 1 architecture reuse; no source change |
| Requirements/scope/security preservation | PASS | No fabricated IDs/windows/financial outcomes/assignments, no token/secret disclosure, no frontend admission authority |
| Git/concurrent-work preservation | PASS | 701 original files, HEAD/index and untracked Phase 3A preserved; only this report is new nonignored work |

## 11. Risks, Open Questions and Known Limitations

1. **BLOCKING — admission policy:** approve exact before/after Showtime interval, boundaries, server timezone handling, eligible Showtime states and behavior for cancelled/ended/inactive Cinema/Hall/Seat. Define policy configuration/storage and safe missing-policy behavior. No guessed default window or automatic Ticket expiry.
2. **BLOCKING — assignment/provisioning:** approve implementation of dictionary membership semantics and protected attributed grant/revoke/current Staff provisioning. No live account/scope exists in verified HTTP inventory; do not manufacture assignments for proof.
3. **BLOCKING — protected transition migration:** approve owner/helper/guard/audit/ACL design and upgrade plan before altering append-only Tickets. Dedicated Staff writer must not gain settlement/provider authority or writable “verified” flags.
4. **CONTRACT DECISION — batch/replay:** approve all-or-nothing selected batches with state-effect idempotency/409 on reuse, or explicitly request a different per-item/durable replay policy. Do not change behavior implicitly during coding.
5. **CONTRACT DECISION — recovery:** approve optional scope-protected Booking GET if reload/direct-entry recovery without rescan is required. Otherwise require rescan and keep QR out of persistent storage.
6. **SCOPE DECISION — role extensions/manual/history:** Admin and conditional Manager permission, Booking-code lookup/history/counters need independent contract approval; phone/suffix search and offline admission are outside scanner core.
7. Broad per-Showtime gate protects consistency but may constrain entrance latency. No performance measurement, load test or hardware/camera compatibility test performed here; NFR-PERF-004 remains a future acceptance target.
8. QR screenshots/copies can be replayed; exact-token possession is not guest identity. Backend single-use per Ticket protects duplicate admission; no attendee verification/transfer/rotating-token feature is approved.
9. No live database, applied schema/collation/ACL inspection or provider/admission exercise. Source evidence, downloadable designs and prior isolated tests cannot certify actual Check-in, VNPAY settlement or production deployment.

## 12. Recommended Implementation Sequence / Next Step

1. Review this audit and approve the blocking admission/resource policy, assignment/provisioning model, batch/error/recovery contract and Staff-first role scope. Do not code policy guesses.
2. Publish an additive versioned Staff QR/Check-in API contract and protected-writer/lock/grant design after approval; preserve Customer/Payment/VNPAY contracts and requirements.
3. Implement assignment/protected attributed administration prerequisites, then approved forward migration/guard/audit/ACL changes as one coherent upgrade. Preserve V1–V12, frozen identities and historical paid aggregates; no seeded live membership/financial data.
4. Implement typed scope/QR logical reads and protected selected Check-in command; optional Staff Booking recovery GET only if approved. Resolve token exactly, use minimum response/no-store/redaction, strict inputs/rate limits/bounded timeouts.
5. Add real HTTP/isolated PostgreSQL scope/state/ACL/audit/rollback/concurrency/migration tests and run full backend `mvn verify` with existing local regression setup. Protect prior 317 cases and source guarantees; record exact new totals/failures.
6. Separately implement real `/staff` and responsive `/staff/qr-scan` with role navigation/safe login resume, camera/manual exact-token fallback, authorized Ticket selection and truthful backend results. Adapt three Stitch screens without unsupported dashboard/offline/PII/gate features.
7. Run tsc/lint/unit/build, focused and full Playwright, QR decoder→resolver interoperability, responsive/keyboard/camera permission checks and uncertainty/recovery tests; preserve prior 151 unit/272 browser cases without skips/retry masking.
8. Only with authorized eligible data/operator credentials, perform separately classified live read/scan/admission verification. Do not edit catalog/schedules/financial data to manufacture proof, enable merchant secrets/flags, run real money or infer live PASS from fixtures.
9. Produce Phase 4 implementation evidence/update relevant handoff after that authorized implementation, reconcile requirements/conventions and STOP. No deployment or next phase automatically.

**Next recommended task:** approve Phase 4B Staff assignment, admission policy and protected QR resolution/Ticket Check-in backend contract/migration slice. This Phase 4A audit ends with the report; no application implementation or commit is performed.
