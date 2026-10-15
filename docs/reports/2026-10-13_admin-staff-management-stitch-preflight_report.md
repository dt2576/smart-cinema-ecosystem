# Phase 4E Pre-flight — ADMIN Staff Management Stitch Design Audit

## 1. Task Information

- Date: 2026-10-13, Asia/Saigon; final live inventory recheck approximately 22:01 local / 15:01 UTC.
- Type: **READ-ONLY design, frontend and API audit**.
- Status: **AUDIT COMPLETE — OPTION B: DESIGN COMPLETION REQUIRED**.
- Project: **Smart Cinema Ecosystem**, projects/1208499799798658711.
- Repository entry: clean working tree and index, HEAD c65e0593baef8b0e1f7dd6763b9468409fe9a0b1.
- Scope: six required ADMIN Staff interfaces. No frontend/backend implementation, design generation/edit, database/configuration change, commit, push or deployment.

**Kết luận:** không tìm thấy thiết kế ADMIN Staff Management trong toàn bộ tài nguyên MCP hiện truy cập được, kể cả các screen bị ẩn trong project metadata. Backend đã có tám endpoint quản trị; frontend chưa có phần quản trị Staff. Ba thiết kế Staff hiện hữu phục vụ soát vé, không phải quản trị nhân viên. Chưa có interface ADMIN Staff nào đạt READY hoặc PARTIAL; shared frontend foundation có thể tái sử dụng khi thiết kế được duyệt.

## 2. Requested Work

Xác minh kết nối, lấy inventory mới, kiểm tra nội dung thực thay vì chỉ tiêu đề, đối chiếu DTO/actions/RBAC hiện hữu, lập matrix READY/PARTIAL/MISSING/UNVERIFIED và xác định thiết kế cần hoàn thiện trước Phase 4E frontend. Chỉ tạo báo cáo mới; không bắt đầu implementation hoặc tạo thiết kế.

Preflight convention/scope check: tên báo cáo được yêu cầu đúng YYYY-MM-DD_kebab-task-name_report.md; thư mục docs/reports hiện hữu. Không có route/API/status/schema mới. Handoff chỉ cập nhật nếu workflow yêu cầu: các workflow áp dụng yêu cầu report, không bắt buộc cập nhật handoff cho audit này; handoff được giữ nguyên.

## 3. Documents Reviewed

