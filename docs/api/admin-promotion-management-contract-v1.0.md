# ADMIN Promotion Management Contract v1.0

Date: 2026-10-27. Additive implementation; database verification status is recorded in the
[implementation report](../reports/2026-10-27_admin-promotion-management-backend_report.md).

## Authority and scope

BRD v1.2 BR-033/034/035; SRS v1.2 FR-PROMO-001–006, FR-AUDIT-001,
NFR-SEC-002/003/006/010/011; System Analysis v1.1 Admin use-case inventory
UC-ADM-010. Existing [Promotion v1.0](promotion-composition-contract-v1.0.md),
[v1.1](promotion-composition-contract-v1.1.md), [Booking v1.3](booking-contract-v1.3.md)
and protected Payment finalization remain authoritative.

Only current ACTIVE ADMIN may use these endpoints. JWT role alone is insufficient:
service reads lock/recheck the current account, and the database command independently
locks/rechecks the actor. No Manager authoring, deletion, public Promotion catalogue,
stacking, Cinema scope, reservations or new eligibility/discount formulas.

## Endpoints

| Method | Resource | Request | Success |
|---|---|---|---|
| GET | `/api/v1/admin/promotions` | None; no query parameters | 200 array of all master records, including INACTIVE |
| GET | `/api/v1/admin/promotions/{promotionId}` | None | 200 master record |
| POST | `/api/v1/admin/promotions` | Create below | 201 master record, Location header |
| PUT | `/api/v1/admin/promotions/{promotionId}` | Full replacement of editable terms below | 200 master record |
| PUT | `/api/v1/admin/promotions/{promotionId}/status` | `{"status":"ACTIVE"}` or `INACTIVE` | 200 master record |

All successful/error application responses use `Cache-Control: no-store`.
The list is ordered by code using database C collation, then ID. No server-side
pagination/search/filter contract is added. Path IDs are canonical positive-bigint
decimal strings, at most `9223372036854775807`.

Create body (illustrative terms, not seed data):

```json
{
  "code": "EXAMPLE-CODE",
  "discountType": "PERCENTAGE",
  "discountValue": "10.1234",
  "validFrom": "2026-10-27T00:00:00Z",
  "validUntil": "2026-11-27T00:00:00Z",
  "minimumOrderAmount": "0",
  "usageLimit": null,
  "maxDiscountAmount": "10000",
  "status": "INACTIVE"
}
```

Update requires exactly `discountType`, `discountValue`, `validFrom`, `validUntil`,
`minimumOrderAmount`, `usageLimit`, `maxDiscountAmount`. Code/ID are immutable
under the existing V8 guard. Status is changed only through the status resource.
No name, description, image, redemption counter or timestamp fields are invented.

## Validation and response

- JSON object only; exact keys including explicit nullable fields; duplicate,
  unknown, missing keys, trailing JSON, invalid UTF-8 or body above 1 MiB rejected.
- Code: strip surrounding whitespace, uppercase with Locale.ROOT, nonblank,
  at most 50 Java UTF-16 units, well-formed Unicode/no NUL, matching the current
  Customer normalization and database canonical-code constraint. Existing unique
  constraint is authoritative; duplicate normalized code returns 409.
- `discountType`: existing `PERCENTAGE` or `FIXED_AMOUNT` only.
- All monetary/percentage values are JSON **strings**, canonical nonnegative
  decimal notation, less than `1000000000000000`, at most four fractional digits;
  zero is supported. No exponent, leading zero padding, NaN or Infinity.
- Percentage value <=100. Optional nonnegative cap only for PERCENTAGE;
  FIXED_AMOUNT requires null cap. Existing percentage floor/cap policy is unchanged.
- `usageLimit`: null or JSON integer 1–2147483647; no string/coercion/fraction.
  It remains a global PAID-count limit, without PENDING reservation or per-user quota.
- Explicit-offset ISO timestamps; finite four-digit years 0001–9999 and at most
  microsecond precision to avoid silent JDBC/database deadline rounding. Returned
  as UTC instants. `validUntil > validFrom`; past/future windows remain configurable.
  ACTIVE does not override the existing server-clock eligibility window.

Response fields: `id`, `code`, `discountType`, `discountValue`, `validFrom`,
`validUntil`, `minimumOrderAmount`, `usageLimit`, `status`, `maxDiscountAmount`.
IDs and exact numeric(19,4) values are strings; usageLimit is integer/null; cap
is string/null. No createdAt/updatedAt/version fields exist in this table.

## Errors and recovery

| HTTP | Meaning |
|---|---|
| 400 | Invalid JSON/fields/path/query; safe optional `errors` field map |
| 401 | Missing/invalid authentication |
| 403 | Wrong role, inactive or missing current ADMIN |
| 404 | Promotion absent |
| 409 | Duplicate code, integrity conflict, lock timeout, serialization/deadlock or statement timeout |
| 503 | Unexpected persistence failure; no SQL or internal diagnostic exposed |

No idempotency key, automatic retry, optimistic version or lost-create lookup
operation is introduced. After an uncertain write, explicitly read list/detail
and review before another command. A read cannot prove an in-flight request has
finished. Never blindly POST again. Existing code uniqueness limits duplicate
identities but does not constitute an idempotency contract.

## Transaction, audit and database boundary

Reads use logical REPEATABLE_READ with current-account SHARE locking. Commands
use READ_COMMITTED, 10-second application transaction timeout, 2-second lock timeout,
5-second statement timeout. Lock order is actor then Promotion; master management
never locks/updates Booking aggregates. Existing Customer/payment flows serialize
on the same Promotion row. Concurrent full replacements are serialized, last
committed writer wins; callers must refresh/review before overwriting newer terms.

V16 adds only actor-aware `admin_configure_promotion(...)`, delegating to the
existing protected `configure_promotion(...)`. SECURITY DEFINER belongs to
`smart_cinema_hold_owner`, fixed `pg_catalog,pg_temp` search_path with qualified
application objects; PUBLIC execution revoked. Shared runtime gets SELECT on
promotions and EXECUTE on the wrapper, no direct DML or deployment writer access.
The existing isolated local app receives equivalent database-scoped narrow grants
through the approved local migration workflow; it gets no owner membership.

Actual creates/term/status changes atomically insert `PROMOTION_CREATED`,
`PROMOTION_UPDATED`, `PROMOTION_STATUS_CHANGED` audit records with actor, resource,
changed fields and old/new master terms. No-op commands produce no audit. Audit
failure rolls back the master mutation. Audit metadata is internal, never part of
these Customer/Admin DTOs. No table/column, seed or historical migration change.

Master edits never rewrite saved Booking amounts, terms, original expiry or
Payment records. Current terms are revalidated during explicit eligible Customer
edits and before first initiation; changed terms require composition review.
After first initiation, permanent composition freeze retains accepted snapshots.
Existing backend-only finalization/usage and reconciliation rules are unchanged.
