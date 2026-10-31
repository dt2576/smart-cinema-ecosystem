# PRIMARY Neon STAFF POS V19 operator plan

Date: 2026-10-30. **APPROVED ONE-SHOT OPERATION COMPLETED.**
[Historical review](../reports/2026-10-30_staff-pos-v19-primary-migration-review_report.md).
This plan is revised by the
[blocker resolution](../reports/2026-10-30_staff-pos-v19-migration-blockers-resolution_report.md).
The user approved the exact V19 setup/migration/cleanup scope in chat. It is now
completed; this document does not authorize replay or any new PRIMARY operation.
[Deployment result](../reports/2026-10-30_staff-pos-v19-primary-deployment_report.md).

Deployment continuation (2026-10-30): the user requested the established migration
workflow with one exact privileged-operation approval, without another recovery
review phase. The tested artifact is now promoted, byte-identically, to the normal
directory below. PRIMARY V19 installation and temporary privilege cleanup completed
after explicit approval. Actual Flyway is V19/V19, zero pending/failed, all 19
checksums valid; root pnpm dev and 29 safe real API checks pass. Provider recovery
coverage remains unverified and must not be represented as a verified backup.

## 1. Pinned artifact and current target

Target is the existing PRIMARY Neon `neondb`, schema `public`, configured in the
existing ignored backend environment. Use its TLS connection; never substitute
loopback credentials or a different branch/database. Pre-install: V18/source V19,
exactly one pending and zero failed. Post-install: V19/source V19, zero pending/
failed and all checksums valid. Actual project `delicate-moon-53589977`, branch
`br-frosty-waterfall-b38x5xm2`, endpoint `ep-divine-snow-b3gho69n` were read from
server identity settings.

Canonical artifact: `backend/src/main/resources/db/migration/V19__enable_staff_counter_sales.sql`
(moved from the isolated proposal directory; no duplicate remains).
SHA-256: `E528550DD23B4658D4C457E21032EFA3C16F0AE788659A5788E163202CCA0E1E`.
Observed Flyway SQL checksum on isolated installations and PRIMARY: `163697808`.
SHA-256 pins file bytes; Flyway checksum validates its own normalized SQL history.
Keep the bytes unchanged, including the historical proposal header/comments.
Promotion changed only its location; approved installation is now complete.

## 2. Resolved technical gates and remaining operator prerequisites

1. `PrimaryDatabase.java` now computes exact owner authority from pending versions.
   V19 is allowed only as installed V18 -> pending [19], target 19. Its separate
   login needs exactly Hold/Staff memberships; unnecessary Configuration membership
   is rejected. Staff/Configuration schema CREATE is not required. Unknown, gapped,
   duplicate or mixed V18/V19 ranges fail closed. Reviewed SHA-256 is checked before
   credentials and again immediately before installation. No historical SQL changes.
2. **Physical rewrite accepted as the technical approach for the observed small
   dataset:** PRIMARY has 3 Bookings, 8192-byte Booking heap (155648 bytes including
   indexes), zero Payments/Tickets. STORED owner_id really rewrites the heap and
   rebuilds indexes. Keep one atomic operation, without intermediate nullable
   ownership/backfill states. Drain old snapshots/readers, callback workers and all
   traffic during a separately approved maintenance window. Fresh size/data/active
   transaction inspection is mandatory; changed scale requires reassessment.
   Actual installer sets lock_timeout=5s, statement_timeout=120s, idle-in-tx=30s.
   A timeout stops/rolls back; no automatic retry. Small size does not guarantee
   lock availability, and these limits are per lock/statement, not total outage SLA.
3. **Audit exposure removed:** no new runtime SELECT on audit_records. A Hold-owned
   SECURITY DEFINER boolean `cash_payment_confirmed(bigint)` checks CASH evidence,
   matching amount/currency/actor and confirmation time. Runtime receives only
   EXECUTE; reports retain scoped outer queries. Existing audit writes/guards and
   pre-existing ACLs remain intact. The predicate exposes a confirmation boolean
   for a supplied ID, not audit rows or metadata; it is database-internal, no HTTP
   endpoint. It is a deliberately narrower runtime capability, not zero expansion.
4. **Still required before installation:** obtain the user's single explicit
   approval for this hash/setup/execution/cleanup and bounded maintenance. Disclose
   that provider recovery coverage is unverified. The latest deployment instruction
   replaces the earlier requirement to complete a separate recovery-readiness phase;
   it does not authorize privileged SQL or create proof of a backup. The existing
   [recovery checklist](neon-v19-recovery-verification.md) remains available without
   creating resources or blocking on another preparatory task.

Technical rehearsal is documented in the resolution report. **NO-GO for PRIMARY
execution without explicit installation approval. That gate was fulfilled for this
completed operation only.** Recovery coverage remains
an explicitly disclosed limitation, not a claim of verified protection.

