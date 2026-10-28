# Primary Neon migration and startup workflow

Normal Windows development uses the PRIMARY Neon connection already configured in
ignored `backend/.env`; it never falls back to the isolated local database.

```powershell
pnpm db:status
pnpm dev
```

The startup gate checks the actual database, installed/source versions, applied
checksums and failed/pending migrations through read-only JDBC. With pending or
invalid history, it stops before launching either application. Normal Spring
Flyway remains enabled with read-only migration connections: it validates an
already current schema. It cannot silently apply DDL using application credentials.
No clean, repair, baseline, skipped migration or automatic retry is provided.

When current, the existing Spring Boot and Next.js commands start. Readiness needs
backend HTTP, frontend HTTP and matching public API proxy content. Maven
`BUILD SUCCESS` alone does not establish readiness. Ctrl+C stops supervised services.
Use a clean terminal; hidden Spring/JVM/Maven overrides that could disagree with
the target checked by the guard are rejected without displaying their values.

## Current reviewed operator plan: V13 to V18

**Execution completed successfully on2026-10-28. PRIMARY is V18/V18,pending0,
failed0,all18 checksums valid. Temporary role/grants/file removed; baseline
runtime/schema privileges and original business data preserved.**
See the [final report](../reports/2026-10-28_neon-flyway-v14-startup-fix_report.md).
The review/history below records the original failed password form and its
separately approved provider-compatible correction; it is not a task to rerun on
the already-current database.

Status verified read-only on2026-10-28: PRIMARY database `neondb`, application/
old Flyway identity `neondb_owner`, installedV13/sourceV18,pendingV14–V18,failed0,
applied checksums valid. V13 removed usable Staff owner membership. The existing
Staff membership is ADMIN-only, with INHERIT=false/SET=false. Configuration owner
has the same limitation; Hold owner is already inherited. The owner of
`public.staff_rate_limits` is `smart_cinema_staff_owner`.

No dedicated PRIMARY migration credential file or usable configured migration
login exists. Local-test operator credentials are unrelated and must not be used.

**The SQL below is the original explicitly approved operator batch. Two explicitly
approved SCRAM-input attempts failed at COMMIT and were verified fully rolled back.
The second identified Neon's plaintext-password input requirement. No migration ran.
Do not replay this incompatible password form; see the proposed correction below.**
Use the existing `neondb_owner` connection's ordinary CREATEROLE, role ADMIN OPTION
and database/schema-owner authority, not PostgreSQL SUPERUSER. Its actual rolsuper
is false. No role or table ownership is transferred to application runtime.

1. Verify the exact configured PRIMARY target, no existing role named
   `smartcinema_neon_migrator`, V13/current pending files, unchanged migration
   hashes, and no running application/other migration from this workspace.
   Capture read-only original business-row fingerprints/history/ACL/memberships.
2. Create **one temporary independent migration login** and only the following
   privileges. The password is randomly generated privately; the placeholder is
   never a real password. Use an encoded SCRAM verifier when installing it; do not
   print password/verifier or include it in CLI arguments/logs.

```sql
BEGIN;
CREATE ROLE smartcinema_neon_migrator LOGIN INHERIT
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD '<privately-generated-SCRAM-verifier>';

GRANT USAGE, CREATE ON SCHEMA public TO smartcinema_neon_migrator;
GRANT SELECT, INSERT ON TABLE public.flyway_schema_history
  TO smartcinema_neon_migrator;
GRANT smart_cinema_staff_owner, smart_cinema_hold_owner,
  smart_cinema_configuration_owner
  TO smartcinema_neon_migrator WITH INHERIT TRUE, SET TRUE, ADMIN FALSE;
GRANT CREATE ON SCHEMA public TO smart_cinema_staff_owner,
  smart_cinema_configuration_owner;
COMMIT;
```

Why each grant is needed:

- Staff ownership/inheritance: V14 constraint and limiter replacement; V17 audit
  guard and V18 assignment wrappers/core. SET: required ownership installation.
- Hold owner: V15/V16 wrapper ownership; no Payment-system role is granted.
- Configuration owner: V17 replaces its existing protected configuration functions.
- Schema CREATE: create functions and satisfy new-owner requirements for
  `ALTER FUNCTION ... OWNER TO`. Staff/Configuration currently have only USAGE;
  their CREATE grants are temporary and will be restored. Hold already has CREATE.
- History SELECT/INSERT: Flyway reads existing history and appends successful
  entries. No history UPDATE/DELETE/repair authority is requested.

PostgreSQL may give the creating administrator an automatic ADMIN-only membership
in the newly created role. Verify it has INHERIT=false and SET=false before
granting owner roles to the migration login. Do not grant runtime usable migration
membership or change its existing protected-role memberships.

3. Save only `{url,user,password}` in ignored
   `backend/.env.neon-migration`, owner-only Windows ACL (or owner-only POSIX mode).
   The URL must exactly equal the configured PRIMARY JDBC URL; the user must be
   `smartcinema_neon_migrator`, distinct from application DB_USERNAME. Create only;
   never overwrite a pre-existing credential file. The application does not import
   this file. The standalone helper loads it only for an explicitly approved batch.
4. Run, only after explicit approval:

```powershell
pnpm db:migrate --approved
```

This executes the unchanged V14,V15,V16,V17,V18 files in order, with Flyway checksums
and protected owners preserved. V15–V18 install the existing approved wrappers/
guards and their exact existing runtime EXECUTE/Promotion SELECT grants. There is
no new direct runtime table DML or protected-owner membership.

5. On success or failure, inspect the committed history; never retry blindly.
   Remove the temporary bootstrap authority using the original operator connection:

```sql
BEGIN;
REVOKE CREATE ON SCHEMA public FROM smart_cinema_staff_owner,
  smart_cinema_configuration_owner;
REVOKE smart_cinema_staff_owner, smart_cinema_hold_owner,
  smart_cinema_configuration_owner FROM smartcinema_neon_migrator;
REVOKE ALL PRIVILEGES ON TABLE public.flyway_schema_history
  FROM smartcinema_neon_migrator;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM smartcinema_neon_migrator;
DROP ROLE smartcinema_neon_migrator;
COMMIT;
```

Drop only that newly created temporary role, and only if it owns no unexpected
objects. Do not use DROP OWNED/CASCADE, broad ownership transfers or role grants
to force cleanup. Revoke grants using the original grantor where needed. Verify
baseline role memberships/schema privileges are restored. Delete only the private
credential file created by this operator run after the role has been removed.

6. Confirm V18/V18,pending0,failed0, all18 checksums valid, original V1–V13 history
   unchanged, protected owner/security-definer/search_path/ACL intact, runtime
   membership unchanged and original business-row fingerprints preserved.
7. Start `pnpm dev`; verify real Spring, Next and proxy readiness, existing auth/
   Manager responses. Do not seed/provision accounts or fabricate Booking/Payment/
   Ticket data. Credentials for any authenticated smoke check need an approved
   existing development account, supplied privately. Disable external delivery/
   provider/expired-Hold cleanup temporarily during preservation QA if necessary;
   do not change persistent product configuration or claim those effects were tested.

## Failure and recovery

### Execution record — 2026-10-28

The user explicitly approved this exact V14–V18 plan. Repeat PRIMARY preflight,
V13/pending5/checksums, original privilege/data comparison and18 source hashes
all passed. The one setup transaction reached COMMIT and returned SQLSTATE XX000.
No success journal was written. Read-only reinspection established:

- no temporary role/membership exists;
- Staff/Configuration CREATE remain false; original schema ACL/history ACL match;
- installedV13,failed0; original26 business-table hashes/history/function ACL/roles
  and memberships all match the baseline;
- only the empty/secret temporary credential file created by this operation was
  removed after verifying role absence. No cleanup REVOKE/DROP was needed or issued.

The exact internal server/control-plane reason cannot be established from the
first attempt's redacted error: it retained only phase/SQLSTATE. Diagnostic handling
has been improved locally to retain messages with both password and SCRAM verifier
redacted. No unsupported-password or transaction incompatibility is asserted.

The user then explicitly approved one bounded identical-SQL replay. Attempt2 also
failed at COMMIT, now exposing the safely redacted exact cause:

```text
Received HTTP code 400 from control plane
Neon only supports being given plaintext passwords
```

Read-only checks again prove full rollback and preservation. No role/grant was
left installed and the second temporary credential file was deleted. No Flyway
migration has run. There will be no third attempt under the two prior approvals.

### Separately approved provider-compatible correction — executed

Replace only the PASSWORD value in the original CREATE ROLE statement: send the
privately generated288-bit random password, rather than a precomputed verifier,
through the existing required-TLS JDBC connection:

```sql
CREATE ROLE smartcinema_neon_migrator LOGIN INHERIT
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD '<privately-generated-random-password>';
```

All grants, owner/role checks, unchanged V14–V18, no runtime privilege expansion
and exact cleanup stay as originally approved. This follows Neon's documented
SQL password form. Read-only settings show password_encryption=scram-sha-256,
log_statement=none,log_min_error_statement=panic; recheck those exact settings before
execution and stop if they differ. No server logging setting is changed. Passwords
remain absent from argv/tool output/local logs; credentials stay owner-only outside
Git and are deleted after the temporary role is removed. The provider receives the
password over TLS and PostgreSQL performs SCRAM storage; client-side hashing is
the incompatible step confirmed by the actual error.

The user explicitly approved this changed password form for **one** bounded setup
attempt. That setup succeeded; `pnpm db:migrate --approved` then executed exactly
five unchanged migrations V14–V18 in order, finishing at17:39:28+07:00. The exact
approved cleanup succeeded: schema CREATE restored, temporary memberships/ACL
removed, temporary role dropped and only its newly created credential file deleted.
No existing privilege was revoked. Original26-table fingerprints and V1–V13 history
matched before application startup. Normal `pnpm dev` skipped migration credentials
and reached real backend/frontend/API-proxy READY; real ADMIN login/logout and
Manager401/403 checks passed. Positive assigned-Manager smoke remains unavailable:
PRIMARY has no MANAGER account and none was provisioned. The only post-startup data
addition was one normal auth session, verified revoked by logout; old sessions and
other business tables remained unchanged.

PostgreSQL transactional DDL rolls back the failed migration, while earlier
successful versions remain installed. Cleanup does not undo committed migrations.
If cleanup fails, stop before application startup, retain the private credential
securely and inspect exact role/dependency/grant state. A new privileged action
outside this plan requires further approval. There is no automatic down migration.

The existing application login is already a Neon administrative login with an
inherited Hold owner and broad effective table privileges. This is an observed
pre-existing configuration, not least-privilege runtime hardening. The plan does
not expand it; replacing it is a separate, explicitly reviewed task.

References: [PostgreSQL18 role membership](https://www.postgresql.org/docs/18/role-membership.html),
[GRANT](https://www.postgresql.org/docs/18/sql-grant.html),
[ALTER FUNCTION owner/schema requirements](https://www.postgresql.org/docs/18/sql-alterfunction.html),
[Neon SQL-created role behavior](https://neon.com/docs/manage/roles).
