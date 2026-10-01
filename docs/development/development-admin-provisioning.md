# Development Admin provisioning

## One-shot command

From the repository root:

```text
pnpm admin:dev
```

This command creates a dedicated ACTIVE ADMIN in the configured **development**
PostgreSQL database. Never target production or use production credentials.
It is independent of the frontend and does not run during normal backend startup.
Recognized `prod`, `production` and `staging` profiles are rejected before database
initialization. The command includes explicit development-only acknowledgement;
it cannot identify production solely from a database hostname. Check your datasource.

## Local input and login

1. Configure the ignored `backend/.env` using [database setup](../../README.md#local-development).
2. Add these placeholders with your own local values (no quotes or `export`):

   ```properties
   DEV_ADMIN_EMAIL=<DEVELOPMENT_ADMIN_EMAIL>
   DEV_ADMIN_PASSWORD=<DEVELOPMENT_ADMIN_PASSWORD>
   DEV_ADMIN_NAME=<DEVELOPMENT_ADMIN_NAME>
   DEV_ADMIN_PHONE=<VALID_VIETNAMESE_PHONE>
   ```

3. Run `pnpm admin:dev`. Output reports CREATED or UNCHANGED, never credentials.
4. Run `pnpm dev`, open [login](http://localhost:3000/login), and sign in normally.
   ADMIN login opens [Admin Home](http://localhost:3000/admin).
5. Remove `DEV_ADMIN_PASSWORD` from local input when no longer needed. Rerunning
   provisioning requires supplying it again; normal login does not read these variables.

The file uses the existing Spring Boot Java-properties import; OS variables override
file values. Passwords must satisfy registration length rules and BCrypt's 72 UTF-8
byte maximum. Name/email/phone use existing registration validation and normalization.
Phone is mandatory because the existing User schema requires it. Do not paste secrets
into commands, reports, screenshots or Git. Keep `.env` ignored.

## Safety and implementation

A separate non-web Spring context loads User persistence, existing BCrypt hashing,
Flyway and Hibernate validation. PostgreSQL serializes provisioning for each normalized
email; JPA creates the account. Existing accounts are locked and never modified.
No schema, migration, seed, HTTP privilege-escalation endpoint or Auth redesign is added.
Public registration remains CUSTOMER-only. Normal Auth JWT and live database Admin
authorization remain required for Movie management.

An existing account permits UNCHANGED only when it is ACTIVE ADMIN and supplied
normalized name, phone and password all match. CUSTOMER/STAFF/MANAGER, blocked Admin,
identity mismatch or password mismatch fail. This command does not promote, reset,
rotate, overwrite or delete accounts. CLI-only profiles must not be enabled for
ordinary application startup; use the explicit command instead.

Automated database tests use isolated local PostgreSQL schemas, never Neon. Live
verification may create clearly named Movies through authorized Admin APIs/UI and
leave them UNPUBLISHED. No Movie deletion or seed rerun is needed.
