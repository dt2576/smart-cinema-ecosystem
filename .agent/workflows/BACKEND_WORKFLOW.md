# Backend Workflow

Extend [Development Workflow](DEVELOPMENT_WORKFLOW.md); apply [Coding Rules](../rules/CODING_RULES.md) and [Requirement Traceability](../rules/REQUIREMENT_TRACEABILITY.md).

Every backend task MUST validate against [project conventions](../../docs/development/project-conventions.md) before planning or editing and after implementation. Check package, class, method, DTO, REST resource, domain terminology, enum value, database, and environment variable naming. Use the base workflow's result classifications and completion gate; mark inapplicable categories explicitly.

Before implementation, inspect the relevant FR, business rules, and design documents for:

- Authorization.
- Data integrity.
- Transaction behavior.
- Validation.
- Concurrency requirements.
- Audit implications.

Do not choose database locking or concurrency strategy solely from assumptions. Use project design and requirements when available; report missing or conflicting decisions before introducing business behavior.

Inspect existing backend configuration for actual verification commands and preserve conventional test locations. Verify relevant contracts and behavior, reconcile requirements, and generate the report required by the base workflow. A reserved backend folder does not establish a framework or database choice.
