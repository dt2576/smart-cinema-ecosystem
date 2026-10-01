# Admin Cinema, Hall and Seat configuration

Use the [API contract](../api/admin-cinema-configuration-contract-v1.0.md) for
the exact fields, guards and status behavior. The hierarchy is Cinema → Hall →
whole Seat Unit; Hall capacity counts guests rather than database rows.

## Developer flow

1. Configure the ignored `backend/.env` as described in the
   [local setup](../../README.md#local-development).
2. Start both applications with root `pnpm dev`. Normal Spring Boot Flyway applies
   V11 and keeps Hibernate validate. Preserve existing migration history.
3. Use an existing active Admin account; the separate `pnpm admin:dev` command
   supports explicitly configured local development provisioning. See the
   [provisioning guide](development-admin-provisioning.md). Never share secrets.
4. Sign in normally, open `/admin`, choose **Cinemas**. Create/edit a Cinema,
   manage its Halls, then open **Manage Seats** under a Hall.
5. For an empty Hall, enter every unit and check the displayed guest total before
   **Initialize complete layout**. STANDARD/VIP count one each, COUPLE two.
   Saving is all-or-nothing. Draft-unit removal only changes the unsaved form.
6. An initialized layout cannot change capacity or add/remove units. Select a
   grid unit to edit safe fields/status. Referenced row/number/type are disabled
   in UI and checked independently in PostgreSQL. No Delete is available.

## Database authority

V11's NOLOGIN configuration definer exposes only protected operations to the
existing hold runtime role. Production runtime logins need their existing
restricted role grants; do not grant configuration-owner membership, broad Seat
UPDATE or deployment-initializer EXECUTE. Actor identity comes from authenticated
backend JWT and is rechecked as ACTIVE ADMIN by both application and SQL.
Configuration writers take the Cinema/Hall barriers before physical resource
updates, preserving transaction history and concurrent Hold/settlement ordering.
Do not copy deployment/demo `SET ROLE` code into HTTP handlers.

Provision the application's database login in the existing restricted role once
through a privileged deployment connection (replace only the role placeholder):

```sql
GRANT smart_cinema_hold_runtime TO "<runtime_login>" WITH INHERIT TRUE;
GRANT smart_cinema_hold_runtime TO "<runtime_login>" WITH SET FALSE;
```

This is database access provisioning, not an HTTP command or another migration.
V11 grants that runtime role the controlled function EXECUTE permissions. No
configuration-owner membership, Seat UPDATE or schema ownership is required.
Managed PostgreSQL may create ADMIN-only membership for a role's creator; V11
revokes its temporary SET grant and schema CREATE before committing. Use separate
restricted runtime and privileged migration logins for a production deployment;
this task validates the existing development configuration and does not deploy.

An ACTIVE Cinema appears in plain Customer branch reads. Movie-filtered branches
still require eligible future Showtimes, and Customer Seat maps require explicit
Showtime membership. This module creates neither Showtimes nor membership.
Status changes do not automatically cancel, refund, reprice or rewrite Tickets/QR.

## Verification

Run backend `mvn verify` against a dedicated local PostgreSQL database with the
existing integration flags, including `MOVIE_DB_TESTS=true` for Admin tests and
`DEMO_DB_TESTS=true` for seed compatibility. Run frontend `pnpm exec tsc --noEmit`,
`pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. Set the configured browser
channel where required by the machine. The Showtime loading test controls the
public read response and retains its loading assertion without production delays
or retry masking. See [Showtime management](admin-showtime-management.md) for the
V12 writer and current Customer read integration.

No seed reset is needed. Live verification creates a separate uniquely named
Cinema/Hall/layout through normal Admin APIs and leaves those verification
records INACTIVE. Do not modify seeded hierarchy merely to test management.
