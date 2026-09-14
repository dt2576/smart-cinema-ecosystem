# Requirement Traceability

Project requirements live under `docs/`; this file defines operating instructions only.

Trace applicable work through:

```text
Business Analysis
    -> BRD
    -> SRS
    -> System Analysis & Design
    -> UI/UX / Database / API Design
    -> Implementation
    -> Testing
```

- Before implementation, review related documents. Do not rely only on memory.
- Identify actual BR, FR, UC, NFR, and Business Rule IDs when relevant, with document version and section.
- Never invent requirement IDs. If none applies, record NOT APPLICABLE and explain why.
- Never silently add business behavior.
- Never modify BRD/SRS just to make implementation appear compliant.
- If implementation conflicts with requirements, report the conflict before changing business behavior.
- Preserve historical versions. Use the latest version as the current baseline unless an explicit approval record identifies otherwise; report ambiguity rather than assuming approval.

Document locations: `docs/business-analysis/`, `docs/brd/`, `docs/srs/`, `docs/system-analysis/`, `docs/ui-ux/`, `docs/db/`, and `docs/api/`. Check `docs/project-scope/` for scope boundaries.
