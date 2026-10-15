# Phase 4E — Google Stitch Final Verification

## 1. Task Information

- Date: **2026-10-14**, Asia/Saigon.
- Type: **Strictly read-only design/contract audit**; no Phase 4E implementation.
- Project: **Smart Cinema Ecosystem**, `projects/1208499799798658711`.
- Final decision: **OPTION B — REVISIONS REQUIRED**.
- Entry/final HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; index empty.

Hai bản “Audit Refined” sửa được numeric IDs, AWS SES/Retry-After, assignment state transitions và focus của sáu Detail dialogs. Tuy nhiên, phone validation, Create recovery states/focus, navigation, error claims và dialog recovery vẫn chưa đạt. Có hồi quy tràn ngang ở Detail 390px. Chưa đủ điều kiện triển khai từ thiết kế này.

## 2. Requested Work and Method

Kiểm tra hai ID cũ trước, đọc báo cáo revision, lấy fresh project/list/get_screen, tải và xem PNG/HTML gốc; chạy interactive exported HTML bằng Playwright/Microsoft Edge **155.0.4283.45** tại **1440×1000, 768×1000, 390×1000**. Không sửa HTML để làm kiểm tra pass. Kiểm tra keyboard, dialogs, loading/empty/errors, success fixtures, repeated assignment transitions và navigation. Các thao tác prototype chỉ thay đổi dữ liệu giả trong browser cô lập, không gọi API ứng dụng hoặc gửi thư.

## 3. Documents and Source Reviewed

