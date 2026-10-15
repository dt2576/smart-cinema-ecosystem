# Phase 4E — Final 7-Screen Stitch Design Audit

## 1. Task Information

- Date: **2026-10-14**, Asia/Saigon. Type: **strictly read-only UI/UX audit**.
- Project: **Smart Cinema Ecosystem**, `1208499799798658711`.
- Final decision: **DESIGN REVISIONS REQUIRED**.
- Baseline HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; empty index; four incoming untracked reports preserved.

Thiết kế có nền Nocturne nhất quán và các thành phần cần thiết, nhưng còn nội dung/quyền/thao tác ngoài hợp đồng và lỗi tương phản CTA. Quyết định dựa trên **thiết kế nhìn thấy**, không yêu cầu Stitch nối API thật hoặc viết production JavaScript.

## 2. Scope and Evidence

Fresh Stitch MCP `get_project`/`list_screens` phát hiện đúng nhóm mới đánh số 1–7; **7 get_screen thành công**, tải và xem **7 HTML +7 PNG**. Chỉ audit các ID hiện hành bên dưới, không gọi get_screen cho ID lịch sử/deleted. Final metadata/list recheck giữ nguyên nhóm này: OWNER, project update **2026-10-13T21:52:28.909847Z** (2026-10-14 04:52:28, Asia/Saigon).

| # | Current screen / ID | Required design coverage | Finding |
|---|---|---|---|
| 1 | Staff List — `a76b3e182457474ab63a874b18b5d5e7` | List, account/setup/delivery labels, Create/Detail, paging, empty/loading/error | Blocker: global KPI/totals, unsupported staff job data, contradictory ACTIVE + incomplete setup |
| 2 | Create Staff Modal — `ac7d4f2d4a8a461e8fed0064ddb0eef7` | Name/email/phone, BLOCKED onboarding, validation/pending/201/409 | Blocker: 2FA/POS/SOC-2/password policy, restrictive phone copy, fabricated employee/matched-account identifiers |
| 3 | Staff Detail — `3e0264b3d0d44bed9fb08e37e56a253c` | Owned administration detail, account/setup/delivery/expiry/attempts, A/B/C action gates | Blocker: legal/HR/KYC/OTP/login-IP/edit/reset features and unsupported permission wording |
| 4 | Cinema Assignments — `3d1c054f04e544639ce2c57d4558718a` | Multiple Cinema assignments, ACTIVE/INACTIVE/future distinction, empty state, deactivate/reactivate | Blocker: immutable-time edit, shift history, extra permission checkboxes, misleading counts/POS claims |
| 5 | Account Action Dialogs — `c55feb9b893242c2a8a4bd1177aeaded` | Reissue, activation prerequisite, block + retained assignments | Blocker: elevated Admin tier, POS/cashier/session claims; destructive CTA contrast |
| 6 | Add Cinema Assignment — `cfb33f1500e245f6bcef2c6767778334` | Cinema/effectiveAt fields, validation/pending/duplicate409/success | Blocker: invented past-time limit/422, transfer/shift workflow, nonnumeric IDs, unconditional future access |
| 7 | Assignment Action Dialogs — `b7fbb4d0249b4e7aad51441ef4aef531` | INACTIVE/ACTIVE transitions, original effectiveAt/history/account separation | Blocker: POS/WebSocket/audit schema claims; destructive CTA contrast |

These are **seven design resources**, including component/state boards; not seven new routes. All have DESKTOP metadata width2560. Responsive evidence comes from actual HTML renders, not that metadata. Canvas “Generating” labels are not job completion evidence; MCP exposes no job-status API. Export availability suffices for this design audit, not generation certification.

## 3. References and Contract Boundary

