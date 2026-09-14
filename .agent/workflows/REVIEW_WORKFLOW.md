# Review Workflow

Use [Development Workflow](DEVELOPMENT_WORKFLOW.md) to review completed implementation against the requested scope and relevant project documents.

Required review categories:

- Requirement compliance and actual requirement traceability.
- Scope compliance.
- Architecture consistency.
- Convention Compliance against [project conventions](../../docs/development/project-conventions.md): repository structure, naming, domain terminology, API style, database style, and documentation style.
- Security concerns.
- Error handling.
- Maintainability.
- UI consistency for frontend work.
- Test coverage when applicable.

Order findings by severity: CRITICAL, HIGH, MEDIUM, LOW. Include file/location, evidence, impact, related requirement when relevant, and a recommended correction. Do not report stylistic preferences as critical issues. State when no findings were identified and disclose verification gaps.

Report convention violations by severity with the relevant canonical section and evidence; distinguish untouched legacy conflicts from violations introduced by the task. Fix convention FAIL results before marking implementation complete unless an exception is explicitly approved and documented.

Reconcile requirements and conventions separately using PASS, PARTIAL, FAIL, or NOT APPLICABLE, and preserve the review evidence in a new report under `docs/reports/`.
