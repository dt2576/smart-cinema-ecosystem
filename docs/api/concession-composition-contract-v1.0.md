# Customer Concession Composition Contract v1.0

Date: 2026-09-29. Status: Concession catalog/composition implemented in V7; Promotion is **persistence only, application disabled pending business policy**.

## 1. Sources and scope

Sources: [SRS v1.2](../srs/srs-v1.2.md) FR-CONCESSION-001/004–006, FR-BOOKING-013–018 and FR-PROMO-001–006; [BRD v1.2](../brd/brd-v1.2.md) BR-065–067/034/035; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§29/29A; [approved decisions](../db/database-design-decisions-v1.0.md); [physical dictionary](../db/physical-data-dictionary-v1.0.md) §§3.15–3.17; [integrity design](../db/integrity-enforcement-design-v1.0.md) §§3/5/6.

Concessions are optional Booking add-ons, with only POPCORN, DRINK and COMBO. No inventory, warehouse, supplier, kitchen, stock movement or standalone POS is introduced. Existing Booking Seat snapshots, owner, Showtime, attached Holds and original deadline remain unchanged. There is no Payment, PAID, CONSUMED, sold_at write, Ticket or Booking QR issuance.

## 2. HTTP resources

| Method/resource | Access | Successful response |
|---|---|---|
| `GET /api/v1/concession-items` | Public | 200 array of ACTIVE catalog items; empty array when none |
| `POST /api/v1/bookings/{bookingId}/concessions` | Owning active CUSTOMER | 200 authoritative BookingResponse after adding a line |
| `PATCH /api/v1/bookings/{bookingId}/concessions/{lineId}` | Owning active CUSTOMER | 200 BookingResponse after setting quantity |
| `DELETE /api/v1/bookings/{bookingId}/concessions/{lineId}` | Owning active CUSTOMER | 200 BookingResponse after removing the line |

Catalog reads have the same public-read policy as Movie/Genre. Invalid supplied Bearer credentials retain existing 401 handling; omit credentials for anonymous reads. Successful responses use `Cache-Control: no-store`. Query parameters are rejected; there are no category-filter, pagination or admin endpoints in this contract. The catalog is chain-wide and does not imply branch stock or availability.

JWT subject supplies ownership; database Customer role/status is revalidated. Staff/Manager/Admin cannot bypass ownership through these Customer routes. Foreign Booking IDs and line IDs produce safe 404 responses without revealing the real owner. DELETE physically removes only the permitted pre-Payment add-on line; it never deletes Booking history or Seat lines.

Catalog DTO fields: `id`, `name`, nullable `description`, `category`, `sellingPrice`, nullable `imageUrl`. IDs and exact decimal prices are JSON strings. Internal status/timestamps are not exposed. Order: POPCORN, DRINK, COMBO; then name using PostgreSQL C collation; then numeric ID. Duplicate display names are not merged: different item IDs remain distinct catalog products. No stock, popularity or pricing classification is invented.

## 3. Request and line identity

Add a new line:

```json
{"itemId":"9007199254740993","quantity":2}
```

Set an existing line quantity:

```json
{"quantity":3}
```

Only the shown fields are accepted. Quantity must be a JSON integer from 1 through 2147483647 (PostgreSQL integer capacity, not a new business maximum). Zero, negatives, strings, fractions, floating-point JSON forms and overflow are rejected. Remove uses DELETE; quantity zero is not an alias for removal.

All path/body IDs follow the existing positive-bigint string contract: 1–19 ASCII digits, numeric range 1–9223372036854775807. IDs above 2^53 remain exact. Client-supplied prices, totals, snapshots, owner, timestamps, Promotion, status and category are rejected. No client input can extend the Booking deadline.

Each POST creates a separate Booking Concession line. The approved model has no unique Booking/Item constraint and does not define automatic merging; repeated POST is **not idempotent**. After an uncertain response, fetch owned Booking detail before deciding to add again. PATCH sets an absolute quantity and safely repeats while eligible; requests serialize, with the last accepted quantity winning. No compare-and-set version or automatic server retry is introduced. Removing a missing/already-removed line returns 404.

## 4. Snapshots and totals

New lines require an ACTIVE item and copy its current name, category and price while holding a catalog row SHARE lock. The row stores `quantity`, `unit_price_snapshot` and `total_price = quantity × unit_price_snapshot`.

Existing-line quantity updates preserve its name/category/unit-price snapshots even if the master changes or becomes INACTIVE. INACTIVE prevents **new addition**; it does not reprice, replace or erase an already selected line. Existing lines may be updated/removed while the Booking remains eligible. Removing and adding again is a new selection and requires ACTIVE catalog state and a new snapshot.

All arithmetic is PostgreSQL exact numeric(19,4). The controlled catalog writer rejects precision beyond four fractional digits rather than silently rounding. Line, aggregate and final totals must remain finite, nonnegative and below 1000000000000000; overflow aborts the whole edit. No currency, discount rounding or gateway minor-unit policy is selected here.

After every accepted edit:

```text
concession_amount = sum(retained Booking Concession total_price)
subtotal = existing seat_amount + concession_amount
discount = 0 (Promotion application remains disabled)
final_amount = subtotal
```

No Seat snapshot is recalculated from current Showtime pricing. A Booking with no add-ons remains valid with zero concession_amount. Promotion/discount input is never accepted through a Concession command.

## 5. Booking response and eligibility

