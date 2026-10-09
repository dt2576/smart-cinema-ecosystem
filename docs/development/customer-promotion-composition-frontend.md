# Customer Promotion composition frontend

Date: 2026-10-05. Primary language: **Vietnamese**. Inline real owned Summary integration, existing V12 backend, no backend change or migration. Read [Promotion v1.0](../api/promotion-composition-contract-v1.0.md), [v1.1](../api/promotion-composition-contract-v1.1.md), and [Booking v1.2](../api/booking-contract-v1.2.md)/[v1.3](../api/booking-contract-v1.3.md) with their earlier contracts. Current Payment freeze supersedes older pre-Payment staging statements; no historical contract is edited.

## Real input and commands

`/bookings/{bookingId}/summary` independently reads owned Booking. Its **Khuyến mãi** panel accepts a code, applies/replaces/reapplies the single Promotion or removes it. There is no public Promotion list/discovery endpoint and no sample-code suggestion or fallback. `/bookings/preview/summary` remains an explicitly separate static demonstration.

| Action | Existing API | Complete body |
|---|---|---|
| Apply/replace/reapply | PUT `/api/v1/bookings/{bookingId}/promotion` | `{code: string}` |
| Remove | DELETE the same resource | No body |

Only the entered code is sent. Backend strips surrounding whitespace, uppercases with Locale.ROOT and requires 1–50 characters after normalization. Frontend checks blank input for Vietnamese feedback; other format/length validation belongs to the backend. No invented alphanumeric pattern or client code normalization is applied. IDs remain positive bigint strings through 9223372036854775807. Bearer JWT is the sole actor authority; no user/owner/role/amount/discount/price/time fields or query parameters are sent. Requests use no-store, omitted browser credentials and AbortSignal. No dependency was added.

## Server rules and persisted state

Backend checks ACTIVE status, its half-open validity window using database time, minimum pre-discount Seat + Concession subtotal, global usage counted from PAID Bookings, type/value/cap bounds and aggregate eligibility. PENDING application does not reserve/consume usage. No per-Customer limit exists; no branch/Movie/Showtime-specific Promotion policy is invented.

The existing database supports FIXED_AMOUNT and PERCENTAGE with its approved percentage rounding/cap and fixed fractional handling. Frontend contains no discount algorithm or authoritative eligibility calculation. It renders exact stored `discount` and all five Booking amount fields through `formatBookingAmount`, retaining zero and four decimal digits without Number/parseFloat, inferred currency or rounding.

Nullable `promotion` contains string `id`, `code`, `type`, exact `value`, `minimumOrderAmount`, nullable `maxDiscountAmount`. There is no name/status/date/usage field in this snapshot. Summary displays the stored code, ID and discount; it does not join a current master or invent a historical name. Owned GET preserves accepted terms even after master changes. Explicit apply/reapply or an accepted Concession edit revalidates current terms. Failed application retains the prior snapshot; eligible DELETE of an absent Promotion succeeds and clears snapshots/discount. Invalid old terms do not prevent eligible removal or replacement.

## Concession interaction

Existing [Concession composition](customer-concession-composition-frontend.md) continues to use real commands and complete owned/catalog reconciliation. Accepted add/quantity/remove revalidates the applied Promotion, refreshes accepted terms/discount and preserves Concession unit-price snapshots. If the Promotion fails current eligibility or minimum amount after an edit, the whole Concession transaction rolls back. It is not silently removed.

The editor now shows the persisted code/discount and explains the Summary removal/replacement recovery path. Summary → Concession → Summary reloads server state. No hook restores an old Promotion or retries the declined Concession command. Removing/replacing an invalid code is a separate explicit Customer action.

## Eligibility, original deadline and freeze

Controls require a confirmed PENDING Booking, future server-derived deadline/screening and null `paymentStartedAt`. Before every command Summary freshly reads owned detail. Backend additionally revalidates origin Holds, current Seat/pair/parent/publication/cutoff and lock-time eligibility; the DTO does not expose all these predicates. UI enablement is not entitlement.

Expired/CANCELLED/PAID/frozen Bookings show persisted Promotion read-only without mutation controls. The permanent first-Payment marker is never reset; no Payment request or replacement Booking is introduced. Receipts preserve Booking identity, Showtime, creation, Seat origins/prices and original `expiresAt`. Exact server time uses the existing monotonic clock, explicit UTC and original countdown. Apply/remove/rejection/revalidation/reload/back cannot extend Hold or Booking TTL. A concurrent accepted Concession edit can change its lines/totals; the complete server aggregate wins.

## Reads, concurrency and uncertainty

The existing Summary detail hook now owns one ref gate for all reads and Promotion writes. It reads before/after each command; no pre-write late GET can overwrite a receipt. Duplicate local submit clicks are gated. Focus/pageshow/visibility, 30-second polling, manual refresh and expiry reconciliation continue through that gate. No optimistic Promotion or total is displayed.

The contract has no version/CAS, command identity or idempotency key. The database serializes aggregate edits; different-tab apply/remove/Concession commands expose the last accepted complete state. No invented client version is sent. Reapplication may refresh changed master terms, so even PUT/DELETE is never automatically replayed.

Network/5xx/malformed receipt can mean a committed command. Owned GET reconciles it; writes and the Concession entry remain blocked until a successful owned read plus explicit **Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa**. Failed reads keep the review disabled. Refresh cannot silently acknowledge. Known conflicts refetch without restoring old snapshots. Abort/unload does not prove rollback; direct entry/reload/back/login restores state by owned reads only, without replay or stored write intent. A read proves current state, not which concurrent command caused it.

400/401/403/404/409/service/network/invalid-response outcomes use safe Vietnamese messages. Only the exact approved ProblemDetail title `Promotion unavailable` refines the 409 category; unknown/inactive/future/expired/minimum/exhaustion remain indistinguishable. Raw title/detail/SQL/internal messages are never rendered. Foreign ownership remains backend 404, inactive/wrong-role 403. 401 clears unavailable data and returns through the existing validated internal Summary login path, with no automatic apply/remove after login.

## Verification and boundary

Use TypeScript, ESLint, unit, production build, full installed-Edge Playwright and backend `mvn verify` with the existing dedicated local PostgreSQL database/integration flags. Isolated PostgreSQL Promotion/Payment tests prove actual eligibility, rounding/cap/fraction, snapshot, revalidation, minimum rollback, usage-count policy and lock/freeze races. Browser fixtures are independent HTTP contract simulators, never production authority or Neon persistence proof.

Read-only Neon preflight on 2026-10-05 again found 73 existing Showtimes and zero future OPEN_FOR_BOOKING/cutoff-valid rows. New live Booking/Promotion writes are **NOT RUN** for this data dependency. No schedule/catalog/Promotion validity/data manipulation was used. Actual production-browser reads used ordinary existing QA Customer login and owned CANCELLED Booking 1; persisted state/deadline, read-only/reload/desktop/mobile/keyboard passed without interception or business writes. Original domain/history/financial rows and V1–V12 checksums are audited separately. See the [dated report](../reports/2026-10-05_customer-promotion-composition-frontend_report.md) for final totals/evidence.

The Promotion task added no Payment/gateway command or issuance. The separately authorized [2026-10-07 Payment continuation](customer-payment-initiation-frontend.md) now adds explicit first initiation and backend-gated Sandbox submission, preserving Promotion freeze and authority. Exact next recommendation: **Audit and integrate the Customer post-initiation Payment return/status/recovery flow against the existing backend verification contract.** Keep backend verification authoritative; no Tickets before independently verified SUCCESS. Recommendation only.
