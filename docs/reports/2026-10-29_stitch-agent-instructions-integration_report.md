# Stitch agent instruction integration

## Task Information and Requested Work

Date: 2026-10-29, Asia/Saigon. Type: documentation/instruction integration.
Status: **PASS**. No frontend implementation or application startup performed.

## Documents Reviewed

Root/frontend AGENTS, canonical development/frontend workflows, project conventions,
document/UI/traceability rules and the two user-provided instruction files.

## Files Integrated and Modified

The supplied files already existed, untracked, at the correct convention-compliant
locations. Their contents were retained byte-for-byte:

- [.agent/workflows/SMART_CINEMA_STITCH_WORKFLOW.md](../../.agent/workflows/SMART_CINEMA_STITCH_WORKFLOW.md).
- [.agent/rules/SMART_CINEMA_AGENT_UI_RULES.md](../../.agent/rules/SMART_CINEMA_AGENT_UI_RULES.md).

Updated four entry points:

- [AGENTS.md](../../AGENTS.md): mandatory frontend reading order and visual/behavior boundaries.
- [frontend/AGENTS.md](../../frontend/AGENTS.md): direct instruction links, screenshot/font verification and separate acceptance; existing Next.js managed block preserved.
- [FRONTEND_WORKFLOW.md](../../.agent/workflows/FRONTEND_WORKFLOW.md): mandatory Stitch/UI companion rules and task-appropriate verification.
- [UI_UX_RULES.md](../../.agent/rules/UI_UX_RULES.md): direct companion links to prevent older entry points bypassing the requirements.

Created this report. No other files changed by this task.

## Implementation and Requirement Reconciliation

Approved Google Stitch MCP designs are mandatory for visual authority, with maximum
achievable fidelity, actual loaded/computed typography including Vietnamese,
matched real-browser screenshots, documented deviations and independent Functional
and Visual acceptance. Functional test success does not imply Visual PASS;
inaccessible references cannot yield Visual PASS; pixel-perfect claims need evidence.

Existing requirements, backend/API contracts, authorization and PRIMARY Neon rules
remain behavioral authority. Prototype content cannot invent capabilities/data.
Phase/prioritization text is not permission to resume modules. Separate user
instruction is required before remaining modules resume.

Business BR/FR/UC/NFR traceability: **NOT APPLICABLE** to these operating-instruction
changes; no business requirement or identifier introduced. Current task permits only
documentation integration, so no live Stitch retrieval, screen acceptance or UI
changes were needed.

## Verification

| Check | Result |
|---|---|
| Local instruction/report links and reading chain | PASS |
| Supplied instruction files preserved | PASS, baseline hashes compared |
| Next.js generated instruction block preserved | PASS, exact content compared |
| Source, backend, API, migrations, dependencies and prior uncommitted work | PASS, baseline hashes compared |
| UTF-8 and whitespace | PASS |
| HEAD/index preservation | PASS; no stage/commit/push |
| Application tests/build/browser/database checks | NOT RUN: documentation only |
| Functional/Visual UI acceptance | NOT APPLICABLE: no screen changes |

Actual audit: **27 local links verified**; only the four listed entry points changed
and this report was added. **968/972 baseline files remained byte-identical**, including
both supplied documents and all prior application work. No references were missing.

## Convention Compliance

PASS against [canonical conventions](../development/project-conventions.md):
uppercase snake-case instruction-file exception in `.agent/workflows/` and
`.agent/rules/`, existing AGENTS filenames, dated kebab-case report, correct relative
links and single convention authority. No convention exception or new dependency.
No existing report was rewritten. No screen, business logic, environment, database
or migration was changed. No services started, commit/push or deployment.

## Remaining Work

None for this integration. **STOP.** Resume remaining functional modules only when
the user separately instructs it.
