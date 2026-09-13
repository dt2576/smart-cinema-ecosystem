# SMART CINEMA ECOSYSTEM
# SOFTWARE REQUIREMENTS SPECIFICATION — SRS v1.1

**Project:** Smart Cinema Ecosystem  
**Document Type:** Software Requirements Specification  
**Version:** 1.1  
**Business Model:** Single Cinema Chain – Multiple Cinema Branches  
**Source Baseline:** Business Analysis v2.0 + BRD v1.1  
**Standard Alignment:** ISO/IEC/IEEE 29148-oriented requirements specification  
**Status:** Baseline

---

# REVISION HISTORY

| Version | Date | Description |
|---|---|---|
| 1.0 | 09/09/2026 | Initial SRS baseline based on BRD v1.0 |
| 1.1 | 09/09/2026 | Added official Concession/F&B Add-on requirements and traceability for BR-065 → BR-067 |

---

# 1. INTRODUCTION & SYSTEM OVERVIEW

## 1.1. Purpose

Tài liệu SRS này xác định các yêu cầu phần mềm có thể:

- thiết kế;
- triển khai;
- kiểm thử;
- nghiệm thu;
- truy xuất nguồn gốc

cho dự án **Smart Cinema Ecosystem**.

SRS chuyển các yêu cầu kinh doanh trong BRD v1.1 thành:

- Functional Requirements — FR;
- Non-Functional Requirements — NFR;
- Data Requirements;
- External Interface Requirements;
- Authorization Requirements;
- State & Lifecycle Requirements;
- Traceability Matrix.

SRS không xác định implementation chi tiết như:

- Java Entity;
- Spring Controller/Service/Repository;
- physical database table;
- SQL index;
- Redis key;
- locking strategy cụ thể;
- URL endpoint cuối cùng;
- deployment topology chi tiết.

Các nội dung đó thuộc các bước System Design, Database Design và API Specification.

---

# 1.2. System Scope

Smart Cinema là hệ thống thuộc **một chuỗi rạp duy nhất**, có nhiều Cinema Branch.

Hệ thống phục vụ hai nhóm nghiệp vụ chính.

## Customer-facing

```text
Movie Discovery
      ↓
Cinema Selection
      ↓
Showtime Selection
      ↓
Seat Selection
      ↓
Seat Hold
      ↓
Concession Add-on
      ↓
Promotion
      ↓
Booking
      ↓
Payment
      ↓
Ticket + QR
```

## Cinema Operations

```text
Admin
 └── Whole Cinema Chain

Manager
 └── Assigned Cinema Scope

Staff
 └── Assigned Cinema Scope
     └── Ticket Check-in
```

Critical transaction path:

```text
Showtime
   ↓
Seat Availability
   ↓
Seat Hold
   ↓
Booking
   ↓
Payment Verification
   ↓
Ticket
   ↓
Check-in
```

---

# 1.3. F&B / Concession Scope

Trong SRS v1.1, hệ thống chính thức hỗ trợ **Concession Add-on** trong quá trình Booking.

Customer có thể chọn:

- Popcorn;
- Drink;
- Combo;
- các concession item hợp lệ khác.

Ví dụ:

```text
Booking
├── Seat A5
├── Seat A6
├── Popcorn × 1
└── Drink × 2
```

Concession chỉ là thành phần bổ sung của Booking.

MVP **không bao gồm**:

- inventory;
- warehouse;
- stock movement;
- stock deduction;
- supplier;
- purchase order;
- recipe/BOM;
- kitchen operations;
- standalone POS;
- F&B staff shift;
- full F&B analytics.

Việc mở rộng các chức năng trên thuộc Future Development.

---

# 1.4. System Boundary

Smart Cinema chịu trách nhiệm quản lý:

- User;
- Movie;
- Cinema;
- Hall;
- Seat;
- Showtime;
- Seat Availability;
- Seat Hold;
- Booking;
- Concession Catalog;
- Booking Concession;
- Promotion;
- Payment coordination;
- Ticket;
- QR;
- Check-in;
- Staff/Manager assignment;
- Reporting;
- Notification coordination;
- Audit.

External systems có thể gồm:

- Payment Gateway;
- Email Service;
- SMS Service;
- Zalo Notification Service.

---

# 1.5. Terminology / Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| Smart Cinema | Chuỗi rạp duy nhất được quản lý bởi hệ thống |
| Cinema | Một chi nhánh vật lý của Smart Cinema |
| Hall / Screening Room | Phòng chiếu thuộc Cinema |
| Seat | Ghế vật lý thuộc Hall |
| Showtime | Một lần chiếu cụ thể của Movie tại Hall và thời gian xác định |
| Seat Availability | Trạng thái bán của Seat đối với Showtime |
| Seat Hold | Quyền giữ tạm thời Seat cho một Customer/session |
| Hold TTL | Khoảng thời gian Seat Hold còn hiệu lực |
| Hold Expiration | Thời điểm Hold hết hiệu lực |
| Lock Timeout | Khoảng thời gian tối đa một thao tác concurrency được phép chờ tài nguyên |
| Booking | Giao dịch đặt một hoặc nhiều Seat của cùng Showtime |
| Concession | Đồ ăn/nước hoặc combo được chọn thêm trong Booking |
| Concession Catalog | Danh sách concession item có thể bán |
| Booking Concession | Snapshot concession được Customer mua trong Booking |
| Pricing Snapshot | Giá được cố định tại thời điểm Booking |
| Promotion | Quy tắc giảm giá được áp dụng cho Booking |
| Payment Transaction | Bản ghi giao dịch thanh toán |
| Payment Gateway | External service xử lý thanh toán |
| Callback | Điều hướng client trở lại Smart Cinema sau payment |
| Webhook | Server-to-server payment notification |
| Idempotency | Xử lý cùng event nhiều lần nhưng không sinh side-effect lặp |
| Ticket | Vé điện tử của một Seat |
| QR Ticket | QR đại diện cho Ticket identifier/token |
| QR Check-in | Staff scan QR và Backend xác thực Ticket |
| Cinema Scope | Tập Cinema Manager/Staff được phép thao tác |
| RBAC | Role-Based Access Control |
| Source of Truth | Thành phần có quyền quyết định cuối cùng về dữ liệu/trạng thái |
| Realtime Seat Update | Cập nhật trạng thái Seat tới các client đang xem Showtime |
| REST | Representational State Transfer |
| JWT | JSON Web Token |
| P95 | Phân vị 95 của thời gian xử lý |
| Audit Log | Bản ghi phục vụ truy vết nghiệp vụ |

---

# 1.6. Requirement Language

- **Shall / Phải:** bắt buộc.
- **Should / Nên:** quan trọng nhưng có thể được ưu tiên sau.
- **May / Có thể:** tùy chọn.

Mỗi requirement phải:

- có identifier duy nhất;
- mô tả hành vi xác định;
- có khả năng kiểm thử;
- có traceability phù hợp.

---

# 2. ACTORS & SYSTEM CONTEXT

## 2.1. Human Actors

