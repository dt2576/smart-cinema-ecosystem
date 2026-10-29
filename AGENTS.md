# AI Agent Instructions

Every AI coding agent MUST first read [.agent/workflows/DEVELOPMENT_WORKFLOW.md](.agent/workflows/DEVELOPMENT_WORKFLOW.md), then [docs/development/project-conventions.md](docs/development/project-conventions.md), and relevant requirements/design documents. Load applicable files from `.agent/rules/` and `.agent/workflows/` and follow applicable application-local instructions. Canonical AI operating instructions live in `.agent/`; the single project convention standard lives in `docs/development/`.

Before implementation: understand the task, complete those readings, identify requirement traceability, perform the convention check, check scope/conflicts, and plan. Only then implement the authorized scope. Read conventions before naming or creating files, writing documentation/reports, or creating/suggesting commits or branch names too.

After implementation: verify, reconcile with requirements, reconcile with project conventions, fix convention violations, and generate a new report under `docs/reports/` including Convention Compliance. Recheck the report itself.

Never knowingly complete a task that violates the canonical convention without explicitly documenting an approved exception.

- Never invent BR/FR/UC/NFR or Business Rule IDs.
- Never silently change business requirements.
- Never change BRD/SRS to make code appear correct.
- Never introduce out-of-scope functionality without reporting it.

## Mandatory frontend workflow

For every frontend task, after the canonical workflow and conventions above, read and follow:

1. [.agent/workflows/FRONTEND_WORKFLOW.md](.agent/workflows/FRONTEND_WORKFLOW.md).
2. [.agent/workflows/SMART_CINEMA_STITCH_WORKFLOW.md](.agent/workflows/SMART_CINEMA_STITCH_WORKFLOW.md).
3. [.agent/rules/SMART_CINEMA_AGENT_UI_RULES.md](.agent/rules/SMART_CINEMA_AGENT_UI_RULES.md).
4. Applicable [frontend/AGENTS.md](frontend/AGENTS.md) instructions.

Approved Google Stitch MCP designs are the mandatory visual source of truth. Aim for maximum achievable fidelity; verify actual loaded/computed typography and compare real browser screenshots at matched viewport/state. Report Functional and Visual acceptance separately; passing functional tests alone does not establish Visual PASS. Disclose deviations and blocked evidence instead of claiming unsupported pixel-perfect results.

Existing requirements, backend/API contracts, authorization and PRIMARY Neon safeguards remain authoritative for behavior. These workflow files do not authorize backend/database changes, unrelated redesigns, or starting/resuming unfinished modules. Resume remaining modules only when separately instructed; complete the authorized scope, report and STOP.
