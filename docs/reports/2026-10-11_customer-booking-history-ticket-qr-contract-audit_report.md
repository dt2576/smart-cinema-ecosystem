# Phase 3A — Customer Booking History, Tickets and QR Contract Audit

## 1. Task Information

- Date: 2026-10-11, Asia/Ho_Chi_Minh.
- Type: read-only technical audit; documentation deliverable only.
- Module: Customer Booking history/detail, Ticket list and Booking QR.
- Status: audit complete; Phase 3 implementation remains blocked on approval and implementation of the additive read contracts proposed below.
- Repository baseline: clean working tree at `cfdf48078f25d40291b9e2999679719864503130`, the committed Phase 2 UI implementation. No staging, commit or deployment performed.
- Live Stitch project: `projects/1208499799798658711`.

**Finding:** protected backend settlement already creates one Booking QR and one Ticket per purchased Seat Unit atomically. Owned Booking detail already exists. Customer history has no collection GET, and Ticket/QR retrieval currently requires a known Payment attempt ID. The frontend's Payment reader deliberately drops the Ticket/QR fields. The smallest recommended addition is two owned GET resources: Booking history and Booking-level Ticket/QR retrieval. No financial writer, new Payment recovery policy or schema migration is needed for those reads.

## 2. Requested Work

Prepare real `/my-bookings` and `/my-bookings/[bookingId]` integration without implementing it. Audit persisted entities, service/repository behavior, HTTP DTOs, authorization, issuance, original expiry and reload/direct-entry recovery. Compare the six supplied Stitch references with supported data. Distinguish existing capabilities from proposals, identify migration impact and regression tests, and specify implementation order.

This report does not authorize backend changes. Customer Check-in, Staff scanner/QR resolution, wallet, NFC, transfer, refund and provider configuration remain outside the proposed Customer read slice.

## 3. Documents Reviewed

| Document | Relevant evidence |
|---|---|
| [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), applicable requirement/document/UI/code rules and backend/frontend workflows | Read before planning and naming the report; traceability, scope and convention reconciliation |
| [Stitch implementation assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md) | Existing route mapping, Phase 3 contract dependency, design adaptations |
| [Phase 1 report](2026-10-11_shared-ui-foundation_report.md) | Shared primitives, Nocturne tokens, role-aware navigation |
| [Phase 2 report](2026-10-11_customer-booking-payment-stitch-ui_report.md) | Preserved Booking/Payment behavior; Ticket/QR exclusion; latest frontend regression evidence |
| [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md) | Booking history/detail, one Booking QR, individual Tickets, ownership and financial authority |
| [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), §§33–36, 48 | Seat Unit/Ticket relationship, repeat QR scanning, individual Check-in, invariants |
| [System Analysis and Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) | Semantic DOCX inspection: UC-CUS-020, 021, 023, 024; UC-SYS-009; UC-STF-004 |
| [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) | Earlier per-Ticket QR wording conflicts with the later approved Booking QR model; see §10 |
| [Booking contracts v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md) | Owned composition, exact snapshots, first-attempt freeze and original expiry |
| [VNPAY contract v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md) | Implemented Payment lookup fields, settlement boundary and Ticket/QR projection |
| [Current handoff](../ai/current-handoff.md), [Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md) | Current return recovery limitation, preview routes and existing visual system |

The handoff was last reconciled on October 10 and predates the committed Phase 1/2 visual reports. This audit uses those newer reports for UI baseline evidence; the handoff's financial/ownership boundaries still agree with current source. Historical documents were not rewritten.

## 4. Requirements Traceability

| Actual requirement | Verified meaning | Audit result |
|---|---|---|
| BRD v1.2 BR-032; SRS v1.2 FR-BOOKING-009; UC-CUS-020 | Customer-owned Booking history | Missing supported HTTP collection; frontend PREVIEW |
| FR-BOOKING-010; UC-CUS-021; FR-AUTH-009 | Authorized Booking detail and ownership | Existing owned GET; My Bookings detail still PREVIEW |
| BR-043; FR-TICKET-001; INV-05, INV-06, INV-14 | Verified financial evidence and backend-authoritative issuance | Protected settlement exists; financial SUCCESS alone is insufficient for fulfillment |
| BR-044, BR-045; FR-TICKET-002, 003; UC-CUS-023 | One uniquely identified Ticket per purchased Seat Unit | Schema and settlement enforce this; COUPLE means one Ticket/two guests |
| BR-046; FR-TICKET-004; UC-SYS-009, UC-CUS-024 | One Booking QR per paid Booking | Persisted unique token exists; Customer rendering remains preview-only |
| FR-TICKET-005, 006 | Authorized QR resolution and current Ticket retrieval | Known-attempt owned projection exists; no supported QR-token resolver or Booking-only Ticket endpoint |
| BR-047; FR-TICKET-007, 008; NFR-SEC-009 | Own QR/Tickets only; minimize sensitive QR plaintext | Existing Payment ownership gate; missing independent Customer read contract |
| FR-TICKET-009; INV-07 | Duplicate Payment evidence does not duplicate issuance | Protected writer and source tests cover atomic/idempotent finalization |
| FR-TICKET-010; INV-08, INV-09, INV-12; UC-STF-004 | Per-Ticket Check-in, invalid/duplicate rejection and cinema scope | Requirement exists; operational Check-in implementation is absent and excluded from this slice |
| INV-13, INV-14 | Snapshot amounts and backend authority | Preserve exact strings, original expiry and permanent first-attempt freeze |

