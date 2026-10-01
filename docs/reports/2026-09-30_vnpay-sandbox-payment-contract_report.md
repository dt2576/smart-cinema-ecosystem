# Smart Cinema Implementation Report

## 1. Task Information

Task: Finalize and publish VNPAY Sandbox integration + Payment finalization contract
Date: 2026-09-30
Module: Payment, Booking, Promotion, Seat Hold, Ticket and Booking QR
Type: Contract/design documentation only
Status: COMPLETE; **READY WITH SANDBOX-CONFIRMATION ITEMS** for next implementation

## 2. Requested Work

Publish the user's approved sandbox policies as an additive versioned contract,
resolve the documented lock-order discrepancy using runtime evidence, separate
provider facts/configuration/unverified behavior, and reconcile AI context. Do not
implement runtime, migrations, charge, finalization or automatic refunds.

## 3. Documents Reviewed

- AGENTS.md, [workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  [conventions](../development/project-conventions.md), document/traceability rules,
  current project context/handoff and report template.
- [BRD v1.2](../brd/brd-v1.2.md) Payment/Ticket/Promotion and sandbox scope;
  [SRS v1.2](../srs/srs-v1.2.md) Payment/Booking/Ticket requirements.
- [Preflight v1.1](../api/payment-finalization-preflight-v1.1.md),
  [provider research report](2026-09-30_vnpay-provider-research_report.md), and its
  recorded official VNPAY source evidence; no new provider fact assumed.
- [Payment initiation](../api/payment-initiation-contract-v1.0.md),
  [Booking v1.3](../api/booking-contract-v1.3.md),
  [Promotion v1.1](../api/promotion-composition-contract-v1.1.md),
  [Concession composition](../api/concession-composition-contract-v1.0.md),
  [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md), linked base contracts.
- [Database decisions](../db/database-design-decisions-v1.0.md),
  [physical dictionary](../db/physical-data-dictionary-v1.0.md),
  [integrity v1.0](../db/integrity-enforcement-design-v1.0.md), V1–V9 history and
  current Payment service/guard design; targeted review of V5–V9 resource locks,
  eligibility, binding restrictions and aggregate assertions.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BRD v1.2 BR-035–042, BC-03 | Server amount, sandbox, trusted verification, references/idempotency | Yes | PASS design; runtime DEFERRED |
| SRS v1.2 FR-PAYMENT-001–015 | Initiation through result verification/late audit | Yes | PASS contract coverage; provider confirmation gates explicit |
| SRS v1.2 FR-BOOKING-012/018 | No premature issuance, historical composition | Yes | PASS preserved permanent freeze/atomic completion |
| SRS v1.2 FR-PROMO-003 | Usage limit | Yes | PASS serialized paid usage and unfulfillable-success policy |
| SRS v1.2 FR-TICKET-001–009 | Whole Seat Unit issuance, unique identifiers, Booking QR/ownership/idempotency | Yes | PASS design; no actual issuance or scanner implementation |
| BRD v1.2 BR-064 | Notification failure isolation | Yes | PASS after-commit contract |

## 5. Implementation Summary

Documentation only. Published the approved provider/amount/binding/retry/result
policies, designed API and adapter boundaries, reconciliation evidence requirements,
forward-migration obligations and verification matrix. The contract clearly labels
current V9 behavior separately from future designed behavior.

The integrity addendum resolves the old Promotion-before-Holds sequence in favor
of actual Holds-before-Promotion runtime order, includes Movie SHARE, and defines
future Payment/Ticket placement without changing runtime. It does not reuse the
unfrozen-composition eligibility helper for finalization.

## 6. Files Created

- [VNPAY Sandbox Payment contract v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md).
- [Integrity enforcement addendum v1.1](../db/integrity-enforcement-design-v1.1.md).
- This report.

## 7. Files Modified

- [Current handoff](../ai/current-handoff.md): latest contract/report, status,
  confirmation gates and exact next migration/runtime/test task.
- [Project context](../ai/project-context.md): only approved stable decisions,
  including the user's blocked-after-initiation refinement and corrected lock order.

No historical report/contract, code, migration, BRD/SRS or configuration changed.
Uncommitted V9 implementation files already present at task entry are preserved.

## 8. Verification

| Check | Result and evidence |
|---|---|
| Preservation | PASS: SHA-256 comparison of 478 task-entry files excluding only the two authorized AI context files |
| Migration head | PASS: V1–V9 remain; no new migration; expected next V10 is a plan subject to head recheck |
| Local documentation links/anchors | PASS: Node validation of 122 local links and two explicit anchors across five task documents |
| Whitespace | PASS: git diff --check and explicit checks of all five task documents including untracked additions |
| Source/design reconciliation | PASS: V5 context gate, V6 aggregate locks and V7–V9 composition/Promotion ordering cross-checked |
| Handoff reconciliation | PASS: approved contract/addendum/report linked; actual runtime stays V9; exact next work and confirmation gates explicit |
| Requirement/convention review | PASS: table above and compliance section below; no new requirement IDs |
| Maven/PostgreSQL/runtime/build tests | NOT RUN: documentation-only task; no runtime verification claimed |
| Real sandbox checks | DEFERRED: no credentials/calls/results; official research is not certification |
| Atomic sale/concurrency/Ticket/QR | DEFERRED: test matrix published for next implementation |

Historical 194-test V9 PASS remains prior evidence and was not rerun or represented
as verification of provider integration. No live PostgreSQL schema mutation or
new database inspection was needed for this documentation revision.

## 9. Requirement Reconciliation

PASS for all requested documentation deliverables and scope guards. Financial
SUCCESS and sale eligibility are explicitly distinct. Exact numeric(19,4) remains
unchanged; positive-whole-VND is an approved provider-boundary policy. Permanent
freeze, original deadlines, COUPLE atomicity and one Booking QR are retained.

Business decisions are resolved; remaining uncertainty is provider interoperability
and operational configuration, not an unanswered architecture approval request.
Implementation can begin from this design while affected provider behavior remains
disabled until its confirmation tests pass.

## 10. Deviations / Conflicts

- User approved settlement despite a later BLOCKED Customer when other eligibility
  remains valid. This explicitly supersedes the opposite preflight proposal; the
  historical preflight remains unchanged.
- Old integrity §4 placed Promotion before Holds; additive v1.1 adopts the actual
  runtime order. V9's one-total-attempt and insert-only guards remain intact today
  and require a coordinated forward migration, never bypasses.
- VNPAY source inconsistencies already recorded in preflight remain confirmation
  items. No new unsupported terminal mapping, reservation/capture guarantee,
  fractional acceptance or refund completion claim is made.
- Designed provider GET callback mutation is a protocol-specific transport
  exception, explicitly documented; new Customer resources remain noun-based.

Existing Convention Conflicts: no new convention violation; no approved convention
exception required. Existing application changes were neither reformatted nor
renamed. Reports and source documents retain their historical names.

## Convention Compliance

Validated against [canonical conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing docs/api, docs/db, docs/ai, docs/reports; additive versioned kebab-case and dated report |
| Domain/status terminology | PASS | Existing lifecycle values; reconciliation separate from lifecycle; UNKNOWN explanatory only |
| API convention | PASS | Designed resource paths use /api/v1 and noun resources; provider GET semantics justified |
| Database convention | PASS design | Existing snake_case names; no physical migration created |
| Code naming | NOT APPLICABLE | No code written |
| Documentation convention | PASS | Evidence/policy/configuration/unknowns separated; traceability, links, history and report checked |

## 11. Unresolved Provider Confirmation

The contract §13 requires actual merchant/sandbox evidence for signature/encoding
vectors, definitive result combinations, duplicate/reopened URL behavior, query
throttling/visibility, special/reversal/refund semantics, amount/window limits and
IPN acknowledgement interoperability. Fractional/zero acceptance need not be
resolved for MVP because both are explicitly rejected by approved policy.

Timeouts/cadence/horizon are configurable starting candidates, not newly approved
business constants. No provider status inferred from a local timeout. No production
charge or automated refund scope is introduced.

## 12. Exact Next Task

Implement [VNPAY Sandbox integration and atomic finalization](../api/vnpay-sandbox-payment-contract-v1.0.md)
with the integrity addendum. Expected work: next forward migration after V9 for
binding/retries/evidence/reconciliation/Ticket/audit and complete paid assertions;
sandbox adapter, owned submission/result endpoints, UX-only return, verified IPN,
query recovery and protected result writer; fresh/V9-upgrade and PostgreSQL race/
grant/atomicity tests plus separately evidenced real sandbox confirmations.

Readiness: **READY WITH SANDBOX-CONFIRMATION ITEMS**. This document task does not
authorize deployment, production money handling or fabricated successful payments.
