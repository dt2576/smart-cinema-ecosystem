# Smart Cinema — Tiến độ và mức sẵn sàng production

## 1. Task Information

- Ngày đánh giá: **2026-10-23**, Asia/Saigon.
- Loại công việc: rà soát tiến độ từ repository, không triển khai tính năng hoặc chạy dịch vụ.
- Kết luận: **khoảng50% chặng đường đến MVP sẵn sàng vận hành**, khoảng ước lượng45–55%. **Chưa đủ bằng chứng để phát hành production.**
- Mốc gần nhất: Phase4F **PARTIALLY VERIFIED**, báo cáo2026-10-15. HEAD hiện tại `7028385` ngày2026-10-15; công việc Phase4F vẫn có thay đổi chưa commit. Không thấy báo cáo hoặc commit mới hơn trong nguồn được kiểm tra.
- Tỷ lệ là đánh giá kỹ thuật có trọng số, không phải phép đếm FR đã nghiệm thu, phần trăm dòng code hoặc cam kết thời gian còn lại.

## 2. Requested Work và Documents Reviewed

Đánh giá dự án đang ở đâu và ước lượng phần còn lại để đưa lên production. Đối chiếu workflow/conventions, current handoff, Project Scope v1.0, phần liên quan BRD/SRS v1.2, assessment Stitch, các báo cáo Phase3C/4B-2/4C/4E/4F, VNPAY contract v1.1, route Next.js, controller Spring và AdminShell/AdminHome thực tế.

100% trong ước lượng nghĩa là MVP theo phạm vi được duyệt có đủ chức năng, kiểm thử tích hợp nghiệp vụ thật, triển khai HTTPS, cấu hình bảo mật và bằng chứng vận hành/recovery phù hợp. Project Scope hiện chọn **Payment Gateway Sandbox**. Nếu mục tiêu là bán vé thu tiền thật, phải xác định và phê duyệt riêng tích hợp thanh toán production; hiện chưa có căn cứ coi đó là bước bật cờ cấu hình.

## 3. Requirements Traceability

| Nguồn hiện hữu | Đánh giá |
|---|---|
| BRD v1.2 BR-002–004; SRS FR-AUTH-007/008, NFR-SEC-002/003 | Auth, RBAC, ownership và Cinema scope đã có nền tảng; đã có kiểm tra thực tế ADMIN/STAFF trong local |
| SRS FR-PAYMENT-003–009, FR-TICKET-001–009, FR-CHECKIN-001–013 | Có implementation nhưng còn thiếu bằng chứng luồng provider → issued Ticket/QR → Check-in thành công thật |
| SRS FR-CONCESSION-002–006, FR-PROMO-001 | Customer tiêu thụ catalog/Promotion đã có; chức năng quản trị tương ứng chưa thấy HTTP/UI đầy đủ |
| SRS FR-REPORT-001–008 | Chưa thấy workspace/API dashboard/reporting nghiệp vụ trong inventory hiện tại |
| SRS NFR-PERF-001–006, NFR-REL-001–006, NFR-OBS-001–006 | Chưa thấy bộ bằng chứng nghiệm thu production về tải, vận hành, giám sát và recovery |

Không bổ sung requirement, permission, endpoint hoặc điều kiện nghiệp vụ mới. Các bước release đề xuất là kế hoạch xác minh, không phải sửa BRD/SRS.

## 4. Cách Ước Lượng

Các trọng số dưới đây là phương pháp của báo cáo này, chưa phải kế hoạch tiến độ đã được chủ dự án phê duyệt. Điểm nhóm phản ánh cả chức năng lẫn chất lượng bằng chứng hiện có.

| Nhóm | Trọng số | Mức hoàn thành ước lượng | Căn cứ |
|---|---:|---:|---|
| Customer/Auth/Discovery/Booking/History/QR presentation |20%|85%|Có route và API thật; còn thiếu nghiệm thu luồng mua vé có thanh toán xác minh và entitlements thực tế |
| Payment, xác minh provider và cấp vé |20%|45%|Backend bảo vệ settlement, return/status/recovery đã có; merchant Sandbox/callback/Query và chuỗi cấp vé chưa chứng minh E2E |
| Staff onboarding và Check-in |15%|75%|Onboarding local đã xác minh; workspace/API Check-in có; positive admission còn BLOCKED |
| ADMIN management |15%|60%|Movie/Cinema/Hall/Seat/Showtime/Staff có; thiếu các phần quản trị còn lại theo phạm vi |
| Manager và Reporting |15%|5%|Có mô hình role/scope nền tảng; chưa có workspace nghiệp vụ/API báo cáo tương ứng |
| Release, hạ tầng và nghiệm thu vận hành |15%|15%|Build/local isolation có; chưa có bằng chứng triển khai staging/production, giám sát, tải và diễn tập khôi phục |

Tổng trọng số:100%; điểm quy đổi49,25%, làm tròn **khoảng50%**. Không hiểu đây là “50% thời gian còn lại”: tích hợp provider và nghiệm thu production có độ bất định cao. Một blocker tài chính vẫn có thể ngăn release dù các điểm nhóm khác tăng.

## 5. Những Phần Đã Đạt

1. Luồng Customer có integration thật: discovery → chọn Showtime/Seat Hold → Booking → Concession/Promotion → explicit Payment initiation, return/status/recovery.
2. My Bookings/owned detail/Ticket list/Booking QR đã chuyển khỏi preview sang owned GET; backend giữ authority về issuance.
3. Auth/session/RBAC/ownership, exact amount/string ID, original expiry và first-attempt composition freeze có nền tảng thực thi và kiểm thử.
4. ADMIN có quản lý Movie, Cinema/Hall/Seat, Showtime và Staff; Staff có invitation/password setup/ADMIN activation/block/assignments.
5. Staff workspace có scanner/manual QR, Cinema scope, Ticket selection, explicit Check-in và recovery; chưa coi là positive E2E verified.
6. Next.js/React/TypeScript/Nocturne/Vietnamese shared UI đã được áp dụng; migration source hiện V14.