Requirement IDs above are taken from the cited documents. Proposed API names, pagination and wire DTOs below are implementation proposals, not new BR/FR/UC requirements.

## 5. Audit Findings and Proposed Integration

### 5.1 Verified backend capability inventory

The backend uses JDBC repositories, Java DTO records and protected PostgreSQL functions. There are no JPA Booking/Ticket entity classes to reuse. Persisted entities and their guards are in the migrations.

| Capability | Current implementation and boundary |
|---|---|
| Booking header/composition | [BookingRepository](../../backend/src/main/java/com/smartcinema/booking/BookingRepository.java) reads `bookings`, purchased-unit snapshots, Concessions and Promotion; existing owned detail is authoritative |
| Historical ownership | `bookings.customer_id`; current database user must be ACTIVE/CUSTOMER, then the requested Booking must belong to that subject |
| Original expiry | Owned detail projects PENDING as EXPIRED when the original deadline has passed; the read does not perform a cleanup mutation |
| Consistent Booking detail | [BookingService.detail](../../backend/src/main/java/com/smartcinema/booking/BookingService.java) uses read-only REPEATABLE_READ |
| Ticket storage | [V10](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql): unique `booking_seat_id`, unique `ticket_code`, status, issuance time and nullable Check-in audit columns |
| Booking QR storage | [V6](../../backend/src/main/resources/db/migration/V6__create_pending_bookings.sql): unique nullable `booking_qr_token`; PAID requires a token and paid timestamp; non-PAID cannot retain them |
| Issuance/finalization | V10 `record_vnpay_result` atomically finalizes eligible Booking/Seat/Hold/Ticket/QR under the protected system boundary |
| Owned Ticket/QR projection | [VnpayService.detail](../../backend/src/main/java/com/smartcinema/payment/VnpayService.java) and [VnpayRepository](../../backend/src/main/java/com/smartcinema/payment/VnpayRepository.java) expose the Booking aggregate through a known owned Payment attempt |
| Check-in states | Schema accepts VALID, CHECKED_IN, EXPIRED, CANCELLED; settlement inserts VALID |
| Check-in transitions | No Ticket/Check-in controller, service or protected transition writer exists. `trg_tickets_guard` currently rejects UPDATE/DELETE, including normal owner updates. Enum and audit columns do not establish a working Check-in flow |
| QR-token lookup | Unique storage makes future lookup possible, but no supported resolver HTTP route or implemented Staff scan workflow was found |
| Booking history | Data and `idx_bookings_customer_created(customer_id, created_at DESC, id)` exist; no Customer list repository/service/controller contract exists |

Owned detail joins current Movie/Cinema/Hall labels without public discovery publication/activity filters. It therefore remains readable after catalog visibility changes, although titles are live labels rather than historical title snapshots. The proposed history read should preserve that behavior instead of depending on public discovery availability.

### 5.2 Verified HTTP endpoint inventory

Sources: [BookingController](../../backend/src/main/java/com/smartcinema/booking/BookingController.java), [PaymentController](../../backend/src/main/java/com/smartcinema/payment/PaymentController.java), [VnpayController](../../backend/src/main/java/com/smartcinema/payment/VnpayController.java), [security configuration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java).

| Existing endpoint | Actor / behavior | Suitability for Phase 3 |
|---|---|---|
| POST `/api/v1/bookings` | ACTIVE Customer; explicit Booking creation | Existing command; never invoke to recover a read |
| GET `/api/v1/bookings/{bookingId}` | ACTIVE owning Customer; 200/no-store; rejects query parameters | Reuse for real owned detail and composition |
| DELETE `/api/v1/bookings/{bookingId}` | Owned protected cancellation; 204/no-store | Existing command; new history/detail cancellation UX is not part of this minimal read proposal |
| POST `/api/v1/bookings/{bookingId}/payment-transactions` | Explicit strict `{}` initiation; existing freeze/replacement gates | Preserve; never use to discover an unknown attempt |
| GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | ACTIVE owning Customer; no queries; 200/no-store; stored Payment plus paid Booking QR/Tickets | Works only with a known attempt; not history or independent retrieval |
| POST `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission` | Explicit strict `{}` Sandbox submission behind configuration/confirmation gates | Preserve; not Ticket recovery |
| GET `/api/v1/payments/vnpay/return` | Public provider transport; checksum validation only; fixed configured HTTPS redirect or informational fallback | Does not settle or issue Tickets |
| GET `/api/v1/payments/vnpay/ipn` | Public provider transport; backend verification before protected financial command | Backend-only; never called as a Customer recheck |

**Absent:** GET collection `/api/v1/bookings`, Booking-only Ticket/QR retrieval, Payment list/latest lookup, Customer QueryDR operation, QR-token resolver and Check-in mutation routes. Absence is verified from source mappings, not by a live HTTP probe; no 404/405 response is claimed for an unmapped route.

Existing [BookingResponse](../../backend/src/main/java/com/smartcinema/booking/BookingResponse.java) fields:

```text
id, bookingCode, status, showtimeId, movieId, movieTitle,
cinemaId, cinemaName, hallId, hallName, startsAt, createdAt,
expiresAt, serverTime, seatUnitCount, guestCount,
seatAmount, concessionAmount, subtotal, discount, finalAmount,
seats, concessions, promotion, paymentStartedAt
seats[]: id, seatId, holdId, row, number, type, guestCount, unitPrice, finalPrice
concessions[]: id, itemId, name, category, quantity, unitPrice, totalPrice
```

It has no Payment attempt ID, paidAt, Ticket/QR, poster, film duration/classification, cinema address, card details or fee/VAT fields. Read stored totals; do not calculate new financial values from design examples.

### 5.3 Exact existing Payment projection and frontend validation

The known-attempt GET serializes [VnpayPaymentResponse](../../backend/src/main/java/com/smartcinema/payment/VnpayPaymentResponse.java):

```text
paymentId: string                    bookingId: string
status: INITIATED | PENDING | SUCCESS | FAILED | CANCELLED
amount: exact decimal string         bookingStatus: PENDING | PAID | EXPIRED | CANCELLED
reconciliationRequired: boolean      bookingQr: string | null
tickets: array of maps
tickets[]: id, bookingSeatId, seatId, ticketCode, status, seatType (strings)
           guestCount (integer: COUPLE=2; otherwise=1)
```

Ticket state values are VALID, CHECKED_IN, EXPIRED, CANCELLED. Seat types include STANDARD, VIP and COUPLE. The projection does not include row/number, Ticket issuance/Check-in timestamps, Staff identity, Ticket price or an individual Ticket QR. Ticket rows are ordered by Ticket ID. The response does not expose currency, merchant/provider reference, signature or a QR image URL. The initiation [PaymentResponse](../../backend/src/main/java/com/smartcinema/payment/PaymentResponse.java) is a different DTO with `id`, `bookingId`, `internalReference`, `status`, `amount`, `currency`, `provider`, `initiatedAt`, `expiresAt`; do not conflate the responses.

`VnpayService.detail` first validates the owned Booking/attempt inside read-only REPEATABLE_READ. It includes QR/Tickets when the persisted Booking status is PAID, and returns null/empty for non-PAID. **This gate is Booking PAID, not the selected attempt's SUCCESS.** An older FAILED attempt can therefore return the paid Booking's QR/Tickets after another attempt finalized the sale. Ticket entitlement must not be bound to a guessed latest attempt or denied solely because a historical attempt failed.

Payment GET reads persisted Booking status; owned Booking detail applies the effective PENDING-to-EXPIRED projection. After the deadline and before cleanup, those responses can legitimately disagree. They also use separate transaction snapshots. A client must not convert either discrepancy into local PAID/issuance or extend the deadline; preserve the existing review/recheck behavior.

The repository's QR/Ticket helper methods themselves accept only Booking ID; they are safe in the current public path because the service checks ownership first. Reusing those helpers in a new endpoint without that gate would introduce an ownership vulnerability.

Current frontend [getOwnedPaymentAttempt](../../frontend/src/features/payment/payment-initiation-api.ts) validates requested/returned positive-bigint IDs, exact amount, Payment/Booking state enums and reconciliation boolean. It then returns only those six financial fields. [OwnedPaymentAttempt](../../frontend/src/features/payment/payment-initiation.types.ts) excludes `bookingQr` and `tickets`. **Neither QR content nor Ticket rows are currently parsed or validated.** The backend's `List<Map<String,Object>>` is also weaker than a dedicated typed Ticket DTO. No real Customer Ticket rendering can safely be enabled by merely reading an extra property from the current frontend type.

### 5.4 Verified issuance lifecycle and expiry

1. First Payment initiation freezes the complete Booking permanently and preserves the original deadline. INITIATED/PENDING do not issue Tickets.
2. Verified backend IPN or backend query processing verifies provider namespace/reference/amount and writes trusted evidence through [VnpaySystemRepository](../../backend/src/main/java/com/smartcinema/payment/VnpaySystemRepository.java), using the separate protected payment-system role.
3. V10 rechecks current fulfillment eligibility, origin Holds, unsold Seat Units, original expiry, Showtime/Cinema/Hall/Movie readiness and Promotion availability under the established locks.
4. Eligible sale finalization is one transaction: Booking becomes PAID; paidAt is set; one QR token is persisted; purchased units are marked sold; origin Holds become CONSUMED; one VALID Ticket is inserted per Booking Seat Unit; sale audit is recorded. Deferred aggregate checks reject partial sales.
5. Duplicate/replayed evidence does not create a new QR or duplicate Tickets. Contradictory evidence is retained for reconciliation.
6. Financial SUCCESS can be recorded when fulfillment is no longer eligible, including expiry/cancellation or late success on an earlier failed attempt. Such cases can remain unpaid with reconciliation required and no Tickets/QR. Browser return and SUCCESS alone must not promise issuance.

The current QR writer concatenates two UUID values with hyphens removed: 64 lowercase hexadecimal characters. It is a stable opaque random identity, **not** an image, rotating QR, SHA-256 claim or browser-verifiable financial signature. The database permits a nonblank unique token up to 128 characters; it does not constrain all stored tokens to the writer's current 64-character format. A formal Customer encoding contract must specify how the opaque token is transported and encoded, without inventing a prefix or payload schema.

