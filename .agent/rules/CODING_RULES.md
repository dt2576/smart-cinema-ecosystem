# Coding Rules

Read [project conventions](../../docs/development/project-conventions.md) for canonical naming, repository placement, and source organization rules. This file adds scoped operating checks, not a separate convention standard.

- Follow the existing architecture and keep changes scoped to the requested task.
- Avoid unrelated refactors, use consistent naming, and avoid duplicate logic.
- Do not hardcode business values that should come from configuration or the backend.
- Do not introduce dependencies without a real need.
- Do not commit generated folders such as `node_modules/`, `.next/`, `build/`, `target/`, or `dist/`.
- Preserve separation between UI, business logic, API, and infrastructure.
- Keep framework-specific automated tests in their conventional locations and preserve test configuration.
