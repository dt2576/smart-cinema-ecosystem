# Phase 4E — Final Design Gate and Conditional Implementation

## 1. Task Information

- Date: **2026-10-14**, Asia/Saigon. Module: ADMIN Staff Management.
- Final outcome: **DESIGN REVISIONS REQUIRED → REPORT ONLY, NO IMPLEMENTATION**.
- Entry/final HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; index empty. Five incoming untracked reports preserved.

**Gate không đạt.** Các bản refined đã sửa phần lớn nội dung và đơn giản hóa UI, nhưng vẫn còn blocker thiết kế rõ ràng: xác nhận Khóa tài khoản khó đọc, lời hứa POS/quyền quản trị không được hỗ trợ, và quy tắc/thao tác phân công ngoài hợp đồng. Theo Step2 của yêu cầu, không bắt đầu frontend implementation.

## 2. Scope, Method and Documents Reviewed

Fresh Stitch MCP project/list/get_screen → tải HTML/PNG hiện tại → đối chiếu báo cáo trước và hợp đồng → render tại390/768/1440px → đo contrast → decision gate → báo cáo. Không sửa export để kiểm tra pass; không yêu cầu prototype gọi API thật, xử lý validation/routing hoặc triển khai production JavaScript.

Đọc [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), root/frontend AGENTS, Frontend/Review workflows và UI_UX/Coding/Document/Traceability/Convention rules; [report template](templates/TASK_REPORT_TEMPLATE.md), [previous7-screen audit](2026-10-14_admin-staff-management-7-screen-design-audit_report.md), [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [BRD v1.2](../brd/brd-v1.2.md)/[SRS v1.2](../srs/srs-v1.2.md).

Kiểm tra actual [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), [AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [StaffRequest](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [DTOs](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [VietnamPhoneValidator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java) và [V13 assignment function](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql).

## 3. Latest Live Screens and Required Components

**CONNECTED AND WORKING**, OWNER. Initial/final project reads agree on update **2026-10-13T22:05:31.082385Z** (2026-10-14 05:05:31, Asia/Saigon). Normal listing identifies the current numbered7-screen set. All seven get_screen reads succeeded, with fresh HTML/PNG downloads. IDs remain the same as the prior audit, but **all seven HTML exports changed**; findings below use fresh content, not historical screenshots.

| # | Current screen ID | Component present / current result |
|---|---|---|
| 1 Staff List | `a76b3e182457474ab63a874b18b5d5e7` | List/Create/Detail/page controls and empty/loading/error present; status example contradiction remains |
| 2 Create Staff | `ac7d4f2d4a8a461e8fed0064ddb0eef7` | Three required fields + validation/pending/409/success present; phone/success copy still incorrect |
| 3 Staff Detail | `3e0264b3d0d44bed9fb08e37e56a253c` | Supported Staff fields, delivery/expiry/attempts, A/B/C action guide; core design substantially corrected |
| 4 Cinema Assignments | `3d1c054f04e544639ce2c57d4558718a` | ACTIVE/INACTIVE/future distinction, original time/history, empty state; edit-time/shift buttons removed |
| 5 Account Action Dialogs | `c55feb9b893242c2a8a4bd1177aeaded` | Reissue/activate/block all present; **contrast and unsupported permission/POS claims remain** |
| 6 Add Cinema Assignment | `cfb33f1500e245f6bcef2c6767778334` | Cinema/effectiveAt + four state variants present; **past-time prohibition/transfer workflow/access claims remain** |
| 7 Assignment Action Dialogs | `b7fbb4d0249b4e7aad51441ef4aef531` | Deactivate/reactivate, original effectiveAt/history; destructive contrast fixed; fake WebSocket/schema claims removed |

All **7 required design components are present in current HTML**. Some MCP PNGs omit substantial content or show blank cards, while independent browser renders show that content. This export discrepancy is not treated as proof that a component is missing. MCP has no generation-job completion metadata; no claim of job completion or hosted-canvas navigation certification.

## 4. Previous Blocker Reconciliation

| Previous concern | Fresh result |
|---|---|
| Global metrics/employee titles in List | Main List simplified to page-local count; KPI48/global48/last-page10 removed. Rows102/103 still ACTIVE with incomplete setup |
| HR/KYC/2FA/legal/photo/edit/reset in Detail | Removed from visible main Detail; supported fields and SMTP-acceptance explanation retained |
| Create SOC-2/password10/2FA/POS main form claims | Main modal simplified; correct name/email/phone fields. Validation still says10digits only; success claims email sent |
| UUID/CUID/employee-code identifiers | Visible current Staff/Cinema identifiers numeric; prior EMP/ASG/ASN success identifiers removed |
| Assignment time editing/shift history/privilege checkboxes | Removed from current assignment display/hidden Add markup. Main Add form retains “Chính thức”/“Kỹ thuật viên” employment labels |
| Invented past-time restriction / transfer conflict | Still present: prohibition now says no past time at all; “Điều chuyển ngay” persists |
| POS/session/audit promises | Removed from #7; still visible in #5 guide; activation now says Staff can enter “hệ thống quản trị” |
| Destructive contrast | #3/#7 white on#DC2626 **4.83:1 PASS**; #5 #690005 on#93000A **1.40:1 FAIL** |
| Text density / Nocturne | Most core panels materially shorter; charcoal/amber/green hierarchy and configured fonts preserved. Component-board commentary remains outside runtime scope |

## 5. DESIGN BLOCKER — Exact Remaining Fixes

Locations refer to the current screen IDs in §3. These are visual copy/rule/action defects, independent of whether prototype JS works.

| Severity / screen | Actual visible evidence | Contract conflict / required Stitch fix |
|---|---|---|
| **HIGH — #5 Block confirm** | Enabled “Khóa tài khoản” label is14px, foreground#690005/background#93000A, contrast**1.40:1** | Replace the color pairing with readable Nocturne destructive presentation. #3/#7 already demonstrate a4.83:1 pairing. Keep explicit label/icon; normal-size text target≥4.5:1 |
| **HIGH — #5 activation / guide** | “Nhân viên sẽ có thể đăng nhập vào hệ thống quản trị”; guide promises immediate logout on all POS, retained shifts/sales | STAFF does not gain ADMIN privileges. No approved POS/session broadcast or shift/sales workflow. Use: “Nhân viên có thể đăng nhập và sử dụng chức năng nhân viên theo phân công hợp lệ.” For block, explain account restriction, unused invitation revocation and preserved assignments only |
| **HIGH — #6 validation** | “Thời gian: Không được trong quá khứ” | Actual parser/function requires a finite instant; it has no past-time prohibition. Remove that invented policy. Show “Thời điểm có hiệu lực không hợp lệ” for malformed date/time; do not restrict valid past instants |
| **HIGH — #6 duplicate state** | “Xung đột lịch trực”, “tạo lịch mới”, CTA “Điều chuyển ngay” | Contract409 concerns existing ACTIVE STAFF Cinema membership, not shifts/transfer. Replace with concise duplicate-membership guidance and supported Close/return/recheck action; remove transfer CTA. Do not invent transfer endpoint or combined workflow |
| **HIGH — #6 success** | Variant labels200OK and “Đã kích hoạt phân công”/automatic check-in access at future date | POST returns**201**, creates ACTIVE membership whose effectiveAt may be future. Use “Đã tạo phân công”; qualify access by effective assignment/current Staff/scope/backend authorization. A created future membership is not immediate operational permission |
| **MEDIUM — #2 validation** | “Số điện thoại cần đủ10số” | Server accepts0+9digits,9digits,+84+9digits after separator normalization. Replace with supported-format or generic valid-Vietnamese-phone guidance. The actual React validator/length constraints remain implementation work |
| **HIGH — #2 success** | “Đã gửi email kích hoạt.” | Successful provisioning commits account/invitation/delivery intent; not guaranteed email delivery. Use “Tài khoản đã được tạo ở trạng thái Đã khóa. Thư mời đã được đưa vào hàng đợi gửi.” Preserve separate password setup and ADMIN activation; SENT explanation in#3 is already correct |
| **MEDIUM — #1 rows102/103** | Both show “Đang hoạt động” alongside “Chưa thiết lập” | Contradicts approved activation prerequisite and correct A/B/C guide. Change these illustrated accounts to BLOCKED or completed setup. No prototype backend simulation required |
| **MEDIUM — #6 identity strip** | “Chính thức”, “Kỹ thuật viên” | StaffAccount has no employment-class/job-title fields. Remove these HR labels; retain name/numeric Staff ID |

The gate remains closed even without the medium findings: #5 contrast/POS/role claims and #6 invented rule/transfer CTA independently block approval.

## 6. FRONTEND IMPLEMENTATION — Deferred, Not Design-Rejection Reasons

- Existing AdminShell authentication/current-role gate, logout and navigation; real List→Detail/back, route ownership and page-size/pagination handling. No new Admin notification workflow is approved; reuse actual shared shell rather than copying mock chrome.
- Exact eight endpoints, canonical positive-bigint strings; name/email/phone constraints150/254/30 and server-compatible phone handling; local Vietnam date presentation with precise finite UTC instant submission.
- Server-derived action eligibility, Staff status, seven delivery statuses, nullable expiry/attempt count, immutable assignment time. No automatic POST on load/recheck/retry and no local authoritative success.
- Loading/empty/validation401/403/404/409/429/503 and uncertain write-result recovery using supported reads; stale response/session changes; duplicate submission prevention. No dedicated Stitch resource is required for every HTTP status.
- Semantic forms/dialogs, labels/aria errors/live regions, focus trap/restore, keyboard selects, Escape/pending policy,44px touch targets and reduced motion. Expand small prototype controls in React shared components.
- Responsive List scroll cue/cards and keyboard reachability of offscreen actions. Improve #6 Cinema/date value clipping at390px without inventing features.

**No frontend implementation performed**, because conditional permission depends on DESIGN READY.

## 7. PROTOTYPE-ONLY — Nonblocking Observations

- #3 throws `Cannot read properties of null (reading 'addEventListener')` once in each inspected viewport. Its supported visual fields/action matrix still render; JS wiring error is **not** the readiness blocker.
- Placeholder navigation, static fixtures/dates, unconnected menu/state controls and stale strings inside unused demo JS are not production API/validation requirements. Do not copy this JavaScript.
- #2 blurred background still contains older sample HR/KPI/report markup. It is treated as a backdrop fixture, not a demand to implement those features; runtime background must be the actual Staff List.
- PNG blank/omitted regions are an export discrepancy; current HTML renders provide content evidence. Generation completion cannot be verified from PNG/HTML availability.

## 8. Verification and Actual Results

Microsoft Edge **155.0.4283.45** via installed Playwright; original fresh exports, **1440×1000,768×1000,390×1000**. Viewed all7 retrieved PNGs and browser renders across the three widths; no application API calls/financial or mail operations.

| Check | Actual result |
|---|---|
| MCP / latest selection | PASS7get_screen; fresh project/list recheck agrees on IDs/updateTime |
| HTML/PNG retrieval | PASS7HTML+7PNG downloads; all7HTML hashes differ from prior audit |
| Responsive renders | **21/21 completed**, document width equals viewport in all; layout cards stack, header clearance and sidebar breakpoint retained; List scroll remains contained |
| Base prototype page errors | **3 total**, all the same#3 JS wiring error, one per width; classified PROTOTYPE-ONLY |
| Required components | PASS7/7 present in HTML; Create has3 required fields; supported account/assignment action boards present |
| Destructive text contrast | PASS#3/#7 **4.83:1**; FAIL#5 **1.40:1** |
| API/requirement comparison | PARTIAL design compliance; exact remaining violations in§5 |
| Frontend typecheck/lint/unit/build/application Playwright | **NOT RUN**: user design gate failed; no application source changes authorized through the conditional branch. Standalone export inspection is not application regression |
| Backend/database/migration/live SMTP | **NOT RUN**; unchanged and outside scope |

Evidence commands from frontend: `node target/admin-staff-design-gate-2026-10-14/inspect-designs.mjs` and `contrast-audit.mjs`, both exit0. Scripts record observations; exit0 does not mean design readiness. Ignored evidence directory contains fresh inventory/downloads, HTML/text, JSON, screenshots and hashes. No credentials/export download URLs are printed in this report.

## 9. Files Created / Modified

Created this report as the only new repository deliverable; local audit artifacts under ignored `frontend/target/admin-staff-design-gate-2026-10-14/`. **Modified application/existing documentation: none.** Five incoming reports preserved byte-for-byte. Source migration head**V14** unchanged; no database connection/mutation, Stitch edit, configuration change, staging, commit, push or deployment.

## 10. Requirement Reconciliation and Convention Compliance

| Actual reference | Result |
|---|---|
| BRD v1.2 BR-002/003/004/053/055; SRS v1.2 FR-AUTH-006/007/008/010, FR-ORG-002/003/004/005, FR-AUDIT-003 | PARTIAL design: supported core administration/history present, permissions/workflow claims remain |
| SRS v1.2 NFR-SEC-006/010/011/012, NFR-UX-004 | PARTIAL design: phone/success copy and safe scope semantics require correction; contrast fails#5 |
| User conditional gate/read-only exclusions | PASS: stopped before application implementation; report only |

### Convention Compliance

| Area | Result / evidence |
|---|---|
| File/folder naming | PASS — dated kebab-case report under docs/reports; ignored audit directory |
| Documentation/traceability | PASS — actual versioned requirement IDs, fresh vs historical evidence separated, UTF-8 and relative links checked |
| Domain/API conventions | PASS for report — actual Staff/Cinema/status fields/endpoints; no invented API or business rule |
| Application/database conventions | NOT APPLICABLE — no app/schema edits; no approved exception needed |
| Preservation | PASS — HEAD/index/tracked files unchanged; five incoming report hashes unchanged |

## 11. Limitations and Conflicts

Design evidence is from MCP exports and isolated browser rendering, not a directly operated hosted Stitch canvas; no generation-job completion claim. Focused contrast check is not exhaustive accessibility certification. Remaining contradictory design copy does not redefine BRD/SRS or authorize backend changes. No convention exception or scope expansion was introduced.

## 12. Next Recommended Step

Correct only the remaining visual/copy/action issues in§5, preserving #3/#4/#7 improvements, then repeat the design gate. Under the user's conditional instruction, frontend may proceed only after DESIGN READY. **Stop here: DESIGN REVISIONS REQUIRED → REPORT ONLY, NO IMPLEMENTATION.**