- [Root AGENTS](../../AGENTS.md), [frontend AGENTS](../../frontend/AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [Frontend Workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), [Review Workflow](../../.agent/workflows/REVIEW_WORKFLOW.md); Document/UI_UX/Coding/Requirement Traceability/Project Convention rules.
- [Canonical conventions](../development/project-conventions.md), [task report template](templates/TASK_REPORT_TEMPLATE.md).
- [Current handoff](../ai/current-handoff.md), [4B-1 continuation](2026-10-12_staff-checkin-foundation-implementation-continuation_report.md), [4B-2 backend APIs](2026-10-13_staff-qr-checkin-backend-apis_report.md), [4C frontend](2026-10-13_staff-checkin-frontend_report.md), [4D invitation frontend](2026-10-13_staff-invitation-activation-frontend_report.md): current milestones, scope, contract/security/design/verification sections.
- [Staff invitation/administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [Stitch implementation assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md).
- [BRD v1.2](../brd/brd-v1.2.md): authorization and limited Staff management; [SRS v1.2](../srs/srs-v1.2.md): §§3.1, 3.12, 3.14, security/usability; [historical scope v1.0](<../project-scope/project-scope v1.0.md>): actor/scope boundaries.
- [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx): actual DOCX paragraphs for UC-ADM-002 Manage Users and Manager assignment inventory.
- Current Admin routes/features/shared UI; actual AdminStaffController, StaffRequest, StaffOnboardingService, StaffRepository response records, account validation, AuthSecurityConfiguration, StaffExceptionHandler and V13 protected administration functions. Source pointers follow below.

Framework-local instruction to read installed Next documentation applies before writing code; no application code was written in this audit.

## 4. Requirements Traceability

| Actual requirement / source | Audit relevance | Result |
|---|---|---|
| BRD v1.2 BR-002, BR-003, BR-004 | Roles, Cinema scope, backend denial | PASS audit; ADMIN-only contract distinguished from Staff operations |
| BRD v1.2 BR-053, BR-055 | Staff assignments and limited Account/Role/Cinema/Status management | PASS audit; six missing design interfaces documented |
| SRS v1.2 FR-AUTH-006, FR-AUTH-007, FR-AUTH-008, FR-AUTH-010 | Account status, role/scope, user administration | PASS audit; no account auto-activation or Manager privilege |
| SRS v1.2 FR-ORG-002, FR-ORG-003, FR-ORG-004, FR-ORG-005 | Assign, deactivate with history, status, server scope | PASS audit; multiple retained Cinema assignments and exact statuses |
| SRS v1.2 FR-AUDIT-003 | Assignment audit/history | PASS audit; no delete or fabricated audit viewer |
| SRS v1.2 NFR-SEC-001/002/006/010/011/012 | Private password, protected APIs, validation, privacy, errors, limits | PASS audit; secrets excluded and invitation rate bound recorded |
| SRS v1.2 NFR-UX-004 | Understandable business errors | PASS gap analysis; Vietnamese safe errors still require designs |
| System Analysis v1.1 UC-ADM-002, Manage Users | General Admin user management | PASS traceability; invitation-specific details come from approved v1.0 contract |
| Approved Staff invitation/administration v1.0 | Exact onboarding, eight HTTP resources, response fields | PASS source comparison |
| UI implementation / formal accessibility compliance | No implementation authorized | NOT APPLICABLE; actual future Admin Staff responsive behavior UNVERIFIED |

No new requirement/Use Case ID is assigned to invitation screens. Historical Manager/Admin wording is not permission to widen the current approved ADMIN-only APIs.

## 5. Audit Summary

### 5.1. Live connection and precise counts

**CONNECTED AND WORKING for read-only inspection.** get_project, list_screens and get_screen succeeded; project metadata reports OWNER. No authentication/configuration intervention was needed. This verifies current access, not the historical cause/effect of an account switch.

| Inventory source | Actual current result |
|---|---|
| list_screens | **41 resources**: 23 UI HTML exports (19 DESKTOP, 4 MOBILE), 18 PNG-only image resources |
| get_project.screenInstances | **58 canvas entries**: 57 distinct sourceScreen resources plus one asset-group entry without sourceScreen |
| Additional hidden sourceScreen resources absent from list_screens | **16**, all get_screen accessible: 15 desktop UI references and 1 non-screen document |
| Unique addressable resources inspected through get_screen | **57/57 succeeded** |
| Combined classification | **38 UI references** (34 DESKTOP, 4 MOBILE), **18 image assets**, **1 document** |
| Downloaded and content-inspected HTML exports | **39/39**: all 38 UI references plus the document |
| Downloaded and visually inspected PNG previews | **6/6**, relevant Staff/auth/profile/account references |
| Matching ADMIN Staff workflow designs | **0** |

Counts do not establish 38 unique completed designs. Homepage, Booking Summary, tickets and older QR families overlap; some are historical alternatives. list_screens alone omits hidden references and is insufficient as a complete canvas inventory.

Project updateTime remained 2026-10-10T15:42:01.600935Z. Final recheck returned the same 41 listed IDs and 58 canvas entries/source identities. Metadata contains **13 “Generating Screen...” labels**. get_screen responses expose name/title/deviceType/width/height/htmlCode/screenshot, **no generation-job status, completion timestamp or error field**. Export accessibility confirms exportable content, not actual job completion. No generation retry occurred.

The asset-group entry assets_ac4a3505e353425b991e16e1d27e0415 has no sourceScreen; it was not treated as a screen or passed to a fabricated screen endpoint.

### 5.2. Content inspection and evidence

Local ignored evidence: frontend/target/admin-staff-stitch-preflight-2026-10-13/. Contains sanitized inventory.json (no download credentials/URLs), 39 original .html files and extracted .txt text, six .png previews, export-hashes.csv (SHA-256/bytes), and System Analysis extracted paragraphs. These are audit artifacts, not application assets or committed files.

Every HTML export was scanned for English/Vietnamese Admin/Staff/employee/invitation/assignment/account-activation terms, and context was reviewed. Staff matches describe operational soát vé or Customer presentation at admission; none contains an Admin employee list, Admin account creation, invitation administration, Admin activation/block action or assignment editor. Hidden references are Customer/booking/payment/ticket content. Titles were corroborated by export content.

| Inspected screen ID | Actual title | HTML/PNG evidence and meaning |
|---|---|---|
| 713c9e3fae5f4ef7a907102243ebff5c | Smart Cinema - Bàn làm việc nhân viên soát vé | HTML 54,209 bytes; downloaded PNG 449×512. Operational workspace, Cinema/shift header, admission KPI/history/mock scenarios. No Admin staff table or assignment editor |
| 05a2ad0f96cd4502ba97662d5f0a2e12 | Smart Cinema - Quét mã vé & Xác minh Booking | HTML 55,282 bytes; PNG 512×464. Scanner, Booking/Ticket selection and Check-in; no account administration |
| 851e390ea6f64946b1c3e9814de03d63 | Smart Cinema - Quét mã QR soát vé Mobile | HTML 30,613 bytes; PNG 171×512. Mobile scanner/Check-in; not mobile Admin Staff Management |
| 82c296db655348e2a3f14776f936989e | Smart Cinema - Create Account | HTML 27,289 bytes; PNG 512×431. Public Customer registration with password/confirmation and sign-in direction. Only field/card visual styling is reusable |
| 85bfbbac541b4455be5bd383218436e6 | Smart Cinema - My Profile | HTML 36,478 bytes; PNG 435×512. Customer personal profile/account presentation. No Admin editing another Staff or invitation/assignment actions |
| 14dc6c1445a747b88c866508463e9879 | Smart Cinema - Authenticated Account Menu | HTML 38,439 bytes; PNG 435×512. Customer profile plus menu; not Admin sidebar or employee navigation |
| 10765353845882543715 | Accessibility Audit.md | 152-byte text export, no PNG/device variant. One sentence describing analysis of Booking Summary; not a UI screen or completed accessibility audit |

MCP export PNGs are small previews, not full-resolution responsive evidence. Screen width/height metadata can differ from actual downloaded PNG dimensions; neither dimension is proof of rendering at 390/768/1440 CSS pixels. Full relevant HTML and PNG were inspected; no Admin workflow was marked READY from a preview.

### 5.3. Existing ADMIN frontend

Source evidence:

- [Admin layout](../../frontend/src/app/admin/layout.tsx), [AdminShell](../../frontend/src/features/admin/admin-shell.tsx): real backend identity read on token/path changes; loading/login/denied/unavailable states, logout and skip link. Desktop sidebar begins at md; small screens use wrapping navigation. Existing links: Tổng quan, Phim, Rạp chiếu phim, Suất chiếu. **No Staff navigation**.
- Existing **14 Admin page files**: /admin; movies list/new/[movieId]/edit; cinemas list/new/[cinemaId]/edit/[cinemaId]/halls/[cinemaId]/halls/new; halls/[hallId]/edit/[hallId]/seats; showtimes list/new/[showtimeId]/edit. All unchanged.
- [Admin home](../../frontend/src/features/admin/admin-home.tsx): real operation entry cards, not chain KPI reporting.
- [Movie list](../../frontend/src/features/admin/admin-movie-list.tsx), [Movie form](../../frontend/src/features/admin/admin-movie-form.tsx), [configuration screen](../../frontend/src/features/admin/admin-configuration-screen.tsx), [showtime screen](../../frontend/src/features/admin/admin-showtime-screen.tsx): native forms, list cards, safe loading/empty/error states, disabled fieldsets and explicit mutation controls.
- [Admin API](../../frontend/src/features/admin/admin-api.ts): auth/no-store transport, identity/catalog/configuration/showtime methods. **No Staff DTO/read/write/invitation/assignment client methods**. Generic response casting is not an already validated Staff contract.
- Only existing Staff pages are /staff/check-in and public /staff/activate. They serve Staff operations/private setup respectively, not ADMIN Staff administration.
- Search of all routes and Admin feature source found **no /admin/staff page, partial Staff management component or dormant Staff menu**.

Reuse inventory:

| Available source | Appropriate future reuse | Limitation |
|---|---|---|
| AdminShell/useAdmin | Admin header/sidebar, active navigation, current identity/error handling | Needs approved Staff entry after implementation; cannot grant Manager/Staff administration |
| Movie/configuration/showtime list and forms | Card/list spacing, native form/fieldset, explicit actions/loading/error/empty patterns | No generic shared DataTable; movie search/totals are not Staff API capabilities |
| SurfaceCard, Button, FormField, StatusBadge, StatusFeedback, Skeleton, Icon under components/ui | Semantic surfaces, native fields, states, loading, ≥44px base buttons, focus | Need Staff-specific validated data and safe Vietnamese labels |
| PreviewDialog | Native dialog/focus-return visual pattern | Preview-specific name, fixed title ID and close behavior; not a ready Admin mutation confirmation component |
| StaffConfirmation in staff-booking-panel | Native confirm/focus-trap/Escape/in-flight pattern to study | Booking/Ticket domain-specific; do not reuse its Check-in command/content as administration |

**Existing Admin modules do not have a verified dedicated Stitch screen mapping.** Current inventory and prior assessment both lack Admin designs. Existing modules use repository AdminShell/tokens/native layouts; no evidence that the operational Staff designs are the source of an Admin management shell. Customer-derived global tokens are shared visual foundation, not dedicated Admin design coverage.

### 5.4. Verified API and policy boundary

Source: [controller](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [strict parser](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [repository/response records](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [security](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), [V13 protected functions](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql), [safe exceptions](../../backend/src/main/java/com/smartcinema/staff/StaffExceptionHandler.java).

All eight require bearer ADMIN plus current database ACTIVE/ADMIN; no Manager inheritance. Canonical positive-bigint IDs remain strings within signed Long range. Strict body keys/types, duplicate/unknown/trailing JSON rejection, no arbitrary query fields, 64KiB administration body bound; responses/errors no-store.

| Actual HTTP resource | Request / response | Design implication |
|---|---|---|
| POST /api/v1/admin/staff | Exact {fullName,email,phone}; 201 StaffAccount + Location | Creates BLOCKED STAFF + invitation + encrypted queued delivery intent atomically; no password, role/status override or “email received” claim |
| GET /api/v1/admin/staff | Only page≥0, size1–100; defaults 0/20; numeric ID order; StaffAccount[] | Page navigation without invented totalElements/totalPages/global counters/search/status filters/sort |
| GET /api/v1/admin/staff/{staffId} | No query; StaffAccount | Independent protected detail read; not a Customer profile API |
| POST /api/v1/admin/staff/{staffId}/invitations | Exact {}; StaffAccount | Reissue only incomplete onboarding while BLOCKED; invalidates previous link, fresh 24h, retains assignments. Not password reset or resend of old token |
| PUT /api/v1/admin/staff/{staffId}/status | Exact {status:ACTIVE or BLOCKED}; StaffAccount | Explicit Admin activation requires password setup; blocking revokes outstanding invitation/payloads, not assignment history |
| GET /api/v1/admin/staff/{staffId}/cinema-assignments | No query; Assignment[] ordered ID | Retained assignment history and multiple Cinemas; no assignment paging/count summary |
| POST /api/v1/admin/staff/{staffId}/cinema-assignments | Exact {cinemaId:string,effectiveAt:ISO instant}; 201 Assignment | Creates ACTIVE STAFF membership; finite persisted UTC instant. No role/assignmentType/status override |
| PUT /api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status | Exact {status:ACTIVE or INACTIVE}; Assignment | Parent/STAFF-type verified, deactivate/reactivate retained row; no delete or identity/date edit |

StaffAccount exposes exactly id, fullName, email, phone, status, passwordSetupCompleted, invitationExpiresAt (instant or null), deliveryStatus, deliveryAttempts. Account status is **ACTIVE/BLOCKED**. passwordSetupCompleted is a boolean, not an ACTIVE state or completion timestamp.

deliveryStatus is **NONE/QUEUED/LEASED/SENT/FAILED/EXPIRED/REVOKED**. SENT means SMTP accepted, **not recipient inbox receipt, link use, completed password setup or active account**. Delivery/expiry fields are not an invitation-validity endpoint; no token, issuedAt, consumedAt, revokedAt, sentAt or serverTime is supplied in StaffAccount. Do not invent distinct confirmed “used/reissued link” server states from these fields.

Assignment exposes id, userId, cinemaId, cinemaName, assignmentType, status, effectiveAt. Vocabulary includes STAFF/MANAGER; this grant API creates STAFF only, and status mutation targets STAFF rows. ACTIVE assignment is not effective admission permission before effectiveAt, or without current ACTIVE Staff and active operational context.

Creation validation reuses [RegisterUserRequest](../../backend/src/main/java/com/smartcinema/auth/dto/RegisterUserRequest.java) and [VietnamPhoneValidator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java): nonblank required name/email/phone, raw name≤150/email≤254/phone≤30; email format then trim/lowercase, name trim, supported Vietnamese phone formats/separators normalize to +84 plus nine digits. Existing normalized email conflicts; cannot promote/reset an existing account. List/detail projections join staff_onboarding and restrict users.role=STAFF; legacy STAFF without onboarding are not automatically adopted or promised in this inventory.

Assignment creation verifies an existing Cinema, not an ACTIVE-Cinema-only predicate. Existing getAdminCinemas provides the Cinema selector read; do not invent a new endpoint or silently exclude Cinema statuses as a backend rule. Operational admission separately enforces active context. Same Staff/Cinema/type can have only one ACTIVE membership; history remains. effectiveAt is immutable after creation; multiple distinct Cinema memberships supported.

Safe errors: 400 malformed, 401 authentication, 403 current authorization, 404 unavailable resource, 409 duplicate/completed onboarding/premature activation/membership conflict, 429 rate bound, 503 configuration/database/transport uncertainty. Admin invitation reissue limit **3 per actor per hour**, Retry-After 3600; no hidden automatic reissue/retry. Create/reissue may fail safe 503 if required key/HTTPS-base configuration is unavailable. No settings/secret/SMTP flags were checked or enabled by this audit.

### 5.5. Required design coverage matrix

MISSING means absent in the 57 accessible resources and all 39 inspected content exports; it is not a generation failure diagnosis. PARTIAL would require an actual matching Admin workflow with gaps. Customer/Staff operational styling alone does not qualify.

| Required interface | Stitch screen ID | Design title | Status | Missing elements | Implementation readiness |
|---|---|---|---|---|---|
| A. ADMIN Staff List | None | None; 713c… is operational workspace | **MISSING** | Name/email/ACTIVE-BLOCKED list, page navigation, create entry/detail link, empty/loading/read failures; no supported global search/filter/count | Not ready; reuse AdminShell/list primitives only |
| B. Create Staff | None | None; 82c… is Customer Create Account | **MISSING** | Required fullName/email/phone, private invitation explanation, BLOCKED creation result, queued/delivery truthfulness, safe validation/409/503/uncertain states | Not ready; auth form/card styling is reference only |
| C. Staff Detail | None | None; 85bf… is Customer My Profile | **MISSING** | Owned Admin staff identity, exact account/passwordSetup/delivery/expiry fields, assignments, allowed actions, loading/404/403/error | Not ready; protected detail read exists; no dedicated design |
| D. Invitation Management | None | None | **MISSING** | Reissue eligibility, invalidates-old-link confirmation, no token, queued/delivery states, completed onboarding restriction, 429/cooldown/503/uncertain feedback | Not ready; command semantics must precede design |
| E. Staff Account Status | None | None | **MISSING** | ACTIVE prerequisite and explicit confirmation, BLOCKED confirmation/revocation effect, current-state/pending/conflict/uncertain views | Not ready; no automatic activation or additional account state |
| F. Cinema Assignments | None | None; operational Cinema selection is not management | **MISSING** | Retained multi-Cinema list, add Cinema+effectiveAt, ACTIVE/INACTIVE actions, confirmations, future-effective labels, empty/loading/conflict/error | Not ready; existing Admin Cinema read can support selector |

Desktop/mobile Admin variants: **none for all six**. Tablet behavior: **UNVERIFIED**. No READY subset of Staff management designs; reusable frontend shell/primitives are implementation foundation, not READY Stitch coverage.

### 5.6. Mismatches and review findings

No matching Admin design exists to approve field-by-field. The following are concrete mismatches in tempting substitute references, ordered by impact:

| Severity | Evidence / issue | Impact and required correction before reuse |
|---|---|---|
| HIGH | Six Admin interfaces absent, matrix above | Cannot implement a claimed approved Stitch Admin Staff workflow; complete designs first |
| HIGH | 82c… HTML has Customer password/confirmation and public registration; 85bf…/14dc… Customer role/self-profile | Do not substitute for ADMIN creation/detail. Admin supplies no password; explicit BLOCKED/invitation/activation workflow required |
| HIGH | 713c…/05a…/851e… operational content contains gate/shift/KPI/history/manual code lookup/offline/pickup concepts | These references are not Admin Staff management; none authorizes those extra capabilities |
| MEDIUM | 713c… “Duty Manager” activation/unlock and fabricated suspended error; Staff invite APIs ADMIN only | New Staff management design must use explicit quản trị viên; no Manager escalation, invented account state/error vocabulary |
| MEDIUM | 85bf… biometric/pass/lounge/SMS “verified” identity and account membership fields | StaffAccount does not expose these; omit rather than add DTOs/features |
| MEDIUM | Old Admin movie list search and total pages available only for movies | Staff list is a plain requested-page array; do not copy global search/filter/totals as supported Staff functionality |
| MEDIUM | Invitation delivery/expiry projections are narrower than a full token lifecycle | Present fields truthfully; no inbox confirmation, link-copy/token viewer or inferred consumed/reissued status |
| MEDIUM | No Admin Staff 390/768/1440 exports or confirmations/accessibility evidence | Explicit responsive/state/keyboard specifications required before READY |

These are design/planning gaps, not newly introduced production defects. No unsupported element was implemented.

### 5.7. Design-system, responsive and accessibility review

- [.stitch/DESIGN.md](../../.stitch/DESIGN.md), live designTheme and [globals.css](../../frontend/src/app/globals.css) agree on Nocturne generated surface **#0F131C**, amber action **#F59E0B**, Space Grotesk/Plus Jakarta Sans. Generated accent #FFC174 and canvas #0A0E16 remain distinct from narrative #0B0F17/#111827/#1F2937. No token changes.
- Six inspected previews show dark/amber shared visual language. Auth/profile/menu are predominantly English; Staff references are mostly Vietnamese with some mixed technical/prototype copy. New Admin designs need entirely Vietnamese user-facing copy.
- Real AdminShell provides the repository header/sidebar pattern; no dedicated live Admin sidebar export exists. Its small-screen wrapping nav and md sidebar are source facts, not rendered QA certification.
- Four live mobile UI references cover Customer bookings/detail/QR and operational Staff scanner. **None covers Admin Staff**; no tablet Admin Staff variant.
- 390px: list rows must reflow/read as cards or a bounded table region, long name/email/Cinema labels and action groups remain readable. 768px: preserve content width with actual Admin sidebar, forms/confirmations fit. 1440px: list/detail/assignment grouping and appropriate whitespace. These are proposed design acceptance criteria, **not tests run or proven layouts**.
- Shared production Button has 2.75rem (44px) minimum height; native form labels/error associations, amber focus-visible and reduced-motion CSS exist. Future Admin confirmations must specify initial focus, Tab/Shift+Tab containment, Escape/cancel behavior, return focus and disabled in-flight states.
- Static export inspection: none of the six references has a native dialog or explicit focus-visible string; aria-label occurrences are sparse (0–3), and responsive utilities vary. This does not prove overall accessibility failure; generated Tailwind/plugin CSS/browser semantics were not tested. It establishes that screenshots alone cannot certify keyboard/focus/touch/contrast.
- Actual responsive browser rendering, keyboard walkthrough, screen-reader, contrast and touch measurements for Admin Staff: **NOT RUN / UNVERIFIED**, because the target designs/pages are absent. Historical Phase4C/4D width tests are not reused as Admin Staff PASS.

### 5.8. Exact design completion scope

All tasks below are prerequisites, not authorization to generate designs. Six interfaces may be composed as list/create/detail plus sections/dialogs; no need for six standalone routes.

1. **Staff List + Admin shell**: Vietnamese “Nhân viên”, “Tạo nhân viên”, name/email/account-status rows and detail links; previous/next requested-page controls without totals; initial/next-page empty, skeleton, network/5xx,401/403 states. No search/status filter/global counters until independently supported.
2. **Create Staff form + result**: fullName/email/phone only; explain private email invitation and initial BLOCKED. Field errors, duplicate-email conflict, submitting/disabled, confirmed201 BLOCKED result, delivery queued vs accepted vs failure, configuration unavailable and lost-response uncertainty. No password, role selector, auto activation, optimistic email delivery or automatic command replay.
3. **Staff Detail**: identity/status, passwordSetupCompleted, safe deliveryStatus/attempts and nullable invitationExpiresAt, Cinema assignment section, action eligibility. Loading/missing/current access/network/inconsistent-data states; no profile/self-service, biometric, staff code, avatar, salary or shift requirements.
4. **Invitation action/confirmation**: “Cấp lại lời mời” for incomplete/BLOCKED onboarding; old link becomes invalid, fresh server-issued24h, current assignments retained. Explicit confirmation/cancel, waiting, returned queued/delivery state,429 Retry-After guidance,409 completed/ineligible and uncertain503/lost response. No raw-token preview/copy, reissue-after-completion/reset or claims that deliveryStatus alone is token validity.
5. **Account status confirmations**: ACTIVE only after setup; “Chờ thiết lập mật khẩu” prerequisite guidance and “Chờ quản trị viên kích hoạt” when setup completed but BLOCKED. Explicit activate/block; block revokes outstanding invitations while preserving assignment history. Pending/conflict/authorization/unavailable/uncertain feedback and current GET recheck; no local authority.
6. **Assignment section/add/status dialogs**: retained multiple rows with Cinema, type, ACTIVE/INACTIVE, effectiveAt; Cinema selector from existing Admin read; explicit UTC date/time meaning and future-effective presentation; add ACTIVE STAFF, deactivate/reactivate compatible rows, uniqueness409, unavailable404, empty/loading/network/in-flight/uncertain states. No hard delete, reassignment/date editing, arbitrary role, shift/gate assignment or staff self-grant.

Each requires desktop and mobile variants plus documented 768px behavior; long Vietnamese text, visible focus, associated labels/errors, ≥44px primary controls, color plus text/icon status, pending disabled states, reduced motion and confirmation focus behavior. Reuse existing AdminShell and semantic primitives; Customer form visuals and operational status cards may supply styling only, not their workflows.

## 6. Files Created

- This report: docs/reports/2026-10-13_admin-staff-management-stitch-preflight_report.md.
- Ignored local audit downloads/metadata/hash/text-extraction evidence described in §5.2; no generated evidence included in version control.

## 7. Files Modified

**None.** No application source, handoff, historical report/contract/requirements, .stitch reference, environment/MCP configuration or database file modified. No files moved. No migration; source head remains **V14**.

## 8. Verification

| Check performed during this audit | Actual result |
|---|---|
| Live project/list/get_screen reads | PASS: 41 listed, 58 canvas entries, 57 addressable resources, 57 successful reads |
| HTML export download/content inspection | PASS:39/39, includes hidden references and non-screen document |
| Relevant PNG download/visual inspection | PASS:6/6 previews; not generation-job or responsive certification |
| Fresh final inventory recheck | PASS: same listed IDs/canvas source identities |
| Eight endpoint DTO/validation/RBAC comparison | PASS source audit; no live HTTP mutation or financial/operational data |
| Required six-interface coverage | **MISSING6; READY0, PARTIAL0, UNVERIFIED0** for interface existence; future responsive/job completion independently UNVERIFIED |
| Report UTF-8/links/structure/convention and repository preservation | PASS: strict UTF-8,39 local links/0 missing,0 trailing-whitespace lines; only requested report added, index/HEAD preserved |
| TypeScript / lint / unit / production build / Playwright | **NOT RUN** — documentation-only audit, application unchanged |
| Backend mvn verify | **NOT RUN** — source/contract inspection only, no backend change |
| Live Gmail/recipient/password setup/Admin activation/admission/Neon | **NOT RUN** — not needed or authorized for design audit |
| Stitch generation completion | **UNVERIFIED** — no job-state API/field available through exposed read tools |

Historical evidence only: Phase4B-2 backend410/410; Phase4D frontend215/215 unit and347/347 Playwright, tsc/lint/build PASS. No historical result is represented as a fresh audit test.

The initial Python text-extraction helper could not run because python resolves to the Windows Store alias with no interpreter. Read-only PowerShell/.NET HTML extraction and DOCX ZIP/XML parsing succeeded instead; no installation/configuration change. This did not block inspection.

## 9. Requirement Reconciliation

- **PASS**: requested current connection/inventory/export/API/frontend audit and exact matrix/report completed.
- **PASS**: private Staff onboarding, explicit ADMIN activation, current RBAC, retained multi-Cinema assignments and secret protection preserved in conclusions.
- **PASS**: actual IDs used; no business requirement/status/endpoint invented or historical document rewritten.
- **PASS**: READ-ONLY constraints; no design mutation/generation/retry, application/database/configuration change, commit or deployment.
- **PARTIAL design coverage**: target six interfaces all missing; project-wide visual foundation exists but does not satisfy them.
- **NOT APPLICABLE implementation gate**: this audit is complete; Phase4E implementation is not authorized by this report.

## 10. Deviations / Conflicts

No scope deviation. Metadata versus list count discrepancy resolved by inspecting all hidden sourceScreen identities. Export availability is not generation status; no completion assertion made.

Historical Scope/System Analysis/BRD/SRS allow broader Manager staff management, while approved invitation/administration v1.0 and actual security grant this phase to ADMIN only. Future designs must follow the narrowed approved contract; no requirement rewrite or Manager UI created.

Existing convention conflicts: historical spaced scope filename, legacy DOCX basename, and uppercase .stitch/DESIGN.md preserved as existing references. This task introduces no exception or naming migration.

## Convention Compliance

Checked against [canonical project conventions](../development/project-conventions.md), including this report itself.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing docs/reports, requested dated kebab-case report; lowercase ignored evidence folder |
| Code naming / imports / routes | NOT APPLICABLE | No code/import/route creation or modification |
| Domain/status terminology | PASS | Admin/Staff/Cinema; exact uppercase serialized states, localized presentation distinguished |
| API convention | PASS audit / no implementation | Existing eight resource paths and DTOs; no invented endpoint |
| Database convention | NOT APPLICABLE | No schema/data/migration change; existing V14 retained |
| Documentation convention | PASS | Template-equivalent sections, relative source links, actual requirement IDs, evidence/limits/conflicts; no historical overwrite |
| Design/scope/Git preservation | PASS | Read tools only; report-only tracked scope, no stage/commit/push/deploy |

## 11. Known Limitations

Inventory conclusion applies to current authenticated MCP project view and all 57 resources addressable through its project metadata/list. It cannot establish undisclosed resources outside that view. All referenced resources read successfully; there is no observed access/server blocker.

Job completion cannot be confirmed. Thirteen canvas labels still indicate generation, while exports are accessible; synchronization vs unfinished job remains unknown and does not turn absent Admin designs into completed ones. No Stitch web UI or generation job was changed.

Only six relevant PNG previews were downloaded/viewed. Other UI resources were classified using get_screen metadata and full HTML content; 18 image assets were classified from image-only exports/titles. No claim of a full visual audit of every image, screen accessibility or all legacy designs.

StaffAccount is a limited projection; invitation token validity/inbox receipt and command commit uncertainty cannot be invented from it. Required design feedback must respect those limitations. No actual provider/onboarding configuration or live backend interoperability proof was attempted.

## 12. Next Recommended Step

**OPTION B — DESIGN COMPLETION REQUIRED.** Separately authorize completing/reviewing six interface groups in §5.8. Recommended order: (1) Admin shell/list/create, (2) detail/onboarding/invitation/status confirmations, (3) assignment list/add/status, (4) shared loading/empty/error/uncertain/access states and 390/768/1440/keyboard review. Re-audit their actual HTML/PNG and exact contracts before marking READY.

Only then separately authorize Phase4E real Admin Staff frontend implementation. Backend API availability is not design approval. Do not begin Gmail live verification, Manager administration, design generation or implementation automatically. **STOP after this report.**

## Appendix A. All current listed UI references

The following 23 entries have content-inspected HTML and available PNG URLs. PNG availability is not a statement that all PNGs were downloaded or that generation completed.

| Stitch screen/resource ID | Actual title | Variant | HTML / PNG |
|---|---|---|---|
| 14dc6c1445a747b88c866508463e9879 | Smart Cinema - Authenticated Account Menu | DESKTOP | HTML inspected / PNG URL available |
| fdea388b4b24406799ab087b31239835 | Smart Cinema - Seat Selection | DESKTOP | HTML inspected / PNG URL available |
| c667635786b940938d6071bb335830f9 | Smart Cinema - Customer Homepage | DESKTOP | HTML inspected / PNG URL available |
| b023e6ffbd0c424d9244aaa8393c442c | Smart Cinema - Payment Result & Order Confirmation | DESKTOP | HTML inspected / PNG URL available |
| 1017f7c1f77943579d9bb1bee37f7718 | Smart Cinema - Food & Drinks (Seat Hold Expired) | DESKTOP | HTML inspected / PNG URL available |
| fe57105a74494ca4807f61ae495f7c29 | Smart Cinema - Movie Listing | DESKTOP | HTML inspected / PNG URL available |
| 85bfbbac541b4455be5bd383218436e6 | Smart Cinema - My Profile | DESKTOP | HTML inspected / PNG URL available |
| a808fb16fcad452696636be952ea70b1 | Smart Cinema - Showtime Selection | DESKTOP | HTML inspected / PNG URL available |
| 16dbe62e3be744e6ab4123fc004283e3 | Smart Cinema - Movie Detail | DESKTOP | HTML inspected / PNG URL available |
| d989b7d6ffb04be6a964be21e298a4fa | Smart Cinema - Thẻ QR Vào Rạp Mobile (Booking QR Pass) | MOBILE | HTML inspected / PNG URL available |
| 05a2ad0f96cd4502ba97662d5f0a2e12 | Smart Cinema - Quét mã vé & Xác minh Booking | DESKTOP | HTML inspected / PNG URL available |
| 851e390ea6f64946b1c3e9814de03d63 | Smart Cinema - Quét mã QR soát vé Mobile | MOBILE | HTML inspected / PNG URL available |
| 602baa042d22404d8b31d461351aa42d | Smart Cinema - Food & Drinks | DESKTOP | HTML inspected / PNG URL available |
| f5904cd07f924d25a0ca844636e93060 | Smart Cinema - Sign In | DESKTOP | HTML inspected / PNG URL available |
| 0cc11f6226c74b6291ef49660e63f748 | Smart Cinema - Payment Method Selection | DESKTOP | HTML inspected / PNG URL available |
| 52aa55f16d2640d68efb6c399d5fb990 | Smart Cinema - Booking Summary / Review Order | DESKTOP | HTML inspected / PNG URL available |
| b850455e65fc482a8ef3332cb672683d | Smart Cinema - Booking QR & Passes | DESKTOP | HTML inspected / PNG URL available |
| 82c296db655348e2a3f14776f936989e | Smart Cinema - Create Account | DESKTOP | HTML inspected / PNG URL available |
| 8de77c4d95c141f9947a4f7bf4cad7c9 | Smart Cinema - Cinema Selection | DESKTOP | HTML inspected / PNG URL available |
| 713c9e3fae5f4ef7a907102243ebff5c | Smart Cinema - Bàn làm việc nhân viên soát vé | DESKTOP | HTML inspected / PNG URL available |
| 28c2fd5f49c0437eb2e77f8b9814be84 | Smart Cinema - Chi tiết đơn vé Mobile (Booking Detail) | MOBILE | HTML inspected / PNG URL available |
| 777b204432ad4fba84065c10697951e9 | Smart Cinema - Payment Processing & Verification | DESKTOP | HTML inspected / PNG URL available |
| 3f5732811dba482e95b07e5aa6251b21 | Smart Cinema - Vé của tôi Mobile (My Bookings) | MOBILE | HTML inspected / PNG URL available |

## Appendix B. Hidden resources recovered from project metadata

These 16 entries are absent from list_screens but directly accessible by their sourceScreen names. Fifteen have desktop UI HTML/PNG; the document has text only. No hidden Admin Staff design was found.

| Stitch screen/resource ID | Actual title | Variant | HTML / PNG |
|---|---|---|---|
| 019a53e2bbc242ca98a84fa1a10192a6 | Cinema Seat Selection | DESKTOP | HTML inspected / PNG URL available |
| 10765353845882543715 | Accessibility Audit.md | Non-screen document | HTML inspected / No PNG |
| 265e1328babf486b9245fb508624d9e6 | Smart Cinema - Thẻ QR Vào Rạp Toàn Màn Hình (Booking QR Pass) | DESKTOP | HTML inspected / PNG URL available |
| 422f032569974172b8217983f7738b41 | Smart Cinema - Ticket Detail | DESKTOP | HTML inspected / PNG URL available |
| 4b9b19206fc14015a77322f58b113bd1 | Smart Cinema - Vé của tôi (My Bookings) | DESKTOP | HTML inspected / PNG URL available |
| 5c2d7472096a4d9099ff2f62a1b6da68 | Smart Cinema - Khởi tạo thanh toán VNPAY Sandbox | DESKTOP | HTML inspected / PNG URL available |
| 5e46faa89712407ca07bf131aaae1316 | Smart Cinema - Booking Summary / Review Order | DESKTOP | HTML inspected / PNG URL available |
| 66beffb2e06e49d3b103533d25f5c54d | Smart Cinema - Thông tin đặt vé & Tóm tắt đơn hàng | DESKTOP | HTML inspected / PNG URL available |
| 85a6a5848b1c499594bc3e3faeecf9b8 | Smart Cinema - Customer Homepage | DESKTOP | HTML inspected / PNG URL available |
| 8c85de5a42c34780915d8661021246ab | Smart Cinema - Individual QR Ticket | DESKTOP | HTML inspected / PNG URL available |
| 91a9d638f6694887a3299111e6026a52 | Smart Cinema - Food & Drinks (Hold Expired) | DESKTOP | HTML inspected / PNG URL available |
| b35a7c6b366d4c2a90d8e04b76c4b99b | Smart Cinema - My Tickets & Passes | DESKTOP | HTML inspected / PNG URL available |
| c7f09eb14aa44fbfa2cfc44e86753013 | Smart Cinema - Chi tiết đơn vé & Trạng thái vé (Booking Detail) | DESKTOP | HTML inspected / PNG URL available |
| ca1c28a605b64d4ebeb59d4c00c23d42 | Smart Cinema - My Tickets | DESKTOP | HTML inspected / PNG URL available |
| ca8f557d4c2f4ea78fa40552b7b41ba3 | Smart Cinema - Kết quả thanh toán & Trạng thái vé | DESKTOP | HTML inspected / PNG URL available |
| e58f593344cd4fdaac8bfe35a885f3d0 | Smart Cinema - Xác minh & Đối soát thanh toán VNPAY | DESKTOP | HTML inspected / PNG URL available |

## Appendix C. Listed image-only resources

These 18 resources have screenshot URLs but no downloadable HTML/UI export or device variant. Titles describe poster/backdrop/food images; they are not counted as interface designs. Subjects are abbreviated here; exact original titles are retained in the sanitized local inventory.

| Resource ID | Image subject (title summarized) |
|---|---|
| e443081476ef45b889c07407a37fc00a | Theatrical movie key art poster for an epic alien planet sci-fi adventure titled 'Fire and Ash'. A stunning alien fantasy landscape with bio… |
| d17964cf5cf34ae5ae8293d927d8a638 | Cinematic landscape wide shot of vast rolling desert sand dunes on an alien planet under a dusky starry night sky with twin moons, warm atmo… |
| 081f444b338947afad9e66d06a8d8f12 | Premium branded pure still mineral water in sleek glass or premium dark bottle on dark cinema bar counter, condensation droplets, luxury stu… |
| 98e0897836c840a09132c20bc2023d3a | Crisp lemon lime soda with fresh lime slice, fizzing bubbles in sleek dark cinema cup, ice cubes, dark studio lighting, movie snack commerci… |
| cd77377730824fbcba1b9f12e4e4c784 | Fresh hot buttery golden movie cinema popcorn overflowing in a sleek black premium paper bucket with warm cinema spotlighting on a dark slee… |
| 33afd83a57494e96bc46d408596fc034 | Official theatrical movie poster style for Furiosa A Mad Max Saga, fierce female warrior silhouette with mechanical arm standing in front of… |
| 517d9ab1a5814297af43fefb65e6704f | Official theatrical movie poster style for Past Lives, romantic drama key art featuring a man and a woman standing near a ferry railing look… |
| f145e703600c491bb9fc5b2d9cbafbf4 | Premium cinema movie combo set featuring a large tub of popcorn, two fountain soda drinks with straws, and chocolate candies, arranged beaut… |
| 896acb2c4d5e42c396d4eba9706a7b3a | Theatrical movie key art poster for an animated multiverse superhero adventure film, featuring an acrobatic hooded hero diving through vibra… |
| 817f0a5e5f02438b86a433aebc1ee807 | Theatrical film key art poster for an epic alien planet fantasy titled Fire and Ash, featuring an otherworldly volcanic landscape with glowi… |
| d194632f74d04fb3b8b46e0631b8c0f7 | Chilled fountain cola soda in a sleek black matte cinema cup with condensation droplets and a straw, ice cubes, dark mood studio lighting |
| 9b54d3edecd74da0b19c5ab08bafdbd6 | Official theatrical movie poster style for Gladiator II, ancient Roman gladiator warrior standing inside the colossal shadowy Colosseum aren… |
| 2a5914f8462a444895bd014510ba6282 | Official theatrical movie poster style for Civil War, close-up dramatic shot of photojournalist camera lens reflecting burning urban dystopi… |
| 6edaa1ec31154bf0a4b43a03091c0166 | Official theatrical movie poster style for Oppenheimer, silhouette of a man wearing a fedora hat and trench coat standing against an immense… |
| 385a395694ed4adc86af9a4a86891343 | Theatrical animation movie poster for a multiverse comic book hero. An athletic acrobatic masked hero in a black and red suit leaping forwar… |
| 82d34150a46a467a90ea4f0933b1e249 | Sweet golden glazed caramel popcorn in a stylish dark matte cinema snack tub with glistening caramel coating, warm studio lighting, gourmet … |
| ca8ef62a23414c8b8047b566375cff5d | Official theatrical movie poster style for Interstellar 10th Anniversary, lone astronaut in modern space suit standing on an icy alien water… |
| df50977f707947758394894e7a282864 | Official theatrical movie poster style for Dune Part Two, epic desert planet Arrakis with vast sweeping orange sand dunes, giant sandworm si… |

