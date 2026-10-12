# Staff Invitation and Administration Contract v1.0

Date: 2026-10-12. Resume approval replaces the unresolved onboarding decision without rewriting the historical blocking report. ADMIN never provides/sees a Staff password. New STAFF is BLOCKED with an unusable marker; Staff privately sets a password via invitation and remains BLOCKED until ADMIN activation. No public Staff registration, reset, invitation auto-login or Cinema self-assignment.

## Administrative resources

Every resource requires JWT ADMIN and current database ACTIVE/ADMIN. No query parameters; canonical positive-bigint path/body strings. Unknown/duplicate JSON properties rejected. Responses/errors no-store; no password/hash/raw token/encryption/SMTP material returned. Lists ordered by numeric ID, limited to 100 by page (page≥0, size1–100) where declared.

| Method/path | Exact request | Response |
|---|---|---|
| POST `/api/v1/admin/staff` | `{ fullName, email, phone }` using existing account validation | 201 StaffAccount; commits BLOCKED STAFF + invitation + encrypted delivery intent together |
| GET `/api/v1/admin/staff?page=0&size=20` | Strict single page/size only | StaffAccount[] for requested page; no global counts promised |
| GET `/api/v1/admin/staff/{staffId}` | No query | StaffAccount |
| POST `/api/v1/admin/staff/{staffId}/invitations` | `{}` | StaffAccount; reissue only incomplete onboarding, invalidates old token, fresh 24 hours, preserves assignments |
| PUT `/api/v1/admin/staff/{staffId}/status` | `{ status: ACTIVE | BLOCKED }` | StaffAccount; activation requires completed password setup; block revokes outstanding invitations/payloads |
| GET `/api/v1/admin/staff/{staffId}/cinema-assignments` | No query | Assignment[] |
| POST `/api/v1/admin/staff/{staffId}/cinema-assignments` | `{ cinemaId, effectiveAt }`, finite ISO UTC instant | Assignment (ACTIVE STAFF membership); retained inactive history, multiple Cinemas |
| PUT `/api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status` | `{ status: ACTIVE | INACTIVE }` | Assignment; parent/current Staff verified; no self-grant or Manager administration |

`StaffAccount { id, fullName, email, phone, status, passwordSetupCompleted, invitationExpiresAt: instant|null, deliveryStatus: NONE|QUEUED|LEASED|SENT|FAILED|EXPIRED|REVOKED, deliveryAttempts: integer }`. SENT means SMTP accepted, not inbox receipt. No hidden email delivery success. `Assignment { id, userId, cinemaId, cinemaName, assignmentType, status, effectiveAt }`. STAFF/MANAGER vocabulary persists; this phase's Admin grant API creates STAFF assignments only.

Create refuses existing normalized email, never promotes/resets accounts. Name/email/phone normalizations preserve existing validation; Admin supplies no password/role/status override. 64 KiB technical administration/setup request maximum; invitation raw token exactly canonical base64url(no padding) of 32 secure random bytes (43 characters).

## POST /api/v1/staff/password-setups

Public confidential POST `{ token, password }`; no query, accountId/role override or GET validation. BCrypt policy reuses existing minimum 8 characters and maximum 72 UTF-8 bytes. Safe 204 after atomic hash persistence, passwordSetAt and single token consumption; account remains BLOCKED. Token purpose STAFF_PASSWORD_SETUP, digest-only lookup, no account-existence information in rejection. At expiry instant (`expiresAt <= database time`) token is invalid; valid interval `[issuedAt, issuedAt+24h)`. Reissued, revoked, consumed or completed account tokens fail identically. Concurrent redemption permits one success only. No automatic page-load consumption.

## Delivery / token protection

SecureRandom 32 bytes; SHA-256 digest for redemption. Durable outbox carries AES-256-GCM ciphertext only, 96-bit random nonce and external key ID; AAD binds Staff ID, token digest and purpose. Key ring/active key are environment/secret-manager values, never database secrets. Encryption is required before committing provisioning/reissue; missing/invalid key/HTTPS activation URL fails safe 503 without creating an account. Worker reconstructs one URL from configured base (not Host), fragment token `#token=...`, sends Vietnamese multipart email via Spring Mail outside database transaction. No fake-success sender.

Durable lease, same ciphertext/token across retries, max 5 attempts, initial 30-second exponential delay capped at 30 minutes; configure finite positive values. Five-minute lease exceeds configured bounded SMTP timeouts; crash/restart may deliver duplicate copies of the **same** invitation, never a new token/deadline. Revocation/supersession/consumption/expiry prevents redemption and erases encrypted payload; successful/terminal delivery erases ciphertext. A message already in SMTP flight cannot be recalled; its stale/expired link remains unusable. Old encryption keys retained until outstanding payloads finish/expire; removing one fails delivery, never mints a replacement token.

Public redemption durable rate bucket per hashed network peer: 10/minute. Admin resend bucket per actor: 3/hour. 429 Retry-After, fixed errors; limits are technical and protect expensive hashing/SMTP, not a business account maximum. No trusted forwarded header unless separately deployed/configured. Errors: 400 safe malformed request/invalid invitation; 401 security; 403 current Admin/account; 404 administration resource unavailable; 409 duplicate email/completed onboarding/activation-before-setup/active membership conflict; 429 throttled; 503 key/configuration/database/transport infrastructure failure. No raw input, mail exception or SQL diagnostics reflected.

## Later frontend contract (NOT IMPLEMENTED)

Exact activation base path configured by `STAFF_ACTIVATION_BASE_URL`, e.g. HTTPS `/staff/activate`. Isolate token fragment in memory immediately, remove it with history.replaceState, no persistent storage/analytics/third-party assets; Referrer-Policy no-referrer and no-store. Explicit password POST only. Show completion as password configured awaiting ADMIN activation, never automatic ACTIVE/login. This backend phase does not create that page; real click-through onboarding remains pending the separately authorized frontend integration.

Traceability: BRD BR-002–004/053/055, SRS FR-AUTH-002/007/008, FR-ORG-002/004/005, FR-AUDIT-003, NFR-SEC-001/002/006/010–012; resume §§2–6 explicitly approve invitation/private password/blocked activation/reissue/delivery. No general password reset or Manager privilege.
