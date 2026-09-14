# Backend Workflow

Extend [Development Workflow](DEVELOPMENT_WORKFLOW.md); apply [Coding Rules](../rules/CODING_RULES.md) and [Requirement Traceability](../rules/REQUIREMENT_TRACEABILITY.md).

Before implementation, inspect the relevant FR, business rules, and design documents for:

- Authorization.
- Data integrity.
- Transaction behavior.
- Validation.
- Concurrency requirements.
- Audit implications.

Do not choose database locking or concurrency strategy solely from assumptions. Use project design and requirements when available; report missing or conflicting decisions before introducing business behavior.

Inspect existing backend configuration for actual verification commands and preserve conventional test locations. Verify relevant contracts and behavior, reconcile requirements, and generate the report required by the base workflow. A reserved backend folder does not establish a framework or database choice.
