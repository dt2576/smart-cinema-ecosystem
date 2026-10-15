# Phase 4E — Complete Local Staff Onboarding & Activation E2E

## 1. Task Information

- Date: **2026-10-15**, Asia/Saigon. Scope: local test infrastructure and real browser/backend verification.
- Outcome: **PHASE 4E ONBOARDING E2E VERIFIED** for invitation → password setup → ADMIN activation → STAFF login → authorization → ADMIN block.
- Final execution **13/13 PASS**,0 failures; cumulative journal19 PASS executions/3 disclosed earlier infrastructure/harness failures.19 safe workflow screenshots. No fixture Staff responses or session/JWT injection.
- Positive Ticket Check-in is **NOT RUN**, explicitly permitted when legitimate issued Booking/Ticket prerequisites are unavailable. No PAID/Ticket/QR data manufactured.
- Existing ADMIN1, Cinema1, Staff2 and future assignment1 reused; no account recreation, database reset, Neon, external SMTP, production-source modification, commit/push/deployment.

## 2. Requested Work and Reviewed Context

Complete the remaining real onboarding using local Mailpit and HTTPS, preserve backend issuance/setup/status/authorization authority, safely test single use and account/scope restrictions, and retain existing synthetic data.

Read [AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), applicable Backend/Frontend workflows and requirement/document/coding rules, [project conventions](../development/project-conventions.md), [report template](templates/TASK_REPORT_TEMPLATE.md), frontend-local AGENTS and installed Next16.3.5 CLI documentation.