| Actor | Mô tả | Trách nhiệm |
|---|---|---|
| Customer | Khách hàng của Smart Cinema | Xem phim, chọn Cinema/Showtime/Seat, chọn Concession, Booking, Payment, Ticket |
| Staff | Nhân viên quầy/soát vé | Scan QR, validate Ticket, Check-in |
| Manager | Quản lý Cinema | Quản lý Hall, Seat, Showtime, Staff và báo cáo trong Cinema Scope |
| Admin | Quản trị toàn chuỗi | Quản lý Cinema, Movie, Manager, User, Promotion, Concession Catalog và report toàn chuỗi |

---

# 2.2. External System Actors

| Actor | Vai trò |
|---|---|
| Payment Gateway | Xử lý thanh toán và cung cấp kết quả xác minh |
| Email Service | Gửi email xác nhận/thông báo |
| SMS Service | Gửi SMS khi được bật |
| Zalo Notification | Gửi notification khi được tích hợp |
| Monitoring Platform | Thu thập log, metrics hoặc trace |

---

# 2.3. System Context

```text
                    CUSTOMER
                       │
                       ▼
             ┌─────────────────────┐
             │    SMART CINEMA     │
             │                     │
             │ Movies              │
             │ Cinemas             │
             │ Showtimes           │
             │ Seats               │
             │ Concessions         │
             │ Booking             │
             │ Payment             │
             │ Ticket / Check-in   │
             └──────┬────────┬─────┘
                    │        │
                    ▼        ▼
             PAYMENT      NOTIFICATION
             GATEWAY       SERVICES

                ▲
                │
         STAFF / MANAGER / ADMIN
```

Smart Cinema là source of truth đối với:

- authorization;
- Seat Availability;
- Seat Hold ownership;
- Booking state;
- Booking price;
- Concession price snapshot;
- internal Payment state;
- Ticket validity;
- Check-in state.

---

# 3. FUNCTIONAL REQUIREMENTS

# 3.1. Authentication & Account — FR-AUTH

| FR ID | Tên chức năng | Hành vi hệ thống | Rules / Validation | Main Flow |
|---|---|---|---|---|
| FR-AUTH-001 | Customer Registration | Customer phải tạo được Account | Identifier phải unique | Submit → Validate → Create |
| FR-AUTH-002 | Login | Hệ thống phải xác thực User | Credential và Account Status hợp lệ | Login → Authenticate → Token |
| FR-AUTH-003 | Logout | Hệ thống phải hỗ trợ logout | Phiên/token phải được xử lý theo security policy | Logout → Invalidate |
| FR-AUTH-004 | Token Renewal | Hệ thống phải hỗ trợ refresh authentication | Refresh credential hợp lệ | Validate → Issue token |
| FR-AUTH-005 | Profile Management | Customer quản lý profile được phép | Không cho sửa protected field trái workflow | Load → Validate → Update |
| FR-AUTH-006 | Account Status | Hệ thống quản lý trạng thái Account | Blocked user bị giới hạn truy cập | Check Status |
| FR-AUTH-007 | Role Enforcement | Backend phải kiểm tra Role | Không dựa vào frontend | Request → Role Check |
| FR-AUTH-008 | Cinema Scope Enforcement | Backend kiểm tra Cinema Scope | Manager/Staff chỉ thao tác trong scope | Resolve Cinema → Check Scope |
| FR-AUTH-009 | Resource Ownership | Customer chỉ truy cập tài nguyên của mình | Ownership validation bắt buộc | Resolve Owner → Validate |
| FR-AUTH-010 | User Administration | Admin quản lý Role/Status theo quyền | Không privilege escalation trái phép | Validate → Update → Audit |

---

# 3.2. Movie — FR-MOVIE

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-MOVIE-001 | View Movie Catalog | Customer xem Movie Catalog | Chỉ phim được phép hiển thị | Query → Filter |
| FR-MOVIE-002 | Movie Detail | Xem chi tiết Movie | Movie tồn tại | Select → Detail |
| FR-MOVIE-003 | Movie Search | Search Movie | Filter hợp lệ | Search → Result |
| FR-MOVIE-004 | Create Movie | Admin tạo Movie | Required fields hợp lệ | Validate → Create |
| FR-MOVIE-005 | Update Movie | Admin sửa Movie | Không phá lịch sử transaction | Validate → Update |
| FR-MOVIE-006 | Movie Status | Admin quản lý status | Status rule hợp lệ | Update |
| FR-MOVIE-007 | Genre Management | Movie được gắn Genre | Genre hợp lệ | Associate |
| FR-MOVIE-008 | Movie Showtime Discovery | Customer tìm Cinema/Showtime theo Movie | Chỉ trả Showtime phù hợp | Movie → Showtime |

---

# 3.3. Cinema & Hall — FR-CINEMA

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-CINEMA-001 | Cinema Listing | Customer xem Cinema | Chỉ Cinema available | Query |
| FR-CINEMA-002 | Cinema Detail | Xem thông tin Cinema | Cinema tồn tại | Select |
| FR-CINEMA-003 | Create Cinema | Admin tạo Cinema | Required data hợp lệ | Create |
| FR-CINEMA-004 | Update Cinema | Admin cập nhật Cinema | Không phá lịch sử | Update |
| FR-CINEMA-005 | Cinema Status | Admin quản lý status | Inactive Cinema không nhận Booking mới | Change Status |
| FR-CINEMA-006 | Create Hall | Manager/Admin tạo Hall | Cinema Scope hợp lệ | Scope → Create |
| FR-CINEMA-007 | Update Hall | Manager/Admin sửa Hall | Hall thuộc scope | Validate → Update |
| FR-CINEMA-008 | Hall Status | Quản lý Hall status | Unavailable Hall không nhận Showtime phù hợp | Update |
| FR-CINEMA-009 | Hall Capacity | Capacity phải nhất quán Seat Layout | Capacity logic hợp lệ | Validate |
| FR-CINEMA-010 | Cinema Staff View | Manager/Admin xem Staff theo scope | Không trả dữ liệu ngoài scope | Scope → Query |

---

# 3.4. Showtime — FR-SHOWTIME

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-SHOWTIME-001 | Create Showtime | Manager/Admin tạo Showtime | Movie/Hall/scope hợp lệ | Validate → Conflict Check → Create |
| FR-SHOWTIME-002 | Update Showtime | Sửa Showtime theo policy | Không phá Booking/Ticket | Validate → Update |
| FR-SHOWTIME-003 | Disable Showtime | Ngừng bán Showtime | Không xóa history | Disable |
| FR-SHOWTIME-004 | Schedule Conflict | Ngăn Hall có lịch chồng lấn | Kiểm tra interval + buffer | Detect Conflict |
| FR-SHOWTIME-005 | Duration Validation | End Time phải hợp lệ | Dựa Movie duration | Calculate |
| FR-SHOWTIME-006 | Search by Movie | Search Showtime theo Movie | Filter Cinema/Date | Query |
| FR-SHOWTIME-007 | Search by Cinema | Search Movie/Showtime theo Cinema | Cinema active | Query |
| FR-SHOWTIME-008 | Booking Cut-off | Không Booking khi Showtime bắt đầu | Server Time | Validate |
| FR-SHOWTIME-009 | Base Price | Showtime có Base Price | Không âm | Save |
| FR-SHOWTIME-010 | Hall Availability | Chỉ dùng Hall available | Hall maintenance/inactive bị reject | Validate |

