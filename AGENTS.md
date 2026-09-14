# AI Agent Instructions

Every AI coding agent MUST first read [.agent/workflows/DEVELOPMENT_WORKFLOW.md](.agent/workflows/DEVELOPMENT_WORKFLOW.md), then load applicable files from `.agent/rules/` and `.agent/workflows/`. Canonical AI operating instructions live in `.agent/`; project requirements live in `docs/`. Follow applicable application-local instructions too.

Before implementation: understand the task, read relevant project docs, identify requirement traceability, check scope/conflicts, plan, then implement only the authorized scope.

After implementation: verify, compare with requirements again, and generate a new report under `docs/reports/`.

- Never invent BR/FR/UC/NFR or Business Rule IDs.
- Never silently change business requirements.
- Never change BRD/SRS to make code appear correct.
- Never introduce out-of-scope functionality without reporting it.
