# Development Workflow

Every AI coding agent must read this workflow first, then load applicable rules from `../rules/` and task-specific workflows from this directory. Project requirements remain under `docs/` at the repository root.

```text
TASK REQUEST
    -> READ RELEVANT DOCUMENTS
    -> PRE-IMPLEMENTATION TRACEABILITY CHECK
    -> CONFLICT / SCOPE CHECK
    -> IMPLEMENTATION PLAN
    -> IMPLEMENT
    -> VERIFY
    -> POST-IMPLEMENTATION REQUIREMENT CHECK
    -> GENERATE REPORT
    -> docs/reports/
```

## Phase 1: Understand Request

Identify requested work, module, actor, task type, and affected application area. Record NOT APPLICABLE for dimensions that do not apply to structural or documentation tasks.

## Phase 2: Read Relevant Documentation

At minimum consider Project Scope, Business Analysis, BRD, SRS, and System Analysis & Design. When applicable, consult UI/UX, API specifications, database design, and previous reports. Read only documents related to the task; do not reread the entire repository unnecessarily. Load the applicable operating rules, including requirement traceability and document rules.

## Phase 3: Pre-Implementation Traceability

Identify applicable BR, FR, UC, NFR, and Business Rules. Use only IDs that actually exist and record document version/section. If none applies, explain why rather than inventing an ID.

## Phase 4: Conflict / Scope Check

Check the request against MVP scope, UI against SRS, implementation against business rules, and documents for contradictions. If a conflict exists, report it before changing business behavior; do not silently decide it.

## Phase 5: Plan

State files to create, files to modify or move, the expected result, and the verification approach. Keep the plan proportional to task size.

## Phase 6: Implement

Implement only approved scope, following existing architecture and applicable rules. Do not change requirements to fit implementation.

## Phase 7: Verify

Inspect actual project configuration before choosing commands. Run appropriate checks such as TypeScript, ESLint, build, tests, manual UI validation, or API contract verification. Record actual results; mark skipped checks NOT RUN with a reason. For documentation-only changes, check paths, links, content preservation, and structure as appropriate.

## Phase 8: Post-Implementation Requirement Check

Compare the result again with relevant documentation. Record PASS, PARTIAL, FAIL, or NOT APPLICABLE for each applicable requirement or task constraint, explaining deviations.

## Phase 9: Report

Generate a report under `docs/reports/` using `docs/reports/templates/TASK_REPORT_TEMPLATE.md`.

Use `YYYY-MM-DD_<task-name>_report.md`. Never overwrite an existing report; use a distinct task-name suffix for another report on the same day. Record actual work, verification, conflicts, and limitations. Reports are evidence, not new requirements.
