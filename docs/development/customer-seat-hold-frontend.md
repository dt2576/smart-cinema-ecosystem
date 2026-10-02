# Customer authoritative Seat Hold frontend

Date: 2026-10-02. Uses existing V12 and [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md)
plus [v1.1](../api/seat-hold-contract-v1.1.md). No new backend endpoint or migration.

## Run and authentication

Run `pnpm dev` from repository root using the normal ignored backend `.env`.
Browse Movie → Cinema → Showtime → `/showtimes/{showtimeId}/seats` with the
Movie/Cinema/date query context. Public discovery/map stays public. An anonymous
Customer can draft a selection, then **Sign in to hold Seats** preserves that
navigation and draft through existing login. The draft grants no entitlement.
Only a backend-accepted active CUSTOMER JWT grants/manages owned Holds; stored
display roles and the legacy numeric Auth userId never supply Hold ownership.

## Select, acquire and change

- Draft selected units are distinct from **Held by you**. **Hold selected Seats**
  POSTs the complete selected string-ID set atomically. No per-unit acquisition
  loop or automatic acquisition retry exists. STANDARD/VIP each mean one guest;
  one COUPLE identity/control/Hold means two guests.
- Existing owned units are included when adding units. Server same-owner retry
  preserves their IDs/expiry and caps new units by the earliest existing deadline
  in that request. Removing an owned unit uses its exact DELETE Hold ID and then
  reconciles; removing an unheld draft makes no write.
- The contract has no atomic replacement/bulk release endpoint. **Clear selection /
  release Holds** discards drafts and releases known owned IDs sequentially,
  stopping on failure and reloading remaining truth. It cannot promise atomic
  multi-release. No implicit release occurs on navigation or reload.
- Requests are gated while pending. Safe typed 400/401/403/404/409/service errors
  expose no upstream SQL/owner details. A lost write response triggers owned GET
  reconciliation, not a blind write retry or mock fallback. Failed reconciliation
  labels last-confirmed state and disables acquisition/Continue until refresh.

## Time, ownership and reconciliation

GET owned unattached usable Holds is separate from public AVAILABLE/HELD/BOOKED/
UNAVAILABLE. Public HELD never identifies an owner. Attached Holds are excluded
by v1.1 and cannot be independently reused/released by this screen.

The countdown projects PostgreSQL `serverTime` plus monotonic elapsed time and
the exact earliest returned `expiresAt`. A conservative round-trip allowance
may display expiry slightly early; it cannot grant a fresh local TTL. Browser
wall-clock changes do not extend this countdown. The server remains authoritative
at every operation and future Booking creation.

Entry/reentry/reload reads owned Holds and the real map. Focus, pageshow/visibility
and 30-second visible-page polling refresh state; reaching an expiry also
reconciles. Refresh does not POST, renew or automatically reacquire. Showtime
cutoff/start blocks new operations/Continue in the projected UI, and the backend
revalidates publication, parents, physical sellability and cutoff after locks.
Explicit release remains server-controlled, including stale/terminal identities.
There is no realtime push transport or frontend concurrency lock substitute.

## Booking handoff (current integration)

Primary **Create Booking & review** freshly reloads owned Holds/map and sends the
complete exact string Hold set through the existing Booking API. It attaches
origins atomically and opens the real owned Summary with server identity,
Seat snapshots, exact total and Booking expiry. Attached Holds are excluded from
independent owned reads and cannot be individually released/reused; returning
shows public HELD/disabled units and Return to Booking, with no renewal.

The secondary **Preview Concessions** action remains a separate local design
flow. Its quantities, Promotion, prices and Payment simulations are not persisted.
No Payment/Ticket/QR is created by either action. See the
[Booking integration guide](customer-booking-creation-frontend.md) for exact-set
unknown-response recovery, owned GET reload/auth, snapshots/deadline and limits.

## Verification

Use frontend `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`
and full `pnpm test:e2e` with `PLAYWRIGHT_CHANNEL=msedge` on this host and no retries.
Run all backend `mvn verify` PostgreSQL flags against the dedicated local
regression database, never destructive isolated-schema tests on Neon. Browser
HTTP fixtures and actual no-interception Customer/Neon evidence are separately
recorded in the [implementation report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md).
