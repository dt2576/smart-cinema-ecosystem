# Smart Cinema Phase 1 — Shared UI Foundation

## 1. Task Information

- Task: implement the approved Phase 1 Stitch frontend foundation.
- Started: 2026-10-10; report/verification date: 2026-10-11, Asia/Ho_Chi_Minh.
- Module: shared frontend presentation/navigation, Auth/Profile and existing catalog feedback.
- Type: implementation; no backend/database/provider/deployment work.
- Status: **COMPLETE**; final verification completed on 2026-10-11, approximately 00:06 Asia/Ho_Chi_Minh.
- Entry HEAD: `a3f0ae420eab2bc9b16b2dd679b708fc46d50129`; 660 tracked files; empty staged diff. The preceding implementation assessment was an incoming untracked file and is preserved byte-for-byte.

## 2. Requested Work

Implement shared tokens/primitives, responsive navigation and appropriate role-visible links; adopt them on a small set of existing real screens; preserve native form/button behavior, existing contracts and business logic. Validate actual UI at 390/768/1440px, run requested frontend checks, document exact evidence and stop before Phase 2. No commit or deployment authorized.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), then [project conventions](../development/project-conventions.md); [root instructions](../../AGENTS.md), [frontend instructions](../../frontend/AGENTS.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding/UI/documentation/traceability/convention rules and [report template](templates/TASK_REPORT_TEMPLATE.md).
- Approved [implementation assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md), especially §5.7–5.9; [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [current handoff](../ai/current-handoff.md), latest [Payment regression evidence](2026-10-10_customer-payment-return-status-recovery-frontend_report.md).
- [BRD v1.2](../brd/brd-v1.2.md) Account/RBAC; [SRS v1.2](../srs/srs-v1.2.md) §3.1, §3.2, security and UX; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) Customer Auth/Profile/catalog use cases; existing project scope boundaries from the assessment.
- Installed Next.js documentation: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`, `13-fonts.md`, `05-server-and-client-components.md`. Tailwind 4 token extension and React 19 native ref props retain existing framework conventions. No dependency/framework migration.

### Live Stitch references used

Read-only MCP `get_screen` inspection succeeded for all five references. Current HTML/PNG file resource identities match the previous assessment's downloaded exports; their content/token definitions and screenshots were inspected. No Stitch mutation/generation tool was invoked.

| Reference | Actual screen ID | Use |
|---|---|---|
| Sign In | `f5904cd07f924d25a0ca844636e93060` | Dark auth surface, amber CTA, fields and visual hierarchy |
| Create Account | `82c296db655348e2a3f14776f936989e` | Related registration presentation; actual validation retained |
| My Profile | `85bfbbac541b4455be5bd383218436e6` | Surface hierarchy, profile summary and account badges |
| Authenticated Account Menu | `14dc6c1445a747b88c866508463e9879` | Account disclosure appearance; real role-visible destinations retained |
| New Booking Summary | `66beffb2e06e49d3b103533d25f5c54d` | Shared palette/type/spacing token definitions only; Booking view not implemented in Phase 1 |

English copy, simulated states, biometric/member/verified claims, unsupported password recovery and financial details in Stitch are not new product capabilities. Existing Vietnamese copy/native behavior was retained. Asset availability does not establish generation-job completion.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-001; FR-AUTH-001/002/003/004/005; UC-CUS-001/002/003/025 | Customer registration/login/logout/renewal/profile | Yes | Presentation adapted; handlers/contracts unchanged; existing Auth regression preserved |
| BR-002–BR-004; FR-AUTH-007/008/009; NFR-SEC-002/003 | Role, ownership and scope authority | Yes | Customer-only menu links restricted; cached role cannot authorize Admin; no new operational routes |
| FR-MOVIE-001/003; UC-CUS-004/005 | Existing catalog/loading/empty/error presentation | Yes | Feedback and skeleton reuse only; filtering/API behavior unchanged |
| NFR-UX-004; NFR-SEC-011 | Understandable, safe errors | Yes | Shared feedback receives already-selected safe messages; internal fixture error not displayed |
| BR-035/038/039; FR-PAYMENT-006/012; NFR-UX-002 | Server money/payment/time authority | Preservation boundary | Payment/Booking/Seat services and state machines unchanged; full existing browser cases retained |
| Assessment Phase 1; DESIGN approved direction | Tokens, typography, reusable surfaces, responsive/focus presentation | Yes, design/task authority | Implemented; no invented business requirement ID |
| Staff/Manager functional expansion | Out of Phase 1 | NOT APPLICABLE | No routes, backend API, assignment or Check-in implementation |

## 5. Implementation Summary

### Tokens and components

The Nocturne palette and configured Plus Jakarta Sans/Space Grotesk fonts remain unchanged. `globals.css` extends the existing Tailwind 4 `@theme inline` with:

- control/card radius: 8/16px, following approved DESIGN narrative;
- shared header/control dimensions: 80/44px;
- mobile gutter 16px and section spacing 40px; container gutters 16/24/40px at mobile/tablet/desktop;
- body 15px/22px, supporting text 13px/18px, labels 14px/20px and heading tokens 22px/30px and 28px/36px;
- `page-container`, `page-content`, `surface-card`, `form-input` presentation classes. Fixed-header clearance is header height + 32px; form-input focus/invalid/readonly styles use existing semantic colors.

The generated tonal palette is preserved: CTA `#F59E0B`, hover `#D97706`, accent `#FFC174`, background `#0F131C`, canvas `#0A0E16`, panel `#1C2028`, low/high surfaces `#181C24/#262A33`, text `#DFE2EE`, muted `#D8C3AD`, success `#4EDEA3`, error `#FFB4AB`, outline `#534434`. Narrative versus generated token provenance remains recorded in DESIGN; no arbitrary new palette is introduced.

| Primitive | Actual reuse | Authority/semantics |
|---|---|---|
| `SurfaceCard` | Login/Register cards, Profile summary/form/privacy/loading and shared feedback | Section/div surface, optional subtle tone/padding; native HTML attributes; no business logic |
| `FormField` | Login/Register/Profile editable and protected fields | Explicit label/input IDs and error/help IDs; caller retains native input, aria linkage, validation and handlers |
| `StatusBadge` | Profile role/account status | Presentation tone passed by feature; no domain state inference or automatic live announcements |
| `StatusFeedback` | Auth status, Profile loading/error/save feedback, catalog empty/error | Compact/full presentation, caller-selected safe message/role/actions; no automatic requests or raw-error interpretation |
| `Skeleton` | Profile loading and Movie loading | Decorative/aria-hidden; pulse only under `prefers-reduced-motion: no-preference` |
| Existing `Button` | Existing callers preserved | Consistent semantic radius/label/min-height; native type override/disabled/events preserved; React 19 ref prop supports menu focus restoration |

Global keyboard focus remains a 2px amber outline; inputs use a 2px offset. Reduced-motion rules are retained, and skeleton animation is explicitly absent in reduced-motion mode. Primitives do not import Auth/Booking/Payment state, fetch data, issue credentials or select outcomes.

### Navigation and incremental adoption

- Shared SiteHeader uses the same container/header dimensions as discovery/auth/profile framing. Discovery main has a focusable skip-link target and consistent header clearance.
- Customer profile links appear only for `CUSTOMER` in account/mobile menus. Shared “Vé của tôi” entries are hidden from authenticated ADMIN/STAFF/MANAGER, including the Home footer. Guest preview entry and Customer destination remain unchanged.
- Admin entry remains `/admin`, including mobile navigation; its backend identity/access check remains unchanged. No Staff/Manager route or placeholder destination is added. Cached roles govern display convenience only.
- Mobile navigation has a bounded, scrollable dropdown below the header. Escape closes it and focuses its toggle. Account Escape closes only the account disclosure and restores summary focus, including when mobile navigation is also open. Existing link-close/logout behavior remains.
- Account summary/header-brand controls have 44px minimum dimensions where appropriate; long account display data is bounded. Auth/Profile gain skip links/focusable main targets.
- Only Login/Register/Profile and existing reusable catalog feedback/loading presenters adopt the new primitives. Home changes only its footer's role visibility. Admin feature screens, discovery forms, Booking, Seat Holds, Concessions, Promotion and Payment views are not redesigned.

Existing Login/Register `handleSubmit`, Register field-error clearing, Profile `validate`/`saveProfile`/`cancelEditing` are text-identical after line-ending normalization; API/Auth context/storage/resume files are unchanged. No new production mock data or dependency is added.

## 6. Files Created

| File | Purpose |
|---|---|
| [surface-card.tsx](../../frontend/src/components/ui/surface-card.tsx) | Shared surfaces |
| [form-field.tsx](../../frontend/src/components/ui/form-field.tsx) | Accessible field presentation |
| [status-badge.tsx](../../frontend/src/components/ui/status-badge.tsx) | Caller-owned status styling |
| [status-feedback.tsx](../../frontend/src/components/ui/status-feedback.tsx) | Shared safe feedback |
| [skeleton.tsx](../../frontend/src/components/ui/skeleton.tsx) | Reduced-motion loading placeholders |
| [shared-ui-foundation.spec.ts](../../frontend/test/e2e/shared-ui-foundation.spec.ts) | 19 fixture-labeled browser cases; no baseline tests changed |
| `docs/reports/2026-10-11_shared-ui-foundation_report.md` | This report |

Ignored runtime evidence is under `frontend/target/shared-ui-foundation-2026-10-10/`: baseline/preservation manifests, command logs and baseline/final screenshot archives. It is not application source or staged output.

## 7. Files Modified

| File | Scoped change |
|---|---|
| [globals.css](../../frontend/src/app/globals.css) | Semantic foundation tokens/classes/focus |
| [button.tsx](../../frontend/src/components/ui/button.tsx) | Existing native Button presentation/ref props |
| [site-header.tsx](../../frontend/src/components/layout/site-header.tsx) | Responsive framing, role-visible navigation, Escape/focus |
| [customer-discovery-layout.tsx](../../frontend/src/components/layout/customer-discovery-layout.tsx) | Shared content container/clearance and skip target |
| [account menu](../../frontend/src/features/auth/customer-account-menu.tsx) | Customer-only profile link, sizing/bounds, Escape containment |
| [Auth layout](<../../frontend/src/app/(auth)/layout.tsx>) | Shared container/header and skip target |
| [Login page](<../../frontend/src/app/(auth)/login/page.tsx>), [Register page](<../../frontend/src/app/(auth)/register/page.tsx>) | Shared surface adoption only; URLs unchanged |
| [login-form.tsx](../../frontend/src/features/auth/login-form.tsx), [register-form.tsx](../../frontend/src/features/auth/register-form.tsx) | Shared fields/feedback/input styling; handlers unchanged |
| [profile-screen.tsx](../../frontend/src/features/auth/profile-screen.tsx) | Shared surfaces/fields/badges/loading/feedback/frame; protected inputs retain readonly |
| [movie-feedback.tsx](../../frontend/src/features/movie/movie-feedback.tsx) | Existing empty/error/loading presenters consume shared primitives |
| [home-screen.tsx](../../frontend/src/features/home/home-screen.tsx) | Existing My Bookings footer link visibility only |

Total: **13 existing frontend files modified**, five primitives + one test file + this report created. Existing tests, test configuration, packages/lockfile, font configuration, API contracts, backend and migrations are unchanged.

Local artifact maintenance: the initial baseline lint found nine `no-require-imports` errors in three ignored audit helper `.cjs` files from earlier tasks. Their content was preserved with verified identical hashes by renaming:

- `frontend/target/stitch-frontend-implementation-assessment-2026-10-10/read-assets.cjs` → same path plus `.txt`;
- `frontend/target/stitch-ui-coverage-audit-2026-10-10/audit-report-check.cjs` → same path plus `.txt`;
- `frontend/target/stitch-ui-coverage-audit-2026-10-10/download-originals.cjs` → same path plus `.txt`.

These are generated reference scripts, not tracked application/test files. No rule/configuration was relaxed, no source error was suppressed, and no existing content was deleted. Baseline lint failures remain in the logs.

## 8. Verification

### Actual baseline before application edits

| Command / check | Actual result |
|---|---|
| Git/baseline file hash capture | PASS: 660 tracked + incoming assessment preserved; staged diff empty |
| `pnpm exec tsc --noEmit` | PASS, exit 0 |
| `pnpm lint` | FAIL initially: 9 errors, all in the three ignored audit helpers described above; application source not implicated |
| `pnpm test` | PASS: 138/138, 0 failures/cancelled/skipped/todo |
| `pnpm build` | PASS, exit 0 |
| `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test customer-final-qa.spec.ts` | PASS: 7/7, 43.0s; existing Auth/Profile/full Customer journey; 34 baseline screenshots retained |

### Implementation/final-source checks

Commands run from `frontend/` with existing Playwright configuration: production `pnpm start --port 3100`, one worker, installed Edge channel via process-local `PLAYWRIGHT_CHANNEL=msedge`, no configured retries/skips or config changes.

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS, exit 0, on final application source/test types |
| `pnpm lint` | PASS, exit 0, on final source; archived helper content retained; no rule relaxation |
| `pnpm test` | PASS: **138/138**, 0 failures/cancelled/skipped/todo |
| `pnpm build` | PASS, exit 0; production App Router build; route destinations unchanged |
| Focused `pnpm exec playwright test shared-ui-foundation.spec.ts customer-final-qa.spec.ts` | PASS: **26/26**, 1.0m, prior to the final Escape containment/feedback padding refinement; final full run includes these cases again |
| Full `pnpm exec playwright test` | PASS: **238/238**, **9.6m**, exit 0; all 219 existing cases + 19 new cases; 0 failed/skipped/retried |
| Preservation / handler comparison | PASS: no protected backend/domain/API/test/config file changed; named Auth/Profile handlers identical; incoming assessment/HEAD/staged diff unchanged |
| Runtime visual inspection | PASS: final screenshots rechecked for Auth/Profile, Profile loading and catalog error at 390/768/1440; 30 new screenshots archived with source paths and SHA-256 manifest |
| Backend `mvn verify` | NOT RUN: backend untouched; not required by this Phase 1 task. Previous 294-test result is historical, not rerun evidence |
| Neon / actual VNPAY / real PAID or issuance | NOT RUN: no database/provider activity; browser fixtures do not establish live external financial interoperability |

### Responsive/accessibility evidence

New browser cases use actual rendered production pages with explicitly labeled HTTP fixtures. At **390, 768 and 1440px**, they cover Login/Register label/error/help linkage and keyboard focus; Profile loading/reduced motion/protected fields/edit errors/cancel; catalog skeleton/empty/error presentation; document `lang=vi`, horizontal overflow and header/heading geometry; visible form/control sizing. Additional tests cover all four authenticated role menus on desktop/mobile, nested disclosures and Escape focus, in-flight disabled login/`aria-busy`, native keyboard submission/login resume to the approved Payment return path, and backend Admin denial despite cached Admin role.

Representative viewed screenshots include `login-1440-focus.png`, `register-390.png`, `register-768.png`, and `profile-390.png`/`profile-768.png`/`profile-1440.png`, plus Profile loading and catalog error at each viewport. These final-run images are archived in `frontend/target/shared-ui-foundation-2026-10-10/final-screenshots/`, with `manifest.json` recording the original test output paths and hashes. Existing Customer QA preserves API registration retries, login errors, Profile save/retry/readonly/logout/renewal, and whole Booking preview boundaries. All existing real/preview Customer and Admin browser cases pass. No manual browser change creates a financial state.

The mobile dropdown intentionally overlays page content while open; its fixed header remains 80px and underlying closed-menu content has consistent clearance. It is bounded/scrollable and Escape-dismissable. No claim is made that all unrelated feature pages were redesigned or that this is a comprehensive WCAG/screen-reader certification.

## 9. Requirement Reconciliation

| Item | Result | Evidence |
|---|---|---|
| Shared foundation and real usage | PASS | All five primitives adopted; existing palette/fonts/native semantics retained |
| Role-visible shared navigation | PASS | Customer-only links corrected; Admin entry retained; backend guard unchanged; no Staff/Manager routes |
| Responsive/keyboard/feedback | PASS | Three viewports, labels/errors/focus/touch/loading/reduced motion; final full suite and actual screenshots inspected |
| Existing functional preservation | PASS | 238/238 full browser cases; 138/138 unit tests; source/handler preservation PASS |
| Backend/domain/provider exclusions | PASS | Protected file hash checks; no DB/backend/merchant/deployment changes |
| Stop at Phase 1 | PASS | No Phase 2 Booking/Payment redesign, no commit/deploy |

## 10. Deviations / Conflicts

Two existing auth route entry files were included to adopt the shared card, and Home footer was included to complete the same role-visibility correction as the header. These are small, necessary extensions to the assessment's candidate list, authorized by incremental real-screen/shared navigation adoption. They do not change URLs or feature behavior.

The assessment lists possible Admin-shell edits, but no Admin-shell source change was needed. Existing guard/context remains intact. Original/new Stitch sample workflows are not copied into production. DESIGN narrative 8/16px radii govern the new semantic classes; generated 4/8/12px token definitions were inspected and their difference preserved as provenance rather than silently redefining DESIGN. No business requirement or convention exception was changed.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Primitives in `components/ui`, shared layout in existing layout folder; kebab-case source; dated report convention |
| Code naming/imports | PASS | PascalCase components, camelCase props/functions, `@/` source imports; no domain imports in generic UI |
| Routes | PASS | Existing App Router route patterns/destinations preserved; no unsupported operator destination |
| Domain/status/API | PASS | No status/DTO/money/time/QR/authorization contract change |
| Database | NOT APPLICABLE to edits | Backend/migration directory unchanged; V12 remains source head |
| Documentation | PASS | All 12 template sections and Convention Compliance present; real IDs verified against BRD/SRS; 35 local links resolve; no trailing whitespace or invalid UTF-8 replacement characters |
| Preservation | PASS | Incoming assessment, historical docs, existing tests, API/state files, HEAD and staged diff preserved |

## 11. Known Limitations

- This phase is a shared foundation and bounded adoption, not pixel-identical reconstruction of every Stitch screen. Auth/Profile preserve supported fields and Vietnamese copy; no biometric, member, recovery, refund or financial verification capability is introduced.
- Screenshots/fixtures verify browser presentation and existing request boundaries, not live merchant/account/database interoperability. Backend/provider tests were not run.
- Guest/My Bookings preview navigation remains intentionally available. Preview history/QR and existing Home sample content are not converted to real APIs; the assessment's history/Staff/Manager API blockers remain.
- User role data filters navigation only. Direct route access still requires existing backend authorization; no frontend role check becomes financial/security authority.
- All responsive screenshots/assertions are scoped to tested screens/states. No comprehensive assistive-technology/device-camera audit or unrelated-page redesign is claimed.

## 12. Next Recommended Step

After approval, implement **Phase 2 — Customer Booking and Payment visual adaptation** on existing owned Summary and fixed VNPAY return/status views using the assessment's N01–N04 references. Keep existing validators, hooks, exact string amounts/IDs, first-attempt freeze, original expiry, known-attempt recovery and backend financial authority unchanged. Audit mobile layouts and remove unsupported financial/Ticket promises from the artwork.

**STOP after Phase 1 verification/report. No automatic Phase 2, commit or deployment.**
