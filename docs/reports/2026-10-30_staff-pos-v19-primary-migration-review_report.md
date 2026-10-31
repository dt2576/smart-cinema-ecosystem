# STAFF POS V19 PRIMARY migration review

Date: 2026-10-30, Asia/Saigon. **Final recommendation: NO-GO for PRIMARY installation
as currently prepared.** SQL/data compatibility and transactional rollback are
supported by isolated tests; operator tooling and approval decisions below remain.
No PRIMARY migration, privilege/owner change, account or business write occurred.

## 1. Scope, requirements and reviewed material

Reviewed canonical AGENTS/development/backend workflows, conventions and scoped
rules; current handoff and STAFF POS implementation report; approved BRD/SRS v1.3
counter-sales revision; POS/Customer Booking/Payment/VNPAY/Staff admission/reporting
contracts; complete V19 and the V5–V18 protected foundations; actual PRIMARY V18
catalog/data/privileges and normal migration/startup helper.

Traceability: approved BR-038 CASH/VNPAY distinction, BR-026–031/035/039–044/046,
BR-050/053/059; SRS FR-AUTH-007/008, FR-ORG-005, existing Booking/Payment/Ticket
requirements and DR-004. This is a deployment/data-safety review, not a new business
requirement or frontend task. No requirements, contract or proposal was changed.

Concrete [operator installation/recovery plan](../development/neon-staff-pos-v19-migration-plan.md)
contains exact proposed SQL, authority, promotion steps, gates and recovery actions.
It is **not execution approval**.

## 2. Current PRIMARY evidence

| Item | Actual read-only result |
|---|---|
| Target | Existing PRIMARY Neon `neondb/public`, PostgreSQL 18.6; TLS, server `transaction_read_only=on` |
| Installed / normal source | **V18 / V18**; 18 valid checksums; pending 0, failed 0 |
| V19 location | Only isolated-test proposal; not promoted or installed |
| Existing Booking data | 3 Bookings: 1 CANCELLED, 2 EXPIRED; 0 Payments/evidence/Tickets |
| Migration data preconditions | 0 null legacy Customers, 0 attached-Hold owner mismatches |
| Accounts/scope | 0 ACTIVE STAFF; MANAGER user 5 remains ACTIVE with its one Cinema 1 assignment |
| Owners | All 13 replaced functions and affected financial tables belong to smart_cinema_hold_owner; users/history to neondb_owner; assignments to smart_cinema_staff_owner |
| Protected triggers | 70 inventoried on affected/related tables, none disabled |
| Temporary credentials/role | No existing migration credential file; no smartcinema_neon_migrator login found |

Before/after **31 fingerprints** covering all public table rows/history, function
definitions/owners/ACLs, relation ACLs, role flags and memberships were unchanged.
Full catalog groups (columns including column ACLs, constraints, indexes, functions,
privileges, memberships, table metadata and triggers) were separately compared and
unchanged. No login/token operation, app startup, callback or account mutation was
used in this review. PRIMARY was used only through enforced read-only connections.

## 3. Exact artifact and object inventory

Artifact: [V19 proposal](../../backend/src/test/resources/pos-migration/V19__enable_staff_counter_sales.sql).
SHA-256: `A4CA71A0D0BAB130E8CE16EA8071C86EC5F4AAE7D912576007672663FE0B1197`.
The file remains unchanged and outside normal Flyway resources.