[Booking v1.1](booking-contract-v1.1.md) adds `concessions` to the existing BookingResponse. Each line contains string `id`, string `itemId`, snapshot `name`, snapshot `category`, integer `quantity`, exact string `unitPrice` and string `totalPrice`, ordered by numeric line ID. All existing totals are authoritative decimal strings. GET owned detail, create/exact-Hold retry and edit responses use the same projection.

Add/update/remove requires PENDING, unexpired Booking with NULL payment_started_at and valid owned ACTIVE origin Holds. Revalidate Movie publication, Cinema/Hall state, Showtime OPEN_FOR_BOOKING/start/cutoff, physical Seat status and sellability at write time. Expired/cancelled/ineligible/frozen composition is rejected. In this stage the schema prohibits creating a real freeze marker at all; future Payment must establish it atomically with an attempt.

Cancellation and aggregate expiry preserve remaining add-on snapshots/totals as history. They do not independently release or detach a single Hold. Existing deadline/ownership rules remain authoritative; failed edits roll back incidental expiry mutations, while read projections and later successful cleanup still enforce elapsed entitlement.

## 6. Persistence, locks and permissions

V7 creates `concession_items`, `booking_concessions` and schema-only `promotions` with approved types, named PK/FK/CHECK/unique constraints and the two Booking Concession FK indexes. It adds the Booking Promotion FK but retains NULL-only Promotion/zero-discount staging. All historical migrations remain unchanged.

Booking edits reuse READ COMMITTED, bounded existing Hold timeouts and the User → Cinema → Hall → Showtime → physical Seats/pairs → Booking/Hold lock order. After those resources, a new item is read FOR SHARE; an existing line is locked FOR UPDATE. Catalog-only configuration takes only its catalog row lock and must not subsequently lock earlier Booking/Showtime resources. Edits recheck PostgreSQL `clock_timestamp()` after waits and before acceptance.

Immediate line guards enforce editable parent state and immutable identity/name/category/price. Header guard permits only add-on monetary fields during eligible PENDING edits; state transitions preserve totals/history. Deferred assertions run for header and child changes and reconcile the complete concession sum with Booking totals. The Seat-line insertion guard also rejects a Booking with existing attached origins: changing header totals/xmin cannot reopen Seat composition, even for zero-priced Seats.

New objects use existing NOLOGIN `smart_cinema_hold_owner`; runtime role receives SELECT on catalog/lines and EXECUTE on the single protected edit routine, with no direct DML/TRUNCATE/configuration/helper privileges. SECURITY DEFINER routines use fixed safe search_path and actual schema-qualified objects. Production must use separate deployment credentials and non-owner runtime credentials as documented by the existing Booking/Hold contracts.

Deployment-only `configure_concession_item(id,name,description,category,price,image,status)` initializes/updates catalog records through guarded persistence; NULL id creates a new item. It preserves identity/creation, validates price precision and stamps update time. No public/admin HTTP writer, product seed, hardcoded price or operational audit subsystem is added. Operators must supply approved catalog content; image fields remain bounded references, not fetched resources.

## 7. Promotion safe boundary and unresolved decisions

The source requirements require active state, server-time validity, usage and minimum-order checks, but SRS §3.8 explicitly leaves the discount target to business rules. Integrity design §6 also leaves usage consumption/release undefined. Consequently this slice **does not expose apply/remove/validation endpoints or calculate any discount**. An ACTIVE stored Promotion is not evidence that application is enabled.

Implemented persistence: unique uppercase-trimmed nonblank code, FIXED/PERCENTAGE tokens, bounded nonnegative values (percentage ≤100), finite `valid_from < valid_until`, nonnegative minimum_order, optional positive usage_limit, ACTIVE/INACTIVE status and Booking FK. No demo code or production Promotion is seeded. Runtime receives no Promotion mutation or lookup privilege/API. Static schema checks do not prove that a code is currently eligible.

Before enabling application/removal, approve:

1. Discount target: Seat subtotal, Concession subtotal or whole Booking; corresponding minimum-order basis and additional eligible scope.
2. Percentage/fixed calculation, cap behavior, currency scale and discount rounding. Preserve the physical design's selected decimal conventions without importing frontend demo rounding.
3. Usage consumption point, concurrent reservation/count predicate, release on remove/cancel/expiry, and any limits per Customer. No usage counter/redemption entity is invented.
4. Behavior when an applied Promotion becomes inactive/expires or composition changes before Payment, including customer reconfirmation of changed totals.

The existing singular Booking Promotion field supports at most one association; no stacking is implemented. Once policy is approved, install the protected application/removal path, total/snapshot assertions and shared Promotion lock protocol together. Do not simply drop the NULL/zero stage checks. Valid/invalid/expired/ineligible application tests remain deferred until that policy exists.

## 8. Errors, verification and Payment dependencies

Existing ProblemDetail conventions apply: 400 invalid body/IDs/quantity/query; 401 missing/invalid credentials; 403 non-Customer/inactive account; 404 foreign/missing Booking/line; 409 unavailable item, ineligible Booking, amount bound or bounded contention; 503 unexpected database failure. No SQL or owner details leak in responses. All unsuccessful commands roll back line/header changes together.

Verification: [implementation report](../reports/2026-09-29_concession-composition-backend_report.md). Frontend adapters remain local and unchanged.

Before first Payment initiation, settle Promotion policy or explicitly retain disabled Promotions, define currency/provider amounts, and implement the persisted attempt plus permanent payment_started_at freeze atomically. Add edit-versus-initiation and frozen-child mutation races. Final successful Payment/sold/consumption/Ticket/QR completion remains a separate atomic verified boundary; no part of this task enables it.