Reviewed [previous real integration](2026-10-15_admin-staff-management-real-local-integration_report.md), [environment readiness](2026-10-15_isolated-local-postgresql-test-environment_report.md), [local environment guide](../development/local-test-environment.md), [Staff foundation](../development/staff-onboarding-and-checkin-foundation.md), [SMTP guide](../development/gmail-smtp-setup.md), [administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [operational contract v1.0](../api/staff-qr-checkin-contract-v1.0.md), relevant BRD v1.2/SRS v1.2 requirements.

Actual StaffDeliveryWorker/InvitationSettings/Crypto/Repository/OnboardingService/PasswordSetupController/AdminStaffController, LoginService, AuthSecurityConfiguration, StaffAdmissionService/Repository and V13/V14 authorization/lifecycle were inspected. Existing [activation form](../../frontend/src/features/staff/staff-activation-form.tsx), activation controller/service, Login, Admin Staff dialogs and Check-in workspace were inspected. **The real `/staff/activate` UI already exists** at `frontend/src/app/(auth)/staff/activate/page.tsx`; older backend-phase “later frontend” notes are historical. No Stitch audit or new onboarding screen.

## 3. Requirements Traceability

| Existing requirement/source | Actual evidence | Result |
|---|---|---|
| BRD v1.2 BR-002/004; SRS FR-AUTH-002/006/007 | Real login, BLOCKED401, ACTIVE login200, STAFF denied ADMIN403, current blocked actor denied despite issued JWT | PASS tested ADMIN/STAFF slice |
| BRD BR-003/053/055; SRS FR-AUTH-008, FR-ORG-005 | Future-effective assignment excluded by server; scope403; original assignment retained | PASS; no Manager or HR workflow |
| SRS NFR-SEC-001/002/006 | Existing normal password redemption/BCrypt, authentication and validation; no hash/state bypass | PASS exercised flow; production implementation unchanged |
| SRS NFR-SEC-005/010/011 | Local HTTPS, narrow certificate trust, fragment scrubbing, safe artifacts/errors, private config/credentials | PASS local test boundary; no public TLS deployment certification |
| SRS NFR-UX-004 | Vietnamese setup/awaiting activation/rejected token and blocked-access UI; responsive accessible dialogs | PASS tested views |
| Staff administration contract v1.0 | Public204 leaves BLOCKED, token reuse400, separate Activate/Block200, truthful SENT, retained history | PASS |
| Explicit task §§2–10 | Dedicated DB, local Mailpit, existing real UI/APIs, no replay or external mail/provider | PASS final tooling/flow; corrected tooling issues disclosed below |

No invented BR/FR/UC/NFR, status, permission or API. Actual positive Check-in/issuance requirements remain outside the verified evidence.

## 4. Isolation and Local Infrastructure

Ran the existing `local-test-environment.ps1 -Action Verify` before infrastructure/config preparation and every test phase. Actual JDBC confirms **127.0.0.1:5432/smartcinema_phase4e_test**, owner/migrator `smartcinema_phase4e_migrator`, runtime `smartcinema_phase4e_app`, read-only preflight, V14/14successful/0failed, five Staff tables, zero runtime memberships and preserved pre-existing role attributes/memberships. All PostgreSQL operations in this task used that dedicated database, including catalogue verification.

Created ignored ACL-restricted **`.env.local-test-onboarding`**, derived from the unchanged `.env.local-test`. It differs only in `spring.profiles.active=local-test,local-onboarding` and `staff.invitations.delivery-enabled=true`; a full property/key comparison rejects other differences. Whole ConfigData location is replaced, import blank, datasource/Flyway fixed loopback; no `backend/.env` import/fallback. Existing remote `.env`, local base/admin secrets and frontend env contents preserved byte-for-byte.

The test-only source launcher adds `@EnableScheduling` under `local-onboarding`, outside production source/build. This is needed because the existing scheduler-enabling SeatHoldCleanup configuration is excluded when cleanup=false. SeatHoldCleanup remains absent; VNPAY remains disabled and its existing scheduled guard returns before provider/database work. The real StaffDeliveryWorker performs delivery, not a replacement sender or test-only financial authority. Existing compiled backend classes/cached dependencies are reused, with normal Flyway/Hibernate validation at startup; no migration/manual repair.

### Mailpit

Docker executable exists but daemon was unavailable; reused the installed portable Mailpit **v1.31.5** under `backend/target/qa/staff-foundation-continuation-2026-10-12/mailpit/`. No installation or binary download. Cached Windows ZIP SHA-256 **9637e21c02b33185fe69268ba05317152a5d8ac7877115e8a70e29b7e199e8dc** matches the official [release asset digest](https://api.github.com/repos/axllent/mailpit/releases/tags/v1.31.5); executable bytes match the EXE inside that verified archive. Version checked with `version --no-release-check`.

Started SMTP **127.0.0.1:1027**, HTTP/UI **127.0.0.1:8027**; actual listeners verified. Flags pin bind addresses, reject non-`@example.test` recipients, disable reverse DNS/version checking, restrict allowed hosts and enable quiet logging. No relay/forwarding/webhook configuration; inherited `MP_` overrides rejected. See official [runtime options](https://mailpit.axllent.org/docs/configuration/runtime-options/).

Preflight verifies Mailpit HTTP readyz200 and actual SMTP220 Mailpit banner **before enabling application delivery**. Effective Spring SMTP is127.0.0.1:1027, blank credentials/auth off, explicitly allowed local capture. No Gmail credentials, external SMTP/provider/Neon connection. External reads were limited to public Mailpit documentation/release metadata, not mail delivery. Mailpit's private SQLite capture is inside an ignored ACL-restricted directory; no MIME/body/token export into evidence.

### HTTPS and browser trust

Created a two-day self-signed development leaf certificate using installed OpenSSL3.5.6, IP SAN127.0.0.1, with key/cert only in the ignored private directory. No OS/browser trust-store installation. Local proxy **127.0.0.1:8443 → 127.0.0.1:3000**, TLS≥1.2, fixed upstream, no request logging. Real `/api/v1` rewrite continues to backend127.0.0.1:8080.

Node strict TLS validation succeeded with **rejectUnauthorized=true**, explicit trust of that exact local certificate, correct IP SAN and socket authorized. Automated Edge uses only the certificate's exact SPKI allowlist exception in its temporary process; no global `ignoreHTTPSErrors`, `--ignore-certificate-errors` or TLS environment bypass. This is development trust, not a publicly trusted certificate.

For manual inspection, first open `https://127.0.0.1:8443/staff/activate` **without an invitation fragment**, inspect the certificate CN/IP SAN127.0.0.1 and compare the public certificate in the private test folder. If the browser shows an authority warning, use **Advanced → Proceed to127.0.0.1** only after confirming that local certificate and only if browser policy permits. If policy disallows proceeding, an operator must separately approve manual development-certificate trust; no installation was performed. Do not disable certificate verification globally or paste an invitation into screenshots/chat.

## 5. Real Capture, Setup and Token Lifecycle

ADMIN authenticated through the actual frontend Login. An untrusted previous test ID hint was validated by current owned server reads; Staff2 was BLOCKED/setupfalse, email matched the approved synthetic identity, assignment1 matched original server state. A generated64-hex test password is retained only in ignored ACL-restricted `.env.local-test-staff`; ADMIN UI never receives/provides it.

Triggered **one** explicit Reissue dialog POST `{}` to `/api/v1/admin/staff/2/invitations`200. Mailpit initially contained0 messages and captured **exactly1**. Read-only bounded polling (max20×1.5s) verified server SENT/attempts1. Privately inspected the received message via real Mailpit API: one correct synthetic recipient; exact subject `Smart Cinema — Lời mời kích hoạt tài khoản nhân viên`; text/HTML share `https://127.0.0.1:8443/staff/activate` with one canonical fragment credential. Raw link/token/MIME never serialized/logged/screenshot. Token obtained only from legitimate SMTP capture, never database decryption.

The real browser scrubbed the fragment, retained no token in DOM/storage/history, rendered the existing public form, and sent no setup on entry or invalid empty submission. Both public requests had no query, Authorization, cookie or Referer. Valid explicit password submission returned **204**, GET confirmed **passwordSetupCompleted=true and status=BLOCKED**, UI truthfully awaited ADMIN activation. Explicitly reopening that same captured link and resubmitting once returned **400** with safe unavailable UI; this is a deliberate single-use negative test, not an automatic retry. No additional invitation minted.

Final read-only metadata: **3 invitations**,2revoked (prior history),1consumed (this delivered invitation), all3 exact24h intervals; queued0, total delivery attempts1. StaffAccount delivery remains **SENT**, correctly recording past SMTP acceptance even after later blocking. No external inbox receipt claim.

## 6. ADMIN Activation, STAFF Authorization and Blocking

| Workflow / real contract | Observed result | Classification |
|---|---|---|
| Before setup, ADMIN Activate control | Disabled | PASS |
| Password configured but not ADMIN activated: actual STAFF Login POST `/api/v1/auth/tokens` |401 | PASS; setup does not activate/login |
| Refreshed ADMIN Detail after setup | Activate enabled; Reissue disabled | PASS |
| Activate confirmation → PUT `/api/v1/admin/staff/2/status` `{status:ACTIVE}` |200; owned GET ACTIVE/setuptrue | PASS |
| Actual STAFF frontend Login, no session injection |200 STAFF; `/staff/check-in` workspace | PASS |
| STAFF JWT → GET `/api/v1/admin/staff?page=0&size=20` |403 | PASS actual RBAC |
| ACTIVE STAFF → GET `/api/v1/staff/cinema-assignments` |200, assignments[] empty, serverTime supplied | PASS; future assignment gives no premature scope |
| STAFF Booking GET with future Cinema1 and explicitly absent canonical sentinel Booking ID |403 before resource lookup | PASS scope boundary; no real Booking claimed |
| Block confirmation → PUT Staff status `{status:BLOCKED}` |200; owned GET BLOCKED/setuptrue | PASS actual ACTIVE→BLOCKED transition |
| Owned assignment GET after block | Exact same single assignment/ID/type/status/original time as before | PASS history preservation |
| Already-issued STAFF JWT → operational assignment GET |403 in API and real workspace recheck | PASS current account authorization; not a claim of cryptographic JWT revocation |
| Fresh STAFF frontend Login after block |401 | PASS |

Existing assignment1 remains ACTIVE STAFF/Cinema1 with immutable **2026-10-21T18:24:00Z**. Backend excludes it until effective; UI shows no operational Cinema. No time modification, second assignment or new Cinema/account. Final actors: ADMIN1 ACTIVE, Staff2 BLOCKED/setuptrue; user count2/Cinema count1/assignment count1. Expected invitation/onboarding/status/audit/rate/session records were changed only through the actual supported application mechanisms.

**Positive Check-in: NOT RUN.** No legitimate issued Booking/Ticket/QR fixture was available for this remaining onboarding task. No Payment SUCCESS/Booking PAID/Ticket state manufactured or admission rule bypassed. Authorization negatives do not prove successful Ticket admission.

## 7. Browser, Responsive and Accessibility Evidence

Real Edge/Playwright, running Next/Spring/PostgreSQL and real SMTP capture. No `route.fulfill`, mocked Staff API, manually fabricated JWT, storage session injection, HAR or trace.19 workflow screenshots: activation empty form and setup success at390/768/1440; reused-token error; ADMIN Activate/Block dialogs at all three widths; active/final Staff Detail; STAFF empty effective scope at all widths; blocked existing session.

Verified Vietnamese copy, associated password labels, empty validation/first-error focus, keyboard traversal, focused completion heading, native dialog Tab/Shift+Tab containment, Escape and trigger-focus restoration, explicit commands/disabled eligibility and document overflow at390/768/1440. Actual rendered screenshots inspected. Native Cinema placeholder truncates in the narrow390px selector but has an associated readable label and safe empty-state explanation; non-blocking existing polish. Dev indicator is visible; no physical-device/screen-reader certification.

Selected evidence: [mobile form](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/activation-empty-form-390.png), [awaiting ADMIN](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/setup-success-awaiting-admin-1440.png), [token reuse rejection](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/consumed-invitation-rejected.png), [mobile Activate](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/activate-dialog-390.png), [tablet Block](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/block-dialog-768.png), [future scope excluded](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/staff-no-effective-scope-390.png), [blocked existing session](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/blocked-existing-staff-session.png).

## 8. Actual Tests, Failures and Corrections

| Check | Actual result |
|---|---|
| Base Verify / onboarding Verify | PASS dedicated read-only JDBC, V14/14success0fail, actual loopback Mailpit banners/listeners |
| Onboarding app startup | PASS Spring4.1.1 startup8.181s; normal Flyway/Hibernate validation; no migration |
| Initial app launcher attempt | FAIL before application startup: compared literal Spring placeholders to resolved values; corrected test-only initializer to resolve approved placeholders before comparing effective configuration |
| Initial browser `run` |0PASS/1FAIL: certificate validated but proxy lacked Next dev WebSocket forwarding, so hydration never completed; no mutation |
| Explicit `resume-preflight` |3PASS/1FAIL: legitimate reissue/capture completed; harness treated same-document fragment `goto` null result as HTTP response; no password request |
| First explicit `resume-delivered` |3PASS/1FAIL: same nullable-navigation harness assertion; delivered message reused, no resend/setup mutation |
| Final explicit `resume-delivered` |**13PASS/0FAIL**, exit0; complete remaining real workflow |
| Cumulative journal |**19PASS executions,3 historical FAIL executions**, not19 independent scenarios;55 sanitized backend API response records |
| Mutation history | One reissue200; one password setup204; one deliberate consumed-token setup400; one Activate200; one Block200. No automatic HTTP replay or repeated successful mutation |
| Node syntax checks, focused ESLint of both new MJS scripts | PASS exit0/0 warnings |
| PowerShell parser | PASS0 errors |
| `pnpm exec tsc --noEmit` | PASS exit0 |
| Unit/fixture Playwright/full build/backend regression | NOT RUN: no application source changes; user requested remaining real E2E, not repeated fixture-only tests. Prior230unit/366browser/410backend counts are historical |

Local proxy corrections: WebSocket upgrade forwarding restored actual Next dev hydration; inspection also found dev activation responses omitted no-store, so proxy now enforces `Cache-Control:no-store` and `Referrer-Policy:no-referrer` specifically on `/staff/activate`. Existing production dynamic route was not modified or re-certified. Harness now accepts Playwright's documented same-document null response while separately asserting the initial real200/no-store document and ready form/privacy state. Guards allow recovery only before any password attempt and with confirmed existing captured delivery; reissue is skipped.

No confirmed production business defect found. Mailpit version probes initially used unsupported flags; corrected to its installed CLI help without update/download. Three diagnostic screenshots initially used an encoded Windows path; moved only those generated files into this task's ignored evidence and corrected `fileURLToPath`; verified empty accidental directories removed without recursive deletion or touching other files. Failed runs remain recorded; no reset/skip/retry masking.

Backend also reported a Hikari **thread starvation or clock leap** warning (about4h57m) between startup and the first real requests. The test did not set the clock; the observed warning does not identify its cause. Issuance/setup/authorization outcomes were verified subsequently against server state; stored24h intervals were read directly, not inferred from wall-clock waits. This run does not certify token expiry boundaries or scheduler behavior across suspension/time changes. Existing Next dev smooth-scroll warning remains; no production layout change was made for it.

Evidence: [workflow/HTTP journal](../../frontend/target/staff-onboarding-local-e2e-2026-10-15/results.json), [summary](../../backend/target/staff-onboarding-local-e2e-2026-10-15/summary.json), [final lifecycle metadata](../../backend/target/staff-onboarding-local-e2e-2026-10-15/lifecycle-final.txt). Mailpit body/credential/certificate-key files are private capture/configuration, not report artifacts.

## 9. Files and Scope Preservation

Created test-only [LocalStaffOnboardingApplication.java](../../backend/scripts/LocalStaffOnboardingApplication.java), [local-staff-onboarding.ps1](../../backend/scripts/local-staff-onboarding.ps1), [local-onboarding-https.mjs](../../frontend/scripts/local-onboarding-https.mjs), [staff-onboarding-local-e2e.mjs](../../frontend/scripts/staff-onboarding-local-e2e.mjs) and this report. New ignored/private onboarding config, Staff credential file, TLS/capture storage and sanitized target evidence. No files moved except the generated diagnostic artifacts noted above.

Only existing documentation changed additively: [local guide](../development/local-test-environment.md) and [current handoff](../ai/current-handoff.md). Before those notes, all799 incoming snapshotted tracked/untracked files and existing private envs were byte-identical. Application source, dependencies, V1–V14, requirements/contracts, previous reports, MCP/Stitch and remote configuration preserved. Index empty; HEAD remains `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`.

Final hash check confirms797 unchanged baseline files and only the two expected additive documentation updates,0 unexpected changes. Private profile/Staff credential/capture-directory ACLs grant only the current Windows user with inheritance disabled. Textual artifact scan checked14 files against actual local DB/admin/Staff/JWT/AES/private-key material **and the legitimately captured token**:0 matches. Screenshots exclude Login/filled passwords and verify scrubbed URL/private content. All test listeners1027/8027/8443/8080/3000 are closed; Ctrl+C exit1 is intentional teardown, not a failed workflow.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| File/folder/report naming | PASS | Existing scripts/ignored target locations, kebab-case PS/MJS, PascalCase Java, dated kebab-task report |
| Identifiers/framework | PASS | English names, actual Spring/Node/Playwright APIs, installed Next conventions; no production route/framework change |
| API/domain/status | PASS preservation | Existing public setup/Admin status/operational endpoints and serialized states; string domain IDs |
| Database/security | PASS | Fixed dedicated datasource, normal protected services, private ACLs, no secret export or privilege repair |
| Documentation/history | PASS | New evidence report/additive guide/handoff; historical reports/requirements unchanged |
| Scope/Git | PASS | No business implementation/Stitch/provider/deployment change, staging or commit |

No convention exception or requirement change. This report is evidence for the local onboarding slice, not a production TLS/SMTP/admission certification.

## 10. Teardown, Limitations and Next Step

All four owned test processes—onboarding backend, frontend, HTTPS proxy and Mailpit—are stopped after final verification. PostgreSQL and existing records/private captured message/configuration remain; Staff2 is deliberately left BLOCKED/setuptrue. Base launcher still disables delivery. Derived onboarding config enables delivery only behind its loopback/Mailpit preflight; it cannot start successfully without that capture service. Do not rerun completed setup/reissue phases or delete the journal to replay them.

Infrastructure relies on the existing compiled backend/cached classpath and portable Mailpit under ignored target paths; it is not a fresh-checkout installer. Development certificate expires after two days; regenerate only local private certificate files when separately running future tests. Normal browser trust requires the manual review described above. No external Gmail inbox, provider, production deployment, token expiry-boundary/concurrency suite or positive Check-in proof.

Next recommended task: separately authorize real local positive Staff QR/Ticket Check-in using independently verified legitimate PAID/issuance contracts and safe available Booking/Ticket data. Preserve immutable assignment1; do not manufacture financial success or silently expand this completed task. **Stop here.**
