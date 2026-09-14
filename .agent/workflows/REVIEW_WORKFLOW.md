# Review Workflow

Use [Development Workflow](DEVELOPMENT_WORKFLOW.md) to review completed implementation against the requested scope and relevant project documents.

Required review categories:

- Requirement compliance and actual requirement traceability.
- Scope compliance.
- Architecture consistency.
- Security concerns.
- Error handling.
- Maintainability.
- UI consistency for frontend work.
- Test coverage when applicable.

Order findings by severity: CRITICAL, HIGH, MEDIUM, LOW. Include file/location, evidence, impact, related requirement when relevant, and a recommended correction. Do not report stylistic preferences as critical issues. State when no findings were identified and disclose verification gaps.

Reconcile requirements using PASS, PARTIAL, FAIL, or NOT APPLICABLE, and preserve the review evidence in a new report under `docs/reports/`.