COUPLE is one purchased Seat Unit, one Ticket, guestCount 2. Two VIP units are two Tickets, guestCount 2 in total. Checked-in counts and Ticket counts must not be substituted for guest counts.

**Original Booking expiresAt is a pre-sale deadline, not a post-sale admission deadline.** A PAID Booking's valid issued QR/Tickets must not disappear just because that original timestamp has passed. Conversely, a VALID Ticket enum does not prove current entrance eligibility: Staff cinema/Showtime/window checks are a separate required workflow. No implemented Ticket expiry/Check-in transition service was found; do not synthesize those states from the browser clock or assume state transitions occur automatically.

### 5.5 Ownership, authorization and recovery

Existing HTTP security explicitly requires CUSTOMER for Booking detail and known Payment GET; repositories recheck the database user's current ACTIVE/CUSTOMER state and scope by authenticated subject. A stale JWT role cannot bypass that database check. Foreign/missing resources use the same safe 404 resource response; malformed requests use 400; inactive/non-Customer access uses 403; missing authentication is rejected by Spring Security. See [BookingExceptionHandler](../../backend/src/main/java/com/smartcinema/booking/BookingExceptionHandler.java).

New routes must have explicit CUSTOMER matchers. The general `.anyRequest().authenticated()` fallback is insufficient. Never accept a caller-supplied customerId, trust an unvalidated route ID, or use local/session storage as entitlement authority. Do not expose internal provider metadata or Staff audit identities. Preserve no-store and redacted DTO logging; treat QR as sensitive access material and keep it out of URLs, analytics, logs and the history collection.

Known owned Booking detail can already recover by Booking ID without a Payment ID. Known-attempt Payment GET can recover with both IDs. Unknown frozen Payment identity remains blocked, and no automatic POST may be added. The proposed Ticket/QR GET removes the attempt-ID dependency for already issued Booking entitlements; it does not repair unknown Payment identity or change initiation restrictions.

The current [login return allowlist](../../frontend/src/features/auth/auth-return.ts) supports owned Summary/Concession paths, Seat selection and the fixed Payment return path. **It does not support `/my-bookings` or its detail route.** Real integration needs a narrowly scoped allowlist extension for those existing internal destinations, positive-bigint validation for detail IDs and rejection of external URLs/query/fragment variants. This is an approved-contract integration dependency, not permission to weaken authentication or redirects.

Separate owned Booking and Ticket reads may straddle finalization. A response mismatch must produce a pending/review state, suppress an unvalidated QR and allow bounded explicit GET refresh. Reads must be cancelled/ignored after identity or session changes. Session loss must clear sensitive content. Reload, direct entry, tab changes and back/forward must load server state; cached hints must not trigger a Payment write.

### 5.6 Current frontend and live Stitch evidence

| Existing route/component | Verified status |
|---|---|
| [`/my-bookings`](../../frontend/src/app/(public)/my-bookings/page.tsx) | PREVIEW; public route, preview metadata/noindex, Suspense around BookingHistoryPreview |
| [`/my-bookings/[bookingId]`](../../frontend/src/app/(public)/my-bookings/[bookingId]/page.tsx) | PREVIEW; BookingDetailPreview with fixture lookup |
| [Booking history service](../../frontend/src/features/booking/booking-history-service.ts) | In-memory sample Bookings, number-based sample amounts, delay/error scenarios; no backend list call |
| [Booking detail preview](../../frontend/src/features/booking/booking-detail-preview.tsx) | Mock Booking and Ticket reads, sample financial calculation, mock QR resolution; no real owned Ticket API |
| [Booking QR preview](../../frontend/src/features/booking/booking-qr-preview.tsx) | Explicitly inert preview image/payload; reload sample does not check in or issue anything |
| [Ticket preview service](../../frontend/src/features/ticket/ticket-preview-service.ts), [types](../../frontend/src/features/ticket/ticket-preview.types.ts) | Fixture-only Ticket states; type covers STANDARD/COUPLE but omits real VIP |
| `/bookings/[bookingId]/summary`, `/payments/vnpay/return` | REAL owned Booking/Payment reads; Phase 2 presentation; no real Ticket/QR rendering |

Both preview routes use Customer discovery layout but no ownership/authentication gate. Role-aware navigation is presentation only, not route authorization. Existing mock `SMART_CINEMA_PREVIEW:BOOKING:...` payloads and static QR images must never enter real entitlement rendering.

Live read-only Stitch `get_screen` succeeded for all six references. Each returned a valid screen ID/title and screenshot/HTML resource. All six actual HTML exports and original PNGs were downloaded (12 HTTP 200 responses); all six PNGs and HTML text were inspected. This establishes accessible design content, not provider interoperability or generation-job completion.

| Design | Stitch ID | Export dimensions | Integration use |
|---|---|---|---|
| My Bookings desktop | `4b9b19206fc14015a77322f58b113bd1` | 2560 × 5730 | History cards and loading/empty/error/session states |
| Booking Detail desktop | `c7f09eb14aa44fbfa2cfc44e86753013` | 2560 × 3898 | Owned composition, one QR, individual Ticket list |
| Booking QR Pass desktop | `265e1328babf486b9245fb508624d9e6` | 2560 × 3554 | Responsive QR display/dialog |
| My Bookings mobile | `3f5732811dba482e95b07e5aa6251b21` | 780 × 3354 | Mobile cards and feedback |
| Booking Detail mobile | `28c2fd5f49c0437eb2e77f8b9814be84` | 780 × 3732 | Mobile Ticket/status/composition arrangement |
| Booking QR Pass mobile | `d989b7d6ffb04be6a964be21e298a4fa` | 780 × 2460 | Mobile QR presentation, subject to corrections below |

