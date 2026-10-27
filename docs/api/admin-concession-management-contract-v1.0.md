# ADMIN Concession Management Contract v1.0

Date: 2026-10-25. Approved minimal Phase5B-1 scope, following [Phase5A](../reports/2026-10-25_admin-concession-management-preparation_report.md). Published before implementation. Customer [Concession](concession-composition-contract-v1.0.md), [Booking v1.3](booking-contract-v1.3.md) and Promotion contracts remain unchanged.

## 1. Authorization and resources

Bearer JWT ADMIN plus current database ACTIVE ADMIN is required on every endpoint. Actor comes only from JWT subject; the protected write independently checks and locks the current database account. CUSTOMER/STAFF/MANAGER do not inherit catalog management. Chain-wide catalog; no Cinema override.

| Method/resource | Entire body | Success |
|---|---|---|
| GET `/api/v1/admin/concession-items` | None |200 AdminConcessionItem[] including INACTIVE |
| GET `/api/v1/admin/concession-items/{itemId}` | None |200 AdminConcessionItem |
| POST `/api/v1/admin/concession-items` | name,description,category,sellingPrice,status |201 AdminConcessionItem + Location of detail |
| PUT `/api/v1/admin/concession-items/{itemId}` | name,description,category,sellingPrice |200 AdminConcessionItem |
| PUT `/api/v1/admin/concession-items/{itemId}/status` | status |200 AdminConcessionItem |

No query parameters are accepted, including pagination/search/sort. List order: category POPCORN,DRINK,COMBO; name PostgreSQL C collation; numeric ID. Empty list is[]. Display names are not unique; equal names remain separate identities. No DELETE/bulk/category/media/audit-viewer endpoint.

## 2. Fields and validation

All shown request keys are mandatory; description may be null. JSON must be one object with no unknown/duplicate keys or trailing document. Feature-local UTF-8 parser bounds the entire body to **1 MiB** as a technical transport limit, not a business description-length limit. Invalid UTF-8, NUL and unpaired Unicode surrogates are rejected. Existing global parser behavior is unchanged.

- itemId and JWT subject: canonical ASCII positive-bigint strings1..9223372036854775807, no leading zeros; no JSON numeric identity.
- name: string, stripped surrounding whitespace, nonblank,≤150 Unicode code points.
- description: null to clear, or nonblank stripped string; no separate invented character maximum.
- category: exact POPCORN,DRINK,COMBO. COMBO is one flat item with its own price.
- sellingPrice: plain decimal JSON string,0 or positive,≤15 integer digits,≤4 fractional digits; range0 inclusive to1000000000000000 exclusive. No signs, exponent, separators, whitespace or noncanonical leading zeros. Numeric JSON values and overprecision reject before numeric(19,4) coercion; never round. Zero/fractional catalog amounts remain valid independently of provider rules.
- status: exact ACTIVE or INACTIVE. Creation requires explicit status. Both transitions are permitted; status is edited only through its endpoint after creation.
- imageUrl: read-only. New item stores null; content/status changes preserve the locked current reference. id/createdAt immutable; updatedAt server-controlled. Request imageUrl/id/timestamps/stock/cinema/actor fields reject.

Response AdminConcessionItem: `{id,name,description,category,sellingPrice,imageUrl,status,createdAt,updatedAt}`. IDs and exact four-decimal amounts are strings; description/imageUrl nullable; timestamps UTC ISO instants. Existing DB column image maps to imageUrl. No currency/stock/Cinema/row-version field.

Example create:
```json
{"name":"Bắp rang","description":null,"category":"POPCORN","sellingPrice":"55000.0000","status":"ACTIVE"}
```

## 3. Transactions, locks and audit

GETs are logically read-only REPEATABLE_READ transactions; existing AdminAccessService uses FOR SHARE, so PostgreSQL-enforced readOnly=true is not used. Writes use READ_COMMITTED with bounded timeouts, ADMIN User SHARE then target item UPDATE; no subsequent Booking/Showtime locks, network or provider calls. Receipt is read in the same transaction; response follows commit.

Actor-aware SECURITY DEFINER command uses existing NOLOGIN hold owner and existing configure_concession_item internally. Runtime gets only narrow wrapper EXECUTE, no raw deployment configure or direct DML/owner role. Price/status/content changes never propagate to Booking lines or financial states.

Each actual create/content/status mutation atomically inserts audit_records with actor, resource CONCESSION_ITEM, ID/time and safe metadata. Actions: CONCESSION_CREATED, CONCESSION_UPDATED, CONCESSION_STATUS_CHANGED. Metadata contains changed-field names and before/after exact price/status, not description/image/request/credentials. Audit failure rolls back catalog changes. Same-value content or status request is a no-op:200 existing resource, unchanged updatedAt, no new audit. Before/after price strings have four decimals.

Concurrent ADMIN content edits serialize; last accepted content wins. Content writes preserve current status/image, status writes preserve current content. No version/ETag/idempotency guarantee. Customer ADD SHARE-locks the item after Booking resources: it sees a coherent old/new active snapshot or rejects unavailable item. No inverse Booking lock is introduced by ADMIN configuration.

## 4. Errors and recovery

Success and safe application failures use Cache-Control:no-store. ProblemDetail: title,status,detail, optional safe field errors; no reflected payload/SQL/constraint diagnostics.

| HTTP | Meaning |
|---|---|
|400|Malformed/oversized/unknown/duplicate/missing input, invalid ID/category/status/decimal/text/query |
|401|Missing/invalid authentication, existing security behavior |
|403|Wrong JWT role or current account not ACTIVE ADMIN |
|404|Item unavailable |
|409|Bounded lock/deadlock/serialization or actual concurrent constraint conflict; duplicate display name is not conflict |
|503|Unexpected database/infrastructure failure; write outcome may be uncertain |

No new rate-limit policy; clients must handle429/Retry-After if actually issued by deployment infrastructure. POST is non-idempotent and must never auto-replay. After unknown create outcome inspect list manually; equal names cannot identify a command uniquely. Known-ID uncertainty uses detail GET plus explicit review. GET cannot exclude a delayed commit or prove which tab caused a state. No optimistic success or automatic mutation on refresh/login.

## 5. Compatibility and traceability

Public GET remains ACTIVE-only with its original fields/order/no-query shape. Existing lines retain name/category/unit-price snapshots when master changes or becomes INACTIVE; eligible pre-Payment quantity edits/removal remain supported. New additions require ACTIVE. Permanent first-attempt composition freeze, original Booking expiry, exact totals and Promotion revalidation remain authoritative. No PAID/Payment/Ticket/provider outcome is introduced.

BRD v1.2 BR-002/004/065–067; SRS v1.2 FR-CONCESSION-001–006, FR-BOOKING-013–018, FR-AUDIT-001/006, SR-CONCESSION-01–04, NFR-SEC-002/003/006/010/011; System Analysis v1.1 UC-ADM-010–013 and BRULE-CON-001–006. New forward migration only; V1–V14 preserved. Database tests exclusively127.0.0.1:5432/smartcinema_phase4e_test; no Neon or financial fixtures.
