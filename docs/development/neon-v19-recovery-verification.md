# PRIMARY Neon V19 recovery evidence checklist

Date: 2026-10-30. Read-only verification procedure; no restore, backup creation,
branch creation, retention change or migration is authorized by this document.
Use with the [V19 operator plan](neon-staff-pos-v19-migration-plan.md).

## Current evidence

PostgreSQL connectivity and V18 history are verified. Provider recovery coverage
is **UNVERIFIED**: this task has no connected Neon management tool/authenticated
Console evidence. SQL credentials do not establish control-plane recovery access.
No snapshot, backup, branch or restore was created, changed or tested. A successful
transactional rollback is not proof of recovery after COMMIT.

## Read-only operator verification before requesting installation approval

1. In the existing authorized Neon Console session, identify the project, endpoint
   and branch belonging to the configured PRIMARY hostname and `neondb`. Do not
   assume the default/main branch is PRIMARY. Record immutable project/branch/
   endpoint IDs privately; compare the endpoint's branch ID and hostname with the
   configured connection without copying its password/connection URI into reports.
2. Inspect Settings -> Postgres history window without saving changes. Record the
   actual configured retention and the provider's displayed recoverable timeline.
   Do not substitute plan defaults or infer coverage solely from retention seconds.
   The history window bounds how far recovery can reach.
   [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window).
3. With traffic/workers drained, capture the database UTC clock and a consistent
   V18 data/history/schema/ACL baseline through a read-only transaction:

   ```sql
   BEGIN READ ONLY;
   SELECT current_database(), current_user, current_schema(),
          current_setting('transaction_read_only'),
          clock_timestamp() AT TIME ZONE 'UTC' AS observed_utc;
   SELECT version, script, checksum, success
   FROM public.flyway_schema_history WHERE version IS NOT NULL
   ORDER BY installed_rank;
   COMMIT;
   ```

   Choose an exact **pre-change UTC target** after the drain/baseline, before role
   setup/migration. Confirm the provider timeline actually includes that instant;
   record its earliest/latest permitted bounds and the time of verification. A
   fresh SQL timestamp by itself is not a restore point. Do not mistake a branch's
   `parent_timestamp`/`parent_lsn` for current recoverable history bounds.
4. Inspect Backup & restore and the restore dialog's timeline, stopping before any
   final restore/create action. Confirm the selected project/branch and target are
   accepted for recovery, that no conflicting operation is running, and that the
   operator has the necessary restore authority. Record the UI evidence privately,
   without credentials. An existing snapshot is an alternative only if its source
   branch, captured state/time and availability cover the required V18 baseline;
   an arbitrary old snapshot is insufficient.
5. If an existing authorized management API connection is available, the following
   **GET-only** calls can supplement Console evidence (base URL
   `https://console.neon.tech/api/v2`). Keep auth headers in a private client, never
   command-line literals, transcripts or Git. No new credentials are provisioned
   by this procedure:

   | Read | Evidence |
   |---|---|
   | `GET /projects/{project_id}` | Exact project and `history_retention_seconds`; [official API](https://neon.com/docs/reference/api/projects/get-project) |
   | `GET /projects/{project_id}/endpoints/{endpoint_id}` | Endpoint-to-branch mapping; [official API](https://neon.com/docs/reference/api/endpoints/get-project-endpoint) |
   | `GET /projects/{project_id}/branches/{branch_id}` | Actual branch identity/state; [official API](https://neon.com/docs/reference/api/branches/get-project-branch) |
   | `GET /projects/{project_id}/snapshots` | Existing snapshot IDs/source branch/time; [official API](https://neon.com/docs/reference/api/snapshots/list-snapshots) |

   These metadata responses alone may not expose a verified oldest/latest restore
   boundary or prove a restore will succeed. If the Console/API cannot establish
   target availability, mark coverage UNVERIFIED and obtain provider/operator
   evidence. Do not invent fields or submit a mutating API request as a probe.
6. Record a recovery budget agreed by the operator: outage, detection/investigation
   and restore time. The chosen target must remain available beyond that budget,
   including the migration window; recheck immediately before installation. If the
   target ages out, repeat read-only verification and select a valid pre-change
   target. Do not extend retention or create a snapshot/branch without approval.
7. Keep the approval packet outside Git: checkedAtUtc, exact IDs, targetUtc/LSN if
   actually supplied, verified coverage bounds, retention, evidence references,
   V18 checksums/fingerprints, revised V19 SHA-256, restore operator, approved time
   budget and decision. Public report should state only readiness and redacted
   evidence references. Distinguish **metadata coverage verified** from **actual
   restore rehearsal verified**. The latter is NOT RUN in this task.

## Recovery execution requires a separate approval

Before COMMIT, failed migration must roll back; inspect actual history and all
postconditions before cleanup. After network loss, inspect from a fresh read-only
connection; never assume failure and resubmit.

After COMMIT, keep traffic closed if postconditions fail. Prefer a reviewed
forward correction. If provider recovery is necessary, obtain explicit approval
for the exact source/target, affected data interval and restore procedure. A
non-destructive restore rehearsal in a separate recovery branch would itself
create resources and needs authorization; it is not part of this read-only check.

Before redirecting traffic to recovered data, verify V18 history/checksums, protected
owners/functions/ACLs, all original records/sequence state and the existing MANAGER
account/assignment. Account for every event after targetUtc, including provider
callbacks, CASH receipts, Tickets/check-ins, assignments and account changes. Do
not discard legitimate financial events or restore only application tables while
leaving inconsistent roles/Flyway metadata. Document actual provider restore
semantics and reconcile identity/grants rather than assuming they are reverted.

If any counter sale exists, V18 cannot represent its null Customer. No automatic
downgrade, synthesized Customer, deleted payment/audit/Ticket or history repair is
allowed. Preserve data and use the [operator recovery matrix](neon-staff-pos-v19-migration-plan.md#6-recovery-matrix).

## Installation readiness gate

**NO-GO** while exact-target recovery coverage, operator recovery access, accepted
maintenance/recovery budget or separate approval for the revised artifact is
missing. Completing this checklist does not itself authorize installation.