| Object | Proposed change |
|---|---|
| bookings.customer_id | DROP NOT NULL; original FK/Customer uniqueness retained |
| bookings.selling_staff_id | New nullable bigint/User FK, no invented Customer rows |
| bookings.owner_id | STORED generated coalesce(customer_id,selling_staff_id) |
| Booking constraints | New XOR owner CHECK; new UNIQUE(id,showtime_id,owner_id); new selling_staff_id FK |
| Booking indexes | New unique-constraint index and partial idx_bookings_counter_owner(selling_staff_id,id) for non-null seller |
| seat_holds FK | Recreate fk_seat_holds_booking_owner against internal owner key, preserving actual actor/Showtime/Booking match |
| payment_transactions CHECK | Retain original VNPAY/unbound expression; add disjoint CASH/VND/COUNTER/SUCCESS binding with no merchant/provider URL fields or reconciliation |
| payment_evidence CHECK | Existing IPN/QUERY plus new CASH source; no evidence rows created by migration |
| users | No row/column change; referenced side of the new FK gains PostgreSQL RI trigger dependencies |
| audit_records/cinema_assignments | Permission changes only; no rows rewritten or inserted by migration |
| booking_seats/tickets | No schema/data rewrite commands; shared finalization definitions retain their aggregate/uniqueness guards |

The FK replacement regenerates its internal RI triggers; new FK/unique constraints
create the corresponding PostgreSQL-owned enforcement objects. Existing paid,
freeze, sold-unit, snapshot and Ticket uniqueness constraints remain installed.
No new table, role, seed, manual financial correction or application sequence reset.

The **13 existing functions** replaced in place are:
`guard_seat_hold`, `guard_booking_seat`, `assert_booking`,
`booking_composition_eligible`, `payment_settlement_eligible`, `create_booking`,
`cancel_booking`, `initiate_payment`, `bind_vnpay_submission`,
`edit_booking_promotion`, `guard_booking`, `lock_hold_context`,
`record_vnpay_result`. Existing owners/ACL identities are retained.

Ownership predicates use the generated owner key; Customer inserts still populate
customer_id, counter inserts selling_staff_id. Current STAFF assignment/account
checks supplement the shared Hold context. The Booking BEFORE guard compares
immutable input fields while excluding its not-yet-computed generated value.
VNPAY verification/reconciliation logic stays in its original writer; issuance is
extracted to one shared internal function, not duplicated.

Two new functions: `finalize_sale(bigint,bigint,bigint,bigint)` (internal invoker)
and `staff_confirm_cash(bigint,bigint,bigint,numeric)` (SECURITY DEFINER), both owned
by Hold owner and using pg_catalog/pg_temp search_path with schema-qualified domain
objects. PUBLIC EXECUTE is revoked; only the cash wrapper is exposed to runtime.

Three permanent privilege additions in the exact proposal:

1. Hold owner SELECT on cinema_assignments.
2. Runtime EXECUTE on staff_confirm_cash.
3. Runtime SELECT(actor_user_id,action,resource_type,resource_id,metadata) on audit_records.

There is no new runtime financial DML, owner membership or internal-finalizer
EXECUTE. However, the third grant reads those columns across **all** audit rows,
not only CASH receipts. It is a genuine group-level read expansion. The configured
neondb_owner already has audit access through Hold-owner inheritance; that does
not make the added runtime-group grant disappear or remove the need to review it.

## 4. Populated V18 migration and compatibility tests

New [review tests](../../backend/src/test/java/com/smartcinema/staff/StaffPosMigrationReviewTests.java)
first migrate a fresh isolated schema to V18, then create representative fixtures
through the existing protected writers. No PRIMARY fixtures and no new database.

Pre-upgrade fixture: **10 Bookings, 6 attempts, 2 Tickets, 1 CHECKED_IN Ticket,
6 permanently frozen Bookings**, plus existing Concession/Promotion snapshots,
effective Staff/Manager assignments, valid PAID aggregate/QR, expired/cancelled
sales and late-success reconciliation. Test database is fixed loopback
smartcinema_phase4e_test (PostgreSQL 18.4); minor-version difference is disclosed.

Actual PRIMARY V18 matched isolated V18 after namespace normalization:
**13/13 changed function definitions, 85 constraints, 23 indexes and 72 exact
column types**; non-RI trigger enable states also matched. RI trigger OIDs/names
are instance-specific, not compared as stable identifiers.

