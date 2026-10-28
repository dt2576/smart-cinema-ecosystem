# PRIMARY Neon Flyway V14/startup fix report

## 1. Outcome

Date:2026-10-28, Asia/Saigon. **PASS — PRIMARY Neon migration and normal `pnpm dev`
startup restored and verified.** Installed/source **V18/V18**,pending0,failed0,
all18 migration checksums valid. Temporary migration authority and credential
files removed. No local database substitution, reset, historical SQL edit,
frontend feature change, commit/push or deployment.

## 2. Root cause

The normal configuration targets PRIMARY Neon `neondb`, PostgreSQL18.6. Both
application and old Flyway login were `neondb_owner`. V13 succeeded and transferred
Staff objects to NOLOGIN `smart_cinema_staff_owner`, then revoked its temporary
usable membership. The surviving membership was ADMIN-only:
**INHERIT=false,SET=false**. MEMBER=true alone did not authorize V14 to alter
`staff_rate_limits`. Configuration owner had the same gap for V17; Staff and
Configuration owner schema CREATE were also absent. Hold owner was already
inherited; its existing authority was preserved.

The old root command immediately launched Flyway DDL using application credentials.
V14 failed42501; Spring never became healthy although Maven printed BUILD SUCCESS.

Read canonical workflows/conventions/rules, current handoff, actual configuration,
V13–V18, protected-owner policy/previous reports, relevant BRD/SRS constraints and
official [PostgreSQL18 membership](https://www.postgresql.org/docs/18/role-membership.html),
[function ownership](https://www.postgresql.org/docs/18/sql-alterfunction.html) and
[Neon role](https://neon.com/docs/manage/roles) documentation.

## 3. Approvals and actual operations

The user explicitly approved the exact temporary-role/grant/migration/cleanup plan
in [the workflow](../development/neon-migration-workflow.md), then separately
approved one bounded diagnostic retry and the necessary password-input correction.

| Authorized step | Actual result |
|---|---|
| Initial read-only preflight | V13/source18,pending5,failed0; original checksums/privileges and26 business-table fingerprints captured |
| Setup attempt1, precomputed SCRAM verifier | COMMIT failedXX000; read-only checks proved complete rollback; temporary credential file deleted |
| Separately approved identical-SQL attempt2 | COMMIT failedXX000/HTTP400; safe diagnostic: **Neon only supports being given plaintext passwords**; rollback/preservation again confirmed; file deleted |
| Separately approved provider-compatible setup | PASS: privately generated288-bit password sent only over required-TLS JDBC; server password_encryption=SCRAM; no password in argv/output/local logs |
| `pnpm db:migrate --approved` | **PASS,exactly5 migrations**: original V14,V15,V16,V17,V18; one Flyway invocation, no migration retry; completed17:39:28+07:00 |
| Approved cleanup | PASS: temporary grants revoked, schema authority restored, only new migration role/file removed |

The temporary `smartcinema_neon_migrator` login had NOSUPERUSER/NOCREATEDB/
NOCREATEROLE/NOBYPASSRLS, only the three approved owner memberships, schema CREATE
and history SELECT/INSERT. Runtime never inherited or SET that login. Staff/
Configuration CREATE was temporary. No Check-in/Payment-system role, runtime owner
membership, direct business DML, broad ownership transfer or DROP OWNED/CASCADE
was added. V15–V18 installed only their historical wrapper/Promotion-read grants.

Password correction was separately approved because the original statement used a
client-computed verifier. Read-only settings were checked before the corrected
attempt: `password_encryption=scram-sha-256`, `log_statement=none`,
`log_min_error_statement=panic`. No server logging setting was changed. Credentials
were owner-ACL restricted and outside Git. No unapproved/automatic retry occurred.

## 4. Project-side changes

Created:

- `backend/scripts/PrimaryDatabase.java`: read-only PRIMARY target/identity/version/
  checksum gate; separate approved migration connection with ACL/role checks;
  no clean/repair/baseline or role-grant action.
- `scripts/dev.mjs`: preflight before launching the existing Spring/Next commands;
  supervised real HTTP/API-proxy readiness, not Maven-only success.
- `scripts/dev.test.mjs`: four security-negative CLI regressions.
- `docs/development/neon-migration-workflow.md` and this report.

Modified: root `package.json`, backend `application.properties`, README and additive
current handoff. Flyway stays enabled and validates on startup with read-only JDBC;
pending DDL uses the standalone approved operator connection. No dependency,
backend business/auth/API source or frontend feature changed. V1–V18 unchanged.

## 5. Actual verification

Root commands executed:

```powershell
pnpm db:status
pnpm dev
pnpm db:migrate --approved
pnpm test:dev
```

Additional checks used compiled guarded JDBC evidence helpers and installed Edge
through Playwright, with no API/JWT interception or fixture-backed HTTP outcomes.

| Check | Actual final result |
|---|---|
| Flyway installed/source/pending/failed | **V18/V18,0/0** |
| Checksums/history | **18 valid**; original V1–V13 history rows/checksums unchanged |
| Startup gate negatives | Pending schema stopped both services before launch; unapproved migrate rejected before operator connection |
| `pnpm test:dev` | **4/4 PASS**,0 failures/skips; no database connections in these negative fixtures |
| Java/Node | Compilation/syntax PASS |
| Real normal `pnpm dev` | **PASS**; current-schema migration skipped without loading operator credentials |
| Spring | Tomcat8080 and application startup confirmed; Flyway reported schema18 up to date |
| Next/frontend proxy | HTTP200 and matching backend/frontend `/api/v1/genres`; health monitor printed **READY: PRIMARY Neon V18/V18** |
| Real Edge/HTTP smoke | **7/7 groups PASS**,15 recorded responses:200×5,204×1,401×4,403×5;0 browser errors |
| Protected functions | **7/7 PASS**: expected owner, SECURITY DEFINER, fixed search_path, no PUBLIC EXECUTE; private core not executable by runtime/group |
| Temporary authority cleanup | PASS: role absent,file absent, original roles/memberships/schema ACL restored |
| Source/scope/format | PASS; all18 historical migration files byte-identical; HEAD/index unchanged |

Browser checks: public home render, real API/proxy, existing development ADMIN
login200 and authoritative ADMIN identity200, anonymous Manager reads401, actual
ADMIN JWT denied Manager reads403, safe Manager-page denial and normal logout204.
Manager paths covered Cinema collection, current Staff, assignment list and detail.
No account was created/promoted/reset, no token was fabricated and no login was
automatically replayed. A public-home screenshot records rendered first paint,
not full Customer booking/catalog acceptance.

During preservation QA, only process environment flags disabled expired-Hold
cleanup, invitation delivery and VNPAY. No persistent environment file changed.
The actual command remained `pnpm dev` on PRIMARY Neon. Those external/cleanup
effects are not claimed tested. Owned QA services were stopped afterward.

Full Maven/frontend/other-module regressions were NOT RUN for this startup-only
scope; no business source changed. Prior feature test counts are not reused here.

## 6. Data preservation and evidence

Immediately after migration and cleanup, fingerprints of all **26 original
business tables**, original13 history rows, function ACL, roles/memberships and
schema privileges matched baseline. Only seven existing function definitions
changed as explicitly implemented by unchanged V14/V17/V18; other original
functions, including financial guards, remained unchanged.

After application/auth checks, every original refresh-token row still matched its
pre-login hash; exactly one new normal login session existed and was revoked by
logout. Other business-table fingerprints, history/ACL/roles/schema still matched.
No Booking/Payment/Ticket/catalog/Staff account or assignment was created/modified.
Only the intended five Flyway history entries and migration-defined routines/
constraint/runtime wrapper grants were installed.

Ignored evidence:`backend/target/neon-startup-2026-10-28/`: read-only preflight,
approved attempt logs, `migrate-approved.log`, `operator-cleanup.log`,
`status-v18-final.log`, `protected-function-audit.log`, `startup-primary.log`,
`http-browser-evidence.json`, `primary-home.png`, preservation logs and scope hashes.
No credential/verifier or raw auth payload is in the report/HTTP evidence. Both the
temporary operator credential file and private smoke-auth input were deleted.

## Requirement reconciliation and Convention Compliance

PASS for the explicit startup/migration task. SRS v1.2 NFR-SEC-003/006 and
FR-AUDIT-003, BRD BR-002/003 are preservation constraints; no new requirement or
business rule was invented. Historical contracts/requirements/reports unchanged.

Checked against [project conventions](../development/project-conventions.md):
PascalCase Java helper, kebab-case scripts/docs, required dated report, existing
locations, English identifiers, private ignored credentials and additive handoff.
No convention exception. Final scope:4 scoped original edits,5 new files,
953/957 original files byte-identical; historical migrations and frontend unchanged.
UTF-8, local links, whitespace and HEAD/index preservation checked at completion.

Final read-only checks after stopping QA services again confirmed V18/V18,
zero pending/failed migrations, 18 valid checksums and preserved business data
(including the single expected revoked login session). Ports 8080/3000 were free.
Evidence: `status-after-shutdown.log` and `preservation-after-shutdown.log`.

## 7. Remaining limitations and normal use

PRIMARY has1 ACTIVE ADMIN,3 ACTIVE CUSTOMER and **no MANAGER**. Positive assigned-
Manager200/business smoke is NOT RUN; only real authentication/role-denial behavior
was verified. No QA/business data was added to manufacture that proof.
Existing runtime Neon administrative/Hold-owner authority was preserved, not
converted into a least-privilege deployment identity. Production deployment,
provider/mail effects and unrelated feature regressions remain outside this task.

From the repository root, normal startup is now:

```powershell
pnpm dev
```

Status only:`pnpm db:status`. Future pending migrations require separate reviewed
operator approval; do not recreate the now-removed temporary role for an already
current schema. **Requested repair complete; report and STOP.**