## 3. Installation authority — exact requirements, not operations performed

The existing administrator `neondb_owner` is not PostgreSQL SUPERUSER, but has
CREATEROLE and ADMIN OPTION on the protected roles. Its current application
connection inherits Hold-owner authority and already owns `users`/Flyway history;
it cannot currently inherit/SET Staff or Configuration owner. Preserve all of
those original memberships, including separate grantors and option flags.

For the **revised pinned** proposal the separate temporary migrator needs:

| Authority | Why |
|---|---|
| CONNECT to neondb | Establish the separate login connection; do not rely on PUBLIC defaults |
| public USAGE/CREATE | Create three functions in the exact target schema |
| Hold-owner INHERIT/SET | ALTER four owned tables/constraints, create index, replace 13 existing Hold-owned functions and assign three new function owners |
| Staff-owner INHERIT/SET | Existing cinema_assignments owner is needed to grant its SELECT to Hold owner |
| users REFERENCES(id) | New selling_staff_id FK; Hold-owner alone lacks it and failed with 42501 in the isolated test |
| Flyway history SELECT/INSERT | Validate existing history and append exactly V19; no repair/update/delete |
| Hold-owner public CREATE | Required for the new function ownership assignment; already true on PRIMARY, verify again, do not add/revoke blindly |

No Configuration-owner, Check-in-owner, Payment-system, neon_superuser, SUPERUSER,
CREATEDB, CREATEROLE or BYPASSRLS authority for the migration login. No new usable
protected-owner membership for application runtime. The migration grants are
temporary operator authority. The three permanent additions are assignment SELECT
to Hold owner and EXECUTE of staff_confirm_cash/cash_payment_confirmed to Hold
runtime. Internal finalize_sale remains private; no audit SELECT/table DML grant.

### Proposed setup SQL — only after the gate is fixed/reviewed and explicit approval

Run as the existing authorized administrator, not the Spring application process.
Check no same-named role/file exists. `PASSWORD` below is a placeholder; the operator
must generate it privately, pass it only inside JDBC/TLS, and suppress SQL/parameter
logging. Prior Neon evidence requires plaintext password input over TLS, with
server SCRAM storage; do not replay the old client-generated-verifier operation.

```sql
BEGIN;
CREATE ROLE smartcinema_neon_migrator LOGIN INHERIT
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD '<privately-generated-random-password>';
GRANT CONNECT ON DATABASE neondb TO smartcinema_neon_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO smartcinema_neon_migrator;
GRANT SELECT, INSERT ON TABLE public.flyway_schema_history TO smartcinema_neon_migrator;
GRANT REFERENCES (id) ON TABLE public.users TO smartcinema_neon_migrator;
GRANT smart_cinema_hold_owner, smart_cinema_staff_owner
  TO smartcinema_neon_migrator WITH INHERIT TRUE, SET TRUE, ADMIN FALSE;
COMMIT;
```

Verify creator membership in the new login is ADMIN-only, INHERIT=false/SET=false;
the runtime must not inherit or SET the migration login. Save new credentials only
in the existing mechanism `backend/.env.neon-migration` (`url,user,password`), with
owner-only ACL, Git exclusion and URL exactly matching PRIMARY. Never overwrite an
existing file. The app does not load it. No credentials or new role were created
by this review. `StaffPosInstallerPostgresTests` rehearses a unique LOCAL LOGIN
with these minimum rights against populated V18 using the actual helper authority
validator and Flyway builder. This is not a Neon control-plane/setup rehearsal.

## 4. Promotion and bounded execution sequence

After the decisions/tooling/local rehearsal are complete and separately approved:

1. Stop app traffic, scheduled writers and new provider submissions; drain existing
   transactions. Do not assume provider retry or silently abandon unresolved
   attempts. Current review found zero payments; recheck immediately before work.
   Any changed target/history/schema/function/privilege fingerprint, new pending
   financial work or concurrent migration requires review, not automatic retry.
2. Pin the source artifact/hash above and all V1–V18 checksums. Capture original
   columns/constraints/indexes/triggers/function definitions/owners/ACLs, roles and
   table/sequence fingerprints; save protected material outside Git. Confirm a
   maintenance budgets and record only recovery evidence actually available;
   do not claim an unverified pre-change backup exists.
3. **Completed source promotion:** moved the exact file to
   `backend/src/main/resources/db/migration/V19__enable_staff_counter_sales.sql`.
   Assert destination absent and compare SHA-256 before/after. Do not edit its old
   proposal header while promoting. Leave one canonical V19. Existing test scanners
   include main and test paths: identical copies happen to deduplicate in this
   Flyway version, but divergent copies fail validation. Do not rely on deduplication.
   Update the review test's proposal-path selection to resolve the canonical
   artifact, then rerun isolated tests. The test path is now updated; the failure
   injection uses one isolated copy location and asserts the final SQL actually ran.