Reuse Nocturne surfaces, amber accent, existing fonts and Phase 1 primitives. Adapt rather than copy unsupported design content:

- Remove prototype state selectors and hardcoded financial/Check-in outcomes. Localize remaining English headings/navigation.
- History search, status counters and “ready for entrance” aggregates have no approved history query contract. Do not implement global counters from a single fetched page. Defer search/global filters until an explicit contract exists; use bounded pagination first.
- Remove SmartPay wallet/refunds, NFC, Apple Wallet, auto gates/kiosk, card/last-four details, extra VAT/fees, transfer/share actions, automatic brightness and fixed entrance/pickup windows. No backend contracts support those claims.
- Poster/duration/classification/format/address/director data are not in owned Booking DTO. Show supported labels; do not require public catalog joins to recover historical tickets. Richer presentation needs a separate approved data decision.
- Concessions are paid composition lines, not proof of fulfillment/readiness or a separate food pickup QR. Remove “sẵn sàng nhận”, FastBar location and 15-minute pickup promises.
- Mobile QR labels a pair as “ghế cặp đôi” while demonstrating 2/2 Tickets and partial use. That is incompatible if it represents one COUPLE unit. Render one Ticket/two guests for COUPLE, or two Tickets only for two purchased units.
- Remove mobile “SHA-256 / periodic refresh” claims; existing token is stable. Do not claim scanner synchronization, admission eligibility or a working Staff scan workflow merely because a QR can be displayed.

### 5.7 Missing contracts and minimal additive proposal

**Everything in this subsection is PROPOSED, not an existing supported API or authorization to implement.** Two reads, reusing the existing detail GET, are sufficient for the Customer scope. No QR-only route, Ticket-detail route, Payment latest/list route or public QR resolver is needed.

| Proposed resource | Minimal contract |
|---|---|
| GET `/api/v1/bookings` | Authenticated current ACTIVE Customer only; subject-scoped paginated list; strict `page`/`size`; no customerId parameter |
| GET `/api/v1/bookings/{bookingId}/tickets` | Authenticated current ACTIVE owner only; one Booking-level QR/Ticket aggregate independent of any Payment ID; no query parameters |

History proposal:

- Reuse existing collection conventions: zero-based page, default size 20, maximum 100 as in [MovieQuery](../../backend/src/main/java/com/smartcinema/movie/MovieQuery.java). This is a proposed bound, not a new business rule. Reject unsupported/repeated/malformed parameters.
- Fixed deterministic ordering `createdAt DESC, id ASC`, matching the existing history index. No arbitrary sort, search, status filter or global counters in the smallest slice. Pagination may shift as new Bookings are created; refresh from the first page on explicit reload rather than claim cursor stability.
- Suggested typed envelope: `items`, `page`, `size`, `totalElements`, `totalPages`, `serverTime`. Pagination/count fields are bounded nonnegative integers; all identifiers remain strings.
- Minimal item projection: `id`, `bookingCode`, `status`, `movieId`, `movieTitle`, `cinemaId`, `cinemaName`, `hallId`, `hallName`, `showtimeId`, `startsAt`, `createdAt`, `expiresAt`, `paymentStartedAt`, `seatUnitCount`, `guestCount`, `finalAmount`. These are subsets of existing Booking data. Retrieve seats/Concessions/Promotion on owned detail, not every collection item.
- Count and page must use the same owner predicate and consistent read transaction. Effective expiry must match existing owned detail; do not mutate cleanup state during GET. Do not expose QR tokens, provider references, Payment IDs or other customers' counts.

Independent entitlement proposal:

```text
BookingTicketsResponse (proposed):
  bookingId: positive-bigint string
  bookingStatus: PENDING | PAID | EXPIRED | CANCELLED
  serverTime: server UTC instant
  bookingQr: opaque string | null
  tickets: CustomerTicket[]

CustomerTicket (proposed typed version of existing seven fields):
  id, bookingSeatId, seatId, ticketCode: strings
  status: VALID | CHECKED_IN | EXPIRED | CANCELLED
  seatType: STANDARD | VIP | COUPLE
  guestCount: 1 | 2, consistent with seatType
```

