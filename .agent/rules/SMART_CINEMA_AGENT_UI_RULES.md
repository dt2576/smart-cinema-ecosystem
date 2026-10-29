# Smart Cinema — Mandatory Agent UI Rules

Applies to Codex and any implementation agent whenever it creates, edits, reviews or accepts frontend UI for Smart Cinema. Add or link this file from the repository's agent instructions (for example `AGENTS.md`) so agents actually load it.

1. **Stitch is authoritative for appearance.** Always retrieve the approved design through connected Google Stitch MCP before writing frontend UI. Never rely on memory, text summaries or a generic dashboard template when the design exists.
2. **100% fidelity is the target.** Preserve every feasible approved visual detail: hierarchy, placement, typography, spacing, colors, icons, surfaces, controls, empty/loading/error states and responsive composition. Do not independently simplify, restyle or omit designed sections.
3. **Real application contracts are authoritative for behavior.** Existing API, RBAC, validations, data model and PRIMARY Neon data take precedence over fictional prototype content. Do not implement unsupported Stitch demo actions or hardcode sample data.
4. **Font fidelity is mandatory.** Use actual Stitch font families and type scales; verify loaded fonts and browser computed styles, including Vietnamese text. Do not accept a fallback font as a match.
5. **Never self-certify by code review alone.** Compare actual browser screenshots against the exact approved Stitch screen at matched viewport/state. Include evidence and explicitly describe remaining differences.
6. **Separate acceptance gates.** Report Functional PASS/FAIL and Visual PASS/FAIL independently. If material visual differences remain, Visual FAIL; if no usable reference, Visual BLOCKED. Do not call a screen 100% identical without objective evidence.
7. **Respect the current project phase.** Until the user starts the frontend-alignment phase, prioritize approved remaining modules and do not proactively redesign unrelated screens. Once authorized, implement and verify one module at a time, then STOP for review.
8. **Use the primary configuration.** Normal startup and real verification use `pnpm dev` with PRIMARY Neon. No local database substitution. No privileged database changes without explicit approval.
9. **No scope creep.** Visual work must not change backend, API, authorization, Flyway, business rules, or persistent Neon data. No commits/pushes/deployments without request.
10. **Escalate genuine conflicts.** If the approved Stitch reference contradicts the functional contract or is missing, explain the precise issue and request a decision rather than guessing.

Before marking UI complete, verify: [ ] Stitch MCP screen ID recorded; [ ] visual structure matched; [ ] fonts computed and loaded; [ ] screenshot comparison captured; [ ] real data used; [ ] relevant tests passed; [ ] deviations documented; [ ] user review requested.