| Verification | Observed outcome |
|---|---|
| Exact V19 over populated V18 | One migration succeeds; all pre-existing business fields/rows and sequence heads unchanged; owner_id equals prior Customer ID; seller null |
| Existing Customer/VNPAY | Pre-V19 bound/unbound/unfrozen/FAILED sales can complete after upgrade through original result command; no manual financial status changes |
| Paid Ticket/QR/check-in | Existing paid QR, Ticket/check-in state and audit records unchanged by migration |
| ADMIN/MANAGER reports | Original VNPAY metrics identical immediately before/after; new CASH remains separate and Manager scope unchanged |
| Actor/Cinema assignments | Existing assignment rows and original history preserved; actual scoped runtime CASH path works on new isolated records |
| Hold-owner-only migration | 42501; after matching PRIMARY schema-CREATE authority, missing users REFERENCES is separately verified; rollback preserves V18 |
| Contended DDL | Bounded lock failure 55P03; no partial migration |
| Injected error after final GRANT | Entire Flyway transaction rolls back DDL/functions/grants/data representation; V18 remains, no failed V19 history row |
| Flyway rerun | 0 executed, no history/data/function drift |
| Raw SQL rerun in transaction | 42701 duplicate-column failure, full rollback; script itself is not idempotent |
| Runtime enforcement | No direct financial table DML or finalizer EXECUTE; legitimate cash wrapper yields one Ticket for a COUPLE unit |
| Promotion copies | Byte-identical copies deduplicate in this Flyway version; divergent V19 copy fails validation; retain one canonical artifact |

**Important storage finding:** bookings relfilenode changed during successful
upgrade. Adding the STORED generated column physically rewrites the table/indexes,
even though old business values remain identical. PostgreSQL documents that rewrite
and the default ACCESS EXCLUSIVE lock for ALTER TABLE. A literal “no records are
physically rewritten” acceptance cannot be confirmed for this proposal.
[PostgreSQL 18 ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html).

Local existing public data/history and global role/membership fingerprints were
unchanged. Test schemas are retained as evidence; no existing data was reset or
cleaned. Fixtures use local operator authority; a dedicated least-privilege Neon
login setup/cleanup rehearsal was **NOT RUN**, and is not implied by these passes.

Commands:

```powershell
cd backend
$env:STAFF_POS_MIGRATION_REVIEW_TESTS='true'
$env:STAFF_POS_DB_TESTS='true'
mvn '-Dmaven.compiler.useIncrementalCompilation=false' '-Dtest=StaffPos*Tests' test
```

**Final combined result: 36/36 PASS, zero failures/errors/skips/retries**: 9 migration
review cases plus 23 PostgreSQL POS and 4 request regression cases. Earlier diagnostic runs
are retained: an AssertJ SQLException overload compile issue, an incremental
compile failure, a mistaken expectation that identical Flyway resources must be
rejected, and a local schema-CREATE mismatch were resolved in review harness/tests.
The V19 proposal and production source were not changed to make tests pass.

## 5. Operator authority and installation blockers

Actual PRIMARY: neondb_owner is non-superuser with CREATEROLE/CREATEDB and protected
role ADMIN options. It can inherit/SET Hold owner, but not Staff/Configuration owner;
Hold owner has schema CREATE, lacks users REFERENCES and cannot grant assignment
SELECT. Staff owner owns assignments; users/history belong to neondb_owner.

An independent temporary migration login for the **unchanged** SQL therefore needs
Hold + Staff owner INHERIT/SET, schema USAGE/CREATE, users REFERENCES(id), history
SELECT/INSERT. No Configuration/Check-in/Payment-system/neon_superuser role or
SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS for that login. Permanent runtime changes
must be exactly those reviewed above, with no owner membership or direct DML.
Exact setup/cleanup SQL and the credential/creator-membership safeguards are in
the linked operator plan. Nothing in that SQL was executed on PRIMARY.

