# AI Agent Instructions

Every AI coding agent MUST first read [.agent/workflows/DEVELOPMENT_WORKFLOW.md](.agent/workflows/DEVELOPMENT_WORKFLOW.md), then [docs/development/project-conventions.md](docs/development/project-conventions.md), and relevant requirements/design documents. Load applicable files from `.agent/rules/` and `.agent/workflows/` and follow applicable application-local instructions. Canonical AI operating instructions live in `.agent/`; the single project convention standard lives in `docs/development/`.

Before implementation: understand the task, complete those readings, identify requirement traceability, perform the convention check, check scope/conflicts, and plan. Only then implement the authorized scope. Read conventions before naming or creating files, writing documentation/reports, or creating/suggesting commits or branch names too.

After implementation: verify, reconcile with requirements, reconcile with project conventions, fix convention violations, and generate a new report under `docs/reports/` including Convention Compliance. Recheck the report itself.

Never knowingly complete a task that violates the canonical convention without explicitly documenting an approved exception.

- Never invent BR/FR/UC/NFR or Business Rule IDs.
- Never silently change business requirements.
- Never change BRD/SRS to make code appear correct.
- Never introduce out-of-scope functionality without reporting it.