Read [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [conventions](../development/project-conventions.md), root/frontend AGENTS, Frontend/Review workflows and UI_UX/Document/Traceability/Convention rules; [report template](templates/TASK_REPORT_TEMPLATE.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [current handoff](../ai/current-handoff.md), [Staff administration v1.0](../api/staff-invitation-administration-contract-v1.0.md), [Staff scope contract](../api/staff-qr-checkin-contract-v1.0.md), [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md).

Compared actual [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), [controller](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [parser](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [DTOs](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [phone validator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java), [account validation](../../backend/src/main/java/com/smartcinema/auth/dto/RegisterUserRequest.java) and [V13 immutable assignment rules](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql).

Approved ADMIN APIs: POST/GET `/api/v1/admin/staff`; GET `/{staffId}`; POST `/{staffId}/invitations` with `{}`; PUT `/{staffId}/status`; GET/POST `/{staffId}/cinema-assignments`; PUT `/{staffId}/cinema-assignments/{assignmentId}/status`. IDs are positive-bigint **strings**. List only supplies page/size and an array, no global KPI/total pages. Create accepts only fullName/email/phone. Assignment creation accepts only cinemaId/effectiveAt and creates STAFF membership; status update preserves original effectiveAt. No proposed endpoint/backend change.

## 4. DESIGN BLOCKER — Correct in Stitch

| Priority / location | Exact evidence and required correction |
|---|---|
| HIGH — #1 List | Global “Tổng nhân sự48”, status KPI42/04/02, “trong số48” and last-page10 imply unavailable totals. Remove global metrics/last-page claims; use current-page count and previous/next. Rows102/103 show ACTIVE without setup: correct to BLOCKED. Remove unsupported job titles/Identity Hub/realtime/Gateway-Ping claims; change “Chưa đổi mật khẩu” to “Chưa thiết lập mật khẩu”. |
| HIGH — #2 Create | Main help says phone is for 2FA/emergency codes/POS; name for timesheets/shifts; footer requires **10-character password +2FA**, “SOC-2”. None is approved. Remove these claims, “Xuất báo cáo”/HR background features and company-only email implication. Correct phone guidance: server supports 0+9 digits, 9 digits, +84+9 digits, and strips whitespace/parentheses/hyphens; raw limit30. UI must not say only10digits/mobile. Keep the three required fields and private setup → ADMIN activation explanation. |
| HIGH — #2 identifiers/conflict | Success board shows `EMP-2024-8891`; conflict board/live duplicate state gives NV049/EMP-092, matched employee name/Cinema and “Mở hồ sơ nhân viên cũ”. These are not returned by safe duplicate-email response. Use numeric server ID in success; generic duplicate email guidance without fabricated matched identity/lookup action. |
| HIGH — #3 Detail | Remove lead-operator/HR/legal-contract/KYC/photo-profile editing, SMS OTP/2FA, last-login/IP, creation-date/first-send-date, digital signature and self-service reset claims not exposed by StaffAccount. Keep initials or decorative avatar, authoritative supported fields and the valid A/B/C gates. “Toàn quyền…quản lý ca” is not STAFF scope. Rename deliveryAttempts as mail-delivery attempts, not invitation reissue count. |
| HIGH — #4 Assignments | “Điều chỉnh giờ” contradicts immutable effectiveAt. Remove it and “Lịch sử ca”. Actual opened Add modal contains **Soát vé cổng POS / Đổi suất khẩn cấp** permission checkboxes: remove; API cannot accept privileges. Correct “3 bản ghi hoạt động” when one of three is INACTIVE. Keep separate future date and membership status; do not promise automatic POS synchronization. |
| HIGH — #5 Account dialogs | Remove “Quản trị viên cấp cao” permission tier, cashier/POS rights, “Hủy phiên đăng nhập…tất cả máy POS/Mobile Admin” and shift/sales guarantees. Actual authority is current ACTIVE ADMIN; blocking account/revoking unused invitations is supported, POS broadcast/session revocation is not established. Activation must remain conditional on password setup and backend STAFF/Cinema authorization. |
| HIGH — #6 Assignment rule/conflict | Remove **past time cannot exceed24h** restriction: backend requires finite instant, not that rule. Validation code422 is unsupported; use safe form copy (server malformed input400). Remove shift overlap/“Điều chuyển ngay”/“Xem ca làm”/transfer-history workflow. Duplicate ACTIVE membership409 is supported; use that exact meaning. Replace ASG/ASN identifiers with numeric assignment IDs. New assignment returns201, not an interchangeable200/201 claim. |
| HIGH — #6/#7 access and audit promises | Future date or ACTIVE account alone does not guarantee operations; qualify effective ACTIVE STAFF membership/current account/scope and backend authorization. Remove #7 WebSocket POS revocation within10seconds, `cinema_assignment_audits`, session/IP/User-Agent/hash projection and invented national audit standard/version. Preserve no hard-delete, history and original effectiveAt. |
| HIGH — #5/#7 contrast | Actual enabled red confirmation labels use **#690005 on #93000A**, **1.40:1** contrast, 14px text. Change foreground/background pairing to readable Nocturne destructive tokens (normal text target≥4.5:1); keep explicit action labels/icons. This is a visual defect, not a production-JS requirement. |
| MEDIUM — shared product chrome/copy | Notification bell is an unsupported product feature; remove it from intended runtime shell. Plain ADMIN identity is fine; no extra tier. Keep Vietnamese product copy and remove invented compliance/API-ready/production-version assertions. English component-board labels/engineering explanations may remain clearly outside runtime UI; factual invented business requirements must be removed even from design annotations. |

The hypothetical values themselves are fixtures; blockers arise when layout/copy promises unsupported fields, workflows or rules. A fake name/date alone is not a blocker.

## 5. FRONTEND IMPLEMENTATION — Handle Later in React/Next.js

- Reuse **existing AdminShell** authentication/current-role check, logout, Customer-home link and supported Admin destinations. Adapt visual navigation/header spacing without adding roles/routes from a mock. Wire List → Detail/back, Cinema assignment dialogs and real pagination later; `href="#"` does not block the design.
- Implement typed owned reads/explicit commands, string IDs, precise field lengths150/254/30, phone normalization/validation, UTC instant serialization and correct error mapping. No requirement for Stitch to do these operations.
- Derive enabled actions and all seven delivery labels from authoritative responses; SENT means SMTP accepted, not inbox receipt. Use server expiry, nullable expiry and deliveryAttempts. Hardcoded “Còn360ngày” is sample data; never carry that countdown into production.
- Add safe Detail/assignment loading/error/empty, selector loading/empty/unavailable,401/login resume,403/404, command409/429/503 and **uncertain-result** recovery using shared feedback primitives. #1 supplies generic list empty/loading/error styling; #2 provides validation/pending/success/duplicate; #4 assignment empty; #3 account variants; #6 assignment validation/pending/duplicate/success. Missing runtime branches need implementation, not a new Stitch screen per HTTP status. Recheck with supported GETs; no automatic command retries or local authoritative success.
- Implement semantic dialogs, focus trap/initial focus/restoration, Escape/backdrop policy, keyboard select/date input, explicit labels/aria errors/live regions, pending/disabled state and reduced motion. Most confirms already show44px targets; expand32/36/40px close/menu controls in shared components.
- At390px, List table uses a **358px scroll region for809px content**. Provide accessible horizontal scrolling/cue or responsive cards so statuses/actions remain reachable. Prevent clipping of long Cinema/date values; preserve the measured contained page layout. No additional seven mobile resources are required.

## 6. PROTOTYPE-ONLY — Does Not Block Readiness

- Mock fixtures, static totals used solely as test data, old sample dates, sample names/photos and manual state switches are not real backend evidence. Product metric/field claims still require the corrections in §4.
- #2 demo pending auto-switches to success; #6 toast buttons simulate outcomes; #4 modal JS and #5 generic popup are demonstrations. No real API, mail delivery, permission grant or persistent mutation is expected or certified.
- Component boards can display variants simultaneously and English technical headings; they are not production routes. Production form/focus behavior is not required in export JavaScript.
- Missing icon-font glyph/visible icon-name text in #6 is an export/prototype rendering artifact; use an existing supported icon in React. MCP generation-job state is not exposed and remains unverified.

## 7. Verification

Microsoft Edge **155.0.4283.45**, installed Playwright; original exports rendered at **1440×1000,768×1000,390×1000**. All7 Stitch PNGs and all21 browser renders inspected.

| Check | Evidence/result |
|---|---|
| Responsive base layouts | **21/21** renders completed; document width equals viewport in all; 0 page-JS errors in base inspection. Cards/dialog boards stack; sidebar hides below desktop; header clearance retained. List has contained horizontal table scrolling. |
| Forms/components | Create default/error/duplicate/pending/success visually inspected via5 demo states; Add validation/pending/409/success boards and3 toast types inspected; #4 actual Add modal opened/closed at all3 widths, exposing unsupported privilege checkboxes. |
| Design tokens | Charcoal layers, amber primary, green semantic success, warm borders/glow and Space Grotesk/Plus Jakarta Sans retained. Shared nav labels match current Admin modules plus intended Staff entry; unsupported notification removed only as a recommendation. |
| Accessibility | Labels/icons supplement status color; required form fields visible. Enabled destructive contrast **FAIL1.40:1** on#5/#7. Formal screen-reader/focus conformance not claimed; React work listed separately. |
| Application regression/backend/DB/live mail | **NOT RUN**: design/document audit, no application changes; browser fixtures are not regression/API/delivery proof. |

Evidence commands from frontend: `node target/admin-staff-seven-design-audit-2026-10-14/inspect-designs.mjs`, `detail-evidence.mjs`, `open-assignment-evidence.mjs`; final runs exit0. JSON/PNGs/source hashes retained locally in that ignored directory. Inspection scripts collect findings; exit0 is not “all designs pass”.

## 8. Requirements and Convention Reconciliation

| Reference | Result |
|---|---|
| BRD v1.2 BR-002/003/004/053/055; SRS v1.2 FR-AUTH-006/007/008/010, FR-ORG-002/003/004/005, FR-AUDIT-003 | **PARTIAL design:** intended Staff administration/history present; unsupported privileges/actions remain |
| SRS NFR-SEC-006/010/011/012, NFR-UX-004 | **PARTIAL design:** safe core onboarding/feedback present; misleading policy/error/access copy and contrast require revision |
| Read-only scope | **PASS:** no source, backend, database, Stitch, configuration or existing-report change |

### Convention Compliance

| Area | Result / evidence |
|---|---|
| Report/file naming | PASS — requested dated kebab-case filename under docs/reports |
| Documentation/traceability | PASS — real versioned requirements; links/UTF-8 checked; no invented BR/FR IDs; design/implementation/prototype findings separated |
| Domain/API terminology | PASS for report — actual Staff/Cinema/status contracts govern recommendations |
| Application/schema conventions | NOT APPLICABLE — no application/schema edits; source migration headV14 unchanged |
| Preservation | PASS — HEAD/index/tracked files unchanged; four incoming reports hash-identical |

## 9. Files, Limitations and Next Step

Created **this report only** as a repository deliverable; downloaded exports and audit helpers/screenshots are ignored local evidence. Modified existing files: **none**. No commit/stage/push/deploy. No approved convention exception or business-scope expansion.

This audit verifies exported designs, not a directly operated hosted Stitch canvas or actual job completion. Contrast check is focused on enabled opaque destructive buttons, not exhaustive WCAG certification. Do not copy generated HTML/JS into the application.

Correct the **DESIGN BLOCKER** items only in the seven current designs, preserving the verified Nocturne layout and supported fields/actions; then re-audit. Frontend work remains a separately authorized task. **Stop after this report.**