- Validate current ACTIVE/CUSTOMER ownership before any QR/Ticket lookup, in read-only REPEATABLE_READ. Return typed DTOs instead of maps. Keep existing Payment/Booking response contracts intact.
- Non-PAID returns its effective status, null QR and an empty list, consistent with current entitlement gating. PAID must return the persisted QR and complete Ticket set; an inconsistent/malformed paid aggregate must fail safely, never synthesize rows or downgrade a paid Booking locally.
- Reuse existing safe 400/401/403/404 semantics and no-store. Explicitly define the safe temporary-error response for an inconsistent aggregate in the approved contract. Do not leak SQL, raw tokens or provider details through error text or DTO logging.
- Keep QR identity opaque, stable and bounded by its storage contract. Approve exact wire/encoding rules before implementation. Encode the returned token exactly into a QR image locally; that is rendering an issued identity, not issuing one. Do not encode personal data, append an invented prefix, rotate the token or add browser signing/financial validation.
- Ticket row/number/price can be matched to existing Booking seats by `bookingSeatId`; verify `seatId`, type and guestCount too. Additional issuance/Check-in timestamps could be added later if explicitly required; current minimal list does not need them or Staff identifiers.
- Use all four serialized Ticket statuses for display, but distinguish future/fixture mixed-state coverage from currently implemented production transitions. Customer has no Check-in action.

Why a separate read: extending Booking detail with QR/Tickets would couple every existing Booking consumer to entitlement payloads and sensitive QR handling. A dedicated aggregate leaves existing contracts intact and provides recovery from Booking ID alone. Reusing known Payment GET cannot solve direct entry with a lost/unknown attempt ID. No frontend mock or automatic initiation can close that gap safely.

**Backend changes required after approval:** additive controller/service/repository/typed DTOs, explicit security matchers, strict query validation and safe error coverage. Reuse current owned-detail authorization and existing SELECT permissions; do not expose unguarded repository helpers. Publish an additive Customer history/Ticket/QR contract and tests before frontend consumption. Historical BRD/SRS/contracts remain unchanged.

### 5.8 Frontend integration plan

1. Keep `/my-bookings` and `/my-bookings/[bookingId]`; no standalone payment, QR or history route is necessary. Replace fixture consumption only after the new contracts are implemented and tested. Decide an explicit location for retained preview demonstrations; never silently fallback to mocks in real routes.
2. Add typed history and entitlement readers with Bearer authentication, no-store, cancellation and safe Vietnamese error mapping. Keep bigint IDs and financial strings intact; do not reuse number-based preview models.
3. Add strict validators for envelope bounds, ID echoes, exact decimal strings, UTC instants, actual enums, unique Ticket IDs/codes/Booking Seat IDs and complete owned Seat Unit correspondence. PAID must have one issued Booking QR and one Ticket per purchased unit; unpaid must have neither. Unknown/duplicate/mismatched rows suppress the QR and show a safe review state.
4. Add route authentication/role feedback and narrowly extend login resume. Clear issued content on logout/account changes; prevent late responses from a previous Booking/session replacing the current screen. Refresh via GET only.
5. History uses backend-owned page data and links to detail. Pending continuation links to existing Summary and its readiness/recovery rules. No new retry, cancel, refund or checkout logic is introduced.
6. Detail reuses authoritative composition and totals, shows individual localized Ticket badges (`Chưa sử dụng`, `Đã check-in`, `Hết hạn`, `Đã hủy`) and distinguishes Seat Unit counts from guests. Paid-after-original-expiry remains readable. Do not imply entrance eligibility from financial or Ticket status alone.
7. Render one responsive QR view/dialog from the validated issued token; reuse existing `qrcode` dependency if appropriate, with quiet zone/high contrast and decoding round-trip tests. Do not copy Stitch's decorative QR or preview assets. Focus management, Escape/close, keyboard controls and a 44px touch target remain required.
8. Handle loading, empty history, no issued Tickets, session expiry, foreign/missing Booking, reconciliation-related non-issuance, inconsistent snapshots, network/5xx/rate-limit and explicit recheck. Avoid unbounded polling; no Ticket-state refresh interval is currently contracted. An explicit recheck can reload both owned GETs without financial/provider commands.

## 6. Files Created

- This report: `docs/reports/2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md`.
- Local ignored evidence: `frontend/target/customer-booking-history-ticket-qr-contract-audit-2026-10-11/`, containing entry tracked-file hashes, six HTML/six PNG exports and a sanitized export manifest. Export download URLs and live tokens are not included in this report or manifest. These artifacts are not staged or committed.

## 7. Files Modified

None. Application source, tests, requirements, historical contracts/reports, current handoff, Stitch designs/settings, MCP configuration, database content and migration files are unchanged. No update to handoff was requested for this audit.

## 8. Verification and Regression Risk

### Audit verification

| Check | Current audit result |
|---|---|
| Git baseline and source preservation | PASS — all 672 tracked SHA-256 hashes unchanged; HEAD and index unchanged; only this new report is untracked |
| Backend/frontend static contract audit | Completed against actual controllers, repositories, DTOs, security and migration guards |
| Live Stitch connection/content | Six successful read-only `get_screen` calls; 12/12 HTML/PNG downloads HTTP 200; all inspected |
| Requirement IDs and report links | PASS — IDs checked against current documents; all 51 relative links resolve |
| Report formatting | PASS — independent UTF-8, trailing-whitespace, link and section checks; all 12 numbered template sections plus Convention Compliance. `git diff --no-index --check -- NUL docs/reports/2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md` returned exit 1 for the new-file comparison, with no whitespace diagnostic and only the normal LF-to-CRLF notice; this is not reported as an exit-0 command |
| TypeScript / lint / unit / build / Playwright | NOT RUN in this read-only audit; no source/test implementation |
| Backend `mvn verify` / PostgreSQL tests | NOT RUN; integration harness creates test schemas/data, outside this read-only investigation |
| Neon, real Customer paid retrieval, live Sandbox callback/payment/Booking PAID, admission scan | NOT RUN; no database/provider/financial action performed |