---

# 3.5. Seat & Seat Hold — FR-SEAT

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-SEAT-001 | Seat Map | Trả Seat Map theo Showtime | Backend state authoritative | Load |
| FR-SEAT-002 | Seat Management | Manager/Admin quản lý physical Seat | Cinema Scope | Validate |
| FR-SEAT-003 | Seat Type | Hỗ trợ STANDARD/VIP/COUPLE | Enum/config hợp lệ | Assign |
| FR-SEAT-004 | Seat State | Xác định AVAILABLE/HELD/BOOKED/UNAVAILABLE | Theo Showtime | Calculate |
| FR-SEAT-005 | Acquire Hold | Customer giữ Seat AVAILABLE | Atomic + exclusive | Validate → Hold |
| FR-SEAT-006 | Multi-seat Hold | Customer giữ nhiều Seat | Cùng Showtime | Validate All |
| FR-SEAT-007 | Hold Ownership | Hold thuộc Customer/session | User khác không sử dụng được | Check Owner |
| FR-SEAT-008 | Hold TTL | Hold có expiration | Default 10 phút configurable | Create TTL |
| FR-SEAT-009 | Expire Hold | Hết TTL thì Hold mất hiệu lực | Expired Hold không tạo Booking | Expire |
| FR-SEAT-010 | Release Hold | Customer/System release Hold | Authorization hợp lệ | Release |
| FR-SEAT-011 | Concurrent Hold Protection | Một Seat chỉ có một valid Holder | Atomic concurrency | Acquire |
| FR-SEAT-012 | Booked Seat Protection | BOOKED Seat không được Hold | Backend validation | Reject |
| FR-SEAT-013 | Seat Held Event | Broadcast SEAT_HELD | Event theo Showtime | Broadcast |
| FR-SEAT-014 | Seat Released Event | Broadcast SEAT_RELEASED | Event theo Showtime | Broadcast |
| FR-SEAT-015 | Seat Booked Event | Broadcast SEAT_BOOKED | Sau finalization | Broadcast |
| FR-SEAT-016 | Stale Client Protection | Backend reject stale Seat request | UI không là source of truth | Validate |
| FR-SEAT-017 | Unavailable Seat | Seat unavailable không được bán | Physical status hợp lệ | Validate |

---

# 3.6. Booking & Concession — FR-BOOKING

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-BOOKING-001 | Create Booking | Customer tạo Booking từ Hold hợp lệ | Hold ownership + TTL hợp lệ | Validate → Create |
| FR-BOOKING-002 | Single Showtime | Booking chỉ chứa Seat cùng Showtime | Mixed Showtime reject | Validate |
| FR-BOOKING-003 | Multiple Seats | Booking có thể chứa nhiều Seat | Holds hợp lệ | Attach |
| FR-BOOKING-004 | Booking Status | Quản lý PENDING/PAID/EXPIRED/CANCELLED | Theo lifecycle | Transition |
| FR-BOOKING-005 | Booking Expiration | PENDING quá hạn phải expire | Không giữ resource vô hạn | Expire |
| FR-BOOKING-006 | Seat Pricing Snapshot | Snapshot giá Seat | Giá cũ không thay đổi | Snapshot |
| FR-BOOKING-007 | Server-side Total | Backend tính tổng Booking | Không tin frontend amount | Calculate |
| FR-BOOKING-008 | Promotion Application | Apply Promotion hợp lệ | Validate rule | Apply |
| FR-BOOKING-009 | Booking History | Customer xem lịch sử | Ownership | Query |
| FR-BOOKING-010 | Booking Detail | Xem Booking theo quyền | Authorization | Load |
| FR-BOOKING-011 | Cancel Pending Booking | Cancel Booking hợp lệ | Không auto-refund PAID | Cancel |
| FR-BOOKING-012 | No Ticket Before Payment | PENDING không được có valid Ticket | Verified Payment required | Guard |
| FR-BOOKING-013 | Concession Selection | Customer phải có thể chọn concession item đang available trong Booking | Item phải ACTIVE; quantity > 0 | Load Catalog → Select → Add |
| FR-BOOKING-014 | Concession Pricing Snapshot | Hệ thống phải snapshot giá concession tại Booking | Master price thay đổi không sửa giao dịch cũ | Calculate → Snapshot |
| FR-BOOKING-015 | Concession Total Integration | Backend phải cộng concession amount vào Booking total | Backend authoritative | Aggregate → Calculate |
| FR-BOOKING-016 | Concession Quantity Update | Customer có thể thay đổi quantity trước Payment | Quantity phải hợp lệ | Update → Recalculate |
| FR-BOOKING-017 | Remove Concession | Customer có thể bỏ concession khỏi Booking trước Payment | Booking phải cho phép chỉnh sửa | Remove → Recalculate |
| FR-BOOKING-018 | Booking Composition Lock | Sau khi Booking được finalization/Payment thành công, Seat/Concession composition không được thay đổi tùy ý | Historical integrity | Finalize → Immutable Snapshot |

---

# 3.7. Concession Catalog — FR-CONCESSION

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-CONCESSION-001 | View Concession Catalog | Customer xem concession item available | Chỉ ACTIVE items | Query |
| FR-CONCESSION-002 | Create Concession Item | Admin tạo item | Name, category, price hợp lệ | Validate → Create |
| FR-CONCESSION-003 | Update Concession Item | Admin cập nhật item | Không sửa historical snapshot | Update |
| FR-CONCESSION-004 | Concession Status | Admin enable/disable item | Inactive item không được thêm mới | Change Status |
| FR-CONCESSION-005 | Concession Price | Admin cấu hình selling price | Price ≥ 0 | Validate |
| FR-CONCESSION-006 | Concession Category | Hỗ trợ POPCORN, DRINK, COMBO hoặc category cấu hình | Category hợp lệ | Assign |

Concession Catalog trong MVP không quản stock.

---

# 3.8. Promotion — FR-PROMO

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-PROMO-001 | Promotion Management | Admin quản lý Promotion | Data hợp lệ |
| FR-PROMO-002 | Validity Period | Kiểm tra thời gian | Server time |
| FR-PROMO-003 | Usage Limit | Kiểm tra usage limit | Không vượt giới hạn |
| FR-PROMO-004 | Minimum Amount | Validate minimum order | Theo promotion policy |
| FR-PROMO-005 | Promotion Status | Inactive promotion bị reject | Backend authority |
| FR-PROMO-006 | Recalculation | Backend tính lại discount | Không tin frontend |

MVP mặc định ưu tiên Promotion cấp toàn chuỗi.

Promotion áp dụng cho Seat, Concession hay toàn Booking phải được quy định rõ trong Business Rules Specification.

---

# 3.9. Payment — FR-PAYMENT