## 6. Các Khoảng Trống Ngăn Production

| Mức ưu tiên | Việc còn lại | Điều kiện xác nhận |
|---|---|---|
| P0 | Xác minh đường thanh toán hợp lệ | Merchant Sandbox được cho phép, callback/signature/amount/reference/query được kiểm chứng, không dùng fixture làm bằng chứng provider |
| P0 | Positive full-chain E2E | Customer booking → verified Payment → PAID và issued Tickets/one Booking QR → scoped Staff Check-in → audit/duplicate/rescan đúng |
| P0 | Staging và cấu hình release | HTTPS, secret management, callback reachability, runtime/system DB least privilege, migration/rollback/recovery có bằng chứng |
| P1 trước full-MVP release | Hoàn thiện Manager và quản trị còn thiếu | Audit contract/RBAC rồi triển khai các yêu cầu được duyệt; không tự mở rộng từ mockup |
| P1 trước full-MVP release | Reporting thật | KPI/revenue/Tickets/occupancy theo định nghĩa và Cinema scope được duyệt; AdminHome hiện chỉ là trang dẫn tới module, chưa phải dashboard KPI |
| P1 | Nghiệm thu vận hành | Load/concurrency trong môi trường nghiệm thu, security review, metrics/alerts, backup/restore và handling payment reconciliation |
| P1 | Regression/UAT trước release | Chạy lại trên release candidate và staging; xác nhận browser/device/camera thực tế, lỗi mạng và recovery |

Không tìm thấy deployment manifests/CI pipeline/runbook production trong các file repository được kiểm tra; điều này là **thiếu bằng chứng trong repo**, không khẳng định người dùng không có hạ tầng bên ngoài.

## 7. Bằng Chứng Kiểm Thử Hiện Có

| Mốc lịch sử | Kết quả được báo cáo | Giới hạn |
|---|---|---|
| Backend Phase4B-2 |410/410 PASS|Báo cáo13/10; không chạy lại trong đánh giá23/10 |
| Frontend Phase4E |230/230 unit,366/366 Playwright; typecheck/lint/build PASS|Fixture-backed browser suite không chứng minh provider hoặc paid issuance thật |
| Local onboarding Phase4E |Final13/13 grouped checks PASS|Local Mailpit/HTTPS; không phải bằng chứng Gmail hay production delivery |
| Local Phase4F |8 grouped checks PASS,0FAIL,25 HTTP records,6 ảnh|Anonymous401/ADMIN403/BLOCKED Staff login401; positive Check-in BLOCKED |

Trong công việc đánh giá này: chỉ đọc source/docs/Git và kiểm tra liên kết báo cáo. Typecheck/lint/unit/build/browser/backend regression/live DB/provider **NOT RUN**. Không gộp kết quả của các ngày khác thành một lần regression hiện tại.

## 8. Files Created / Modified

Chỉ tạo báo cáo này. Không sửa handoff, application source, configuration, requirement, database hoặc báo cáo lịch sử. Các thay đổi Phase4F chưa commit được giữ nguyên; không stage/commit/push/deploy.

## 9. Requirement Reconciliation và Conflicts

PASS cho phạm vi đánh giá: đối chiếu nguồn hiện tại, tách implementation khỏi live verification, nêu rõ cơ sở ước lượng và giới hạn. Readiness của toàn dự án: **PARTIAL**, chưa nghiệm thu production. Không thay đổi business requirements hoặc tự phê duyệt real-money payment. Không có convention exception mới.

## Convention Compliance

Đối chiếu [project conventions](../development/project-conventions.md): report nằm đúng `docs/reports/`, tên dated kebab-case đúng quy ước; nội dung giữ domain/API/status chuẩn, trích đúng ID hiện hữu và bảo toàn lịch sử: **PASS**. Folder/code/API/database/routes thay đổi: **NOT APPLICABLE**. Liên kết report được kiểm tra tồn tại; không có secrets trong nội dung.

## 10. Giới Hạn và Thứ Tự Tiếp Theo

Đây là estimate từ repository hiện tại với bằng chứng gần nhất15/10; không phải kiểm định hạ tầng chạy thực tế ngày23/10. Chưa có acceptance matrix đầy đủ từng FR với trọng số effort được phê duyệt; khoảng45–55% phù hợp hơn một con số chính xác tuyệt đối.

Thứ tự đề xuất: **giải quyết verified-payment dependency → positive booking/issuance/check-in E2E → hoàn thiện Manager/Admin/Reporting theo contract → staging và operational/security/performance acceptance → UAT/release**. Có thể chuẩn bị staging và các module độc lập song song khi được giao; không bắt đầu bất kỳ bước nào trong task báo cáo này.

Nguồn chính: [current handoff](../ai/current-handoff.md), [Phase4F](2026-10-15_staff-qr-checkin-real-local-e2e_report.md), [onboarding](2026-10-15_staff-onboarding-local-e2e_report.md), [Phase4E frontend](2026-10-14_admin-staff-management-frontend-implementation_report.md), [backend Staff](2026-10-13_staff-qr-checkin-backend-apis_report.md), [VNPAY contract](../api/vnpay-sandbox-payment-contract-v1.1.md), [SRS v1.2](../srs/srs-v1.2.md), [AdminHome](../../frontend/src/features/admin/admin-home.tsx).
