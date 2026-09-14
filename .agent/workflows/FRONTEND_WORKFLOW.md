# Frontend Workflow

Extend [Development Workflow](DEVELOPMENT_WORKFLOW.md); apply [UI/UX Rules](../rules/UI_UX_RULES.md), [Coding Rules](../rules/CODING_RULES.md), and [Requirement Traceability](../rules/REQUIREMENT_TRACEABILITY.md).

Before UI implementation:

1. Review relevant SRS FR.
2. Review the related Use Case.
3. Review approved UI/UX references.
4. Confirm the route and actor.
5. Identify required UI states.

Prioritize semantic design tokens, shared UI components, responsive design, accessibility basics, and loading/error/empty states. Do not add unsupported business rules. Keep analysis proportional for pure visual tasks.

Inspect `frontend/package.json` first. After implementation, run `pnpm lint` and `pnpm build` from `frontend/` when applicable, or the project's actual equivalent commands. Do not invent commands. Follow applicable frontend-local instructions. Finish with requirement reconciliation and a report as defined by the base workflow.