| FR ID | Tên | Hành vi | Rules | Main Flow |
|---|---|---|---|---|
| FR-PAYMENT-001 | Initiate Payment | Tạo Payment cho Booking | Booking state hợp lệ | Create |
| FR-PAYMENT-002 | Payment Amount | Amount lấy từ Backend Booking total | Bao gồm concession đã snapshot | Load → Calculate |
| FR-PAYMENT-003 | Gateway Flow | Hỗ trợ sandbox provider | Provider configured | Redirect/Create |
| FR-PAYMENT-004 | Callback | Nhận browser callback | Không tự xác nhận success | Receive |
| FR-PAYMENT-005 | Webhook | Nhận server notification | Verify authenticity | Receive |
| FR-PAYMENT-006 | Backend Verification | Backend xác minh Payment | Trusted provider result | Verify |
| FR-PAYMENT-007 | Payment Success | Verified success cập nhật state | Atomic business transition | SUCCESS |
| FR-PAYMENT-008 | Payment Failure | Failed không tạo Ticket | Booking không PAID | FAILED |
| FR-PAYMENT-009 | Payment Cancellation | Lưu trạng thái cancel khi xác định | Không chuyển Booking PAID | CANCELLED |
| FR-PAYMENT-010 | Payment Idempotency | Duplicate event không duplicate side effect | Reference/event idempotent | Check |
| FR-PAYMENT-011 | Transaction Reference | Lưu internal/external reference | Traceable | Store |
| FR-PAYMENT-012 | Amount Verification | Verify amount/currency/reference | Mismatch reject | Validate |
| FR-PAYMENT-013 | Signature Verification | Verify provider message | Invalid reject | Verify |
| FR-PAYMENT-014 | Late Payment | Xử lý payment tới sau Booking expiry theo policy | Không auto-ticket trái state | Resolve |
| FR-PAYMENT-015 | Payment Audit | Payment transition traceable | Không log secret | Audit |

---

# 3.10. Ticket — FR-TICKET

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-TICKET-001 | Generate Ticket | Tạo Ticket sau Payment Success | Booking PAID |
| FR-TICKET-002 | One Ticket per Seat | Một Seat → một Ticket | Không duplicate |
| FR-TICKET-003 | Unique Token | Ticket token unique | Không dễ đoán |
| FR-TICKET-004 | QR Generation | Sinh QR | Map tới Ticket |
| FR-TICKET-005 | Customer Ticket View | Customer xem Ticket của mình | Ownership |
| FR-TICKET-006 | Ticket Detail | Hiển thị Movie/Cinema/Hall/Seat/Showtime | Data nhất quán |
| FR-TICKET-007 | Ticket Status | Quản lý lifecycle | State rules |
| FR-TICKET-008 | No Duplicate Generation | Retry không sinh thêm Ticket | Idempotent |
| FR-TICKET-009 | Cancelled Ticket | Không Check-in Ticket cancelled | Validate |

---

# 3.11. Check-in — FR-CHECKIN

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-CHECKIN-001 | Scan QR | Staff scan QR | Authenticated Staff |
| FR-CHECKIN-002 | Ticket Existence | Validate Ticket tồn tại | Unknown reject |
| FR-CHECKIN-003 | Paid Booking | Booking phải PAID | Otherwise reject |
| FR-CHECKIN-004 | Cinema Scope | Staff đúng Cinema | Wrong Cinema reject |
| FR-CHECKIN-005 | Showtime Window | Check time policy | Server time |
| FR-CHECKIN-006 | Duplicate Check-in | Không check-in lần hai | Atomic |
| FR-CHECKIN-007 | Cancelled Ticket | Cancelled reject | State validation |
| FR-CHECKIN-008 | Successful Check-in | Chuyển Ticket USED/CHECKED_IN | Save time + Staff |
| FR-CHECKIN-009 | Validation Result | UI nhận result chuẩn hóa | Clear error code |
| FR-CHECKIN-010 | Check-in Audit | Lưu audit | Staff, Ticket, Time, Cinema |

---

# 3.12. Organization — FR-ORG

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-ORG-001 | Assign Manager | Admin gán Manager | Cinema/User hợp lệ |
| FR-ORG-002 | Assign Staff | Manager/Admin gán Staff | Manager theo scope |
| FR-ORG-003 | Remove Assignment | Deactivate assignment | Preserve history |
| FR-ORG-004 | Staff Status | Quản lý trạng thái Staff | Inactive bị hạn chế |
| FR-ORG-005 | Scope Resolution | Backend resolve Cinema Scope | Không tin client |

---

# 3.13. Reporting — FR-REPORT

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-REPORT-001 | Manager Dashboard | KPI theo Cinema Scope | Scope filter |
| FR-REPORT-002 | Admin Dashboard | KPI toàn chuỗi | Admin |
| FR-REPORT-003 | Revenue | Tính revenue hợp lệ | Không tính failed/pending |
| FR-REPORT-004 | Ticket Sold | Tổng Ticket sold | Theo định nghĩa metric |
| FR-REPORT-005 | Occupancy | Tính occupancy | Theo Seat/Showtime |
| FR-REPORT-006 | Movie Performance | Popular/Top Movie | Transaction hợp lệ |
| FR-REPORT-007 | Showtime Performance | Hiệu suất Showtime | Scope enforcement |
| FR-REPORT-008 | Concession Revenue | Có thể tổng hợp concession revenue từ Booking Snapshot | Không yêu cầu inventory analytics |

---

# 3.14. Notification — FR-NOTIFY

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-NOTIFY-001 | Payment Success Notification | Gửi notification sau success | Không rollback Payment |
| FR-NOTIFY-002 | Ticket Notification | Gửi Ticket/confirmation | Sau Ticket creation |
| FR-NOTIFY-003 | Failure Isolation | Notification lỗi không phá core transaction | Log/retry |
| FR-NOTIFY-004 | Channel Selection | Email/SMS/Zalo theo cấu hình | Optional |

---

# 3.15. Audit — FR-AUDIT

| FR ID | Tên | Hành vi | Rules |
|---|---|---|---|
| FR-AUDIT-001 | Admin Audit | Audit sensitive admin operation | Không log secrets |
| FR-AUDIT-002 | Showtime Audit | Audit Showtime changes | Actor/time/resource |
| FR-AUDIT-003 | Assignment Audit | Audit Staff/Manager assignment | Preserve history |
| FR-AUDIT-004 | Check-in Audit | Audit Check-in | Immutable operational record |
| FR-AUDIT-005 | Payment Audit | Audit Payment transition | Safe metadata |
| FR-AUDIT-006 | Concession Catalog Audit | Audit concession price/status changes | Không sửa historical snapshot |

---

# 4. NON-FUNCTIONAL REQUIREMENTS

## 4.1. Performance

| NFR ID | Requirement |
|---|---|
| NFR-PERF-001 | P95 API đọc thông thường mục tiêu ≤ 2 giây trong môi trường nghiệm thu tiêu chuẩn |
| NFR-PERF-002 | P95 Seat Hold processing mục tiêu ≤ 1 giây |
| NFR-PERF-003 | P95 Seat Map API mục tiêu ≤ 2 giây |
| NFR-PERF-004 | P95 QR validation mục tiêu ≤ 2 giây |
| NFR-PERF-005 | Realtime Seat event mục tiêu đến client ≤ 3 giây |
| NFR-PERF-006 | Reporting workload không được làm suy giảm đáng kể critical booking path |

---

# 4.2. Concurrency

