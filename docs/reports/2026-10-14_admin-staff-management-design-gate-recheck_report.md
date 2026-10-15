# Phase 4E — Final Design Gate Recheck

## 1. Task Information and Decision

- Date: **2026-10-14**, Asia/Saigon. Module: ADMIN Staff Management.
- Final outcome: **DESIGN REVISIONS REQUIRED → REPORT ONLY, NO IMPLEMENTATION**.
- Entry/final HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; empty index; six incoming untracked reports preserved.

**Phần lớn blocker đã được sửa.** Nút Khóa đạt6.47:1; trạng thái List, quyền Staff, hướng dẫn khóa, quy tắc thời gian và conflict phân công đã được chỉnh. Nhưng Create vẫn mô tả phone10digits-only và khẳng định email đã gửi; Add vẫn có job-title ngoài hợp đồng. Đây là nội dung thiết kế, không phải thiếu API/validation/navigation trong prototype. Step2 yêu cầu dừng nếu còn genuine DESIGN BLOCKER, nên không sửa application source.

## 2. Scope and References

Fresh MCP discovery/get_screen/download → so sánh export với lần gate trước → đọc nội dung/PNG →21 responsive renders +contrast → gate → báo cáo. Không sửa Stitch/export để làm kiểm tra pass, không gọi API ứng dụng hoặc gửi thư.

