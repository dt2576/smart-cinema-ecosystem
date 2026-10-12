# Staff QR resolution, recovery and Check-in APIs

Implemented 2026-10-13, Phase4B-2. Authoritative wire contract: [Staff operational v1.0](../api/staff-qr-checkin-contract-v1.0.md). [Implementation evidence](../reports/2026-10-13_staff-qr-checkin-backend-apis_report.md). Previous [onboarding/foundation](staff-onboarding-and-checkin-foundation.md) remains valid.

## Operational resources

All require authenticated JWT STAFF **and current database ACTIVE/STAFF**. ADMIN/MANAGER have no admission inheritance. Effective ACTIVE STAFF assignment authorizes only its actual Cinema; cinemaId is a context hint, not permission.

| Resource | Request | Result |
|---|---|---|
| GET `/api/v1/staff/cinema-assignments` | No body/query | serverTime and current assignments, numeric assignment ID order |
| POST `/api/v1/staff/booking-qr-resolutions` | Exact `{cinemaId,bookingQr}`; no query | Minimal StaffBookingResponse; logical read only |
| GET `/api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` | Exactly one canonical context; no body | Independent authorization and coherent recovery |
| POST `/api/v1/staff/bookings/{bookingId}/check-ins` | Exact `{cinemaId,ticketIds}`; no query | 200 `{checkedInTicketIds,booking}` after transition/audit commit |

Every ID is a canonical positive bigint decimal **string**, including beyond JS safe integers. Reject number IDs, leading zeros, signs, overflow, duplicate/unknown properties/query fields, empty/duplicate selections and actor/state/time overrides. Stream-bound Check-in body to1MiB; QR resolution64KiB. No business maximum Ticket count.

## Confidential reads and admission

Booking QR is exact opaque UTF-8: preserve spaces, case, Unicode normalization and punctuation. Nonblank, maximum128 code points, no controls/unpaired surrogates. Never trim, URL-decode, fetch, wrap or regenerate. JSON body only; no URL, return field, log/error reflection or Staff-client persistence. Redacted MVC wrapper and private JDBC binding suppress ordinary DEBUG/TRACE token diagnostics. Reverse proxy/APM/wire capture require operational redaction; do not enable body capture.

Reads use read-only REPEATABLE_READ snapshots. Separately committed rate ledger is technical persistence only; no read changes Booking/Ticket/QR/financial data. Unknown and foreign QR/Booking share fixed404. Projection includes only contracted screening labels/times, Booking identity/status, Seat Unit/Ticket state and purchased Concession name/category/quantity. No Customer PII, amount, provider detail, QR, audit operator ID or pickup authority.

PAID issuance validates complete nonempty one-Ticket-per-unit aggregate, unique identities/codes, seat-type snapshots, soldAt=issuedAt=paidAt and Check-in timestamp consistency. Corrupt issuance fails503 without partial entitlements. Nonpaid recovery returns no Tickets and NOT_PAID; elapsed PENDING expiry projects EXPIRED without mutation.

Advisory admission requires PAID, ACTIVE Cinema/Hall, OPEN_FOR_BOOKING or STARTED and inclusive start−30min through start+15min using database time. Reasons: null, NOT_PAID, CONTEXT_UNAVAILABLE, OUTSIDE_ADMISSION_WINDOW; response explanations, not domain states. canCheckIn additionally requires VALID. CHECKED_IN/EXPIRED/CANCELLED are non-selectable. COUPLE is one Ticket/two guests/one transition. Original pre-sale expiry, Movie publication and Customer block do not veto paid admission.

## Explicit command and recovery

READ_COMMITTED service uses **only V13 check_in_tickets**. Writer revalidates current Staff/scope/actual hierarchy, complete PAID issuance, active context/window and all selected VALID members after ordered locks/fresh database time. User→Cinema→Hall→Showtime→Movie→Seats/pairs→Bookings→Holds→selected Tickets→audit order unchanged. Lock2s, statement5s, service transaction10s; no network or automatic command retry under locks. Runtime has no direct Ticket UPDATE/DELETE or owner membership.

Selected transitions and exactly one immutable attributed audit per Ticket commit together. Booking stays PAID; QR/freeze/financial snapshots/unselected Tickets stay intact. Response construction/deferred assertion failure rolls back. Transport loss **after commit** is uncertain to caller: recover via scoped GET/rescan, explicitly reselect. Repeated command may409; no identical-response replay. Never automatic Check-in on mount/reload/rescan, or retry possibly committed command.

All responses/errors no-store, fixed ProblemDetail. 400 invalid input/media/body;401 auth;403 current account/role/scope;generic404 inaccessible Booking/QR/Ticket;409 state/admission conflict;429 Retry-After60;503 database/timeout/inconsistent aggregate/commit uncertainty. Generic internal DB assertions on strictly validated operational commands map503; invitation validation semantics are preserved.

V14 extends V13's durable limiter: shared per-actor STAFF_READ60/minute (three reads), CHECKIN30/minute. Independently committed ledger includes business conflicts. Existing redemption10/minute/resend3/hour, owner/ACL/retention intact. V1–V13 sources/checksums/writer preserved. Local QA only; no Neon operation.

## Verification and Phase4C prerequisites

Use dedicated local PostgreSQL and all previous DB flags plus STAFF_DB_TESTS=true; delivery/provider/cleanup disabled. Existing foundation SMTP regression needs non-relaying Mailpit127.0.0.1:1027/8027. No Gmail credentials/live recipient. From backend:

```text
mvn -Dtest=StaffAdmissionTests,StaffAdmissionPostgresTests test
mvn verify
```

Isolated protected-settlement fixtures do not prove live VNPAY/Gmail/production admission. Exact results and failure history are in the report.

Phase4C needs separate authorization, frontend-local workflow/Next docs and actual Staff Stitch exports review, Staff navigation/auth resume, current scope selection, exact-token scanner/manual input, explicit selection/command and uncertain-result GET recovery. Context/session changes must invalidate stale responses/selection. Vietnamese loading/no assignment/403/404/409/429/503/camera permission/device/empty/mixed/success states, privacy/media lifecycle, accessibility and390/768/1440 QA remain frontend work. No history/KPI/shift/gate/pickup/offline/printing/undo capability implied. Activation/Admin frontend and live HTTPS/Gmail onboarding remain separate scope. No automatic Phase4C, commit or deployment.