| NFR ID | Requirement |
|---|---|
| NFR-CONC-001 | Một Showtime + Seat chỉ có tối đa một valid Hold |
| NFR-CONC-002 | Concurrent booking không được bán cùng Seat cho nhiều Customer |
| NFR-CONC-003 | Concurrent Check-in cùng Ticket chỉ có tối đa một success |
| NFR-CONC-004 | Concurrent/retry Payment events không sinh duplicate Ticket |
| NFR-CONC-005 | Concurrency control phải có timeout xác định |
| NFR-CONC-006 | Phải có automated concurrency test cho hot-seat scenario |
| NFR-CONC-007 | Contention phải trả lỗi xác định thay vì inconsistent state |

---

# 4.3. Security

| NFR ID | Requirement |
|---|---|
| NFR-SEC-001 | Password phải được hash an toàn; không plaintext |
| NFR-SEC-002 | Protected API yêu cầu authentication |
| NFR-SEC-003 | Backend phải enforce Role + Ownership + Cinema Scope |
| NFR-SEC-004 | Token/session phải có lifecycle hợp lệ |
| NFR-SEC-005 | Production-like environment dùng HTTPS/TLS |
| NFR-SEC-006 | Input phải server-side validation |
| NFR-SEC-007 | Hệ thống phải có biện pháp phù hợp với OWASP Top 10 |
| NFR-SEC-008 | Payment message phải verify authenticity/signature khi provider yêu cầu |
| NFR-SEC-009 | QR không chứa sensitive plaintext không cần thiết |
| NFR-SEC-010 | Log không lưu password/token secret/payment secret |
| NFR-SEC-011 | Error response không làm lộ thông tin nội bộ |
| NFR-SEC-012 | Endpoint nhạy cảm nên có rate limiting |

---

# 4.4. Reliability

| NFR ID | Requirement |
|---|---|
| NFR-REL-001 | Availability target dài hạn 99.9%, không tính planned maintenance |
| NFR-REL-002 | Notification failure không rollback Booking/Payment hợp lệ |
| NFR-REL-003 | Duplicate external events phải idempotent |
| NFR-REL-004 | Failure giữa Payment Success và Ticket creation phải recoverable |
| NFR-REL-005 | Transaction-critical data phải persistent trước final success |
| NFR-REL-006 | Server-side time/timezone phải thống nhất |

---

# 4.5. Scalability

| NFR ID | Requirement |
|---|---|
| NFR-SCALE-001 | Application layer có khả năng scale nhiều instance mà không phá transaction consistency |
| NFR-SCALE-002 | Critical shared state không phụ thuộc memory một instance |
| NFR-SCALE-003 | Realtime channel có khả năng mở rộng theo số client |
| NFR-SCALE-004 | Architecture hỗ trợ horizontal scaling/autoscaling trong tương lai |
| NFR-SCALE-005 | Reporting workload nên được tách khỏi critical transaction workload |

---

# 4.6. Maintainability

| NFR ID | Requirement |
|---|---|
| NFR-MAINT-001 | Backend tổ chức modular boundaries rõ ràng |
| NFR-MAINT-002 | Critical business rules phải có automated tests |
| NFR-MAINT-003 | API contract phải được document |
| NFR-MAINT-004 | Hold TTL và operational config không hard-code |
| NFR-MAINT-005 | Error code/business exception có convention thống nhất |
| NFR-MAINT-006 | External provider integration phải được tách biệt hợp lý khỏi core domain |

---

# 4.7. Observability

| NFR ID | Requirement |
|---|---|
| NFR-OBS-001 | Structured application log có timestamp/severity/correlation ID |
| NFR-OBS-002 | Trace được Booking → Payment → Ticket |
| NFR-OBS-003 | Có metrics request rate/error rate/latency/critical events |
| NFR-OBS-004 | Payment failure, seat contention, ticket validation failure phải observable |
| NFR-OBS-005 | Có health/readiness information phù hợp |
| NFR-OBS-006 | Audit Log và technical Log phải tách mục đích |

---

# 4.8. Usability

| NFR ID | Requirement |
|---|---|
| NFR-UX-001 | Seat status phải hiển thị rõ |
| NFR-UX-002 | Hold countdown dựa trên Backend expiration |
| NFR-UX-003 | Staff Check-in UI phải trả kết quả rõ |
| NFR-UX-004 | Business errors phải map thành thông báo dễ hiểu |
| NFR-UX-005 | Booking Summary phải tách rõ Ticket Amount, Concession Amount, Discount và Final Amount |

---

# 5. DATA REQUIREMENTS

## 5.1. User

Core attributes:

- User ID
- Email/Username
- Password Credential
- Full Name
- Phone
- Role
- Status
- Created At
- Updated At

---

## 5.2. Cinema Assignment

- Assignment ID
- User
- Cinema
- Role/Assignment Type
- Status
- Effective Time

---

## 5.3. Movie

- Movie ID
- Title
- Description
- Duration
- Release Date
- Age Rating
- Language
- Poster
- Trailer
- Status
- Genres

---

## 5.4. Cinema

- Cinema ID
- Name
- Address
- Contact
- Operating Information
- Status

---

## 5.5. Hall

- Hall ID
- Cinema
- Name
- Capacity
- Type
- Status

---

## 5.6. Seat

- Seat ID
- Hall
- Row
- Number
- Seat Type
- Physical Status

Logical uniqueness:

```text
Hall + Row + Number
```

---

## 5.7. Showtime

- Showtime ID
- Movie
- Hall
- Start Time
- End Time
- Base Price
- Status
- Booking Cut-off

---

## 5.8. Seat Hold

- Hold ID
- Showtime
- Seat
- Owner
- Created At
- Expires At
- Status

---

## 5.9. Concession Item

- Concession Item ID
- Name
- Description
- Category
- Selling Price
- Image
- Status
- Created At
- Updated At

No inventory attributes are required in MVP.

---

## 5.10. Booking

- Booking ID
- Booking Code
- Customer
- Showtime
- Status
- Seat Amount
- Concession Amount
- Subtotal
- Discount
- Final Amount
- Promotion
- Created At
- Expires At
- Paid At

---

## 5.11. Booking Seat

- Booking
- Seat
- Seat Type Snapshot
- Unit Price Snapshot
- Final Price

---

## 5.12. Booking Concession

- Booking
- Concession Item Reference
- Item Name Snapshot
- Category Snapshot
- Quantity
- Unit Price Snapshot
- Total Price

Snapshot phải đảm bảo nếu Concession Catalog sau này thay đổi:

```text
Original Booking
=
Unchanged
```

---

## 5.13. Promotion

- Promotion ID
- Code
- Discount Type
- Discount Value
- Valid From
- Valid Until
- Minimum Order
- Usage Limit
- Status

---

## 5.14. Payment Transaction

- Payment ID
- Booking
- Provider
- Internal Reference
- External Reference
- Amount
- Currency
- Status
- Initiated At
- Completed At
- Provider Metadata cần thiết

---

## 5.15. Ticket

- Ticket ID
- Booking
- Seat
- Token
- Status
- Issued At
- Checked In At
- Checked In By

---

## 5.16. Audit Record

