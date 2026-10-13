# Smart Cinema implementation report — Staff invitation activation frontend

## 1. Task information and requested work

- Date: 2026-10-13, Asia/Ho_Chi_Minh.
- Phase/module: Phase 4D, public Staff invitation redemption/password setup frontend.
- Type: implementation against existing backend contract.
- Status: **COMPLETE for authorized Phase 4D frontend scope; all frontend regression PASS.** External onboarding interoperability remains NOT RUN.
- Entry: clean tree at `7cd5b3ba3e2da8aa6f3e4628bb078b682c605f32`, 756 tracked-file hashes captured before edits. User's Phase 4C commit is preserved; no reset/staging/commit/push/deployment.

Implement the public invitation route, confidential fragment capture, exact password/confirmation validation, one explicit POST, truthful password-setup/awaiting-ADMIN feedback and safe failure/uncertainty/navigation. Preserve backend policy, V1–V14, all existing authentication and Phase 4C operations. No live mail or production account redemption is authorized/performed.

## 2. Documents and source reviewed

Read root/frontend AGENTS, [canonical workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), frontend/review workflows, coding/document/UI/traceability rules and [project conventions](../development/project-conventions.md). Installed Next.js 16.3.5 docs reviewed for App Router layouts/pages, server/client boundaries, Script restrictions, Promise searchParams and redirect semantics. No framework/dependency migration.

