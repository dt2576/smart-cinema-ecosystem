# Smart Cinema frontend instructions

Before every frontend task, follow [root AGENTS.md](../AGENTS.md), including the canonical development workflow and project conventions, then read and follow:

1. [Frontend Workflow](../.agent/workflows/FRONTEND_WORKFLOW.md).
2. [Smart Cinema Stitch Workflow](../.agent/workflows/SMART_CINEMA_STITCH_WORKFLOW.md).
3. [Smart Cinema Agent UI Rules](../.agent/rules/SMART_CINEMA_AGENT_UI_RULES.md).

For UI implementation or review, retrieve the approved current screen through Google Stitch MCP and read [.stitch/DESIGN.md](../.stitch/DESIGN.md). Preserve the approved composition with maximum achievable visual fidelity. Verify actual font loading and computed typography, including Vietnamese glyphs; compare real browser screenshots with the reference at matched viewport/state and correct material differences. Record screen IDs, revision/evidence, justified deviations and separate Functional/Visual acceptance. Do not substitute functional test success for Visual PASS or assert pixel-perfect fidelity without objective evidence.

Preserve existing API integration, backend-authoritative business rules, authentication/authorization and PRIMARY Neon constraints. Do not invent capabilities or persist prototype data. Normal real-app verification uses the established `pnpm dev` PRIMARY configuration; no database substitution or unapproved privileged/business-data mutations.

Apply verification appropriate to the task: documentation-only changes require reference/content checks, not screen redesign or application startup. These instructions do not authorize additional modules. Finish only the requested scope, report and STOP; resume remaining functional modules only on a separate instruction.

The framework-managed Next.js instructions below remain applicable and must be preserved.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