4. `pnpm db:status` must now report installed V18/source V19, exactly V19 pending,
   failed=0, valid V1–V18 checksums. Normal `pnpm dev` must refuse startup. No skip,
   baseline, repair, history deletion or application migration fallback.
5. Use only the separately reviewed V19-aware installer with the private migration
   connection. Required settings: public/default schema fixed; createSchemas=false;
   validateOnMigrate=true; cleanDisabled=true; baselineOnMigrate=false; outOfOrder=false;
   target=19; connectRetries=0; transactional execution=true; no concurrent-index or
   autocommit execution; skip unrelated callbacks; lock_timeout=5s and an explicitly
   accepted statement budget (initial proposal 120s, re-evaluate against current
   table size). Do not automatically retry any failed/uncertain operation.
   The revised operator command is `pnpm db:migrate --approved`; it requires separate
   explicit approval for the operation. The flag cannot supply human authorization,
   verify backup coverage or drain traffic. No command was executed in this task.
6. Validate the actual database: V19/source V19, exactly one successful V19 entry,
   zero failed/pending, all 19 checksums valid. V1–V18 history unchanged. Check the
   three new function owners, existing owners unchanged, fixed search_path,
   PUBLIC EXECUTE denied, cash wrapper runtime EXECUTE, internal finalizer denied,
   boolean proof runtime EXECUTE, no new audit SELECT/table DML/role membership. Validate every
   constraint and generated owner/FK consistency. Old business values/IDs/QRs/
   timestamps/amounts/sequence heads must match; ignore only the two derived/new
   Booking fields in old-row comparisons. Physical filenodes are expected to differ.
7. Before reopening traffic, verify zero newly created counter rows and unchanged
   MANAGER account/assignment and other business data. Do not create STAFF, Booking,
   CASH/VNPAY payment or Ticket fixtures on PRIMARY. App startup/read-only HTTP may
   be checked only within the separately approved installation scope.

## 5. Cleanup without widening runtime

Once committed history/outcome is known, reconnect using the original operator.
Expected permanent V19 grantors are the protected owners, not the temporary login.
Inspect dependencies before dropping the login; if unexpected ownership/ACL
dependencies exist, stop and investigate. Never force cleanup with CASCADE or
DROP OWNED; never revoke original memberships/grants.

```sql
BEGIN;
REVOKE REFERENCES (id) ON TABLE public.users FROM smartcinema_neon_migrator;
REVOKE SELECT, INSERT ON TABLE public.flyway_schema_history FROM smartcinema_neon_migrator;
REVOKE USAGE, CREATE ON SCHEMA public FROM smartcinema_neon_migrator;
REVOKE CONNECT ON DATABASE neondb FROM smartcinema_neon_migrator;
REVOKE smart_cinema_hold_owner, smart_cinema_staff_owner FROM smartcinema_neon_migrator;
DROP ROLE smartcinema_neon_migrator;
COMMIT;
```

Delete only the private credential file created for this approved operation after
role removal is verified. Restore original operator/runtime/schema privileges,
**plus only the expressly approved permanent V19 additions**; do not claim all
ACLs equal V18. No Staff/Configuration CREATE grant is part of this plan.

## 6. Recovery matrix

| Observed point/outcome | Safe action |
|---|---|
| Before migration starts | Stop; no schema change; remove only approved temporary authority after inspecting state |
| Known transactional migration failure | Wait for rollback, inspect history and object/data/ACL fingerprints read-only; expect V18/no V19 columns/functions/grants and no failed history row. Local early-lock and after-final-GRANT injection tests verified this. Do not repair/clean/retry automatically |
| Network loss / commit uncertain | Do not resubmit. New read-only connection: inspect successful V19 history and complete V19 postconditions. If transaction still active, wait/operator inspect, do not race another installer |
| V19 committed; no counter records | Keep traffic closed. Prefer reviewed forward-only corrective migration. A reverse requires a new explicitly approved migration, restoration of all 13 captured V18 definitions/ACLs, removal only of V19 constraints/index/functions/grants, restoration of old Hold FK and customer NOT NULL, and full validation. Do not delete V19 history or edit V1–V19 |
| Any counter row, CASH evidence or counter Ticket exists | Automatic V18 downgrade is unsafe: customer_id=null is legitimate and V18 cannot represent it. Do not synthesize Customers, delete sales, reverse PAID, discard Tickets/audits or assume refund. Stop new sales; preserve V19 data; make a reviewed forward fix. Any provider restore requires accounting for every later event and separate approval |

No deleted/reset/reseeded application rows or logical rewrites are needed for the
forward upgrade. Physical storage rewrite and post-commit financial irreversibility
are real limitations. No rollback/recovery operation against PRIMARY was performed.