- [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), root/frontend AGENTS; Frontend/Review workflows và Document/UI_UX/Requirement Traceability/Project Convention rules; [report template](templates/TASK_REPORT_TEMPLATE.md).
- [Previous revision verification](2026-10-14_admin-staff-management-stitch-revision-verification_report.md), [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [current handoff](../ai/current-handoff.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md).
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md).
- Actual [controller](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [request parser](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [repository/DTOs](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [security](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), [V13 protected assignment functions](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql), [phone validator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java), [field validation](../../backend/src/main/java/com/smartcinema/auth/dto/RegisterUserRequest.java), [AdminShell](../../frontend/src/features/admin/admin-shell.tsx) and current app route inventory.

## 4. Requirements Traceability

| Actual requirements | Audit coverage | Design reconciliation |
|---|---|---|
| BRD BR-002/003/004; SRS FR-AUTH-006/007/008/010 | ADMIN authority, account status, Cinema scope | PARTIAL: gates preserved; unsupported permission/error wording remains |
| BRD BR-053/055; SRS FR-ORG-002/003/004/005, FR-AUDIT-003 | STAFF assignments, immutable time, retained history | PARTIAL: original-time/state bugs fixed; duplicate/conflict and permission hints incomplete |
| SRS NFR-SEC-006/010/011/012 | Validation, privacy, safe errors, rate limits | PARTIAL: no secrets exposed; phone and error semantics require revision |
| SRS NFR-UX-004; user width/keyboard/state checklist | Understandable errors and recovery | PARTIAL: Detail dialogs improved; remaining failures below |
| User read-only/scope constraints | Preserve source, designs and historical reports | PASS |

Previous P0/P1 labels below are audit finding labels, not invented requirement IDs. Historical Manager requirements do not expand the approved **ADMIN-only** Staff HTTP contract.

## 5. Findings

### 5.1. Live connection and latest available screens

**CONNECTED AND WORKING**: project, listing and four relevant get_screen reads succeeded; metadata userRole **OWNER**. Final project/list recheck retained the same IDs and update time **2026-10-13T17:59:26.159393Z** (2026-10-14 00:59:26, Asia/Saigon).

| Screen | Previous revised ID | Latest available refined ID | HTML/PNG |
|---|---|---|---|
| Staff List — Quản lý nhân viên | `fb57bdfdafcb4f5fb28213bc0e9d760d` | **`8a4df96f0d8d45b9b7c4fcda87b8153b`** | Both downloaded and readable; HTML 57,448 bytes; PNG 100,957 bytes |
| Staff Detail — Chi tiết nhân viên | `54935e4a78b24fafa8876dc445306051` | **`87b9d7362b31483a8d98ab0cbd772075`** | Both downloaded and readable; HTML 90,934 bytes; PNG 96,019 bytes |

Selection evidence: two additional resources titled **“Audit Refined”**, their revised content, and unchanged old HTML hashes. MCP does not expose per-screen revision timestamps/lineage; “latest” means latest available replacement candidates compared with the previous audit. Both are DESKTOP resources, metadata dimensions 2560×2760 and 2560×3788; responsive behavior was tested from HTML, not inferred from these dimensions.

Normal listing increased **45→47 resources**; canvas **62→64 entries**; sourceScreen references **61→63**. The 16 additional hidden references remain the same set. These are resource counts, not counts of unique completed UI screens; unrelated resources were not re-audited. Canvas has **19 “Generating” labels**, including the new resources. MCP provides no generation-job completion/error status, so actual job completion remains **UNVERIFIED** despite accessible exports.

### 5.2. Before/after reconciliation

| Previous finding | Verified improvement | Remaining result |
|---|---|---|
| P0-01 Create contract/validation | Required name/email/phone; 150/254 name/email limits; invalid native phone pattern removed; field errors now linked by aria-describedby; BLOCKED → private setup → ADMIN activation preserved | **PARTIAL:** phone validator/maxlength wrong; pending inputs editable; Create 503/uncertain states removed |
| P0-02 IDs/activation | Staff ID `125`, Cinema IDs `1`–`6`, Assignment IDs `101` onward; model/select IDs are strings; A/B/C gates and nullable expiry retained | **FIXED identity/gates:** no UUID/CUID schema. Activation wording should qualify STAFF/Cinema scope |
| P0-03 Delivery/reissue | AWS SES removed; SMTP acceptance wording; actual 3/hour and Retry-After **3600**; reissue gate retained | **PARTIAL:** non-SENT variants retain SENT-specific help; mock reissue still forces SENT and increments deliveryAttempts |
| P0-04 Assignments | ACTIVE/INACTIVE separated from future date; repeated `102` cycles preserve Jan 1 time; future `103` changes state and preserves Oct 20 time | **FIXED original-time/state defects:** duplicate ACTIVE assignment and specific conflict UX remain incomplete |
| P0-05 API state coverage | Detail skeleton, assignment empty, 404/403 and uncertain-result warning added; six commands show pending feedback | **PARTIAL:** no dedicated authentication-expiry or read-unavailable state; wrong 409/503 explanations; uncertain warning corrupts subsequent Block dialog |
| P0-06 Responsive geometry | List remains contained; mobile drawers open/close; Detail table scroll remains local | **REGRESSION:** Detail header creates 397px document width at 390px |
| P0-07 Dialog/accessibility | All six Detail dialogs open with Enter, receive focus, trap Tab/Shift+Tab, close with Escape, restore focus; confirm targets ≥44px | **PARTIAL:** List Create has no trap/restore; its close target is 32px; other List targets remain below 44px |
| P1 navigation/privileges | List adds numeric-ID detail links; Settings/notifications/privilege-tier decoration removed | **PARTIAL:** detail links are unmapped `/staff/{id}`; back-to-list is `href="#"`; unsupported organizational/error claims remain |

No hard-delete, password entry, role elevation, arbitrary assignment type or new operational Staff privilege was added. Dark/amber palette, configured fonts, status labels/icons, account variants and retained history presentation remain present.

### 5.3. Exact remaining revisions

**List ID `8a4df96f0d8d45b9b7c4fcda87b8153b`:**

- **P0 — Phone:** `validateVietnamesePhone` restricts prefixes to 3/5/7/8/9, only trims, and field maxlength is **12**, versus server raw limit **30** and separator normalization. Browser rejected five server-valid examples: `983241889`, `0123456789`, `+84123456789`, `0912 345 678`, `(0912)-345-678`. Restore exact supported formats; do not tighten backend policy. Invalid `abc`/`12345` are now rejected correctly.
- **P0 — Recovery regression:** previous Create 503 and uncertain-result views are absent from latest markup/script/scenario controls. Restore distinct unavailable and lost-result guidance without claiming account creation failed or automatically repeating POST. Pending inputs still accept edits; shown field errors never set aria-invalid.
- **P0 — Create focus:** initial focus/Escape work, but Tab/Shift+Tab escape the modal and close does not restore the actual Create trigger. Implement equivalent focus handling to Detail in a future design revision.
- **P1 — Navigation:** desktop/mobile links `/staff/125`–`129` have no exported Detail mapping and no existing application route. Actual clicks at all three widths produce `ERR_FILE_NOT_FOUND` in isolated export testing. Wire List → Detail and return navigation between approved prototype frames; do not invent a backend endpoint or claim Phase 4E routes already exist.
- **P1 — Presentation:** replace misleading “Email doanh nghiệp”/10-digit-only phone guidance; enlarge List close/navigation/pagination targets (32px close; 40px nav; 34px pagination; menu width 38px). Prototype-only controls are excluded from product touch-target acceptance.

**Detail ID `87b9d7362b31483a8d98ab0cbd772075`:**

- **P0 — Uncertain recovery breaks Block:** open network warning → Escape or close icon → open Block: title remains “Kết quả phản hồi mạng chưa xác định” and `#btn-submit-block` count is **0**, at every width. Only the acknowledgement button resets content. Reset on every close path; keep the normal destructive confirmation usable. “Đã hiểu & Kiểm tra lại” currently closes/resets only, without a recheck.
- **P0 — Safe errors/read coverage:** 409 asserts another Admin is editing; 503 asserts email maintenance/overload. Neither cause follows from generic API status. Missing dedicated read-unavailable/network and 401/login-resume treatment remains; existing AdminShell supplies an authentication boundary to reuse. Restore safe states without new API capabilities.
- **P1 — Unsupported claims:** 403 refers to “Trưởng bộ phận Quản trị” granting permission; 404 suggests staff “đã được điều chuyển”; uncertain guidance suggests a “lịch sử thao tác” viewer. No such privilege tier, transfer workflow or audit-viewer API is established by this contract. Remove these claims. Also remove invented “CONTRACT V2.5”, “100% AUDIT READY” and List “v2.4.0 (Production)” product assertions; current Staff contract is v1.0.
- **P1 — Delivery truthfulness:** seven backend enum values can update the raw status fields, but static help still explains SENT for NONE/QUEUED/LEASED/FAILED/EXPIRED/REVOKED. Supply appropriate localized states; preserve SMTP acceptance vs inbox/setup distinction. Mock confirmation must not imply POST reissue guarantees SENT or determines SMTP attempt count.
- **P1 — Assignment conflict/scope:** assigning Cinema `4` twice yields two synthetic ACTIVE assignments `104`/`105`; actual backend rejects duplicate ACTIVE scope. Provide accurate conflict and unavailable/empty selector states. “Sẽ tự động áp dụng khi đến mốc thời gian” and activation “thao tác bình thường” need account/assignment/Cinema-scope qualification, not an unconditional permission promise. Original effectiveAt fixes must remain.
- **P1 — Responsive regression:** header account area extends to **397.33px** at viewport 390; document scrollWidth **397**. Correct header wrapping/clearance while preserving contained table scrolling.

### 5.4. Actual backend contract boundary

Base **`/api/v1/admin/staff`**, authenticated ADMIN plus current database ACTIVE ADMIN check; no-store responses. All IDs are canonical positive-bigint strings (within Java long), not UUID/CUID.

| Method/path relative to base | Actual request/result |
|---|---|
| POST base | `{fullName,email,phone}` → 201 StaffAccount; no role/password/token input |
| GET base | Only page/size; defaults 0/20, size 1–100 → StaffAccount array; no totals/search/filter/sort |
| GET `/{staffId}` | No query → StaffAccount |
| POST `/{staffId}/invitations` | `{}` → StaffAccount; BLOCKED/incomplete gate; old invitation invalidated/new 24h; 3 per actor/hour, Retry-After 3600 |
| PUT `/{staffId}/status` | `{status: ACTIVE or BLOCKED}` → StaffAccount; setup prerequisite for ACTIVE; unused invitations revoked on block |
| GET `/{staffId}/cinema-assignments` | Assignment array, owned parent scope |
| POST `/{staffId}/cinema-assignments` | `{cinemaId,effectiveAt}` → 201 ACTIVE STAFF Assignment; finite timestamp; duplicate ACTIVE scope rejected |
| PUT `/{staffId}/cinema-assignments/{assignmentId}/status` | `{status: ACTIVE or INACTIVE}` → Assignment; immutable original effectiveAt; history retained |

StaffAccount exposes id/fullName/email/phone/status/passwordSetupCompleted/invitationExpiresAt/deliveryStatus/deliveryAttempts. Delivery enum: NONE, QUEUED, LEASED, SENT, FAILED, EXPIRED, REVOKED. Assignment exposes id/userId/cinemaId/cinemaName/assignmentType/status/effectiveAt. Browser may show a localized date but future HTTP writes must retain the existing instant contract. Raw phone limit is 30; server removes whitespace/parentheses/hyphens and accepts 0+9 digits, 9 digits, or +84+9 digits. No company-email/mobile-carrier restriction is established.

Generic 400/401/403/404/409/429/503 cannot establish invented causes. No supported audit-viewer/Staff transfer/privilege-grant workflow was found in these APIs. No backend change or new endpoint is proposed.

## 6. Files Created

- This report only as a new repository deliverable.
- Ignored local evidence: `frontend/target/admin-staff-stitch-final-2026-10-14/` contains four unchanged HTML/PNG downloads, extracted text, three audit scripts, JSON observations and browser screenshots. Export URLs/credentials are not included in the report. Evidence is local and not committed.

Latest HTML SHA-256: List `C287503D9832D0DFBD4C21B8B1CB57F4FF7927CD0742548951698B9CB84A3AEC`; Detail `00244BB68C16F3AC8313A697FD5503CB0AF21DE4714EA1FEFD0BC918CBB094B4`.

## 7. Files Modified

**None.** Three incoming untracked reports preserved byte-for-byte. No source, handoff, existing report, requirements, Stitch, backend, database, migrations or MCP configuration modified; no staging/commit/push/deploy. Source migration head remains **V14**; live database migration state was not queried.

## 8. Verification Evidence

Commands, from frontend: `node target/admin-staff-stitch-final-2026-10-14/browser-audit.mjs`, `followup-audit.mjs`, `interaction-audit.mjs` in that directory. All final runs exited **0**; scripts record observations, not a fabricated all-pass test suite. An initial helper run was stopped to correct an evidence-selector wait; final complete runs supplied the findings.

| Check | Actual result |
|---|---|
| Three widths × two exports | **6 browser configurations** completed; 0 page/console errors recorded by primary audit |
| List/Create states | Loading/empty/500/403 and validation/409/pending/201 fixtures rendered at all widths; Create 503/uncertain absent |
| Detail screen states | Normal/skeleton/assignment empty/404/403 rendered at all widths; read/auth gaps remain |
| Six normal Detail dialogs × three widths | **18/18** open with Enter, initial focus inside, Tab/Shift+Tab contained, Escape closes, focus restored to real trigger |
| Six Detail confirmations × three widths | **18 synthetic confirmations** show disabled submit/cancel + pending feedback, then local result; close/Escape still available while pending; no HTTP outcome proof |
| Dialog geometry | Detail cards 512px at desktop/tablet, 358px at mobile; fit the tested viewport; Create card also fits |
| List Create focus × three widths | **3/3 fail** containment/restoration; initial focus/Escape pass; pending fields remain editable |
| Phone examples × three widths | Nine examples each: 2 server-valid accepted, **5 server-valid rejected**, 2 invalid rejected |
| Assignment repeated transitions | Five transitions per width: `102` ACTIVE→INACTIVE→ACTIVE retains `01/01/2024, 08:00`; `103` INACTIVE→ACTIVE retains `20/10/2026, 09:00` and future label |
| Unknown-result close paths | Escape and close icon leave normal Block confirmation missing at all widths; acknowledgement reset works |
| Navigation | List detail clicks fail at all widths; Detail back link remains `#` |
| Responsive | List document width equals viewport; Detail 1440/768 contained, **390 overflows to397**; assignment table scroll verified locally at tablet/mobile |
| Mobile/tablet drawers | Open settles at x=0, width288; close returns offscreen for both exports |
| Visual review | Actual Stitch PNGs, six base renders, Create validation, all six mobile dialogs and selected desktop/tablet renders inspected; Nocturne palette/fonts retained |
| Application TypeScript/lint/unit/build/backend/Playwright regression | **NOT RUN**: documentation-only audit; standalone browser inspection is not application regression or live backend/provider proof |

## 9. Requirement Reconciliation

**PARTIAL design compliance**, sufficient evidence for **OPTION B — REVISIONS REQUIRED**. Numeric identity, immutable-time behavior and six normal Detail dialog keyboard handling are verified improvements. Remaining P0/P1 items in §5.3 prevent READY. Preserve the verified fixes during revision.

## 10. Deviations / Conflicts

No approved exception or scope expansion. Generated schema/version/permission claims conflict with actual contracts and are findings, not changes to requirements. No frontend/backend implementation or new business rule was introduced. No handoff update required for this focused audit.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| File/folder naming | PASS | Requested dated kebab-case report under docs/reports; temporary evidence in ignored target |
| Documentation/traceability | PASS | Existing versioned IDs only; relative links checked; historical reports retained; UTF-8 report |
| Domain/API terminology | PASS | Account vs assignment status separated; actual endpoints cited; proposals distinguished from observations |
| Application/database/code naming | NOT APPLICABLE | No application/schema edits; V1–V14 preserved |
| Git/scope preservation | PASS | HEAD/index/tracked work unchanged; only new report added to incoming untracked files |

## 11. Limitations

Interactive evidence concerns downloaded, unmodified exports, not a directly operated hosted Stitch canvas session. No MCP prototype-link/job-status metadata is available to certify hosted navigation or generation completion. Accessible PNG/HTML does not prove job completion. Browser sample data/confirmations are fixtures, not actual account creation, SMTP delivery, assignment or authorization results. Formal assistive-technology and exhaustive contrast audits were not performed.

## 12. Next Recommended Step

Revise only the two refined screens for the exact issues in §5.3, preserve verified improvements, then repeat this focused export/contract audit. No revision or Phase 4E implementation performed. **STOP after this report.**