**Current installer is not compatible with that minimum plan:**
`PrimaryDatabase.migrate()` still insists on Configuration-owner INHERIT/SET and
Staff/Configuration schema CREATE. These were necessary for V14–V18, not V19.
It must become version-scoped (or a separately reviewed V19 installer must replace
that execution path). Do not widen authority solely to pass its obsolete check.

Other gates: accept the physical rewrite/downtime or revise/retest the artifact;
approve/restrict the all-row audit-column exposure; confirm an actual recoverable
restore point; test the revised installer/login authority and cleanup. These are
concrete missing prerequisites, not permission to execute the current proposal.

## 6. Promotion, recovery and record preservation

The plan promotes the **same bytes by move**, not a second drifting copy, to normal
`backend/src/main/resources/db/migration/V19__enable_staff_counter_sales.sql` only
after the gates and separate approval. Test path selection must then follow the
canonical artifact. Installed V18/source V19 should show exactly one pending V19;
normal startup must stop until approved migration succeeds. No clean/repair/skip.

Execution must use bounded, transactional Flyway with exact target/version/hash,
separate credentials and no automatic retries. Before commit, failures are safely
rolled back in the tested conditions. Autocommit/psql statement-by-statement
execution is prohibited because it can leave partial DDL.

After uncertain commit, reconnect read-only and inspect history/full postconditions
before any action. After successful commit, prefer a reviewed forward correction.
Never delete V19 history or rewrite historical migration checksums. A V18 downgrade
is unsafe once any counter row exists: legitimate customer_id=null cannot be
represented without destructive deletion or an invented Customer. CASH evidence,
issued QR/Tickets and audits cannot be automatically reversed or discarded.

**No existing row needs logical deletion, reset, reseeding or business-field
rewriting for this forward upgrade. Physical Booking storage rewriting is real.**
No verified provider restore point was created here; post-commit restore is not
claimed as tested and must account for all later events. The exact staged recovery
matrix and cleanup restrictions are in the operator plan.

## 7. Evidence, files and Convention Compliance

- [PRIMARY status](../../backend/target/staff-pos-v19-review-2026-10-30/db-status.log)
- [PRIMARY catalog/privileges](../../backend/target/staff-pos-v19-review-2026-10-30/primary-metadata.json)
- [PRIMARY after fingerprints](../../backend/target/staff-pos-v19-review-2026-10-30/primary-after.log)
- [Catalog equality](../../backend/target/staff-pos-v19-review-2026-10-30/primary-catalog-equality.txt)
- [Final combined test log](../../backend/target/staff-pos-v19-review-2026-10-30/final-safety-regression.log)
- [Migration findings](../../backend/target/staff-pos-v19-review-2026-10-30/review-evidence.txt)

Created only the review test, this report, the operator plan and ignored review
helpers/evidence; current handoff updated additively. Existing uncommitted POS
implementation, SQL proposal, requirements/contracts, historical migrations/reports,
environment and frontend are preserved. No commit/push/deployment.

Convention Compliance: PascalCase Java test in the existing staff test package;
dated kebab-case report and development plan; actual requirement IDs; explicit
fact/proposal separation and no credentials in documentation. **PASS:** all 1,048
pre-existing tracked/untracked source/document files preserved except the additive
handoff; complete old handoff body intact; V19 hash unchanged; HEAD/index unchanged;
strict UTF-8, local links and diff checks verified. Only three new review files.
Visual/Stitch and
production build are NOT APPLICABLE to this review; no UI or production-code change.

## 8. Decision

**NO-GO — do not install V19 on PRIMARY yet.** Resolve the minimum-authority helper
gate and the explicit rewrite/audit/recovery decisions first, then request approval
for the exact pinned artifact, setup, execution and cleanup plan. Stop here; no
STAFF account, live sale, POS frontend or next module is authorized by this review.
