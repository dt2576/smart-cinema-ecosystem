# Phase 4E — ADMIN Staff Management Stitch Post-design Audit

## 1. Task Information

- Date: 2026-10-13, Asia/Saigon.
- Type: **STRICTLY READ-ONLY design verification / API contract audit**.
- Project: Smart Cinema Ecosystem — projects/1208499799798658711.
- Status: **AUDIT COMPLETE — OPTION B: STITCH REVISIONS REQUIRED**.
- Entry HEAD: c65e0593baef8b0e1f7dd6763b9468409fe9a0b1; index empty. Incoming untracked preflight report preserved.
- Final inventory recheck: 2026-10-13 approximately 23:38 local; project updateTime 2026-10-13T16:27:31.726904Z.

**Kết luận:** đã có hai screen ADMIN mới, gồm Staff List và Staff Detail; Create Staff nằm trong overlay của Staff List. Cả sáu nhóm dialog có nội dung HTML, nhưng chưa đủ điều kiện READY. Thiếu phone bắt buộc, thiếu trạng thái lỗi/uncertain, sai diễn giải delivery/expiry/assignment, dialog kích hoạt bị lỗi runtime và responsive mobile không sử dụng được. Không có API blocker cần sửa backend; cần sửa thiết kế trước khi xin phép implementation.

## 2. Requested Work and Scope

Xác minh toàn bộ thiết kế ADMIN Staff hiện truy cập được, bao gồm screen ẩn, HTML/PNG, ba main-screen functions, sáu dialog groups, tám API resources, fidelity, responsive/accessibility và Git preservation. Preflight là baseline lịch sử, không dùng kết luận “missing” làm bằng chứng cho trạng thái mới.

Chỉ tạo báo cáo này và evidence cục bộ dưới ignored target. Không sửa source, requirements, historical reports, handoff, backend/migrations, database, environment/MCP settings hoặc Stitch; không commit/push/deploy. Không chạy build/test suite không liên quan.

Convention/scope plan trước khi ghi file: đúng tên báo cáo được yêu cầu trong docs/reports; evidence dùng lowercase kebab-case dưới frontend/target đã bị Git ignore. Không tạo route, component hoặc business status. Áp dụng canonical workflow/report template; không có workflow yêu cầu cập nhật handoff cho audit này.

## 3. Documents and Source Reviewed