Historical evidence only: Phase 2 reported TypeScript, lint, build, **138 frontend unit tests and 250 Playwright cases PASS**. Accepted backend baseline is **294 tests PASS** in the [prior Customer return/status report](2026-10-10_customer-payment-return-status-recovery-frontend_report.md). These are not fresh runs or live issuance proof from this audit.

### Existing source-test evidence inspected

- [BookingPostgresTests](../../backend/src/test/java/com/smartcinema/booking/BookingPostgresTests.java): ownership/strict inputs, original deadline, whole-unit snapshots, cancellation/expiry, guarded history and concurrency.
- [PaymentPostgresTests](../../backend/src/test/java/com/smartcinema/payment/PaymentPostgresTests.java): first freeze, exact fractional amounts, whole COUPLE, duplicate initiation, frozen retry and protected writes.
- [VnpayPostgresTests](../../backend/src/test/java/com/smartcinema/payment/VnpayPostgresTests.java): `completeSalePreservesWholeCoupleAndOneQr`, `rollbackOnTicketFailureLeavesNoPartialSale`, duplicate/concurrent success, cancellation/expiry races, owned-route security, late SUCCESS and no unpaid QR. Signed IPN/query tests use test fixtures, not live provider evidence.
- [VnpayProtocolTests](../../backend/src/test/java/com/smartcinema/payment/VnpayProtocolTests.java): signature tampering/duplicate parameters rejected, both success codes required, return never settles, sensitive DTO redaction and stored submission amount.

The sources verify intended coverage; tests were not executed here. Existing tests do not establish a tested HTTP history contract or comprehensive typed independent paid Ticket/QR retrieval contract because those endpoints do not exist.

### Required tests after contract approval

| Area / risk | Required regression and acceptance coverage |
|---|---|
| Owned collection privacy | Anonymous/other roles denied; current BLOCKED user with stale JWT denied; no owner parameter injection; counts/items scoped to one Customer; empty/paginated pages; deterministic order; duplicate/unknown/overflow query inputs rejected |
| Historical readability | Effective expiry matches detail without writes; catalog hidden/inactive labels still readable; exact money/bigint strings; published discovery availability is not required |
| Independent entitlement security | Foreign and missing Booking have safe equivalent errors; typed paid response complete; nonpaid null/empty; no QR/provider/Staff metadata in logs/errors/cache or collection |
| Issuance coherence | One QR/one Ticket per purchased unit; STANDARD/VIP guestCount 1, COUPLE 2; replay/duplicate callback stable identity; transactional rollback leaves no partial aggregate; no GET issuance/mutation |
| Payment independence | Paid by replacement while reading an older FAILED attempt; late SUCCESS without sale yields no entitlement; lost attempt ID on paid Booking can recover via proposed read; frozen unknown identity never creates a Payment |
| Time/state boundaries | PAID after original expiresAt still shows issued entitlements; no automatic frontend Ticket expiry/admission claim; actual Ticket states including mixed-state HTTP fixtures, clearly marked as fixtures |
| Response validation | Malformed amount/IDs/time/state/QR, duplicate Ticket IDs/codes, foreign Booking Seat ID, wrong Seat Unit type/guestCount, incomplete set and stale mismatching Booking/entitlement projections suppress unsafe rendering |
| Browser recovery | Direct entry, reload, login resume, logout/account change, back/forward, multiple tabs, aborted/out-of-order reads, delayed finalization, network/5xx/429; no automatic initiation/submission/check-in |
| QR/accessibility | Decode rendered QR back to the exact server token; no mock payload/PII; mobile/tablet/desktop 390/768/1440px; quiet zone/high contrast; keyboard focus/Escape/return focus; Vietnamese long labels, disabled/loading/error states and no overflow |
| Full regression | Authorized test database only; `mvn verify`; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, relevant and full Playwright; preserve existing cases, no skips/retry masking |

Fixture-backed Ticket states do not prove real Check-in transitions. Isolated signed callback tests do not prove actual merchant interoperability, real Payment SUCCESS or real Booking PAID. Report those evidence classes separately in Phase 3 implementation.

## 9. Requirement Reconciliation

| Deliverable / requirement | Result |
|---|---|
| Backend capability and existing HTTP inventory | PASS — actual supported reads distinguished from internal storage/writers |
| Issuance, ownership, first freeze/original expiry and attempt independence | PASS — verified source boundaries documented |
| Missing contracts and smallest additive proposal | PASS — two proposed GET resources; no implementation performed |
| Frontend/Stitch comparison, integration plan and tests | PASS — real/preview boundary and unsupported content identified |
| Migration and implementation order | PASS — no migration expected for the read slice; approval gate explicit |
| Product history/real Ticket/QR Customer requirements today | PARTIAL — existing owned detail and issuance/projection; history and independent recovery still absent |
| Operational QR resolution/Staff Check-in | PARTIAL — requirements/schema only; unsupported workflow excluded from Customer proposal |
| Live paid/QR admission verification | NOT APPLICABLE to execution of this read-only audit; NOT RUN |

These PASS entries describe completion of the audit deliverables, not completion of Phase 3 product functionality.