- Audit ID
- Actor
- Action
- Resource Type
- Resource ID
- Timestamp
- Metadata

---

## 5.17. Logical Relationships

```text
Cinema
  1 ───── N Hall

Hall
  1 ───── N Seat

Movie
  1 ───── N Showtime

Hall
  1 ───── N Showtime

Showtime
  1 ───── N Seat Hold

Customer
  1 ───── N Booking

Showtime
  1 ───── N Booking

Booking
  1 ───── N Booking Seat

Booking
  1 ───── N Booking Concession

Concession Item
  1 ───── N Booking Concession

Booking
  1 ───── N Payment Transaction

Booking
  1 ───── N Ticket
```

---

# 5.18. Data Integrity Constraints

**DR-001:** Seat thuộc đúng một Hall.

**DR-002:** Hall thuộc đúng một Cinema.

**DR-003:** Showtime thuộc đúng một Movie và Hall.

**DR-004:** Booking thuộc đúng một Customer và một Showtime.

**DR-005:** Booking Seat phải thuộc Hall của Showtime.

**DR-006:** Một Showtime + Seat không được bán thành công nhiều lần.

**DR-007:** Không có nhiều active Hold cùng Showtime + Seat.

**DR-008:** Valid Ticket chỉ tồn tại sau successful Payment.

**DR-009:** Một Booking Seat chỉ có tối đa một valid Ticket.

**DR-010:** Ticket Token unique.

**DR-011:** Payment reference phải đủ khả năng xác định giao dịch.

**DR-012:** Final Amount không âm.

**DR-013:** Showtime End Time > Start Time.

**DR-014:** Hold Expires At > Created At.

**DR-015:** Seat pricing snapshot không thay đổi sau transaction.

**DR-016:** Concession pricing snapshot không thay đổi sau transaction.

**DR-017:** Booking Concession Quantity > 0.

**DR-018:** Booking Concession Total = Quantity × Unit Price Snapshot trước các discount allocation nếu có.

**DR-019:** Historical transaction data không bị hard delete nếu phá audit/reconciliation.

---

# 6. EXTERNAL INTERFACE REQUIREMENTS

# 6.1. Customer UI

Các màn hình chính:

```text
Home
Movie List
Movie Detail
Cinema Selection
Showtime Selection
Seat Map
Concession Selection
Booking Summary
Promotion
Payment
Payment Result
My Bookings
My Tickets
QR Ticket
Profile
```

Booking Summary phải hiển thị tối thiểu:

```text
Seats
Seat Amount

Concessions
Concession Amount

Promotion
Discount

Final Amount
```

---

# 6.2. Staff UI

```text
Login
QR Scanner
Ticket Validation Result
Manual Ticket Lookup
Check-in History
```

---

# 6.3. Manager UI

```text
Cinema Dashboard
Hall Management
Seat Management
Showtime Management
Staff Management
Booking View
Reports
```

F&B Inventory Management không tồn tại trong Manager MVP.

---

# 6.4. Admin UI

```text
Chain Dashboard
Cinema Management
Movie Management
User Management
Manager Assignment
Promotion Management
Concession Catalog Management
Reports
Audit
```

---

# 6.5. API Interfaces

Frontend ↔ Backend sử dụng RESTful API trong MVP.

Data format:

```text
HTTPS
JSON
UTF-8
```

API phải hỗ trợ:

- standardized validation;
- standardized error response;
- authentication;
- pagination;
- server timestamps;
- deterministic error code.

GraphQL không thuộc baseline MVP.

---

# 6.6. Payment Interface

```text
Booking
   ↓
Create Payment
   ↓
Payment Gateway
   ↓
Callback/Webhook
   ↓
Backend Verification
```

Backend phải verify:

- Booking reference;
- payment reference;
- amount;
- currency;
- provider status;
- signature/authenticity;
- duplicate event.

Amount phải bao gồm:

```text
Seat Amount
+
Concession Amount
-
Valid Discount
=
Final Amount
```

---

# 6.7. Notification Interfaces

Hệ thống có thể tích hợp:

- Email;
- SMS;
- Zalo Notification.

Notification failure không rollback core transaction.

---

# 6.8. Realtime Interface

WebSocket được ưu tiên cho Seat realtime events:

```text
SEAT_HELD
SEAT_RELEASED
SEAT_BOOKED
```

Events được scoped theo Showtime.

Backend vẫn là source of truth.

---

# 7. AUTHORIZATION REQUIREMENTS

## 7.1. Model

```text
Authentication
      ↓
Role
      ↓
Ownership
      ↓
Cinema Scope
```

---

# 7.2. RBAC Matrix

| Resource / Operation | Customer | Staff | Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Register/Login | ✓ | ✓ | ✓ | ✓ |
| View Movie | ✓ | ✓ | ✓ | ✓ |
| Manage Movie | ✗ | ✗ | ✗ | ✓ |
| View Cinema | ✓ | ✓ | ✓ | ✓ |
| Manage Cinema | ✗ | ✗ | ✗ | ✓ |
| Manage Hall | ✗ | ✗ | Scope | ✓ |
| Manage Seat | ✗ | ✗ | Scope | ✓ |
| View Showtime | ✓ | ✓ | ✓ | ✓ |
| Manage Showtime | ✗ | ✗ | Scope | ✓ |
| View Seat Map | ✓ | ✓ | ✓ | ✓ |
| Hold Seat | Own | ✗ | ✗ | ✗ |
| View Concession | ✓ | ✓ | ✓ | ✓ |
| Manage Concession Catalog | ✗ | ✗ | ✗ | ✓ |
| Add Concession to Booking | Own | ✗ | ✗ | ✗ |
| Create Booking | Own | ✗ | ✗ | ✗ |
| View Booking | Own | Operational | Scope | ✓ |
| Create Payment | Own | ✗ | ✗ | ✗ |
| View Ticket | Own | Operational | Scope | ✓ |
| Check-in Ticket | ✗ | Scope | Scope if permitted | ✓ |
| Manage Staff | ✗ | ✗ | Scope | ✓ |
| Assign Manager | ✗ | ✗ | ✗ | ✓ |
| Cinema Dashboard | ✗ | Limited | Scope | ✓ |
| Chain Dashboard | ✗ | ✗ | ✗ | ✓ |
| Audit | ✗ | Limited | Scope subset | ✓ |

---

# 7.3. Customer Ownership

Customer chỉ được:

- chỉnh profile của mình;
- sử dụng Hold của mình;
- chỉnh concession trong Booking của mình;
- xem Booking của mình;
- thanh toán Booking của mình;
- xem Ticket của mình.

---

# 7.4. Staff Scope

Staff chỉ được Check-in Ticket của Cinema phù hợp.

```text
Staff Cinema A
+
Ticket Cinema B
=
DENIED
```

---

# 7.5. Manager Scope

Manager chỉ quản resource thuộc Cinema được gán.

Backend phải resolve Cinema từ resource thực tế.

Ví dụ:

```text
Showtime
   ↓
Hall
   ↓
Cinema
```

Không tin `cinemaId` do client tự khai để authorize.

---

# 7.6. Admin

Admin có Chain Scope nhưng vẫn phải tuân:

- authentication;
- operation permission;
- validation;
- audit.

---

# 8. STATE & LIFECYCLE REQUIREMENTS

# 8.1. Seat Hold Lifecycle

```text
AVAILABLE
    │
    │ acquire hold
    ▼
HOLDING
  │   │
  │   └──── booking finalized ───→ BOOKED
  │
  └──────── release/expire ──────→ AVAILABLE
```

`UNAVAILABLE` tồn tại độc lập cho Seat không được bán.

### Rules

- SR-SEAT-01: AVAILABLE → HOLDING chỉ khi atomic acquire thành công.
- SR-SEAT-02: HOLDING → AVAILABLE khi expire/release.
- SR-SEAT-03: HOLDING → BOOKED khi finalization hợp lệ.
- SR-SEAT-04: Expired Hold không được dùng tạo Booking.
- SR-SEAT-05: BOOKED không được Hold.

---

# 8.2. Booking Lifecycle

```text
                verified payment
PENDING ─────────────────────────→ PAID
   │
   ├─────────────────────────────→ EXPIRED
   │
   └─────────────────────────────→ CANCELLED
```

Rules:

- Booking mới → PENDING.
- PENDING → PAID chỉ sau verified Payment.
- PENDING → EXPIRED khi quá hạn.
- PENDING → CANCELLED khi hợp lệ.
- Paid auto-refund/cancel không thuộc MVP.

---

# 8.3. Payment Lifecycle

```text
INITIATED
   │
   ├──→ SUCCESS
   ├──→ FAILED
   └──→ CANCELLED
```

Có thể có `PENDING` nếu provider asynchronous.

`REFUNDED` reserved cho future extension.

---

# 8.4. Ticket Lifecycle

```text
VALID
  │
  ├────→ CHECKED_IN / USED
  ├────→ EXPIRED
  └────→ CANCELLED
```

Rules:

- Ticket chỉ tạo sau Booking PAID.
- Check-in chỉ một lần.
- Cancelled/Expired Ticket bị reject.

---

# 8.5. Showtime Lifecycle

```text
DRAFT
  ↓
SCHEDULED
  ↓
OPEN_FOR_BOOKING
  ↓
STARTED
  ↓
ENDED
```

Có thể có:

```text
CANCELLED
```

---

# 8.6. Concession Item Lifecycle

```text
ACTIVE
  │
  └────→ INACTIVE
```

Có thể thêm `DRAFT` nếu cần trong implementation.

Rules:

**SR-CONCESSION-01:** Chỉ ACTIVE Item được thêm vào Booking mới.

**SR-CONCESSION-02:** Item chuyển INACTIVE không được xóa snapshot khỏi Booking cũ.

**SR-CONCESSION-03:** Thay đổi Master Price không thay đổi Booking Concession Snapshot.

**SR-CONCESSION-04:** Booking PAID không được tùy ý thay đổi Concession composition.

---

# 9. TRACEABILITY MATRIX

| BR ID | Business Requirement | FR / NFR Mapping |
|---|---|---|
| BR-001 | Customer Account Management | FR-AUTH-001, 002, 004, 005 |
| BR-002 | RBAC | FR-AUTH-007, NFR-SEC-003 |
| BR-003 | Cinema Scope Authorization | FR-AUTH-008, FR-ORG-005 |
| BR-004 | Unauthorized Access Prevention | FR-AUTH-007, 008, 009, NFR-SEC-002, 003 |
| BR-005 | Centralized Movie Catalog | FR-MOVIE-001, 004, 005 |
| BR-006 | Movie Information Management | FR-MOVIE-004 → 007 |
| BR-007 | Movie Discovery | FR-MOVIE-001, 002, 003, 008 |
| BR-008 | Cinema Branch Management | FR-CINEMA-003 → 005 |
| BR-009 | Screening Room Management | FR-CINEMA-006 → 008 |
| BR-010 | Room Availability | FR-CINEMA-008, FR-SHOWTIME-010 |
| BR-011 | Seat Layout Management | FR-CINEMA-009, FR-SEAT-002, 003 |
| BR-012 | Showtime Creation | FR-SHOWTIME-001 |
| BR-013 | Showtime Conflict Prevention | FR-SHOWTIME-004, NFR-CONC-007 |
| BR-014 | Showtime Duration Validation | FR-SHOWTIME-005 |
| BR-015 | Started Showtime Booking Prevention | FR-SHOWTIME-008 |
| BR-016 | Cinema-Specific Showtime | FR-SHOWTIME-006, 007 |
| BR-017 | Showtime Seat Availability | FR-SEAT-001, 004 |
| BR-018 | Seat Holding | FR-SEAT-005, 006 |
| BR-019 | Seat Hold Expiration | FR-SEAT-008, 009 |
| BR-020 | Seat Hold Ownership | FR-SEAT-007, FR-AUTH-009 |
| BR-021 | Seat Hold Exclusivity | FR-SEAT-011, NFR-CONC-001 |
| BR-022 | Double Booking Prevention | FR-SEAT-011, 012, NFR-CONC-002 |
| BR-023 | Backend Seat Validation | FR-SEAT-016 |
| BR-024 | Automatic Seat Release | FR-SEAT-009, 010, 014 |
| BR-025 | Realtime Seat Synchronization | FR-SEAT-013 → 015, NFR-PERF-005 |
| BR-026 | Booking Creation | FR-BOOKING-001 |
| BR-027 | Single Showtime per Booking | FR-BOOKING-002 |
| BR-028 | Multiple Seats per Booking | FR-BOOKING-003 |
| BR-029 | Booking Lifecycle | FR-BOOKING-004 |
| BR-030 | Booking Expiration | FR-BOOKING-005 |
| BR-031 | Pricing Snapshot | FR-BOOKING-006 |
| BR-032 | Booking History | FR-BOOKING-009, 010 |
| BR-033 | Promotion Management | FR-PROMO-001 |
| BR-034 | Promotion Validation | FR-PROMO-002 → 006 |
| BR-035 | Server-side Price Calculation | FR-BOOKING-007, FR-PAYMENT-002 |
| BR-036 | Payment Creation | FR-PAYMENT-001 |
| BR-037 | Payment Gateway Integration | FR-PAYMENT-003 → 006 |
| BR-038 | Backend Payment Verification | FR-PAYMENT-005, 006, 012, 013 |
| BR-039 | Frontend Payment Distrust | FR-PAYMENT-004, 006 |
| BR-040 | Payment Failure Handling | FR-PAYMENT-008, FR-BOOKING-012 |
| BR-041 | Payment Idempotency | FR-PAYMENT-010, FR-TICKET-008, NFR-CONC-004 |
| BR-042 | Payment Traceability | FR-PAYMENT-011, 015, NFR-OBS-002 |
| BR-043 | Ticket Generation | FR-TICKET-001 |
| BR-044 | One Ticket per Seat | FR-TICKET-002 |
| BR-045 | Unique Ticket Identifier | FR-TICKET-003 |
| BR-046 | QR Ticket | FR-TICKET-004 |
| BR-047 | Ticket Ownership | FR-TICKET-005, FR-AUTH-009 |
| BR-048 | QR Scan | FR-CHECKIN-001 |
| BR-049 | Ticket Validation | FR-CHECKIN-002, 003, 005, 007 |
| BR-050 | Cinema Validation | FR-CHECKIN-004, FR-AUTH-008 |
| BR-051 | Duplicate Check-in Prevention | FR-CHECKIN-006, NFR-CONC-003 |
| BR-052 | Check-in Audit | FR-CHECKIN-010, FR-AUDIT-004 |
| BR-053 | Staff Assignment | FR-ORG-002, 004, 005 |
| BR-054 | Manager Assignment | FR-ORG-001, 003, 005 |
| BR-055 | Limited Staff Management | FR-ORG-001 → 004 |
| BR-056 | No HRM Expansion | Scope Constraint |
| BR-057 | Manager Dashboard | FR-REPORT-001 |
| BR-058 | Admin Dashboard | FR-REPORT-002 |
| BR-059 | Revenue Accuracy | FR-REPORT-003 |
| BR-060 | Cinema Performance Reporting | FR-REPORT-004 → 007 |
| BR-061 | Administrative Audit Log | FR-AUDIT-001 → 003 |
| BR-062 | Ticket Check-in Audit | FR-CHECKIN-010, FR-AUDIT-004 |
| BR-063 | Booking Notification | FR-NOTIFY-001, 002, 004 |
| BR-064 | Notification Failure Isolation | FR-NOTIFY-003, NFR-REL-002 |
| **BR-065** | **Concession Add-on Selection** | **FR-BOOKING-013, 016, 017; FR-CONCESSION-001** |
| **BR-066** | **Concession Pricing Snapshot** | **FR-BOOKING-014, 018; FR-CONCESSION-003, 005** |
| **BR-067** | **Concession Total Integration** | **FR-BOOKING-015, FR-PAYMENT-002, NFR-UX-005** |