- [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [conventions](../development/project-conventions.md), [root instructions](../../AGENTS.md), [frontend instructions](../../frontend/AGENTS.md), Frontend/Review workflows, Document/UI_UX/Requirement Traceability/Project Convention rules; [report template](templates/TASK_REPORT_TEMPLATE.md).
- [Current handoff](../ai/current-handoff.md), [historical preflight](2026-10-13_admin-staff-management-stitch-preflight_report.md), relevant scope/design/verification sections of [Phase4D](2026-10-13_staff-invitation-activation-frontend_report.md) and [Phase4C](2026-10-13_staff-checkin-frontend_report.md).
- [Staff invitation/administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [BRD v1.2](../brd/brd-v1.2.md) Staff/RBAC requirements and [SRS v1.2](../srs/srs-v1.2.md) account/organization/audit/security/usability.
- [AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [StaffRequest](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [StaffOnboardingService](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [StaffRepository and actual DTO records](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [security](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), protected [V13 functions](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql).
- [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), [Admin layout](../../frontend/src/app/admin/layout.tsx), current Admin routes/API/forms/list patterns, shared UI and [global tokens](../../frontend/src/app/globals.css). Package configuration inspected for the existing Playwright/browser review tool; no dependency change.

## 4. Requirements Traceability

| Actual requirement / approved source | Verification relevance | Result |
|---|---|---|
| BRD v1.2 BR-002/003/004 | RBAC, Cinema scope, backend authorization | PASS audit; no privileges changed |
| BRD v1.2 BR-053/055 | Assignment and limited Staff management | PARTIAL design coverage; all main/dialog groups identified |
| SRS v1.2 FR-AUTH-006/007/008/010 | Account status, role/scope, administration | PARTIAL design alignment; activate/reissue/identity corrections needed |
| SRS v1.2 FR-ORG-002/003/004/005 | Staff assignments, deactivation/history, status/scope | PARTIAL design alignment; type/status/effectiveAt wording needs revision |
| SRS v1.2 FR-AUDIT-003 | Assignment audit/history | History concept present; no audit retention/UI capability invented |
| SRS v1.2 NFR-SEC-010/011/012 | No secrets/internal errors; rate limits | No raw token field;429/uncertain/safe-error designs missing |
| SRS v1.2 NFR-UX-004 | Understandable business error | PARTIAL; dedicated validation/conflict/unavailable states missing |
| Contract v1.0; user audit §§3–7 | Exact fields, private setup, explicit activation, delivery semantics, responsive/a11y | PARTIAL; concrete findings below |
| User read-only constraints | No implementation, design edit, DB/config/Git mutation | PASS |
| System Analysis UC-ADM-002 Manage Users | General Admin scope already verified in preflight | Historical traceability only; no invitation-specific UC ID invented |

No requirements or Business Rule IDs were created. Historical Manager staff-management wording does not expand this approved ADMIN-only contract.

## 5. Audit Findings

### 5.1. Fresh connection and complete current inventory

**CONNECTED AND WORKING** for available read operations; metadata reports OWNER. Fresh get_project/list_screens plus get_screen succeeded for every distinct source reference. No reconfiguration/authentication intervention.

| Source / classification | Current verified count |
|---|---|
| Normal list_screens | **43** resources:25 UI HTML exports (21 DESKTOP,4 MOBILE) +18 image-only resources |
| Project screenInstances | **60** canvas entries:59 distinct sourceScreen resources +1 asset group without sourceScreen |
| Hidden additional resources absent from normal list | **16**:15 desktop UI references +1 non-screen document |
| get_screen | **59/59 successful reads** |
| Combined addressable inventory | **40 UI references** (36 DESKTOP,4 MOBILE),18 image assets,1 document |
| Current HTML downloads/content inspection | **41/41**:40 UI references +1 document |
| Newly discovered ADMIN resources | **2**, both DESKTOP |
| Dedicated ADMIN mobile/tablet resources | **0** |
| New ADMIN MCP PNG previews retrieved/viewed | **2/2**, one has an incomplete-looking capture |
| Canvas “Generating Screen...” labels | **15**, including both new ADMIN screens |

Compared with preflight:43 vs41 listed,59 vs57 addressable,40 vs38 UI references; two new IDs, no removed IDs identified. All **39 historical HTML/text exports were freshly downloaded and SHA-256-identical** to preflight evidence; only the two new HTML files are additions. Searching all41 content exports for Admin management context identified only these two. Staff operational scanner/workspace references remain distinct and are not counted as Admin coverage.

Final project/list recheck returned the same current IDs; no additional uninspected references appeared. Appendix lists current identities, not a count of unique completed designs. Image-only food/poster resources and Accessibility Audit.md are not main UI screens.

get_screen exposes name/title/deviceType/width/height/htmlCode/screenshot, not generation job completion/error metadata. **Actual generation-job completion is UNVERIFIED**. Accessible HTML or a browser-rendered preview cannot establish completion. No generation or retry invoked.

### 5.2. Exact new screens and inspected exports

| Stitch ID | Actual title | Device / MCP dimensions | Retrieved HTML | Retrieved MCP PNG |
|---|---|---|---|---|
| 0336c7c6d22a4fc19c1b39c453ca62fc | Smart Cinema Admin - Quản lý nhân viên | DESKTOP;2560×2048 |39,730 bytes; content and prototype states inspected |512×410; populated list/header/sidebar visible |
| 35f64500179847fa978243ca032b9a16 | Smart Cinema Admin - Chi tiết nhân viên | DESKTOP;2560×3116 |89,201 bytes; content, six dialog containers and script templates inspected |227×512; mostly empty shell/dark/black canvas, no readable detail content |

The Detail MCP PNG is **not a complete-looking visual export**. Its downloaded HTML does render the populated detail page locally. This PNG/HTML discrepancy remains unresolved; no claim of generation completion or exact cause (job vs capture/sync) is made.

Evidence folder: frontend/target/admin-staff-stitch-postdesign-2026-10-13/ (ignored). It contains original exports, extracted text, sanitized inventory.json (no signed download URLs), export-hashes.csv, isolated-browser screenshots, browser-evidence.json, states-evidence.json and audit helpers. Generated screenshots contain only Stitch mock identities, not live employee credentials/data.

Exact inspectable frames:

- List HTML: **#state-data, #state-loading, #state-empty, #state-error, #state-error-denied, #modal-create, #modal-details**.
- Detail HTML: **#modal-reinvite, #modal-activate, #modal-block, #modal-assign, #modal-deactivate-cinema, #modal-reactivate-cinema**.
- Activation intended templates: renderActivationDialog (around lines756–801); duplicate later renderer renderActivationModalContent (around1056+) references non-existent elements. This is a real inspectable design template, not just a trigger.

No separate Admin Create Staff resource exists in current metadata/list. The form is an overlay in the List resource; three functions do not require three independent routes.

### 5.3. Main screen coverage matrix

All classifications concern design/workflow readiness; export/job status is separately described above.

| Screen | Stitch ID | Actual title | Desktop | Mobile | Status | Missing elements |
|---|---|---|---|---|---|---|
| A Staff List |0336c7c6d22a4fc19c1b39c453ca62fc |Smart Cinema Admin - Quản lý nhân viên |Export inspected;1440 browser render |No variant;390 render fails |**PARTIAL** |Correct delivery vocabulary/IDs, real-detail navigation decision, accessible list and pagination controls, readable small-screen layout |
| B Create Staff |0336c7c6d22a4fc19c1b39c453ca62fc / #modal-create |Tạo tài khoản nhân viên |Actual overlay inspected/rendered |No standalone variant;overlay fits tested390 width |**PARTIAL** |Required phone; associated labels/errors/max-length policy; explicit still-BLOCKED awaiting Admin; duplicate409, submitting/disabled, returned201 result,503/configuration and uncertain states |
| C Staff Detail |35f64500179847fa978243ca032b9a16 |Smart Cinema Admin - Chi tiết nhân viên |HTML locally renders;MCP PNG incomplete-looking |No variant;390 render fails |**PARTIAL** |Actual bigint ID, nullable expiresAt, truthful delivery/type/status fields, correct actions, read-loading/empty/404/401/403/error, working state/activation variants |

Verified present in A: active Nhân viên nav; full name/email; ACTIVE/BLOCKED badges; setup column; delivery column; create and detail triggers; Previous/Next with current page and requested size only; distinct loading skeleton/empty/error/403 containers. **No global search/filter/sort/total count/total-page indicator found**. These absent unsupported controls are a positive contract match.

Verified present in B: name/email required native inputs, cancel/submit,24h invitation explanation and initial BLOCKED mention; no Admin-entered password, role selector or raw token. However, “BLOCKED cho đến khi nhân viên hoàn tất thiết lập” omits continued blocking until explicit ADMIN activation. “Email doanh nghiệp” also implies a restriction beyond the existing general email validator.

Verified present in C: name/email/phone, account/setup presentation, delivery attempts, invitation duration concept, back link, account actions, multi-Cinema section with retained inactive rows and future effective time. Missing separate read/access/empty/error variants; three mock account-state buttons do not faithfully change the exported page (see§5.5). “NV-0482” is not the required actual StaffAccount.id.

### 5.4. Six dialog groups: actual design coverage

All six frames belong to **35f64500179847fa978243ca032b9a16**. Five were opened/rendered and visually inspected; activation opening failed. They are overlays, not proposed independent routes.

| Dialog | Stitch ID / frame | Actual evidence | Status | Missing elements |
|---|---|---|---|---|
| Reissue invitation |35f64500179847fa978243ca032b9a16 / #modal-reinvite |HTML372–403;visible confirm/cancel;old link invalidation/new24h stated |**PARTIAL** |BLOCKED/incomplete eligibility; completed/ACTIVE restriction; queued vs SENT;429 Retry-After;pending,409,503,uncertain feedback |
| Activate Staff |35f64500179847fa978243ca032b9a16 / #modal-activate |HTML409–432 and dynamic templates;intended password prerequisite/explicit confirm |**PARTIAL** |Actual dialog fails to open; body/footer remain empty; stale duplicate state logic; working has/no-password variants;pending/success/conflict/uncertain |
| Block Staff |35f64500179847fa978243ca032b9a16 / #modal-block |HTML438–469;explicit confirm and invitation revocation text |**PARTIAL** |Explicit assignment-history preservation, pending/error/uncertain result; safe context/identity; usable destructive CTA contrast |
| Add assignment |35f64500179847fa978243ca032b9a16 / #modal-assign |HTML475–527;Cinema selector plus date/time;explicit confirm;no role selector |**PARTIAL** |Real Cinema ID binding, timezone/UTC meaning, required validation, duplicate409, selector empty/error, pending/uncertain; no unconditional permission promise |
| Deactivate assignment |35f64500179847fa978243ca032b9a16 / #modal-deactivate-cinema |HTML534–563;explicit confirm and retained INACTIVE history |**PARTIAL** |Correct scope wording (not global login denial), pending/error/uncertain, destructive contrast |
| Reactivate assignment |35f64500179847fa978243ca032b9a16 / #modal-reactivate-cinema |HTML571–602;explicit confirm/cancel and Cinema context |**PARTIAL** |Original effectiveAt displayed/preserved, ACTIVE membership conflict, pending/error/uncertain; remove unconditional immediate admission claim |

Totals: **main screens READY0/PARTIAL3; dialog groups READY0/PARTIAL6**. Activation visual behavior is separately **UNVERIFIED/broken**, despite an inspectable partial template. None is classified MISSING solely because there is no standalone frame.

### 5.5. Concrete export behavior defects

The local browser executed the downloaded original HTML, not rewritten/repaired design code:

1. **Activation cannot open**: original openModal('modal-activate') throws “Cannot set properties of null (setting 'innerHTML')”. Actual containers are activate-dialog-body/footer, while the later renderer expects activate-content-container/activate-actions-container. Two definitions of openModal, setStaffState and confirmReinviteAction coexist. The later ones replace the earlier intended workflow.
2. **Mock account variants do not work consistently**: setStaffState('active') throws a null innerText error. blocked_has_pass and blocked_no_pass return without updating the ACTIVE badge or completed-password label; later branches use different keys. The intended prerequisite template must not be considered a successfully verified no-password state.
3. **Reissue on an ACTIVE/completed account is visibly offered** in header and account section. Current backend only reissues for incomplete/BLOCKED onboarding.
4. **Create is only two fields** and its prototype submit merely closes the form and shows a queued-message alert. This is not a designed returned201 StaffAccount/result or error/uncertain flow.
5. Detail prototype actions have mismatched IDs/state logic and hardcoded success toasts. These are mock design behaviors, **not live API integration or production failures**, and must not be copied into frontend authority.
6. Detail PNG contains mostly shell; HTML capture renders content. Cause/job state unknown; request a readable export as part of revisions.

No confirmation command was submitted to a backend, and no Stitch design was changed to make these checks pass.

### 5.6. Eight current backend resources

Actual source and approved v1.0 contract agree:

| Method/resource | Exact input / result | Critical design boundary |
|---|---|---|
| POST /api/v1/admin/staff |{fullName,email,phone};201 StaffAccount |Creates BLOCKED STAFF, private invitation and encrypted queued intent atomically; no password/role/status override |
| GET /api/v1/admin/staff |Only page/size;defaults0/20;size1–100;StaffAccount[] |No search/global filter/sort/totals; numeric ID order; onboarded STAFF projection |
| GET /api/v1/admin/staff/{staffId} |No query;StaffAccount |Protected administrative resource and limited fields; no last-login/staff-code/audit identity DTO |
| POST /api/v1/admin/staff/{staffId}/invitations |Exact {};StaffAccount |Only BLOCKED/incomplete onboarding; fresh24h invalidates old link, preserves assignments;3/hour actor bound/429 Retry-After3600 |
| PUT /api/v1/admin/staff/{staffId}/status |{status:ACTIVE or BLOCKED};StaffAccount |ACTIVE requires completed setup;block revokes outstanding invitations;no automatic activation |
| GET /api/v1/admin/staff/{staffId}/cinema-assignments |No query;Assignment[] |Retained ordered rows,multiple Cinemas,no hard delete |
| POST /api/v1/admin/staff/{staffId}/cinema-assignments |{cinemaId:string,effectiveAt:finite ISO instant};201 Assignment |Creates ACTIVE STAFF membership; no role/shift/assignment-type selector |
| PUT /api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status |{status:ACTIVE or INACTIVE};Assignment |Checks parent/STAFF assignment;effectiveAt and identity immutable;unique ACTIVE scope conflict |

Authority: bearer ADMIN **and current database ACTIVE/ADMIN** for all eight; Manager/Staff have no administration inheritance. Positive-bigint IDs remain canonical strings. Strict properties/query parsing, no duplicate/unknown/trailing body input, technical64KiB bound and no-store preserved.

StaffAccount fields: id,fullName,email,phone,status,passwordSetupCompleted,invitationExpiresAt (instant|null),deliveryStatus,deliveryAttempts. Account statuses ACTIVE/BLOCKED only. Delivery states NONE/QUEUED/LEASED/SENT/FAILED/EXPIRED/REVOKED; SENT is SMTP acceptance, not queued intent, inbox receipt or password completion. No invitation-validity endpoint, sentAt/lastLoginAt/consumedAt/staffCode/secret fields.

Assignment fields: id,userId,cinemaId,cinemaName,assignmentType,status,effectiveAt. Persisted type vocabulary STAFF/MANAGER; grant/status API scope is STAFF. ACTIVE/INACTIVE are the statuses; future effectiveness is a separate time condition. An ACTIVE assignment alone does not promise usable Check-in or login/admission: current account/role/time/operational context remain server-authoritative.

Create reuses actual identity/email/Vietnamese phone validation (required name≤150,email≤254,phone≤30 before normalization), duplicate normalized email409. Required crypto/HTTPS-base configuration can fail safe503. Assignment grant verifies Cinema existence, not an ACTIVE-Cinema-only rule. Existing Admin getAdminCinemas supplies a selector; no new endpoint needed.

### 5.7. API alignment matrix

| UI action or field | Actual backend support | Match/mismatch | Required correction |
|---|---|---|---|
| Staff page/size + Previous/Next |Requested-page StaffAccount[] only |MATCH |Keep; no global counts/search/filter/sort additions |
| Name/email/account/setup columns |Exact DTO fields |MATCH |Use authoritative fields; localized labels without changing serialized states |
| Create name/email only |phone also mandatory |**MISMATCH HIGH** |Add labeled validated phone; no hidden default |
| Initial BLOCKED “until setup finished” |Still BLOCKED until explicit ADMIN activation |**MISMATCH HIGH** |Say password setup and account activation are two separate steps |
| No Admin password/role/token input |Private Staff setup/fixedSTAFF role |MATCH |Preserve |
| “Đã gửi thư (Chờ mở thư)” / “Đã hoàn tất xác thực” in delivery column |SENT means SMTP accepted;no open-tracking/verification delivery state |**MISMATCH HIGH** |Map exact delivery states; keep setup separate,do not infer inbox/open state |
| “SENT (Đã gửi vào hàng đợi SES)” / AWS SES toast |QUEUED differs from SENT;actual Spring Mail/SMTP contract has no SES promise |**MISMATCH HIGH** |Remove provider claims; show queued vs SMTP-accepted truthfully |
| NV-8821/NV-0482 staff codes |StaffAccount.id is canonical bigint string |**MISMATCH** |Show actual backend ID; no invented independent Staff code |
| Detail drawer invitation sent date/last login |Neither field supplied |**MISMATCH** |Remove unsupported fields or replace with actual DTO projection |
| “24 giờ kể từ phát hành” as current expiry |Nullable absolute invitationExpiresAt supplied |**MISMATCH** |Display actual expiration/timezone and null case;duration only explanatory |
| Reissue on ACTIVE/completed account |Only incomplete/BLOCKED |**MISMATCH HIGH** |Hide/disable with explanation;design409/rate/uncertain states |
| Explicit activation/private prerequisite template |Supported;export state/renderer broken |PARTIAL |Repair design variant;show truthful prerequisite,current-state/409/uncertain |
| Block/revoke outstanding invitations |Supported,history retained |PARTIAL |Add preservation/pending/error/uncertain views |
| Multiple retained Cinema assignments |Assignment[] supports this |MATCH concept |Current detail “3 rạp” may derive from returned rows;not a forbidden global Staff count |
| Trực tiếp tại rạp / Dự phòng ca trực / Chính thức |Not assignmentType enums or shift DTO |**MISMATCH** |Use STAFF presentation;do not add staffing categories |
| SẮP CÓ HIỆU LỰC in status column |ACTIVE/INACTIVE + original effectiveAt |**MISMATCH** |Display actual status plus separate future-effective note |
| Hủy trước ngày |No separate cancellation/deletion operation |AMBIGUOUS/PARTIAL |Map explicitly to confirmed INACTIVE with history preserved,or omit;no new endpoint |
| Add Cinema and date/time |cinemaId + finite UTC instant supported |PARTIAL |Use canonical Cinema IDs,timezone/validation and server-result feedback |
| Deactivation prevents “đăng nhập ... tại rạp” |Scope revocation;not general account login block |**MISMATCH** |Describe loss of this Cinema scope,not login denial |
| Reactivation “lập tức được cấp quyền” |Original effectiveAt/current account/context still required |**MISMATCH HIGH** |Show original time;avoid unconditional immediate-operation claim |
| Delete/reset/role escalation/assignment identity editing |Not supported |ABSENT / MATCH |Do not add |
| Pending,429,409,503,lost-response states |Real failure/uncertain outcomes exist |**MISSING STATE DESIGNS** |Explicit read recheck where known,avoid automatic command replay |

No backend change is proposed to accommodate these designs.

### 5.8. Fidelity, responsive and accessibility evidence

**Positive fidelity:** original CSS tokens include background #0F131C,primary-container #F59E0B,Space Grotesk headings and Plus Jakarta Sans body. Browser computed background rgb(15,19,28) and body font “Plus Jakarta Sans”. List/Create/Detail share the same dark/amber sidebar/card/dialog family; no Customer or operational scanner workflow in the two new Admin pages.

**Precise differences:** new fixed sidebar is288px with pl-72/left-72 at every width; existing AdminShell uses180px sidebar from md and wrapping nav on small screens. New “Cài đặt hệ thống”,notification bell,“Quản trị viên cấp cao”/privilege bar have no corresponding existing route/API or privilege tier. Do not add those capabilities. New rounded-xl config is12px for panels versus16px shared SurfaceCard/design narrative; spacing uses valid shared rhythm, but radius/hierarchy should align to existing primitives. Mixed SYSTEM ADMIN/SECTION/AUDIT/SES/Mock labels require natural Vietnamese and removal of prototype/internal decorations in production.

Previous-reference limit: the historical preflight had no ADMIN Staff List/Create design, and no independent prior Admin Create frame/version is exposed now. Current List and its Create overlay were compared directly against current Detail and repository Admin conventions. Fidelity to an unspecified earlier version cannot be confirmed; public Customer Create Account is not an Admin design substitute.

**Targeted isolated export-browser review** (headless installed Edge via existing Playwright; original local HTML, external access restricted to exported Tailwind/fonts; no project server/backend/session):

| Width × height | Staff List | Staff Detail | Interpretation |
|---|---|---|---|
|390×1000 |document scrollWidth454;main width102 behind fixed288px sidebar |scrollWidth530;main width102;content stacks into narrow strips |**FAIL** responsive usability and document overflow;no mobile Admin variant |
|768×1000 |document width768;main480;columns beyond name/email clipped in visual capture |document width768;main480;assignment area horizontally scrollable,identity/Cinema strings truncate |PARTIAL;no document overflow does not prove complete table/label readability |
|1440×1000 |document width1440;main1152;list visible |document width1440;main1152;detail visible,main height1421.25 |Usable base desktop composition;remaining semantic/workflow issues |

Create plus five working dialog panels fit the tested viewport at all three widths (**18 geometry observations**); at390px their heights were516,349.5,325.875,447.375,376.25 and327.5px respectively. This is panel-fit evidence, not a successful activation-dialog test or mobile navigation proof. Smaller viewport heights, virtual keyboard and enlarged text remain unverified.

Accessibility findings from actual DOM/limited probe:

- No native dialog or role=dialog/aria-modal on the overlay containers. Create inputs have no IDs/associated labels; assignment select/date/time also have zero associated labels. Labels exist visually, but accessible naming is incomplete.
- One real keyboard probe: focus Create name input,press Escape — **overlay remains open**. Full Tab trap/focus restoration/screen-reader compliance not tested and not claimed.
- Many controls below44px: at1440 base view,List20/20 visible controls and Detail21/23 had height<44; dialog confirm buttons commonly36px. Primary controls need shared44px minimum.
- Destructive Block confirm computed foreground rgb(105,0,5) on rgb(147,0,10), contrast approximately **1.40:1**, height36px; screenshot shows nearly unreadable red-on-red text. Correct semantic on-error-container/contrast pair in design.
- Inputs have some focus:ring styles; no broad focus-visible/keyboard-navigation specification. Badges pair color with text/icons positively, but wrong delivery/type vocabulary remains.
- Loading skeleton exists in List; no status announcement text in the loading container. Detail/read and command loading/disabled/error/uncertain variants are absent.
- Existing long Vietnamese sample names wrap; email/Cinema labels clip/truncate at smaller widths. No maximum-length identity/email stress fixture, formal contrast audit, zoom/reflow, physical-device or screen-reader matrix was run.

Browser captures are **design-export evidence**, not real frontend route QA or live Admin API verification.

### 5.9. Prioritized Stitch revisions

**P0 — required before implementation readiness**

1. List #modal-create: add phone per exact DTO and label/error associations; correct private setup + **still BLOCKED awaiting explicit Admin activation**. Design duplicate409,submitting/disabled,confirmed201/queued result,503/configuration and uncertain-response views. Do not add password/role/raw token.
2. Detail: repair duplicated/obsolete script/frame references; supply readable PNG and working ACTIVE/BLOCKED-with-password/BLOCKED-without-password and activation-prerequisite/confirmation variants. Show actual Staff ID and nullable expiresAt.
3. Correct delivery mapping across both screens;remove SES,inbox/open tracking and “verification complete” as delivery state. Add all supported states or shared reusable variants; restrict reissue to incomplete/BLOCKED,with429 Retry-After/409/503/uncertain designs.
4. Correct assignment type/status/effectiveAt presentation and original-time reactivation semantics;remove unconditional access/login promises. Map future deactivation to existing INACTIVE confirmation,not a novel cancel/delete policy.
5. Add current read/loading/empty/404/401/403/server-error states for Detail/assignments;explicit pending/success/failure/conflict/uncertain states for six commands. Preserve backend authority;safe GET review of known resources,no automatic command retry.
6. Responsive Admin shell/list/detail at390/768/1440;mobile cards or an accessible bounded table region,readable long fields/actions,consistent fixed-header clearance. No permanent288px sidebar on390px.
7. Correct destructive CTA contrast,44px targets,semantic field labels/errors and dialog focus/cancel behavior;show keyboard states in revised references.

**P1 — consistency and traceability**

- Resolve overlapping List detail drawer versus full Detail destination;remove unsupported sent date/last-login fields and align navigation/back behavior.
- Cinema selector empty/loading/error,canonical ID presentation,timezone explanation and validation/duplicate-membership409;preserve original effectiveAt and retained rows.
- Explain block preserves assignments;deactivation only affects the named Cinema;explicit permission/read failures and current role handling.
- Remove unsupported sidebar/settings/notification/privilege-tier decorations;keep actual Admin navigation and existing destinations.

**P2 — polish after essential corrections**

- Match shared16px card/radius hierarchy and spacing;Vietnamese copy replacing internal/provider/English labels.
- Replace invented audit-compliance/immutable-retention promises with supported history wording.
- Supply consistent readable preview exports and documented small-height/zoom/long-text behavior.

These are revision scopes and acceptance criteria, not authorization to edit Stitch or add product requirements. No independent route per dialog is needed.

## 6. Files Created

- docs/reports/2026-10-13_admin-staff-management-stitch-postdesign-audit_report.md.
- Ignored audit downloads/helpers/JSON/screenshots described in§5.2 only;not application assets.

## 7. Files Modified

**None.** Incoming untracked preflight report preserved byte-for-byte. No handoff/history/source/Stitch/reference/configuration/migration modification,no file move.

## 8. Verification and Evidence Boundaries

| Actual check | Result |
|---|---|
| Fresh MCP project/list/metadata refs/get_screen |PASS inspection:43 listed,60 canvas entries,59/59 resource reads |
| HTML content downloads/comparison |PASS inspection:41/41;39 existing exports hash-identical;2 new Admin content matches |
| New MCP PNG download/view |2/2 accessible;List populated,Detail mostly blank/incomplete-looking |
| Isolated original HTML browser rendering |Six base viewport captures inspected;mobile failures/tablet limitations recorded,not blanket PASS |
| Dialog content/visual inspection |Six containers/templates inspected;five open,activation throws null innerHTML |
| Dialog viewport geometry |18 panels fit tested widths/heights;does not include broken activation |
| List read variants |loading skeleton,empty,error,403 exported and switched locally |
| Detail mock variants |Broken/inconsistent:active null innerText;two BLOCKED variants leave ACTIVE/completed labels unchanged |
| Limited keyboard/DOM/contrast |Escape Create does not dismiss;missing labels/dialog semantics;1.40:1 destructive text contrast |
| Actual backend contract |Source/DTO/security/protected-function comparison;no live commands |
| Report links/UTF-8/conventions/Git preservation |Validated before completion;historical preflight SHA-256 retained |
| TypeScript/lint/unit/build/Playwright project suite/mvn verify |**NOT RUN** — documentation-only audit,no app change;targeted export inspection only |
| Live Gmail/onboarding/Admin activation/database/Neon/provider |**NOT RUN** |
| Generation-job completion |**UNVERIFIED**,not exposed by MCP |

Failure disclosure: the first supplemental browser helper stopped on the actual Detail setStaffState('active') null-element error. The audit helper was adjusted to **record and continue past the export error**,without changing original HTML/design/source; final JSON retains that failed state. An initial inline Node contrast calculation failed from PowerShell argument quoting; equivalent read-only PowerShell calculation succeeded. Neither failure was hidden as a passing application test.

No project test count is claimed as fresh. Historical Phase4D215 unit/347 Playwright and backend410 results belong to their original reports.

## 9. Requirement Reconciliation

- **PASS audit deliverables**: current normal/hidden inventory,all new Admin identities,exports,three/six/API matrices,fidelity/responsive/accessibility evidence,revision list and precise readiness decision.
- **PARTIAL design compliance**: relevant designs now exist;essential contract/state/mobile/a11y requirements remain deficient.
- **PASS preservation**: current contract/backend financial/Staff authority and migration headV14 unchanged;no source/design/config/DB/Git mutation.
- **NOT APPLICABLE implementation acceptance**: no frontend implementation authorized or performed.

## 10. Deviations / Conflicts

No scope deviation. Standalone Create Staff screen absent but actual Create overlay inspected;not incorrectly classified missing. No six-route demand.

Current contract is ADMIN-only despite broader historical Manager role requirements. New “Quản trị viên cấp cao” label/privilege bar is not an approved additional role or permission. No requirements rewritten to match designs.

Existing historical DOCX/spaced document names and .stitch/DESIGN.md remain untouched. No convention exception or naming migration introduced.

## Convention Compliance

Against [canonical conventions](../development/project-conventions.md),including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/document naming |PASS |Requested dated kebab-case report;ignored lowercase evidence directory |
| Code/import/route naming |NOT APPLICABLE |No application code/import/route change |
| Domain/status/API terminology |PASS audit |Actual Admin/Staff/Cinema DTO/status/endpoint values;design mismatches explicitly flagged |
| Database convention |NOT APPLICABLE |No database/migration change;V14 retained |
| Report/requirements/history |PASS |Template-equivalent sections,real IDs,relative source references,prior report unchanged |
| Scope/Git preservation |PASS |Only new report;incoming preflight retained,index/HEAD unchanged;no commit/push/deploy |

## 11. Limitations and Unverified Claims

Inventory is current authenticated MCP view;resources outside its project metadata/list cannot be ruled out. All visible/addressable references succeeded,no observed access blocker.

MCP cannot confirm generation jobs. Detail PNG capture discrepancy remains unexplained;local HTML visibility is not proof of a finished provider job.

Two actual Admin PNG previews plus isolated renders were inspected. All other HTML was content-inspected and compared;not every asset or historical PNG was visually re-audited.

Browser review used original standalone exports with Tailwind CDN/fonts in headless Edge,file URLs and1000px height. It does not establish Next/React integration,real Admin API auth,physical mobile behavior,virtual-keyboard fit or live delivery. Only a limited Escape probe/DOM geometry/one computed contrast pair;no full accessibility certification.

No independent previous Admin List/Create design version or screen ID supplied/exposed;historical fidelity beyond current content/repository foundation remains unverified. No actual creation timestamps exist in get_screen;“new” means newly discovered relative to the verified preflight ID set.

## 12. Final Readiness Decision and Next Task

**Exactly one decision: OPTION B — STITCH REVISIONS REQUIRED.**

All three main functions and six dialog groups are **PARTIAL**;zero READY. Connection/export access is sufficient for this finding,so not OPTION C. Focused contract/state/responsive revisions in§5.9 are required;then separately re-verify revised HTML/PNG and working variants.

Do not authorize implementation from these attractive desktop captures alone. Backend already supports the approved scope;do not invent endpoints or statuses to match design extras. **STOP — no design edits,frontend implementation,commit or next phase started.**

## Appendix. Current Resource Inventory

Listed means present in normal list_screens;Hidden means recovered from project metadata. HTML indicates available/content-inspected export,not completed generation. Image titles are abbreviated for readability;full titles retained in sanitized evidence.

| ID | Actual title / abbreviated image title | Listing | Device / resource | Export |
|---|---|---|---|---|
| 16dbe62e3be744e6ab4123fc004283e3 | Smart Cinema - Movie Detail | Listed | DESKTOP | HTML + PNG |
| cd77377730824fbcba1b9f12e4e4c784 | Fresh hot buttery golden movie cinema popcorn overflowing in a sleek black premium paper bucket with warm cinema spotlighting on a dark sleek … | Listed | Image asset | PNG only |
| d194632f74d04fb3b8b46e0631b8c0f7 | Chilled fountain cola soda in a sleek black matte cinema cup with condensation droplets and a straw, ice cubes, dark mood studio lighting | Listed | Image asset | PNG only |
| 817f0a5e5f02438b86a433aebc1ee807 | Theatrical film key art poster for an epic alien planet fantasy titled Fire and Ash, featuring an otherworldly volcanic landscape with glowing… | Listed | Image asset | PNG only |
| 98e0897836c840a09132c20bc2023d3a | Crisp lemon lime soda with fresh lime slice, fizzing bubbles in sleek dark cinema cup, ice cubes, dark studio lighting, movie snack commercial… | Listed | Image asset | PNG only |
| 8de77c4d95c141f9947a4f7bf4cad7c9 | Smart Cinema - Cinema Selection | Listed | DESKTOP | HTML + PNG |
| 9b54d3edecd74da0b19c5ab08bafdbd6 | Official theatrical movie poster style for Gladiator II, ancient Roman gladiator warrior standing inside the colossal shadowy Colosseum arena,… | Listed | Image asset | PNG only |
| b023e6ffbd0c424d9244aaa8393c442c | Smart Cinema - Payment Result & Order Confirmation | Listed | DESKTOP | HTML + PNG |
| 851e390ea6f64946b1c3e9814de03d63 | Smart Cinema - Quét mã QR soát vé Mobile | Listed | MOBILE | HTML + PNG |
| 602baa042d22404d8b31d461351aa42d | Smart Cinema - Food & Drinks | Listed | DESKTOP | HTML + PNG |
| 82d34150a46a467a90ea4f0933b1e249 | Sweet golden glazed caramel popcorn in a stylish dark matte cinema snack tub with glistening caramel coating, warm studio lighting, gourmet mo… | Listed | Image asset | PNG only |
| a808fb16fcad452696636be952ea70b1 | Smart Cinema - Showtime Selection | Listed | DESKTOP | HTML + PNG |
| 517d9ab1a5814297af43fefb65e6704f | Official theatrical movie poster style for Past Lives, romantic drama key art featuring a man and a woman standing near a ferry railing lookin… | Listed | Image asset | PNG only |
| 777b204432ad4fba84065c10697951e9 | Smart Cinema - Payment Processing & Verification | Listed | DESKTOP | HTML + PNG |
| 0cc11f6226c74b6291ef49660e63f748 | Smart Cinema - Payment Method Selection | Listed | DESKTOP | HTML + PNG |
| fdea388b4b24406799ab087b31239835 | Smart Cinema - Seat Selection | Listed | DESKTOP | HTML + PNG |
| 6edaa1ec31154bf0a4b43a03091c0166 | Official theatrical movie poster style for Oppenheimer, silhouette of a man wearing a fedora hat and trench coat standing against an immense s… | Listed | Image asset | PNG only |
| d17964cf5cf34ae5ae8293d927d8a638 | Cinematic landscape wide shot of vast rolling desert sand dunes on an alien planet under a dusky starry night sky with twin moons, warm atmosp… | Listed | Image asset | PNG only |
| fe57105a74494ca4807f61ae495f7c29 | Smart Cinema - Movie Listing | Listed | DESKTOP | HTML + PNG |
| f5904cd07f924d25a0ca844636e93060 | Smart Cinema - Sign In | Listed | DESKTOP | HTML + PNG |
| 52aa55f16d2640d68efb6c399d5fb990 | Smart Cinema - Booking Summary / Review Order | Listed | DESKTOP | HTML + PNG |
| 385a395694ed4adc86af9a4a86891343 | Theatrical animation movie poster for a multiverse comic book hero. An athletic acrobatic masked hero in a black and red suit leaping forward … | Listed | Image asset | PNG only |
| 896acb2c4d5e42c396d4eba9706a7b3a | Theatrical movie key art poster for an animated multiverse superhero adventure film, featuring an acrobatic hooded hero diving through vibrant… | Listed | Image asset | PNG only |
| e443081476ef45b889c07407a37fc00a | Theatrical movie key art poster for an epic alien planet sci-fi adventure titled 'Fire and Ash'. A stunning alien fantasy landscape with biolu… | Listed | Image asset | PNG only |
| 0336c7c6d22a4fc19c1b39c453ca62fc | Smart Cinema Admin - Quản lý nhân viên | Listed | DESKTOP | HTML + PNG |
| ca8ef62a23414c8b8047b566375cff5d | Official theatrical movie poster style for Interstellar 10th Anniversary, lone astronaut in modern space suit standing on an icy alien water p… | Listed | Image asset | PNG only |
| df50977f707947758394894e7a282864 | Official theatrical movie poster style for Dune Part Two, epic desert planet Arrakis with vast sweeping orange sand dunes, giant sandworm silh… | Listed | Image asset | PNG only |
| 82c296db655348e2a3f14776f936989e | Smart Cinema - Create Account | Listed | DESKTOP | HTML + PNG |
| 1017f7c1f77943579d9bb1bee37f7718 | Smart Cinema - Food & Drinks (Seat Hold Expired) | Listed | DESKTOP | HTML + PNG |
| 33afd83a57494e96bc46d408596fc034 | Official theatrical movie poster style for Furiosa A Mad Max Saga, fierce female warrior silhouette with mechanical arm standing in front of a… | Listed | Image asset | PNG only |
| 28c2fd5f49c0437eb2e77f8b9814be84 | Smart Cinema - Chi tiết đơn vé Mobile (Booking Detail) | Listed | MOBILE | HTML + PNG |
| 05a2ad0f96cd4502ba97662d5f0a2e12 | Smart Cinema - Quét mã vé & Xác minh Booking | Listed | DESKTOP | HTML + PNG |
| 85bfbbac541b4455be5bd383218436e6 | Smart Cinema - My Profile | Listed | DESKTOP | HTML + PNG |
| 081f444b338947afad9e66d06a8d8f12 | Premium branded pure still mineral water in sleek glass or premium dark bottle on dark cinema bar counter, condensation droplets, luxury studi… | Listed | Image asset | PNG only |
| 35f64500179847fa978243ca032b9a16 | Smart Cinema Admin - Chi tiết nhân viên | Listed | DESKTOP | HTML + PNG |
| b850455e65fc482a8ef3332cb672683d | Smart Cinema - Booking QR & Passes | Listed | DESKTOP | HTML + PNG |
| 3f5732811dba482e95b07e5aa6251b21 | Smart Cinema - Vé của tôi Mobile (My Bookings) | Listed | MOBILE | HTML + PNG |
| 14dc6c1445a747b88c866508463e9879 | Smart Cinema - Authenticated Account Menu | Listed | DESKTOP | HTML + PNG |
| c667635786b940938d6071bb335830f9 | Smart Cinema - Customer Homepage | Listed | DESKTOP | HTML + PNG |
| 713c9e3fae5f4ef7a907102243ebff5c | Smart Cinema - Bàn làm việc nhân viên soát vé | Listed | DESKTOP | HTML + PNG |
| 2a5914f8462a444895bd014510ba6282 | Official theatrical movie poster style for Civil War, close-up dramatic shot of photojournalist camera lens reflecting burning urban dystopian… | Listed | Image asset | PNG only |
| d989b7d6ffb04be6a964be21e298a4fa | Smart Cinema - Thẻ QR Vào Rạp Mobile (Booking QR Pass) | Listed | MOBILE | HTML + PNG |
| f145e703600c491bb9fc5b2d9cbafbf4 | Premium cinema movie combo set featuring a large tub of popcorn, two fountain soda drinks with straws, and chocolate candies, arranged beautif… | Listed | Image asset | PNG only |
| 019a53e2bbc242ca98a84fa1a10192a6 | Cinema Seat Selection | Hidden | DESKTOP | HTML + PNG |
| 10765353845882543715 | Accessibility Audit.md | Hidden | Document | Text only |
| 265e1328babf486b9245fb508624d9e6 | Smart Cinema - Thẻ QR Vào Rạp Toàn Màn Hình (Booking QR Pass) | Hidden | DESKTOP | HTML + PNG |
| 422f032569974172b8217983f7738b41 | Smart Cinema - Ticket Detail | Hidden | DESKTOP | HTML + PNG |
| 4b9b19206fc14015a77322f58b113bd1 | Smart Cinema - Vé của tôi (My Bookings) | Hidden | DESKTOP | HTML + PNG |
| 5c2d7472096a4d9099ff2f62a1b6da68 | Smart Cinema - Khởi tạo thanh toán VNPAY Sandbox | Hidden | DESKTOP | HTML + PNG |
| 5e46faa89712407ca07bf131aaae1316 | Smart Cinema - Booking Summary / Review Order | Hidden | DESKTOP | HTML + PNG |
| 66beffb2e06e49d3b103533d25f5c54d | Smart Cinema - Thông tin đặt vé & Tóm tắt đơn hàng | Hidden | DESKTOP | HTML + PNG |
| 85a6a5848b1c499594bc3e3faeecf9b8 | Smart Cinema - Customer Homepage | Hidden | DESKTOP | HTML + PNG |
| 8c85de5a42c34780915d8661021246ab | Smart Cinema - Individual QR Ticket | Hidden | DESKTOP | HTML + PNG |
| 91a9d638f6694887a3299111e6026a52 | Smart Cinema - Food & Drinks (Hold Expired) | Hidden | DESKTOP | HTML + PNG |
| b35a7c6b366d4c2a90d8e04b76c4b99b | Smart Cinema - My Tickets & Passes | Hidden | DESKTOP | HTML + PNG |
| c7f09eb14aa44fbfa2cfc44e86753013 | Smart Cinema - Chi tiết đơn vé & Trạng thái vé (Booking Detail) | Hidden | DESKTOP | HTML + PNG |
| ca1c28a605b64d4ebeb59d4c00c23d42 | Smart Cinema - My Tickets | Hidden | DESKTOP | HTML + PNG |
| ca8f557d4c2f4ea78fa40552b7b41ba3 | Smart Cinema - Kết quả thanh toán & Trạng thái vé | Hidden | DESKTOP | HTML + PNG |
| e58f593344cd4fdaac8bfe35a885f3d0 | Smart Cinema - Xác minh & Đối soát thanh toán VNPAY | Hidden | DESKTOP | HTML + PNG |

