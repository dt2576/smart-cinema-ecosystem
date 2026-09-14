# Document Rules

Follow [project conventions](../../docs/development/project-conventions.md) for document naming, language, terminology, reports, and convention changes. Do not maintain a parallel naming standard here.

- `docs/` contains project truth and design documentation.
- `.agent/` contains AI operating instructions only, not application requirements.
- Reports document evidence and do not replace BRD/SRS.
- Implementation reports must not modify or silently redefine project requirements.
- Never overwrite historical requirement versions. New requirement revisions must use new version numbers.
- Preserve historical reports and documents even if they appear duplicated; report uncertain duplicates.
- During structural moves, preserve document content and versioned filenames. Update internal links only when required, recording any such edits.
- Backlog artifacts are planning documentation, not replacements for BRD/SRS.