Reviewed [current handoff](../ai/current-handoff.md), [Phase 4B-1 continuation](2026-10-12_staff-checkin-foundation-implementation-continuation_report.md), [Phase 4B-2 backend report](2026-10-13_staff-qr-checkin-backend-apis_report.md), [Phase 4C frontend report](2026-10-13_staff-checkin-frontend_report.md), [onboarding contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [operational contract v1.0](../api/staff-qr-checkin-contract-v1.0.md), [security DB design](../db/staff-onboarding-checkin-security-design-v1.0.md), [Gmail setup](../development/gmail-smtp-setup.md), relevant [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) and project scope.

Actual backend audit: StaffPasswordSetupController, StaffOnboardingService, StaffInvitationCrypto, StaffInvitationSettings, StaffDeliveryWorker, StaffRequest/StaffSensitiveBody, StaffRequestFilter, StaffExceptionHandler, StaffRepository and existing AuthSecurityConfiguration. Existing invitation/DB tests corroborate canonical encoding, confidential link, public 204/BLOCKED, invalid-token privacy and limiter. Historical backend test results are not fresh frontend-task evidence.

Frontend audit: existing `(auth)` layout, RootLayout/AuthProvider/auth-storage/login, form-field/Button/SurfaceCard/StatusFeedback/StatusBadge/icon/fonts/tokens, Phase 4C workspace and Node/Playwright configuration. Auth/session infrastructure and existing test files remain unchanged.

## 3. Requirements traceability and scope check

The invitation-specific policy is approved by the existing Phase 4B-1 resume/contract and current Phase 4D §§1–14. It has no newly invented BR/FR/UC ID.

| Existing requirement / approval | Reconciliation |
|---|---|
| BRD BR-002/004/055; SRS FR-AUTH-006/007/010 | PASS for approved frontend scope — Preserve backend account/role authority; public password setup never activates or grants STAFF/ADMIN/Manager operations |
| SRS FR-AUTH-002 | PASS for approved frontend scope — Fixed existing login only after ADMIN activation; no automatic login/session rewrite |
| SRS NFR-SEC-001/006 | PASS for approved frontend scope — Exact password sent confidentially; existing backend hashing/validation untouched; frontend mirrors actual rules |
| SRS NFR-SEC-010/011 | PASS for approved frontend scope — No credential logging/persistence/diagnostic echo; generic public errors and uncertainty |
| SRS NFR-SEC-012 | PASS for approved frontend scope — Existing public 10/minute hashed-peer limiter/Retry-After honored; no auto retry |
| SRS NFR-UX-004 | PASS for approved frontend scope — Vietnamese understandable validation/error messages and truthful result presentation |
| Onboarding contract v1.0 / Phase 4D §§3–8 | PASS for approved frontend scope — Public canonical route, private fragment, explicit exact POST, 204 awaiting ADMIN; no public resend/reset/status endpoint invented |
| Phase 4D §§9–12 | PASS for approved frontend scope — Responsive/accessibility, async/privacy, preserved original cases/source, external evidence boundaries |

No business requirement or historical contract/report was rewritten. Backend lifecycle/auth policy, Staff scope, financial/Ticket/QR/admission rules and original expiry/freeze remain untouched. Existing framework route-group exceptions are used; no convention exception needed.

## 4. Actual activation URL / route decision

`application.properties` uses `staff.invitations.activation-base-url=${STAFF_ACTIVATION_BASE_URL:}`. StaffInvitationSettings requires HTTPS, valid host/nonblank path and no userinfo/query/fragment. StaffDeliveryWorker emits exactly `activationBase + "#token=" + rawCanonicalToken`, in both Vietnamese email alternatives; no Host-header construction.

Read-only preflight checked the named variable in current process/user/machine environment and only its line in root/backend/frontend dotenv files, without dumping credentials. **No actual configured local value found**; sanitized `backend/.env.example` supplies an HTTPS example with path **`/staff/activate`**. The example is not a live deployment or a credential.

Implemented expected approved **`/staff/activate`** via `frontend/src/app/(auth)/staff/activate/page.tsx`, inheriting the existing public auth layout. No JWT prerequisite or unauthenticated login redirect. Deployment must separately configure an HTTPS frontend origin and this path; no environment/configuration/SMTP flag was changed. Missing live configuration is an external interoperability dependency, not an endpoint/policy mismatch requiring backend changes.

The dynamic page supplies no-store rendering, no-referrer/noindex metadata. Any query parameter causes a fixed same-origin canonical redirect before activation UI rendering. Values are never used; `token`, `next`, `returnUrl` and external destinations cannot authorize/redirect setup. The browser-only fragment is captured only in the client. This canonical redirect fixes an observed Next router-history retention of a rejected query token.

## 5. Fragment privacy and async state design

Only `#token=` plus one canonical 43-character unpadded base64url encoding of 32 bytes is accepted. Last-character zero padding bits checked; no URL decoding, normalization, trimming, duplicate/extra fields or token-query fallback. A well-formed token remains untrusted until backend redemption; no GET validation/existence probe on mount.

Client layout effect captures the fragment and replaces the URL with the fixed path **before** parsing/form display. Token lives in a private `#token` controller field; state snapshots contain stage/errors/fixed messages only. No hidden token field, server HTML/RSC token prop, navigation echo, localStorage/sessionStorage/cookie write, analytics or third-party script. Root fonts and app assets remain self-hosted as before; Stitch CDN scripts are reference only and not copied.

One explicit valid submission clears the stored token, resets password fields and locks the form synchronously before awaiting the request. No duplicate command gate race, mount POST, speculative redemption, polling or retry. Aborted/stale results belong to a controller generation and cannot overwrite a new fragment/route/identity context.

Real disposal cancels immediately and erases the token next microtask; synchronous React Strict Mode cleanup/reattachment preserves the already captured credential and does not reread the scrubbed fragment. Native popstate/hashchange duplicate handling prevents a new token context from being cleared twice. The inherited fixed #auth-content keyboard skip anchor preserves the current form/credential rather than being interpreted as an invitation. Pagehide, route disposal or authenticated identity changes reset fields/credential and suppress late responses. Existing session is observed for cancellation only, never used as invitation authority or mutated by setup. Same-identity token renewal does not grant/change the invitation.

Reload/Back/Forward after scrub cannot resurrect a credential; reopen a still-valid original invitation. No persistent recovery hint is stored. A navigation interruption after sending may still allow server commit; UI never claims cancellation reversed setup.

## 6. Password validation and UI

Two native uncontrolled fields: “Mật khẩu mới” and “Xác nhận mật khẩu mới”. Each has an accessible visibility toggle, exact label/error association and keyboard focus. Invalid submission focuses the first field; editing clears its stale error. No new password-strength policy, generated password, reset/resend action or truncating maxLength.

Actual backend StaffOnboardingService checks nonblank, Java String length ≥8, UTF-8 bytes ≤72 and malformed UTF-16 rejection through a REPORT encoder. Frontend mirrors it:

- JS `.length` matches Java UTF-16 length; four astral emoji occupy eight units. No stricter code-point minimum is silently imposed.
- Java isBlank whitespace boundary is matched, including its exclusion of non-breaking/figure/narrow space and BOM from blank characters.
- Unpaired surrogates rejected before TextEncoder; UTF-8 byte count checked at **72**, not 72 JS characters.
- Confirmation equals the exact string. Spaces, case, NFC/NFD and emoji are never trimmed/normalized.

Tests cover 72/73 ASCII bytes, 36/37 composed accents, 24/25 decomposed accents, 18/19 emoji, minimum/blank/malformed cases and exact confirmation. Password/token never enter serialized state or application persistence. DOM fields clear at submission and disposal; practical erasure does not claim browser/JS-engine memory zeroization or control user password-manager behavior.

## 7. Exact backend integration and account policy

**POST `/api/v1/staff/password-setups`**, exact confidential `{token,password}` JSON, no query/additional fields. Existing security explicitly `permitAll()` for this POST before the STAFF subtree gate and exempts only the actual endpoint from CSRF. No Authorization/CSRF header/cookie is needed or sent. Existing global auth rules are untouched.

Fetch is same-origin through the existing API rewrite, `credentials:omit`, `cache:no-store`, `referrerPolicy:no-referrer`, `redirect:error`, a caller abort signal and a finite **15-second** deadline. No response body/ProblemDetail is parsed or echoed. No backend endpoint, callback, token generation/digest/expiry/revocation, encryption/mail or account writer changed.

Only **HTTP 204** confirms password setup. Display “Đã thiết lập mật khẩu”, successful setup announcement, “Chờ quản trị viên kích hoạt” and “Bạn chưa thể bắt đầu soát vé”. No ACTIVE claim, automatic session/login, Check-in link/redirect, activation-status polling or invented notification. Safe navigation is the fixed existing `/login`; actual backend Account Status continues to control later login and Staff operations.

## 8. Error and uncertain-result handling

| Evidence | Presentation / next action |
|---|---|
| Missing fragment | Open original invitation; refresh explanation; no form/API request |
| Malformed/noncanonical fragment | Safe format guidance/contact administrator; no token echo/request |
| Client password/confirmation invalid | Field error and first-invalid focus; token stays in private context until valid explicit submission |
| HTTP 400 | Generic unavailable invitation or password rejection; expired/revoked/used/superseded/ineligible are deliberately indistinguishable |
| Other public 4xx | Generic unavailable message; no auth-session mutation, account-existence diagnosis or automatic login redirect |
| 429 | Bounded validated Retry-After seconds/HTTP-date guidance; reopen original invitation after wait, no timer request/retry |
| 5xx / timeout / lost response / redirect / misleading non-204 2xx | “Chưa thể xác nhận kết quả”; request may have completed; contact ADMIN before another setup, no replay |
| Route/session/pagehide interruption | Clear credential, abort, reject late success; if command was sent, preserve uncertain semantics |

Post-submission token/password are not retained for an in-page retry. This frontend privacy/recovery choice does not extend expiry, revoke/mint a server token or create a new business policy. No public status/reconciliation/resend API exists. Contact administrative support through the organization's known channel; no fabricated email/support endpoint or “resend” button.

## 9. Stitch alignment, responsive and accessibility evidence

Live Stitch MCP connected to project `1208499799798658711`; current list has **41 resources**, not a claim of unique completed screens. No dedicated activation/invitation/password design found. Retrieved actual auth/Staff reference screens, downloaded auth HTML/PNG and inspected them. References:

| Screen ID | Actual reference | Applied scope |
|---|---|---|
| `f5904cd07f924d25a0ca844636e93060` | Smart Cinema - Sign In | Centered card/auth hierarchy and amber action |
| `82c296db655348e2a3f14776f936989e` | Smart Cinema - Create Account | Password/confirmation fields and visibility affordances |
| `05a2ad0f96cd4502ba97662d5f0a2e12` | Smart Cinema - Quét mã vé & Xác minh Booking | Existing Staff visual context, previously implemented Phase 4C |

Preserved [.stitch/DESIGN.md](../../.stitch/DESIGN.md), Nocturne tokens/background `#0f131c` and inherited canvas/layered surfaces, amber `#f59e0b`, existing Space Grotesk/Plus Jakarta Sans. Reused public AuthLayout, SurfaceCard/Button/FormField/StatusFeedback/StatusBadge/Icon/focus/reduced-motion rules. No copied CDN HTML/script, unsupported social login/reset/product actions, dependency or unrelated redesign.

Actual browser form/awaiting-ADMIN/uncertain states rendered and screenshots inspected at **390/768/1440px**. Checks: no horizontal document overflow, normal header/content clearance, labeled fields, keyboard Tab/Space/Enter visibility/submission, first-invalid and terminal-heading focus, visible focus, approximately44px controls, reduced-motion media, disabled pending fields/buttons and early credential erasure. Screenshots contain empty inputs or terminal states, not real credentials. Formal screen-reader and physical iOS/Android/browser matrix are NOT RUN.

## 10. Exact verification evidence

Existing Windows frontend setup, `pnpm.cmd`; Edge via `PLAYWRIGHT_CHANNEL=msedge`, one Playwright worker, **zero retries**, no skips/removals/weakened baseline cases. Ignored evidence under `frontend/target/staff-activation-2026-10-13/`: baseline hashes, logs, design exports and fixture screenshots/traces. No real invitation/token/password used.

| Command / check | Result |
|---|---|
| Entry `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` | **PASS**, all exit0 before source edits |
| Entry `pnpm test` | **192/192 PASS**,0 failed/cancelled/skipped/todo,1.528 seconds |
| Final `pnpm exec tsc --noEmit` | **PASS**; query-fix typed async PageProps; build TypeScript also PASS |
| Final `pnpm lint` | **PASS**, exit0; new feature/browser files also independently linted |
| Final `pnpm test` | **215/215 PASS** (all192 +23 new),0 failed/cancelled/skipped/todo,1.913 seconds |
| Final `pnpm build` | **PASS**, exit0, `/staff/activate` dynamic and existing routes retained |
| Focused `pnpm exec playwright test staff-activation.spec.ts --workers=1 --retries=0 --reporter=line` | **38/38 PASS**,27.9 seconds after skip-link fix,0 failures/skips/retries; final full run additionally verifies explicit native POST method |
| Full Playwright same workers/retries/reporter | **347/347 PASS**,11.2 minutes,26 files, exit0; all309 baseline +38 new,0 failures/skips/retries (`full-browser-final.log`) |
| Backend `mvn verify` | **NOT RUN** this frontend-only task; historical Phase4B-2 410/410 not claimed as a current result |
| Diff/hash/document/convention reconciliation | **PASS**:756 entry hashes checked, only package.json/handoff changed among tracked files,754 unchanged;13 intended paths total; HEAD/index preserved; links/UTF-8/diff checks PASS |

Retained failure history: first new unit run **204 PASS/1 failed file** (205 reported nodes); Node strip-only loader rejected a TypeScript constructor parameter property. Replaced it with an ordinary declared field/assignment, without changing compiler/runner settings; all215 then passed. First focused browser run **36 PASS/2 FAIL**: Next history retained a rejected query credential, and paired popstate/hashchange erased a new fragment. Fixed in production with route-local canonical query redirect and event separation. The same privacy/context assertions remain and second focused run passed38/38. Accessibility review then found the inherited fixed #auth-content skip anchor could be mistaken for a new invitation; corrected only that local anchor and added keyboard assertions at all three widths. The first full run was deliberately stopped at last-started case219/347 for this fix; no partial PASS count is inferred. An explicit native method=post attribute prevents credential GET fallback; the final full suite includes its assertion. Local unavailable-backend ECONNREFUSED warnings appear for inherited discovery navigation/webServer startup; these do not certify live backend redemption. No retry masking or source-policy weakening.

Evidence classifications:

| Evidence | Classification |
|---|---|
| Fragment/password/transport/controller/Vietnamese frontend | Automated synthetic unit/HTTP/browser fixtures, real rendered production frontend |
| Existing backend public204/BLOCKED/single-use/expiry/revocation | Actual current source/contract audited; existing backend integration evidence historical |
| Full Customer/Admin/Manager/Phase4C regression | Final results recorded above after suite completion |
| Real HTTPS invitation delivery/click/redemption/ADMIN activation/login | **NOT RUN**; no live configured origin/redemption or recipient action |
| Gmail SMTP delivery/inbox proof | **NOT RUN**, settings/credentials/delivery flags unchanged |
| Neon/production account/business data | **NOT RUN / unchanged by this task** |

## 11. Files created and modified

Created nine frontend files:

- `frontend/src/app/(auth)/staff/activate/page.tsx` — public dynamic metadata/canonical route.
- `frontend/src/features/staff/staff-activation-service.ts` — canonical capture/password validation/public confidential transport.
- `frontend/src/features/staff/staff-activation-controller.ts` — private invitation state, explicit attempt and stale/disposal handling.
- `frontend/src/features/staff/staff-activation-form.tsx` — shared Vietnamese form/results, field cleanup/navigation/context events.
- `frontend/src/features/staff/staff-activation-service.test.ts`, `staff-activation-controller.test.ts` —23 new pure/transport/lifecycle cases.
- `frontend/test/fixtures/staff-activation.ts`, `frontend/test/e2e/helpers/staff-activation.ts`, `frontend/test/e2e/staff-activation.spec.ts` — clearly synthetic fixtures and38 browser cases.

Created [development guide](../development/staff-invitation-activation-frontend.md) and this report. Modified `frontend/package.json` only to append two unit files, plus [current handoff](../ai/current-handoff.md) with an additive verified milestone. No files moved or dependency/lock/configuration changes.

## 12. Requirement reconciliation / preservation

Phase 4D implements the authorized frontend; there is no mandatory API/architecture/routing blocker. Local missing HTTPS/base/SMTP evidence is explicit, and no fixes requiring external authorization were applied. Token authenticity/lifecycle/hash, password persistence, account activation and login authority stay backend-only. Public setup supports unauthenticated and existing Customer/Admin/Manager/Staff sessions without changing them.

Backend/source migration head **V14**, V1–V14, original Phase4C scanner/workspace, Customer/Admin/Manager auth, Payment/Booking/Ticket/QR/expiry/freeze and old unit/browser files remain unchanged. All192 baseline unit and309 baseline Playwright cases are retained. Final hash/index/HEAD evidence PASS:756 baseline files,754 unchanged and exactly package.json/handoff modified; all old source/test files unchanged, empty index, unchanged HEAD.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report and guide. No approved exception or naming migration.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/route naming | PASS | existing `(auth)` exception, lowercase `/staff/activate`, kebab-case feature/test/guide filenames and requested dated report |
| Code/type/import naming | PASS | PascalCase components/types/classes, camelCase helpers, alias imports, existing Node fixture loader pattern |
| Domain/status terminology | PASS | STAFF/Admin/Account/invitation/password setup; local presentation stages are not persisted/backend statuses |
| API naming/DTO | PASS | exact existing public resource and `{token,password}`, no new endpoint or actor/status override |
| Database | NOT APPLICABLE implementation | no DB/migration or server policy changes; V14 preservation verified |
| UI/design/accessibility | PASS for verified scope | existing shared tokens/native forms/focus,390/768/1440 evidence; external AT/device limits explicit |
| Documentation/requirements | PASS | canonical directories/template sections, real IDs and approval references, no BRD/SRS/history rewrite |
| Scope/preservation/Git | PASS |13 intended paths; backend/V1–V14/Phase4C/old tests/auth/env/Stitch preserved; empty index/unchanged HEAD, no commit/push/deployment |

## 13. Limitations and next recommended task

No live HTTPS/Gmail click-through or production redemption occurred. The environment must separately configure an actual HTTPS frontend origin/path, external secrets and authorized mail delivery; `.env.example` is not live proof. Public errors intentionally do not identify expired/revoked/used accounts; no public status endpoint permits recovery of an uncertain password-setup commit. Reopen a valid invitation only after an appropriate wait or administrator verification, rather than automatic replay. Reload loses in-memory token by design. JS must be enabled; initial HTML provides no usable credential/form, with noscript guidance.

Recommended separately authorized next work: legitimate **HTTPS/Gmail end-to-end Staff onboarding verification**, including real invitation delivery/fragment privacy, one password redemption, still BLOCKED, explicit ADMIN activation and ordinary login into current assigned-Cinema workspace. Use an explicitly authorized recipient/account/environment; do not manufacture proof with production data or enable secrets/flags automatically. Admin Staff management frontend remains a separate scoped task after contract/design audit. Final report/handoff and convention verification PASS. Phase 4D is complete and stops here; no next phase, commit/push or deployment started.
