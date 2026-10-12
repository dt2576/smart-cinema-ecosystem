# Staff onboarding and Check-in database foundation

Current continuation: Phase4B-2 operational HTTP implementation is covered by the [Staff API integration guide](staff-qr-checkin-backend-apis.md). The Phase4B-1 scope/evidence below is historical; V14 adds operational rate buckets and retains V13's protected Check-in writer.

Date: 2026-10-12. API definitions: [onboarding/admin v1.0](../api/staff-invitation-administration-contract-v1.0.md), [Staff operational v1.0](../api/staff-qr-checkin-contract-v1.0.md). [Security design](../db/staff-onboarding-checkin-security-design-v1.0.md). Operational Staff HTTP routes/frontends remain Phase 4B-2/later; database writer and onboarding/admin endpoints are this slice.

## Onboarding and activation

Current ACTIVE ADMIN posts name/email/phone; password/role/status input is rejected. Transaction creates BLOCKED STAFF with unusable credential marker, onboarding record, 256-bit invitation digest and encrypted delivery intent. Deferred database assertion prevents provisioning without invitation intent. Existing normalized email is rejected, never promoted/reset. Password is chosen privately through the one-time public POST, persisted as BCrypt and token consumed; account remains BLOCKED. ADMIN can activate only after setup, then existing login works. Assignments may precede setup, but no login/operation before activation and effective scope. Block/reissue revokes old outstanding token and erases pending ciphertext; configured accounts cannot reissue onboarding as password reset.

Exact 24 hours uses database time, valid `[issuedAt, expiresAt)`. Fragment activation link doesn't place the bearer in HTTP access-log query strings. Later frontend must immediately remove fragment into memory, use no-referrer/no-store, omit third-party scripts/resources/analytics, never persist token, and explicitly POST password. This phase doesn't create that page or claim end-to-end employee invitation UI.

## External encryption keys and delivery

`STAFF_INVITATION_ENCRYPTION_KEYS=key-id:<base64-32-byte-secret>[,previous-id:<...>]`; active ID in `STAFF_INVITATION_ACTIVE_KEY_ID`. Generate each 32-byte key with a cryptographically secure generator; use an external secret manager/ignored process environment, not the database, source, command output or shared test key. An operator must provision real keys; no live secret is generated/printed by this implementation.

AES-256-GCM uses a fresh random 12-byte nonce. AAD binds Staff ID, purpose STAFF_PASSWORD_SETUP and SHA-256 digest. Database holds ciphertext/nonce/key ID only. Hash is indexed for redemption; the email worker decrypts in memory, checks digest in constant time and builds the configured link. No raw token persisted in plaintext, email body outbox, events, technical logs or API responses. Password setup uses a redacted MVC body and private JDBC binding to avoid DEBUG/TRACE password/hash argument diagnostics.

To rotate: add new key to the external ring, change active ID for new invitations, keep previous keys until all their pending/leased payloads become terminal/expire, then remove them. No automatic key fallback/regeneration. Missing old key causes failed retry, not a new token. Erase encrypted payload on SENT/FAILED/EXPIRED/REVOKED or consumption/supersession. Worker sweeps expired queued/leased payloads even when their next retry is later. With delivery worker disabled/unavailable, payload cleanup waits for the worker or an authorized reissue/block; token expiry is still enforced independently. Backup/secret-store retention must be managed operationally; ciphertext backups remain sensitive to key compromise.

Claims/finishes commit short isolated queue transactions; SMTP is outside domain transaction. Default 5 attempts, 30-second exponential retry capped at 30 minutes, 5-minute lease, 5-second SMTP operation timeouts. Settings enforce finite ranges; duplicate delivery after a crash is possible (SMTP is not exactly-once), but duplicates carry the same one-time token and unchanged deadline. Reissue/block racing SMTP may leave an in-flight obsolete email; no stale message can restore token validity. SENT means SMTP accepted, not recipient receipt. Safe administrative status contains no transport exception/secret. Queue/transport failures are logged with fixed text only.

Redemption limit 10/minute per hashed network peer; resend 3/hour per ADMIN actor, durable independent transactions. Forwarded headers are not trusted implicitly. Retry-After is safe and conservative: redemption 60 seconds, reissue 3600 seconds. Rate keys have seven-day inactive retention cleanup, saturated counters and no plaintext IP storage. Production shared proxies require explicit trusted-proxy/limit policy; no deployment changes performed here.

## Database authorization and Check-in

V13 installs assignment/onboarding/invitation/queue/rate storage, separate NOLOGIN Staff/Check-in owners, private lock-only hold-owner adapters, append-only attributed administration audit, narrow Ticket transition and unique/deferred Check-in audit correspondence. Runtime EXECUTE only, no owner membership, unrestricted assignment/audit writes or Ticket DML. Column grants avoid handing new owners Customer credential/financial projections; the existing paid assertion executes under its existing owner instead of granting the Check-in owner Payment SELECT. Existing settlement/evidence/reconciliation source and guard policy remain unchanged.

Assignment is User/Cinema/type/status/effective_at, active-scope uniqueness and retained inactive history. STAFF/MANAGER persisted vocabulary exists; this phase's Admin workflow grants STAFF only. Check-in authorizes current ACTIVE STAFF, matching chosen/actual Cinema and effective active assignment; no role claim preserves revocation. Administration locks actor/target User IDs in order; Check-in actor SHARE precedes existing Cinema/Hall/Showtime/Movie/Seat/pair/Booking/Hold gate and ordered selected Tickets. Block/revoke target User UPDATE serializes with admission. No network call occurs under these locks.

Admission is inclusive −30/+15 minutes from persisted start, Cinema/Hall ACTIVE, Showtime OPEN_FOR_BOOKING or STARTED, PAID consistent issuance and selected VALID units. Never use payment expiry, Customer account status, Movie publication or sold-seat availability as admission veto. Pure shared time predicates support exact microsecond boundary tests; actual writer captures/revalidates database time after waits. All selected Tickets validate first, transition/audit together or rollback together. COUPLE one Ticket/two guests/one success; Booking PAID, original QR/snapshots/other Tickets stay intact. No expiry/cancellation/refund/resale.

## Regression setup

Use the already authorized local PostgreSQL regression database, never Neon. Enable all prior DB flags plus STAFF_DB_TESTS=true; scheduling/cleanup/provider flags remain disabled during tests. Mailpit localhost 1027/8027 is required for the actual capture case; other SMTP cases use a test-only loopback server which cannot relay. Keep all SMTP credentials blank and test sender/recipient `@example.test`. Run from backend:

```text
mvn -Dtest=StaffInvitationTests,StaffFoundationPostgresTests test
mvn verify
```

Tests create isolated random schemas, clean install/upgrade V12→V13, use restricted session authorization for owner-abuse tests and retain historical checksums. Financial SUCCESS/PAID fixture setup goes only through existing protected settlement in those isolated schemas. No live provider/Neon/real Gmail/production admission proof is implied. No Staff operational HTTP controller or frontend is installed by these commands.