Đọc [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), root/frontend AGENTS và applicable Frontend/Review, UI_UX/Coding/Document/Traceability/Convention instructions; [report template](templates/TASK_REPORT_TEMPLATE.md), [required7-screen audit](2026-10-14_admin-staff-management-7-screen-design-audit_report.md), [last gate report](2026-10-14_admin-staff-management-design-gate_report.md), [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [BRD v1.2](../brd/brd-v1.2.md)/[SRS v1.2](../srs/srs-v1.2.md), existing [AdminShell](../../frontend/src/features/admin/admin-shell.tsx).

Actual source contract audited in the preceding gate remains unchanged at the same HEAD: [AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [StaffRequest](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [DTOs](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [phone validator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java), [immutable assignment rules](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql). No endpoint/role/business-rule proposal.

## 3. Latest Screen Inventory

**CONNECTED AND WORKING**, OWNER. Fresh initial/final metadata agrees on update **2026-10-13T22:14:45.611818Z** (2026-10-14 05:14:45, Asia/Saigon). All7 current get_screen reads succeeded with HTML/PNG. Same resource IDs, **in-place refined content**: #1/#5/#6 HTML changed since previous gate; #2/#3/#4/#7 HTML hashes unchanged. No historical/deleted screen was selected for this gate.

| # | Current screen ID | Present / fresh finding |
|---|---|---|
| 1 Staff List | `a76b3e182457474ab63a874b18b5d5e7` | PASS core design: numeric IDs, coherent account/setup examples, Create/Detail/paging, empty/loading/error |
| 2 Create Staff | `ac7d4f2d4a8a461e8fed0064ddb0eef7` | Three required fields and four state cards present; **remaining phone/success-copy blockers** |
| 3 Staff Detail | `3e0264b3d0d44bed9fb08e37e56a253c` | Supported Staff fields, delivery/expiry/attempts, A/B/C guide; core design retained; JS issue nonblocking |
| 4 Cinema Assignments | `3d1c054f04e544639ce2c57d4558718a` | Correct ACTIVE/INACTIVE/future distinction, history/original time, supported actions and empty state |
| 5 Account Action Dialogs | `c55feb9b893242c2a8a4bd1177aeaded` | All3 account dialogs present; **contrast/POS/ADMIN privilege blockers fixed** |
| 6 Add Cinema Assignment | `cfb33f1500e245f6bcef2c6767778334` | Cinema/effectiveAt fields +validation/pending/conflict/success; rules/transfer fixed; **job-title caption remains** |
| 7 Assignment Action Dialogs | `b7fbb4d0249b4e7aad51441ef4aef531` | Both status dialogs, preserved original effectiveAt/history, readable destructive confirm retained |

**7/7 required components present in HTML**, not seven mandated application routes. PNG retrieval succeeded, but some MCP previews omit content; independent HTML renders provide the complete content evidence. MCP exposes no generation-job status; no actual job-completion claim.

## 4. Before/After Reconciliation

| Previous gate finding | Current evidence / result |
|---|---|
| #1 ACTIVE before setup | Rows102/103 now **Đã khóa +Chưa thiết lập** — FIXED |
| #5 contrast1.40:1 | White on#B91C1C,14px text, **6.47:1** — FIXED; #3/#7 remain4.83:1 |
| #5 Staff entering Admin system | Copy now says Staff functions according to valid assignment — FIXED |
| #5 POS/shifts/sales guarantee | Guide now describes account access and retained assignment/account-activity history — FIXED |
| #6 past-time ban | Validation now says malformed/invalid effectiveAt; no past-time prohibition — FIXED |
| #6 shift-conflict/transfer | “Trùng lặp phân công”, duplicate ACTIVE membership explanation, **Đóng** only — FIXED |
| #6 premature operation success | Now “Đã tạo phân công”; access depends on account/effectiveAt/Cinema permissions — FIXED |
| #6 employment labels | “Chính thức” removed; **“Kỹ thuật viên” remains** — PARTIAL |
| #2 phone/success copy | HTML byte-identical; both wrong strings remain — NOT FIXED |
| #3/#4/#7 previous improvements | Supported fields, immutable time/actions, simpler Vietnamese copy, no fake WebSocket/audit-schema UI — PRESERVED |

## 5. DESIGN BLOCKER — Remaining Exact Fixes

| Severity / exact screen | Evidence and impact | Required correction in Stitch |
|---|---|---|
| **HIGH — Create #2 `ac7d4f2d4a8a461e8fed0064ddb0eef7`** | Visible success card says **“Đã gửi email kích hoạt.”** Creation commits account/invitation/encrypted delivery intent; it does not prove external SMTP acceptance or inbox delivery. Invitation privately sets password; account remains BLOCKED pending ADMIN activation | Replace with **“Tài khoản đã được tạo ở trạng thái Đã khóa. Thư mời đã được đưa vào hàng đợi gửi.”** This requires truthful copy, not a live email/API implementation in Stitch |
| **MEDIUM — same Create #2, validation card** | **“Số điện thoại cần đủ10số”** excludes server-supported9digit/+84 formats. Actual validator accepts0+9digits,9digits,+84+9digits after whitespace/parentheses/hyphen normalization | Use **“Số điện thoại Việt Nam không hợp lệ.”** or accurate supported-format guidance. The validator algorithm/maxlength remains later frontend work |
| **MEDIUM — Add #6 `cfb33f1500e245f6bcef2c6767778334`, Staff identity strip** | **“Kỹ thuật viên”** is still displayed as Staff job data; no such field is returned by StaffAccount. User explicitly requires removal of unsupported HR content | Remove the caption. Keep **Trần Minh Đức (#125)**; do not add job-title source/API |

These are the remaining supported design corrections. Previously fixed contrast, POS, transfer, past-time restriction and account examples are **not** still blockers. No demand to implement prototype APIs/navigation is part of this decision.

## 6. FRONTEND IMPLEMENTATION — Deferred, Nonblocking Design Findings

- Reuse AdminShell/current-role authentication/logout/navigation, shared UI/Nocturne tokens. Integrate the8 existing endpoints only: POST/GET `/api/v1/admin/staff`; GET `/{staffId}`; POST `/{staffId}/invitations` with `{}`; PUT `/{staffId}/status`; GET/POST `/{staffId}/cinema-assignments`; PUT `/{staffId}/cinema-assignments/{assignmentId}/status`.
- Implement positive-bigint string IDs, name/email/phone lengths150/254/30, exact phone validation, Vietnam-local date presentation and finite UTC effectiveAt submission; preserve existing original effectiveAt on status changes.
- Bind authoritative status/action eligibility, all7 delivery labels, nullable expiry and deliveryAttempts. Use safe reads after uncertain writes; prevent duplicate submits/automatic retries.
- Add loading/empty/validation401/403/404/409/429/503/uncertain states, safe session/stale-response handling, accessible dialogs/focus/keyboard/aria and44px controls/reduced motion. These are React/Next.js work, not requirements for executable Stitch JS.
- Handle responsive table scrolling/offscreen actions, long Cinema/date values at390px. Technical **200OK** badge in Add’s component-state board is not a new business capability; production must consume the actual create **201** contract and need not expose HTTP codes to users.
- Use real AdminShell chrome; unconnected mock notification icon is not approval to create a notification module.

## 7. PROTOTYPE-ONLY

Static fixtures/dates, `href="#"`, menu/state controls, old blurred background and unused JS templates are nonblocking. #3 still throws **Cannot read properties of null (reading 'addEventListener')** once per viewport; current visual fields/gates remain visible. No real API, validation, navigation, SMTP delivery or persistent mutation is expected from Stitch. Do not copy prototype JS into production.

## 8. Verification and Actual Results

Microsoft Edge **155.0.4283.45** with installed Playwright, fresh unchanged exports at **1440×1000,768×1000,390×1000**.

| Check | Result / evidence |
|---|---|
| MCP/current selection | PASS7get_screen; final project/list recheck retained IDs/updateTime |
| Exports | PASS7HTML+7PNG; hashes show3changed/4unchanged vs previous gate |
| Responsive render | **21/21 complete**, document width equals viewport in every case; stacking/sidebar/header clearance retained; List table scroll contained |
| Required components | **PASS7/7**; forms/confirmations/state boards present in HTML; no missing-component finding from partial PNG previews |
| Destructive contrast | **PASS #5 6.47:1; #3/#7 4.83:1**; no previous low-contrast finding carried forward |
| Prototype page errors | **3 total**, same#3 error once per width; classified PROTOTYPE-ONLY |
| Manual content review | Reviewed all7 fresh PNGs/current HTML; responsive screenshots/DOM observations, including#2 validation/success and#6 identity caption |
| Frontend typecheck/lint/unit/build/application browser regression | **NOT RUN** — design gate failed; no application implementation started |
| Backend/DB/migrations/live SMTP | **NOT RUN**, unchanged/out of scope |

Commands from frontend: `node target/admin-staff-design-gate-recheck-2026-10-14/inspect-designs.mjs`, `contrast-audit.mjs`, both final exit0. Observational scripts are not an all-pass application test suite. Fresh inventory/source hashes/JSON/screenshots are retained in this ignored evidence directory. No credentials/export URLs included in the report.

## 9. Files Changed and Preservation

Created **this new report only** as a repository deliverable; ignored local export/audit artifacts created under `frontend/target/admin-staff-design-gate-recheck-2026-10-14/`. Modified existing/source files: **none**. Six incoming reports remain byte-identical; HEAD/index/tracked tree unchanged. Source migration head**V14** preserved. No Stitch edit, backend/database/config change, staging/commit/push/deploy.

## 10. Requirements and Convention Compliance

| Actual reference | Reconciliation |
|---|---|
| BRD v1.2 BR-002/003/004/053/055; SRS v1.2 FR-AUTH-006/007/008/010, FR-ORG-002/003/004/005, FR-AUDIT-003 | PARTIAL overall design; core authority/actions/history improved; unsupported job caption remains |
| SRS v1.2 NFR-SEC-006/010/011/012, NFR-UX-004 | PARTIAL design: truthful phone/delivery copy still required; destructive contrast corrected |
| Conditional implementation gate / exclusions | PASS — report only after actual blockers confirmed |

### Convention Compliance

| Area | Result / evidence |
|---|---|
| File/folder naming | PASS — unique dated kebab-case recheck report under docs/reports, preserving earlier gate report |
| Documentation/traceability | PASS — real versioned IDs; UTF-8/relative links checked; current vs historical evidence separated |
| Domain/API conventions | PASS for report — actual Staff/Cinema fields/statuses/endpoints; no invented contracts |
| Application/schema conventions | NOT APPLICABLE — no application/schema implementation or approved exception |
| Preservation | PASS — six incoming reports hash-identical; HEAD/index/tracked work unchanged |

## 11. Limitations and Next Step

Evidence covers MCP exports/isolated browser rendering, not operated hosted-canvas navigation or generation-job completion. Focused contrast measurement is not exhaustive accessibility certification. No backend/live email success claimed.

Correct the three specific design items in§5 while preserving verified fixes, then repeat the conditional gate. Frontend implementation is automatically authorized only after DESIGN READY. **Stop: DESIGN REVISIONS REQUIRED → REPORT ONLY, NO IMPLEMENTATION.**
