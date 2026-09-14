# Coding Rules

- Follow the existing architecture and keep changes scoped to the requested task.
- Avoid unrelated refactors, use consistent naming, and avoid duplicate logic.
- Do not hardcode business values that should come from configuration or the backend.
- Do not introduce dependencies without a real need.
- Do not commit generated folders such as `node_modules/`, `.next/`, `build/`, `target/`, or `dist/`.
- Preserve separation between UI, business logic, API, and infrastructure.
- Keep `frontend/` and `backend/` directly at the repository root; do not add a `code/` wrapper.
- Keep framework-specific automated tests in their conventional locations and preserve test configuration.
- Use lowercase kebab-case for new folders where appropriate. Preserve existing versioned document filenames unless a rename is necessary.
