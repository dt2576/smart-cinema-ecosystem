# Customer Booking creation frontend

Date: 2026-10-02. Existing backend V12; no backend change or migration.
Read [Booking v1.0](../api/booking-contract-v1.0.md) and additive
[v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md),
[v1.3](../api/booking-contract-v1.3.md), plus
[Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md) and
[v1.1](../api/seat-hold-contract-v1.1.md). These contracts remain unchanged.

Current continuation, 2026-10-05: [real Concession composition](customer-concession-composition-frontend.md) and [real Promotion application/removal](customer-promotion-composition-frontend.md) now extend owned Summary. The original creation/Seat-origin behavior below is preserved; Payment remains a separate integration.

## Actual boundary and navigation

Run `pnpm dev` from repository root with the existing ignored `backend/.env`.
Use the normal Customer login and Movie → Cinema → Showtime → Seat flow.
Select whole units, **Hold selected Seats**, then **Create Booking & review**.
The primary action opens `/bookings/{bookingId}/summary` only after the server
confirms its identity. It creates a seat-only PENDING Booking. Owned Summary now
offers optional real Concession composition; it stops before Promotion and Payment integration.

The existing **Preview Concessions** secondary action opens the separate static
design preview. Its local catalog, quantities, Promotion codes, prices and
Payment simulations never modify the real Booking. Preview routes retain their
explicit disclosures and are not a continuation of the persisted Summary.
My Bookings/Tickets/QR also remain separate fictional fixtures.

## Create request and atomicity

`POST /api/v1/bookings`, Bearer authenticated active CUSTOMER, returns 200.
The complete request is:

```json
{"showtimeId":"12","holdIds":["2","3"]}
```

The adapter takes exactly the fresh owned Hold identities from Seat Selection,
after reloading owned Holds and map. It never reconstructs origins from Seat IDs,
public HELD, userId, role or timestamps. No client price/status/deadline is sent.
One POST attaches the entire set under existing PostgreSQL gates; there is no
client loop creating Booking Seats. Backend ownership, original origin,
membership, publication/parent eligibility and cutoff/expiry checks win even
when the displayed timer still looks valid. A rejection reconciles owned/map
truth, displays a safe error and creates no local substitute or fresh Hold.

STANDARD/VIP each produce one Booking Seat for one guest. COUPLE produces one
Booking Seat for two guests. Existing server pricing uses one approved
`showtime.base_price` per unit; no type adjustment or two-guest price doubling.

## Actual response and authoritative display

The typed DTO mirrors the current BookingResponse, with decimal string IDs:

- `id`, `bookingCode`, `status`, Showtime/Movie/Cinema/Hall IDs and labels;
- `startsAt`, `createdAt`, `expiresAt`, `serverTime`, nullable `paymentStartedAt`;
- `seatUnitCount`, `guestCount`, whole Seat lines including `id`, `seatId`,
  `holdId`, row/number, type/guest count and `unitPrice`/`finalPrice`;
- `seatAmount`, `concessionAmount`, `subtotal`, `discount`, `finalAmount`;
- persisted Concession lines and nullable Promotion snapshot. Concession lines
  may be edited through the dedicated composition screen while eligible;
  Promotion now supports explicit real apply/replace/reapply/remove inline in owned Summary; its terms and discount remain server-authoritative.

Seat type, prices and totals are saved snapshots. Movie/Cinema/Hall labels are
current referenced metadata in this API; they are not invented historical
snapshots. Summary does not reload the public Movie catalog or reprice from it.
The response contains no currency, poster/duration, Ticket or QR. Screening time
is explicitly displayed in UTC because this DTO supplies no display timezone.
No VNPAY amount conversion or assumed currency is added.

`numeric(19,4)` values remain strings and display all four digits, including
fractions/zero and values above JavaScript's safe integer range. BigInt arithmetic
checks response consistency only; it never replaces server amounts. An invalid
or partial create receipt remains an unknown outcome, not confirmed creation.

## Deadline, reload and attached origins

Summary projects returned `serverTime` with monotonic elapsed time and the exact
server Booking `expiresAt`, not a new local TTL or the old Hold timer. Refresh,
reload, browser navigation and composition previews cannot extend it. GET
reports elapsed PENDING as EXPIRED even if scheduled persistence cleanup is
delayed. The UI rechecks at expiry and preserves snapshots for terminal states.

`GET /api/v1/bookings/{id}` restores owned detail on reload/direct entry. It
remains usable after the public catalog hides the screening. Missing/foreign
detail returns the same safe 404, roles/inactive accounts 403, unauthenticated
access 401. Normal login safely resumes only the validated local Summary route;
browser role/userId display and knowledge of a Booking code grant no access.

After creation, attached Holds remain ACTIVE with their original expiry. They
are excluded from the independent owned-Hold list and cannot be individually
released or reused. Returning to Seat Selection shows them as public HELD,
disabled, with **Return to Booking** and **See Booking** for the aggregate deadline.
It does not automatically POST, release or renew. Cancel/expiry belongs to the
backend whole-Booking lifecycle; no new cancellation UI is included here.

A per-tab sessionStorage hint remembers exact submitted origins, optional
confirmed server Booking ID and the original Seat URL only. It is untrusted
navigation/recovery intent, never ownership or entitlement. Stored Seat query
context is accepted for navigation only if validated and matching the returned
Booking IDs. Cold direct entry uses the real Showtime date picker, not a guessed
local date sliced from a UTC timestamp.

## Duplicate and uncertain writes

The Hold refresh gate and Booking request ref prevent duplicate local actions.
While creation is pending/uncertain, acquisition, release, preview continuation
and fresh creation are disabled. No automatic Booking POST retry exists.

The existing backend exact-set retry is deliberately used only by explicit
**Recover Booking**: same authenticated owner, same Showtime, complete exact
original Hold set, existing eligible unexpired PENDING Booking. It returns the
same identity/snapshots/deadline. Subsets, supersets, mixed/foreign or conflicting
attached sets cannot fabricate a replacement. The intent is saved before the
write because abort/navigation does not prove rollback. Recovery can still be
offered if public catalog/map reads later fail; backend eligibility still wins.

Definitive 4xx rejection clears pending intent and reloads Seat truth. Transport,
5xx or malformed success keeps the exact intent for explicit recovery. Errors
use safe typed messages, no SQL/privilege/provider internals, no mock fallback.
GET service failure labels last-confirmed data; 401/403/404 clears displayed
detail. Requests use Bearer, no-store, omit browser credentials and AbortSignal.

Limits: there is no Booking list/search endpoint for unknown lost identity.
If its exact-set retry window has elapsed, the frontend cannot discover that
unknown Booking or resurrect it. If sessionStorage is blocked, in-memory recovery
survives only until unload. The last per-tab hint is not Booking history.

## Payment and next integration

Persisted Summary provides no enabled Payment handoff. It links to the real
Concession editor and inline real Promotion commands; no Payment or VNPAY write is initiated. Creation does not freeze composition,
consume Holds/Promotion usage, set PAID/paid_at/sold_at or issue Ticket/Booking QR.
If GET returns an already frozen Booking, `paymentStartedAt` is shown as an
existing attempt boundary, never proof of verified success.

Exact next recommended task: **Real Customer Payment initiation frontend integration against the existing backend Payment contract.**
Do not begin automatically. See the
[implementation report](../reports/2026-10-02_customer-booking-creation-frontend_report.md).
