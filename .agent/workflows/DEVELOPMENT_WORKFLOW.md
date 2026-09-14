# Development Workflow

Every AI coding agent must read this workflow first, then the [canonical project conventions](../../docs/development/project-conventions.md), and applicable rules from `../rules/` and task-specific workflows from this directory. Project requirements remain under `docs/` at the repository root. The convention is a project standard, not a replacement for business requirements.

```text
TASK REQUEST
    -> READ RELEVANT PROJECT DOCUMENTS
    -> READ PROJECT CONVENTIONS
    -> PRE-IMPLEMENTATION TRACEABILITY CHECK
    -> PRE-IMPLEMENTATION CONVENTION CHECK
    -> CONFLICT / SCOPE CHECK
    -> PLAN
    -> IMPLEMENT
    -> VERIFY
    -> POST-IMPLEMENTATION REQUIREMENT CHECK
    -> POST-IMPLEMENTATION CONVENTION CHECK
    -> GENERATE REPORT
    -> docs/reports/
```

## Phase 1: Understand Request

Identify requested work, module, actor, task type, and affected application area. Record NOT APPLICABLE for dimensions that do not apply to structural or documentation tasks.

## Phase 2: Read Relevant Documentation

At minimum consider Project Scope, Business Analysis, BRD, SRS, and System Analysis & Design. When applicable, consult UI/UX, API specifications, database design, and previous reports. Read only documents related to the task; do not reread the entire repository unnecessarily. Load the applicable operating rules, including requirement traceability and document rules.

## Phase 3: Read Project Conventions

Read [docs/development/project-conventions.md](../../docs/development/project-conventions.md) and its [enforcement pointer](../rules/PROJECT_CONVENTIONS.md). This is mandatory before planning, creating/modifying files, naming anything, writing documentation or code, designing APIs/database objects, creating reports, or creating/suggesting commits and branches. If already read during task entry, use that current version; reread if it changes.

## Phase 4: Pre-Implementation Traceability

Identify applicable BR, FR, UC, NFR, and Business Rules. Use only IDs that actually exist and record document version/section. If none applies, explain why rather than inventing an ID.

## Phase 5: Pre-Implementation Convention Check

Before creating or modifying anything, check applicable folder names, filenames, route names, component names, function names, type names, enum/status names, API naming, database naming, and documentation naming against the canonical convention. Record NOT APPLICABLE for irrelevant categories. The implementation plan must follow the convention.

If requested naming conflicts, identify and explain the conflict. Use the canonical convention unless the user explicitly approves changing it; update the canonical document first after that approval. Do not independently redefine conventions in this workflow.

## Phase 6: Conflict / Scope Check

Check the request against MVP scope, UI against SRS, implementation against business rules, and documents for contradictions. If a conflict exists, report it before changing business behavior; do not silently decide it.

Also check convention conflicts, including category-specific exceptions and legacy names. Preserve legacy files unless migration is explicitly requested; report existing conflicts without mass-renaming.

## Phase 7: Plan

State files to create, files to modify or move, the expected result, and the verification approach. Keep the plan proportional to task size.

## Phase 8: Implement

Implement only approved scope, following existing architecture and applicable rules. Do not change requirements to fit implementation.

## Phase 9: Verify

Inspect actual project configuration before choosing commands. Run appropriate checks such as TypeScript, ESLint, build, tests, manual UI validation, or API contract verification. Record actual results; mark skipped checks NOT RUN with a reason. For documentation-only changes, check paths, links, content preservation, and structure as appropriate.

## Phase 10: Post-Implementation Requirement Check

Compare the result again with relevant documentation. Record PASS, PARTIAL, FAIL, or NOT APPLICABLE for each applicable requirement or task constraint, explaining deviations.

## Phase 11: Post-Implementation Convention Check

Review all created/modified files against the canonical convention: new folder names, filenames, code identifiers, routes, imports, APIs, database objects, documentation names, and the report name. Classify each area as PASS, PARTIAL, FAIL, or NOT APPLICABLE and record evidence or an approved exception.

Fix every FAIL before marking the task complete unless the deviation is explicitly approved and documented. Include the report itself in the final check after generating it. PARTIAL must describe the remaining gap and must not conceal a known violation.

## Phase 12: Report

Generate a report under `docs/reports/` using `docs/reports/templates/TASK_REPORT_TEMPLATE.md`.

Follow the canonical convention's report naming and preservation rules. Record actual work, verification, requirement reconciliation, Convention Compliance, existing conflicts, approved exceptions, and limitations. Reports are evidence, not new requirements. Recheck the generated report before completing the task.