## 10. Deviations / Conflicts and Migration Impact

**Migration assessment:** no schema change is expected for the proposed two reads. Booking/Ticket/QR data, history index and runtime SELECT grants already exist. Source migration head remains **V12**; V1–V12 are unchanged. No V13 is proposed. If future query profiling or authorization exposes an actual schema/index/grant blocker, report it separately before approving a migration.

The broader Staff Check-in lifecycle is a separate blocker: current append-only Ticket guard rejects status updates, and no protected scanner/check-in writer exists. Completing that workflow would require a separately approved contract/authorization/state-transition design and likely guard migration. Do not bundle it into Customer retrieval or relax guards to simulate mixed states.

Existing document/design conflicts:

- Project Scope v1.0 §5.9 describes a per-Ticket QR. Later BRD/SRS v1.2 and Business Analysis v2.1 explicitly approve one Booking QR with independent Ticket statuses. Current backend follows the latter. Preserve historical documents and record this conflict; do not generate individual Ticket QR codes.
- Supplied Stitch screens contain unsupported wallet/refund/NFC/rotating-token/admission/pickup and payment-detail claims, and the mobile COUPLE/Ticket-count ambiguity. These are design adaptation requirements, not backend capabilities.
- `CHECKED_IN`, `EXPIRED` and `CANCELLED` Ticket enum values are not evidence of implemented writers. A real status UI may display server-returned values, but fixtures must not be presented as live transitions.
- Current public preview route classification and incomplete login resume are explicit frontend integration dependencies. They cannot be fixed by treating navigation visibility as authorization.

Existing Convention Conflicts: legacy spaced Project Scope filename and legacy DOCX filename are cited as-is, not renamed. No new exception or requirement change was approved. No application/API convention was changed.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | New report uses `docs/reports/YYYY-MM-DD_task-name_report.md`; ignored evidence is under existing target output |
| Documentation convention | PASS | Template sections retained, verified facts/proposals separated, requirements linked, limitations and evidence classified |
| Domain terminology/statuses | PASS | Booking QR, Seat Unit, Ticket, exact existing serialized states; no invented requirement IDs or financial states |
| API convention | PASS for proposal | Plural `/api/v1/bookings` and nested `tickets`; existing routes untouched; new contracts explicitly unimplemented |
| Frontend code/import naming | NOT APPLICABLE | No source changes; proposed use of existing routes/primitives only |
| Backend/database naming | NOT APPLICABLE | No source/schema changes; current migration head preserved |
| Scope/security preservation | PASS | Read-only Stitch/source inspection; no database/provider commands, secrets, financial mutation, staging or commit |

## 11. Known Limitations and Decisions Needed

1. Proposed routes/DTOs, page bound/order, effective status/error semantics and exact opaque QR encoding require approval before backend implementation. They are not callable contracts today.
2. No live owned paid response, actual Sandbox callback or entrance scan was verified. Source and fixture evidence cannot replace those checks.
3. No operational Staff QR resolver/Check-in API exists. Customer can eventually display a genuinely issued identity via the proposed reads; end-to-end admission must remain unverified until the separate Staff contract exists.
4. Paid Ticket status expiry/Check-in updates are not implemented. Do not infer a temporal validity window or add a Customer check-in capability.
5. Rich history filters/posters/admission counters and unsupported Stitch actions are intentionally deferred. Product owners may approve additional contracts separately; they are not necessary for minimal real history/detail/QR recovery.
6. Decide how preview demonstrations are retained when existing routes become real, and confirm safe auth resume and session-clearing acceptance behavior. No mock fallback is acceptable on authenticated real routes.

## 12. Exact Implementation Order / Next Recommended Step

1. Review and approve the two additive read contracts, QR payload rules, history pagination/status semantics and design exclusions. Resolve any blocking contract question before coding.
2. Publish an additive history/Ticket/QR API contract and trace it to the existing requirements; preserve historical contracts and BRD/SRS.
3. Implement the minimal backend reads, typed DTOs, explicit Customer security, owner checks, read consistency, strict validation and safe errors. No settlement/guard/schema changes.
4. Add HTTP/PostgreSQL ownership, paid/unpaid projection, pagination and concurrency tests; run backend regression against an authorized test database. Do not manufacture live financial data for proof.
5. Implement validated frontend readers and pure service/type tests. Add narrowly scoped login resume and sensitive-data clearing behavior.
6. Replace preview consumption at the existing two routes; implement history, owned detail, Ticket statuses and the single issued QR view with Phase 1 components and adapted desktop/mobile Stitch references. Preserve Phase 2 Payment behavior.
7. Run QR decoding/accessibility/responsive and browser recovery checks, then the full frontend/backend regressions with exact final counts and no skipped/retried masking.
8. If authorized, perform read-only live owned-state checks and separately classify provider callback, actual Payment SUCCESS, Booking PAID and admission evidence. Mark unavailable live interoperability NOT RUN.
9. Produce the implementation report/update the relevant handoff after that separately authorized implementation, reconcile requirements/conventions and STOP. Do not proceed automatically to Staff Check-in, wallet, refund or deployment.

**Next task:** approve and implement the minimal Customer Booking history and independent Ticket/Booking QR read contracts, before real Phase 3 frontend integration. This audit makes no application changes.