---

# 9.1. Traceability Coverage

BRD baseline:

```text
BR-001 → BR-067
```

Coverage:

- `BR-001 → BR-055`: mapped.
- `BR-056`: Scope Exclusion Requirement.
- `BR-057 → BR-067`: mapped.

**BRD v1.1 coverage: 100%.**

Không còn Functional Requirement nào trong SRS v1.1 bị đánh dấu “Derived / Pending BRD Change”.

---

# 9.2. Requirement Chain

Traceability tổng thể của project:

```text
Business Analysis
       ↓
BRD v1.1
       ↓
BR-xxx
       ↓
SRS v1.1
       ↓
FR / NFR
       ↓
Use Case
       ↓
Business Rules
       ↓
ERD / Domain Model
       ↓
API
       ↓
Implementation
       ↓
Test Case
```

---

# 10. MVP BOUNDARY

## MVP Includes

```text
Authentication
Movie
Cinema
Hall
Seat
Showtime
Seat Hold
Realtime Seat Update
Booking
Limited Concession Add-on
Promotion
Payment Sandbox
Ticket
QR
Check-in
Staff / Manager Scope
Dashboard
Audit
```

## MVP Excludes

```text
Multi-brand
Multi-tenant
HRM
Payroll
Attendance
Full F&B Management
Inventory
Warehouse
Supplier
Kitchen
Standalone POS
Automatic Refund
Production Payment
Microservices
Kafka
Kubernetes
Native Mobile
Advanced AI
IoT
```

---

# 11. CORE SYSTEM INVARIANTS

## INV-01

```text
Showtime + Seat
→ maximum one successful owner
```

## INV-02

```text
Showtime + Seat
→ maximum one valid Hold at a time
```

## INV-03

Customer không sử dụng Hold của người khác.

## INV-04

Expired Hold không được tạo Booking hợp lệ.

## INV-05

Frontend không xác nhận Payment Success.

## INV-06

Không tạo valid Ticket trước verified Payment.

## INV-07

Duplicate Payment event không được sinh duplicate Ticket.

## INV-08

Một Ticket chỉ Check-in thành công một lần.

## INV-09

Manager và Staff chỉ thao tác trong Cinema Scope.

## INV-10

Booking Pricing Snapshot phải bất biến sau finalization.

## INV-11

Concession Pricing Snapshot phải bất biến sau finalization.

## INV-12

Notification failure không rollback core transaction.

## INV-13

Realtime UI state không thay thế Backend validation.

---

# 12. IMPLEMENTATION PRIORITY

## Phase 1 — Foundation

```text
AUTH
MOVIE
CINEMA
HALL
SEAT
SHOWTIME
```

## Phase 2 — Core Booking

```text
SEAT AVAILABILITY
SEAT HOLD
CONCURRENCY
BOOKING
PRICING
```

## Phase 3 — Concession & Pricing

```text
CONCESSION CATALOG
BOOKING CONCESSION
PRICING SNAPSHOT
PROMOTION
FINAL AMOUNT
```

## Phase 4 — Payment & Ticket

```text
PAYMENT
PAYMENT VERIFICATION
TICKET
QR
CHECK-IN
```

## Phase 5 — Operations

```text
STAFF ASSIGNMENT
MANAGER SCOPE
REPORTING
AUDIT
```

## Phase 6 — Enhancements

```text
WEBSOCKET
EMAIL
SMS
ZALO NOTIFICATION
```

---

# 13. SRS BASELINE ACCEPTANCE

SRS v1.1 được xem là baseline khi các nguyên tắc sau được chấp nhận:

### Business Model

```text
One Smart Cinema Chain
        ↓
Multiple Cinema Branches
```

### Booking

```text
One Booking
    ↓
One Showtime
    ↓
One or More Seats
    +
Zero or More Concession Items
```

### Price

```text
Seat Amount
+
Concession Amount
-
Promotion Discount
=
Final Booking Amount
```

### Payment

```text
Verified Backend Payment
=
Booking PAID
```

### Ticket

```text
One Purchased Seat
=
One Ticket
```

### Check-in

```text
One Ticket
=
Maximum One Successful Check-in
```

### Authorization

```text
Role
+
Ownership
+
Cinema Scope
```

### F&B Boundary

```text
Concession Add-on
=
MVP

Full F&B Management
=
Future Scope
```

---

# 14. CONCLUSION

SRS v1.1 chính thức đưa **Concession/F&B Add-on** vào phạm vi Smart Cinema mà không mở rộng hệ thống thành một nền tảng quản lý F&B hoàn chỉnh.

Customer Journey hoàn chỉnh trở thành:

```text
Customer
   ↓
Movie
   ↓
Cinema
   ↓
Showtime
   ↓
Seat
   ↓
Seat Hold
   ↓
Concession Add-on
   ↓
Promotion
   ↓
Booking
   ↓
Payment
   ↓
Ticket
   ↓
QR Check-in
```

Core technical focus vẫn là:

```text
Seat Concurrency
+
Booking Integrity
+
Payment Verification
+
Ticket Integrity
+
Cinema Scope Authorization
```

Concession được thiết kế dưới dạng domain nhỏ, đủ để phát triển tiếp thành F&B Management trong tương lai mà không làm phình scope MVP hiện tại.

**SRS v1.1 là baseline chính thức thay thế SRS v1.0 và là đầu vào cho Bước 5 — Actor & Use Case Specification.**