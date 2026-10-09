# Customer Concession composition frontend

Date: 2026-10-05. Primary frontend language: **Vietnamese**. Existing V12 backend, no backend change or migration. Read [Concession v1.0](../api/concession-composition-contract-v1.0.md) and [Booking v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md) together. Later Booking deltas supersede the older Concession document's disabled-Promotion/no-freeze staging statements.

## Real flow and catalog

Confirmed eligible owned `/bookings/{bookingId}/summary` offers **Thêm bắp nước** or **Chỉnh sửa bắp nước**. `/bookings/{bookingId}/concessions` independently loads authenticated owned Booking and public `GET /api/v1/concession-items`. Direct entry/reload never depends on preview memory. Static `/bookings/preview/...` demonstrations remain separate.

Catalog fields: string `id`, `name`, nullable `description`, `category` (POPCORN/DRINK/COMBO), exact string `sellingPrice`, nullable `imageUrl`. The endpoint returns ACTIVE items only; it has no status, branch-stock or availability field. Preserve order and distinct IDs even when names match. Tabs filter the returned array locally, without query parameters. Missing images use a neutral icon. Empty/error/malformed responses never fall back to products or prices from fixtures.

## Commands, quantities and ownership

| Action | Existing resource | Entire body |
|---|---|---|
| Add | POST `/api/v1/bookings/{id}/concessions` | `{itemId, quantity}` |
| Set quantity | PATCH `/api/v1/bookings/{id}/concessions/{lineId}` | `{quantity}` |
| Remove | DELETE the line resource | No body |

Each explicit save changes one line. Every POST creates a distinct line; there is no automatic merge or bulk replacement. Quantity is a JSON integer from 1 through 2147483647 (PostgreSQL integer capacity). Zero is invalid; use **Xóa món**. Frontend validation assists users; the backend decides eligibility and numeric overflow.

Bearer JWT supplies ownership. No owner/user/role/price/status/deadline field is sent. Adapters retain string bigint IDs, decimal strings, no-store, omitted browser credentials and AbortSignal. Foreign Booking/line access remains safe 404; wrong-role/inactive Customers remain 403. Login resume allows validated internal Summary/Concession URLs or the existing Seat route, with no automatic mutation or query-based write intent.

## Eligibility, deadline and stored amounts

UI edits require confirmed PENDING data, unelapsed original deadline, future screening and null `paymentStartedAt`. Before every explicit write, owned detail is refetched. Backend additionally checks publication, Cinema/Hall/Seat eligibility, attached origin Holds and cutoff. The DTO does not expose every eligibility predicate: an enabled UI control never grants entitlement. Frozen, terminal and elapsed Bookings are read-only, without replacement Booking or Hold actions.

Countdown projects returned `serverTime` with the existing conservative monotonic clock and original `expiresAt`. Add/update/remove/navigation/reload cannot renew it. Explicit UTC and the existing exact decimal-string formatter remain; the DTO supplies no currency/display timezone. Receipts must preserve Booking identity, creation, Seat snapshots/origins and expiry; inconsistent success is uncertain.

Each persisted line supplies `id`, `itemId`, snapshot `name`, snapshot `category`, `quantity`, snapshot `unitPrice`, exact `totalPrice`. Summary/editor render these from Booking, never from current catalog. Catalog repricing/renaming/omission cannot rewrite stored prices. Previously selected inactive products may still be updated/removed while eligible but cannot be newly added.

All five amount fields are server-authoritative. BigInt validates response consistency/line multiplication only; no frontend pricing, floating-point totals, guessed currency or Promotion formulas are added. Existing Promotion snapshots/discounts remain read-only. Backend revalidation of an applied Promotion can reject Concession changes; this screen cannot remove/reapply it.

## Concurrency and uncertain outcomes

One request ref gates editor reads/writes and duplicate local clicks. Complete reads before/after mutation, focus/pageshow/visibility refresh and 30-second polling reconcile server state. No late pre-write GET overwrites a mutation; no optimistic stored amount/line update is used. The contract has no version/CAS field: two tabs can add distinct lines; the last accepted absolute PATCH quantity wins. Conflicts/missing lines trigger safe owned/catalog reads, never automatic write replay.

Transport/5xx/malformed success may mean a committed write. The editor refetches Booking and keeps writes disabled until the Customer explicitly reviews returned composition. Failed reconciliation keeps controls disabled. A further add is a new line, never a silently replayed POST. Abort/unload does not prove rollback. Reload/login performs reads only. No command identity exists, so a read cannot identify which tab/request created a line or prove rollback; the UI makes neither claim.

## Verification and remaining boundary

Run TypeScript, ESLint, unit, production build, full Playwright and backend `mvn verify` with the dedicated local database/integration flags. New coverage includes exact DTOs/payloads, quantity bounds, all mutations, snapshots/totals/deadline, reload/back, two tabs, stale/inactive products, duplicate clicks, uncertain writes, freeze/expiry, auth and desktop/mobile/keyboard. Existing PostgreSQL tests change catalog name/price/status in isolated schemas and prove old snapshots survive quantity updates. Shared Neon catalog is not edited for proof.

Live Neon preflight on 2026-10-05 found no future OPEN_FOR_BOOKING/cutoff-valid Showtime among 73 records. Full live creation/composition persistence could not be exercised without out-of-scope scheduling changes. Actual no-interception production-browser checks used ordinary Customer login, existing CANCELLED Booking 1 and real five-item catalog for read-only/reload/desktop/mobile/keyboard verification. This is limited live read evidence, not a new live composition transaction. No business writes or cleanup were needed; original domain/history/financial fingerprints and V1–V12 applied checksums were preserved.

The Concession milestone itself added no Promotion/Payment command; its [implementation report](../reports/2026-10-05_customer-concession-composition-frontend_report.md) is preserved. Current continuation: [real Promotion application/removal](customer-promotion-composition-frontend.md) and [Payment initiation](customer-payment-initiation-frontend.md) now live inline in owned Summary. The editor displays persisted code/discount, directs Customers there to explicitly remove/replace a code after revalidation conflict, and remains read-only after first Payment freeze. It never silently clears/reapplies Promotion or unfreezes composition. Post-initiation return/status, Ticket/QR, history, Admin and deployment remain separate. Exact next recommendation: **Audit and integrate the Customer post-initiation Payment return/status/recovery flow against the existing backend verification contract.** Keep backend verification authoritative; no Tickets before independently verified SUCCESS. Recommendation only.
