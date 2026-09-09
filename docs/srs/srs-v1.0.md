# SMART CINEMA ECOSYSTEM
# SOFTWARE REQUIREMENTS SPECIFICATION — SRS v1.0

**Project:** Smart Cinema Ecosystem  
**Document Type:** Software Requirements Specification  
**Version:** 1.0  
**Business Model:** Single Cinema Chain – Multiple Cinema Branches  
**Source Baseline:** Business Analysis v2.0 + BRD v1.0  
**Standard Alignment:** ISO/IEC/IEEE 29148-oriented requirements specification  
**Status:** Baseline Candidate

---

# 1. INTRODUCTION & SYSTEM OVERVIEW

## 1.1. Purpose

Tài liệu SRS này xác định các yêu cầu phần mềm có thể:

- thiết kế;
- triển khai;
- kiểm thử;
- nghiệm thu;
- truy xuất về yêu cầu kinh doanh

cho dự án **Smart Cinema Ecosystem**.

SRS chuyển các Business Requirements trong BRD thành:

- Functional Requirements — FR;
- Non-Functional Requirements — NFR;
- Data Requirements;
- Interface Requirements;
- Authorization Requirements;
- State/Lifecycle Requirements;
- Traceability Matrix.

SRS không quyết định chi tiết implementation như:

- Java class;
- Spring package;
- database physical table;
- SQL index;
- Redis key;
- locking implementation cụ thể;
- REST endpoint path cuối cùng;
- deployment topology chi tiết.

Các quyết định trên thuộc System Design / Database Design / API Specification.

---

# 1.2. System Scope

Smart Cinema là hệ thống phần mềm thuộc **một chuỗi rạp duy nhất**, quản lý nhiều chi nhánh Cinema.

Hệ thống hỗ trợ hai nhóm chức năng chính.

### Customer-facing

```text
Movie Discovery
      ↓
Cinema Selection
      ↓
Showtime Selection
      ↓
Seat Map
      ↓
Seat Hold
      ↓
Booking
      ↓
Payment
      ↓
Ticket + QR
```

### Cinema-operation

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

# 1.3. System Boundary

Smart Cinema chịu trách nhiệm quản lý:

- User;
- Movie Catalog;
- Cinema;
- Hall / Screening Room;
- Seat;
- Showtime;
- Seat Availability;
- Seat Hold;
- Booking;
- Promotion;
- Payment coordination;
- Ticket;
- QR;
- Check-in;
- Staff/Manager assignment;
- Reporting;
- Notification coordination;
- Audit.

Các hệ thống ngoài có thể gồm:

- Payment Gateway;
- Email Service;
- SMS Service;
- Zalo Notification Service.

Các external service không phải source of truth cho nghiệp vụ Cinema.

---

# 1.4. Terminology / Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| Smart Cinema | Chuỗi rạp duy nhất được quản lý bởi hệ thống |
| Cinema | Một chi nhánh/cụm rạp vật lý của Smart Cinema |
| Hall / Screening Room | Một phòng chiếu thuộc Cinema |
| Seat | Ghế vật lý thuộc Hall |
| Showtime | Một lần chiếu cụ thể của một Movie tại một Hall trong một khoảng thời gian |
| Seat Availability | Trạng thái bán của một Seat đối với một Showtime cụ thể |
| Seat Hold | Quyền giữ tạm thời một Seat cho một Customer/session trước khi hoàn tất Booking |
| Hold TTL | Khoảng thời gian Seat Hold còn hiệu lực |
| Hold Expiration | Thời điểm Seat Hold hết hiệu lực |
| Lock Timeout | Thời gian tối đa một thao tác đồng bộ/concurrency control được phép chờ tài nguyên trước khi thất bại |
| Booking | Giao dịch đặt một hoặc nhiều Seat thuộc cùng một Showtime |
| Pricing Snapshot | Bản ghi giá được cố định tại thời điểm Booking để thay đổi giá tương lai không ảnh hưởng giao dịch cũ |
| Promotion | Quy tắc giảm giá hợp lệ được áp dụng cho Booking |
| Payment | Quá trình thanh toán của Booking |
| Payment Transaction | Bản ghi giao dịch giữa Smart Cinema và Payment Gateway |
| Payment Gateway | Hệ thống ngoài thực hiện xử lý thanh toán, ví dụ sandbox VNPay/MoMo |
| Callback | Request người dùng được chuyển lại hệ thống sau quá trình thanh toán |
| Webhook | Server-to-server notification từ Payment Gateway tới Smart Cinema |
| Idempotency | Cùng một request/event được xử lý nhiều lần nhưng không gây side-effect nghiệp vụ lặp |
| Ticket | Vé điện tử được tạo cho một Seat sau Payment Success |
| QR Ticket | Biểu diễn QR của token/identifier Ticket |
| QR Check-in | Quy trình Staff scan và Backend xác thực Ticket trước khi cho phép vào rạp |
| Cinema Scope | Tập Cinema mà Manager/Staff được phép thao tác |
| RBAC | Role-Based Access Control |
| Source of Truth | Hệ thống/dữ liệu có quyền quyết định cuối cùng về một trạng thái nghiệp vụ |
| Realtime Seat Update | Cơ chế đẩy thay đổi trạng thái ghế tới các client đang xem cùng Showtime |
| Concession | Đồ ăn/nước có thể chọn thêm trong Booking; không bao gồm quản trị kho/POS đầy đủ |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| JWT | JSON Web Token |
| SLA | Service Level Agreement |
| KPI | Key Performance Indicator |
| P95 | Phân vị 95 của thời gian phản hồi |
| Audit Log | Bản ghi hành động quan trọng để phục vụ truy vết |

---

# 1.5. Requirement Language

Các từ sau được hiểu thống nhất:

- **Shall / Phải:** yêu cầu bắt buộc.
- **Should / Nên:** yêu cầu quan trọng nhưng có thể hoãn theo scope.
- **May / Có thể:** khả năng tùy chọn.

Mỗi requirement phải:

- có mã duy nhất;
- có hành vi xác định;
- có khả năng kiểm thử;
- tránh mô tả implementation nếu chưa cần thiết.

---

# 2. ACTORS & SYSTEM CONTEXT

## 2.1. Human Actors

| Actor | Mô tả | Trách nhiệm chính |
|---|---|---|
| Customer | Khách hàng sử dụng Smart Cinema | Xem phim, chọn Cinema/Showtime/Seat, Booking, Payment, xem Ticket |
| Staff | Nhân viên quầy/soát vé tại Cinema | Tra cứu Ticket được phép, scan QR, Check-in |
| Manager | Quản lý Cinema | Quản lý Hall, Seat, Showtime, Staff và báo cáo trong Cinema Scope |
| Admin | Quản trị hệ thống toàn chuỗi | Quản lý Cinema, Movie, Manager, User, Promotion và dashboard toàn chuỗi |

---

# 2.2. External System Actors

| Actor | Mục đích |
|---|---|
| Payment Gateway | Tạo/tiếp nhận giao dịch thanh toán và gửi kết quả xác minh |
| Email Service | Gửi email xác nhận Booking/Ticket/thông báo |
| SMS Service | Gửi SMS khi feature được bật |
| Zalo Notification Service | Gửi notification khi feature được tích hợp |
| Monitoring Platform | Thu thập log/metrics/traces trong môi trường triển khai nếu được cấu hình |

---

# 2.3. System Context Description

```text
                    ┌───────────────────────┐
                    │       CUSTOMER        │
                    └──────────┬────────────┘
                               │
                               ▼
                 ┌───────────────────────────┐
                 │       SMART CINEMA        │
                 │                           │
                 │ Movie / Cinema / Showtime │
                 │ Seat / Booking / Payment  │
                 │ Ticket / Check-in         │
                 └───────┬─────────┬─────────┘
                         │         │
               ┌─────────┘         └────────────┐
               ▼                                ▼
      PAYMENT GATEWAY                  NOTIFICATION SERVICES

               ▲
               │
       ┌───────┼───────────────┐
       │       │               │
     STAFF   MANAGER          ADMIN
```

Smart Cinema phải là source of truth đối với:

- authorization;
- seat availability;
- hold ownership;
- booking state;
- giá Booking;
- payment state nội bộ;
- ticket validity;
- check-in state.

---

# 3. FUNCTIONAL REQUIREMENTS

# 3.1. Authentication & Account — FR-AUTH

| FR ID | Tên chức năng | Hành vi hệ thống | Business Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-AUTH-001 | Customer Registration | Hệ thống phải cho Customer tạo tài khoản | Identifier đăng nhập phải unique; dữ liệu bắt buộc phải hợp lệ | Submit → validate → create account → success |
| FR-AUTH-002 | User Login | Hệ thống phải xác thực credential và tạo authenticated session/token | Account phải active; credential không hợp lệ bị từ chối | Credential → authenticate → issue tokens/session |
| FR-AUTH-003 | Logout | Hệ thống phải hỗ trợ kết thúc phiên đăng nhập | Token/session hiện tại phải bị vô hiệu hóa theo security design | Logout request → invalidate → success |
| FR-AUTH-004 | Token Renewal | Hệ thống phải cho phép gia hạn phiên bằng refresh mechanism | Refresh credential phải còn hiệu lực | Submit refresh → validate → issue new access token |
| FR-AUTH-005 | User Profile | Customer phải xem và cập nhật thông tin profile được phép | Không được sửa security-sensitive attributes ngoài workflow quy định | Get/update → validate → save |
| FR-AUTH-006 | Account Status | Hệ thống phải hỗ trợ ACTIVE/BLOCKED hoặc trạng thái tương đương | User bị khóa không được đăng nhập mới | Status check trước authentication |
| FR-AUTH-007 | Role Enforcement | Backend phải kiểm tra Role trên protected operation | Frontend visibility không thay thế backend authorization | Request → authenticate → role check |
| FR-AUTH-008 | Cinema Scope Enforcement | Backend phải kiểm tra Cinema Scope của Staff/Manager | Có Role nhưng ngoài scope vẫn phải bị từ chối | Resolve resource cinema → scope check |
| FR-AUTH-009 | Ownership Enforcement | Customer chỉ được truy cập tài nguyên thuộc quyền sở hữu của mình | Booking/Ticket của Customer khác bị từ chối | Authenticate → ownership check |
| FR-AUTH-010 | Administrative User Management | Admin phải có khả năng quản lý trạng thái và role phù hợp của User | Không cho phép privilege escalation trái rule | Admin action → validate → update → audit |

---

# 3.2. Movie — FR-MOVIE

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-MOVIE-001 | Movie Catalog View | Customer phải xem được danh sách Movie phù hợp trạng thái công bố | Movie inactive không xuất hiện trong customer catalog | Query → filter → return |
| FR-MOVIE-002 | Movie Detail | Hệ thống phải trả chi tiết Movie | ID phải tồn tại và Movie được phép hiển thị | Select movie → return detail |
| FR-MOVIE-003 | Movie Search | Customer phải tìm Movie theo tiêu chí hỗ trợ | Search phải áp dụng trạng thái visibility | Keyword/filter → results |
| FR-MOVIE-004 | Create Movie | Admin phải tạo Movie | Duration > 0; các trường bắt buộc hợp lệ | Validate → create |
| FR-MOVIE-005 | Update Movie | Admin phải sửa thông tin Movie | Không được phá tính nhất quán Showtime hiện hữu | Validate → update |
| FR-MOVIE-006 | Movie Status Management | Admin phải thay đổi trạng thái Movie | Status không được làm sai lịch sử Booking | Change → validate → persist |
| FR-MOVIE-007 | Genre Association | Admin phải gắn Movie với Genre | Genre phải tồn tại | Select genres → validate → save |
| FR-MOVIE-008 | Movie Showtime Discovery | Hệ thống phải cho Customer tìm Cinema/Showtime đang chiếu Movie | Chỉ trả Showtime bookable theo điều kiện | Movie → Cinema/date → Showtime |

---

# 3.3. Cinema / Hall — FR-CINEMA

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-CINEMA-001 | Cinema Listing | Customer phải xem các Cinema đang phục vụ | Cinema inactive không được book | Query → filter active cinemas |
| FR-CINEMA-002 | Cinema Detail | Hệ thống phải cung cấp thông tin chi nhánh | Cinema phải tồn tại | Select → return detail |
| FR-CINEMA-003 | Create Cinema | Admin phải tạo Cinema | Tên/địa chỉ và required data hợp lệ | Validate → create |
| FR-CINEMA-004 | Update Cinema | Admin phải cập nhật Cinema | Không được phá lịch sử nghiệp vụ | Validate → update |
| FR-CINEMA-005 | Cinema Status | Admin phải quản lý trạng thái Cinema | Cinema không hoạt động không nhận Booking mới | Change → enforce |
| FR-CINEMA-006 | Create Hall | Manager/Admin được tạo Hall trong Cinema Scope | Manager phải có quyền trên Cinema | Scope check → validate → create |
| FR-CINEMA-007 | Update Hall | Manager/Admin được cập nhật Hall | Hall phải thuộc Cinema được phép | Scope → validate → update |
| FR-CINEMA-008 | Hall Status | Manager/Admin phải quản lý ACTIVE/MAINTENANCE/INACTIVE | Hall unavailable không được nhận Showtime mới phù hợp thời gian | Update → validate affected schedules |
| FR-CINEMA-009 | Hall Capacity | Hệ thống phải duy trì capacity logic theo Seat Layout | Capacity phải nhất quán với Seat hợp lệ | Recalculate/validate |
| FR-CINEMA-010 | Cinema Staff Assignment View | Manager/Admin phải xem Staff thuộc Cinema Scope | Không trả Staff ngoài scope | Scope → query → return |

---

# 3.4. Showtime — FR-SHOWTIME

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-SHOWTIME-001 | Create Showtime | Manager/Admin phải tạo Showtime | Movie, Hall hợp lệ; Manager có scope | Validate → conflict check → create |
| FR-SHOWTIME-002 | Update Showtime | Manager/Admin được sửa Showtime khi policy cho phép | Không được làm sai Booking/Ticket hiện hữu | Validate state/dependencies → update |
| FR-SHOWTIME-003 | Disable Showtime | Authorized user phải có thể ngừng bán Showtime | Không xóa lịch sử transaction | Disable → stop new booking |
| FR-SHOWTIME-004 | Schedule Conflict Validation | Backend phải ngăn Showtime chồng lấn cùng Hall | Xét start/end và configured buffer | Calculate interval → detect conflict |
| FR-SHOWTIME-005 | Movie Duration Validation | Hệ thống phải xác định End Time hợp lệ | Không được nhỏ hơn duration + required buffer rule | Calculate → validate |
| FR-SHOWTIME-006 | Search by Movie | Customer phải tìm Showtime theo Movie/Date/Cinema | Chỉ trả Showtime phù hợp visibility | Filter → return |
| FR-SHOWTIME-007 | Search by Cinema | Customer phải xem Movie/Showtime theo Cinema/Date | Cinema phải active | Cinema/date → results |
| FR-SHOWTIME-008 | Booking Cut-off | Hệ thống phải từ chối Booking khi Showtime đã bắt đầu | Dựa trên server time | Booking request → compare time |
| FR-SHOWTIME-009 | Showtime Base Price | Showtime phải có thông tin giá cơ sở | Price phải không âm | Configure → validate |
| FR-SHOWTIME-010 | Hall Availability Check | Showtime chỉ được tạo tại Hall usable | Hall maintenance/inactive bị từ chối | Validate Hall state |

---

# 3.5. Seat & Realtime Hold — FR-SEAT

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-SEAT-001 | Seat Layout View | Hệ thống phải trả Seat Map của Showtime | Phản ánh trạng thái gần nhất từ backend | Showtime → load physical seats + availability |
| FR-SEAT-002 | Physical Seat Management | Manager/Admin quản lý Seat của Hall | Manager phải có Cinema Scope | Scope → validate → create/update |
| FR-SEAT-003 | Seat Type | Hệ thống phải hỗ trợ STANDARD, VIP, COUPLE tối thiểu | Type phải nằm trong cấu hình hợp lệ | Assign type |
| FR-SEAT-004 | Showtime Seat State | Hệ thống phải xác định AVAILABLE/HELD/BOOKED/UNAVAILABLE | Physical state và transaction state phải được kết hợp đúng | Calculate → return |
| FR-SEAT-005 | Acquire Seat Hold | Customer phải giữ được Seat AVAILABLE | Hold phải atomic và exclusive | Validate → acquire → return expiry |
| FR-SEAT-006 | Multi-seat Hold | Customer phải có thể yêu cầu giữ nhiều Seat | Tập Seat phải thuộc cùng Showtime; kết quả phải đảm bảo consistency theo booking policy | Validate all → acquire |
| FR-SEAT-007 | Hold Ownership | Hold phải gắn với Customer/session | User khác không được sử dụng Hold | Validate owner |
| FR-SEAT-008 | Hold TTL | Hold phải có expiration time | Default 10 phút, configurable | Create → calculate expiresAt |
| FR-SEAT-009 | Expire Hold | Hold hết TTL phải mất hiệu lực | Expired hold không được dùng tạo booking | Detect expiry → release |
| FR-SEAT-010 | Manual Hold Release | Customer/system có thể release Hold không còn cần | Chỉ owner hoặc privileged system operation | Validate → release |
| FR-SEAT-011 | Concurrent Hold Protection | Chỉ một concurrent requester được sở hữu Seat Hold hợp lệ | Không được hai success cho cùng Showtime+Seat | Concurrent requests → one winner |
| FR-SEAT-012 | Booked Seat Protection | Seat BOOKED không được Hold | Backend phải kiểm tra source of truth | Request → reject |
| FR-SEAT-013 | Realtime Hold Event | Hệ thống nên phát event khi Seat HELD | Event không thay thế DB/backend validation | State change → broadcast |
| FR-SEAT-014 | Realtime Release Event | Hệ thống nên phát event khi Hold release/expire | Event scoped theo Showtime | Release → broadcast |
| FR-SEAT-015 | Realtime Booked Event | Hệ thống nên phát event khi Seat BOOKED | Client phải cập nhật seat state | Payment/booking finalized → broadcast |
| FR-SEAT-016 | Stale Client Protection | Backend phải từ chối Seat không còn AVAILABLE dù client hiển thị AVAILABLE | UI state không có quyền quyết định | Request → backend validation |
| FR-SEAT-017 | Unavailable Physical Seat | Seat disabled/maintenance không được bán | Áp dụng trên các Showtime chịu ảnh hưởng | Validate physical availability |

---

# 3.6. Booking & Concession — FR-BOOKING

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-BOOKING-001 | Create Booking | Customer phải tạo Booking từ Hold hợp lệ | Hold thuộc Customer, chưa expire, cùng Showtime | Validate → price → create PENDING |
| FR-BOOKING-002 | Single Showtime Rule | Một Booking chỉ chứa Seat của một Showtime | Mixed-showtime booking bị từ chối | Validate selected seats |
| FR-BOOKING-003 | Multiple Seat Booking | Một Booking có thể chứa nhiều Seat | Tất cả Seat phải có valid Hold | Validate → attach |
| FR-BOOKING-004 | Booking Status | Hệ thống phải quản lý PENDING/PAID/EXPIRED/CANCELLED | Transition phải tuân state machine | Event → transition |
| FR-BOOKING-005 | Booking Expiration | PENDING Booking quá hạn phải hết hiệu lực | Không giữ resource vô thời hạn | Detect → expire |
| FR-BOOKING-006 | Booking Pricing Snapshot | Hệ thống phải lưu giá từng thành phần tại Booking | Giá lịch sử không bị thay đổi bởi pricing mới | Calculate → snapshot |
| FR-BOOKING-007 | Server-side Total | Backend phải tính subtotal, discount và final amount | Không tin amount do frontend cung cấp | Recalculate → persist |
| FR-BOOKING-008 | Promotion Application | Customer có thể áp Promotion hợp lệ | Code/status/date/limit/minimum phải hợp lệ | Validate → calculate discount |
| FR-BOOKING-009 | Booking History | Customer phải xem Booking của chính mình | Ownership check bắt buộc | Authenticate → query |
| FR-BOOKING-010 | Booking Detail | Customer/authorized staff phải xem Booking theo quyền | Sensitive fields bị giới hạn | Authorization → return |
| FR-BOOKING-011 | Cancel Pending Booking | Customer/system có thể cancel PENDING Booking theo rule | Không áp dụng auto-refund cho PAID | Validate state → cancel → release resources |
| FR-BOOKING-012 | No Ticket Before Payment | Booking PENDING không được có valid Ticket | Ticket generation phụ thuộc verified payment | Guard invariant |
| FR-BOOKING-013 | Concession Selection | **Derived:** Customer có thể chọn đồ ăn/nước từ catalog đơn giản trong lúc Booking | Không bao gồm inventory/POS; cần BRD change-control nếu đưa vào MVP | Select items → validate → price snapshot |
| FR-BOOKING-014 | Concession Pricing Snapshot | **Derived:** Giá đồ ăn/nước trong Booking phải được snapshot | Thay đổi giá sau đó không sửa Booking cũ | Calculate → persist |
| FR-BOOKING-015 | Concession Total Integration | **Derived:** Giá concession được cộng vào final Booking amount | Backend tính final total | Aggregate → calculate |

**Scope note:** FR-BOOKING-013 → 015 không mở rộng thành quản trị kho, bếp, POS hay supply chain.

---

# 3.7. Promotion — FR-PROMO

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-PROMO-001 | Promotion Management | Admin phải tạo/cập nhật/disable Promotion | Các field phải hợp lệ | Validate → save |
| FR-PROMO-002 | Validity Period | Backend phải kiểm tra thời gian hiệu lực | Server time là nguồn kiểm tra | Apply → date validation |
| FR-PROMO-003 | Usage Constraint | Backend phải kiểm tra usage limit | Không vượt giới hạn | Check → accept/reject |
| FR-PROMO-004 | Minimum Amount | Backend kiểm tra minimum order | Dùng amount trước discount theo policy | Calculate → validate |
| FR-PROMO-005 | Promotion Status | Inactive promotion không được áp dụng | Backend authority | Validate status |
| FR-PROMO-006 | Promotion Recalculation | Backend phải tái tính discount khi booking composition thay đổi | Không tin frontend discount | Recalculate |

---

# 3.8. Payment — FR-PAYMENT

| FR ID | Tên | Hành vi | Rules / Validation | Luồng chính |
|---|---|---|---|---|
| FR-PAYMENT-001 | Initiate Payment | Customer phải tạo Payment cho Booking hợp lệ | Booking phải ở state cho phép thanh toán | Validate → create transaction |
| FR-PAYMENT-002 | Payment Amount | Amount gửi Gateway phải lấy từ server-side Booking total | Client amount không được tin cậy | Load booking → create request |
| FR-PAYMENT-003 | Gateway Redirect/Flow | Hệ thống phải hỗ trợ flow sandbox của gateway được chọn | Chỉ provider đã cấu hình | Generate payment request |
| FR-PAYMENT-004 | Payment Callback | Hệ thống có thể tiếp nhận callback từ browser | Callback không đủ để tự xác nhận success | Receive → show/intermediate verify |
| FR-PAYMENT-005 | Payment Webhook | Hệ thống phải tiếp nhận server notification khi Gateway hỗ trợ | Signature/authenticity phải được xác minh | Receive → verify |
| FR-PAYMENT-006 | Backend Verification | Backend phải xác minh Payment với dữ liệu đáng tin cậy | Booking chỉ PAID sau verified success | Verify → transition |
| FR-PAYMENT-007 | Payment Success | Verified success phải cập nhật Payment và Booking phù hợp | Transition atomic về mặt business | Success → payment SUCCESS → booking PAID |
| FR-PAYMENT-008 | Payment Failure | Failed payment không được tạo Ticket | Booking không chuyển PAID | Failure → persist |
| FR-PAYMENT-009 | Payment Cancellation | Hệ thống phải lưu cancelled/abandoned payment khi xác định được | Không đồng nghĩa Booking PAID | Update state |
| FR-PAYMENT-010 | Payment Idempotency | Duplicate callback/webhook không được gây duplicate side-effects | Transaction/reference/event phải idempotent | Detect processed → return safe result |
| FR-PAYMENT-011 | Transaction Reference | Payment phải lưu external/internal reference | Reference hỗ trợ trace/reconciliation | Create/store |
| FR-PAYMENT-012 | Amount Verification | Backend phải kiểm tra amount/currency/reference theo provider data | Mismatch → reject payment confirmation | Verify fields |
| FR-PAYMENT-013 | Signature Verification | Gateway message phải được kiểm tra authenticity khi protocol hỗ trợ | Invalid signature → reject | Verify signature |
| FR-PAYMENT-014 | Late Payment Handling | Kết quả Payment đến sau khi Booking hết hạn phải được xử lý theo policy nhất quán | Không tự phát hành Ticket khi state không cho phép | Verify → conflict policy |
| FR-PAYMENT-015 | Payment Auditability | Payment state change phải truy vết được | Không log secret/payment sensitive data trái policy | Record safe metadata |

---

# 3.9. Ticket — FR-TICKET

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-TICKET-001 | Generate Ticket | Hệ thống phải tạo Ticket sau verified Payment Success | Booking phải PAID | Payment success → create |
| FR-TICKET-002 | One Ticket per Seat | Mỗi purchased Seat tạo một Ticket | Không duplicate ticket cho cùng booking-seat | Generate unique ticket |
| FR-TICKET-003 | Unique Ticket Token | Ticket phải có identifier/token unique | Token không được dễ đoán nếu dùng để xác thực | Generate → persist |
| FR-TICKET-004 | QR Generation | Hệ thống phải tạo biểu diễn QR cho Ticket | QR phải map tới token/validation payload an toàn | Ticket → QR |
| FR-TICKET-005 | Customer Ticket View | Customer phải xem Ticket của mình | Ownership check | Login → booking/ticket |
| FR-TICKET-006 | Ticket Detail | Hệ thống phải cung cấp Movie/Cinema/Hall/Seat/Showtime cần thiết | Data phải phù hợp snapshot/reference | Fetch → render |
| FR-TICKET-007 | Ticket Status | Ticket phải có state phục vụ validation | Transition theo lifecycle | Event → update |
| FR-TICKET-008 | No Duplicate Generation | Retry Payment event không được sinh thêm Ticket | Idempotency invariant | Check existing → skip/create |
| FR-TICKET-009 | Cancelled Ticket Enforcement | Ticket cancelled không được check-in | Backend validation | Scan → reject |

---

# 3.10. Check-in — FR-CHECKIN

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-CHECKIN-001 | Scan QR | Staff phải nhập/scan QR token | Staff authenticated | Scan → send token |
| FR-CHECKIN-002 | Ticket Existence Validation | Backend phải xác minh Ticket tồn tại | Unknown token → reject | Resolve token |
| FR-CHECKIN-003 | Paid Booking Validation | Ticket chỉ hợp lệ nếu Booking có trạng thái cho phép | Unpaid → reject | Load booking → validate |
| FR-CHECKIN-004 | Cinema Scope Validation | Staff phải thuộc Cinema tương ứng | Wrong Cinema → reject | Resolve cinema → scope check |
| FR-CHECKIN-005 | Showtime Validation | Check-in phải tuân time-window policy của Showtime | Window được cấu hình trong system rules | Compare server time |
| FR-CHECKIN-006 | Duplicate Check-in Prevention | Ticket không được check-in thành công lần hai | Check + transition phải atomic | Validate state → mark used |
| FR-CHECKIN-007 | Cancelled Ticket Rejection | Cancelled Ticket bị từ chối | Ticket state authoritative | Validate → reject |
| FR-CHECKIN-008 | Successful Check-in | Valid Ticket phải chuyển state sang USED/CHECKED_IN | Ghi checkedInAt và Staff | Validate → transition |
| FR-CHECKIN-009 | Check-in Result | UI Staff phải nhận kết quả rõ SUCCESS/INVALID/WRONG_CINEMA/ALREADY_USED/... | Không lộ internal security detail không cần thiết | Validate → standardized result |
| FR-CHECKIN-010 | Check-in Audit | Check-in phải lưu thông tin audit cần thiết | Staff ID, time, ticket, cinema | Persist audit |

---

# 3.11. Staff & Manager Assignment — FR-ORG

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-ORG-001 | Assign Manager | Admin phải gán Manager cho Cinema | Cinema/User hợp lệ | Select → assign |
| FR-ORG-002 | Assign Staff | Manager/Admin phải gán Staff theo quyền | Manager chỉ gán trong scope | Scope → assign |
| FR-ORG-003 | Remove Assignment | Authorized actor có thể ngừng assignment | Không làm mất audit history | Validate → deactivate |
| FR-ORG-004 | Staff Status | Hệ thống phải hỗ trợ trạng thái account/assignment | Inactive Staff không check-in | Validate during authorization |
| FR-ORG-005 | Scope Resolution | Backend phải xác định Cinema Scope cho request | Không phụ thuộc dữ liệu client tự khai | Resolve from trusted persistence |

---

# 3.12. Dashboard & Reporting — FR-REPORT

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-REPORT-001 | Manager Dashboard | Manager phải xem KPI Cinema trong scope | Không trả Cinema khác | Scope → aggregate |
| FR-REPORT-002 | Admin Dashboard | Admin phải xem KPI toàn chuỗi | Admin authorization | Aggregate chain |
| FR-REPORT-003 | Revenue Metric | Revenue chỉ tính transaction hợp lệ theo rule | Không tính PENDING/FAILED | Filter → aggregate |
| FR-REPORT-004 | Ticket Sold Metric | Hệ thống phải tính số Ticket sold | Định nghĩa metric nhất quán | Aggregate |
| FR-REPORT-005 | Occupancy Metric | Hệ thống nên tính occupancy theo Showtime/Cinema | Formula phải được document | Aggregate seats |
| FR-REPORT-006 | Movie Performance | Hệ thống nên cung cấp top/popular movie metrics | Dựa trên transaction hợp lệ | Aggregate |
| FR-REPORT-007 | Showtime Performance | Manager/Admin nên xem hiệu suất Showtime | Scope enforcement | Query → aggregate |

---

# 3.13. Notification — FR-NOTIFY

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-NOTIFY-001 | Payment Success Notification | Hệ thống có thể gửi notification sau Payment Success | Notification failure không rollback payment | Event → send |
| FR-NOTIFY-002 | Ticket Notification | Hệ thống có thể gửi thông tin Ticket/booking confirmation | Chỉ sau Ticket creation | Event → send |
| FR-NOTIFY-003 | Notification Failure Isolation | Lỗi provider không được rollback core transaction | Retry có thể xử lý riêng | Send fail → log/retry |
| FR-NOTIFY-004 | Channel Selection | Hệ thống có thể hỗ trợ Email/SMS/Zalo theo cấu hình | Không bắt buộc tất cả channel MVP | Resolve channel → send |

---

# 3.14. Audit — FR-AUDIT

| FR ID | Tên | Hành vi | Rules | Luồng |
|---|---|---|---|---|
| FR-AUDIT-001 | Administrative Audit | Hệ thống phải/ nên ghi các admin operation quan trọng | Không lưu secret/plain password | Operation → audit |
| FR-AUDIT-002 | Showtime Audit | Thay đổi Showtime quan trọng phải truy vết được | Record actor/time/resource | Save event |
| FR-AUDIT-003 | Assignment Audit | Staff/Manager assignment phải truy vết | Actor + old/new assignment | Save |
| FR-AUDIT-004 | Check-in Audit | Check-in phải có audit record | Không cho user thường sửa | Persist |
| FR-AUDIT-005 | Payment Audit | Payment transition phải truy vết bằng safe metadata | Không log sensitive credentials | Persist |

---

# 4. NON-FUNCTIONAL REQUIREMENTS

## 4.1. Performance

| NFR ID | Requirement |
|---|---|
| NFR-PERF-001 | Với API đọc thông thường trong môi trường nghiệm thu tiêu chuẩn, P95 response time mục tiêu không vượt quá 2 giây. |
| NFR-PERF-002 | Request Seat Hold trong điều kiện tải nghiệm thu mục tiêu phải hoàn tất trong P95 ≤ 1 giây, không tính thời gian mạng ngoài hệ thống. |
| NFR-PERF-003 | API Seat Map mục tiêu trả dữ liệu trong P95 ≤ 2 giây đối với Hall có kích thước trong phạm vi thiết kế. |
| NFR-PERF-004 | QR validation/check-in backend mục tiêu P95 ≤ 2 giây. |
| NFR-PERF-005 | Realtime Seat state event mục tiêu tới connected clients trong ≤ 3 giây ở điều kiện vận hành bình thường. |
| NFR-PERF-006 | Report/dashboard không được làm suy giảm critical booking path vượt ngưỡng nghiệm thu đã định. |

---

# 4.2. Concurrency

| NFR ID | Requirement |
|---|---|
| NFR-CONC-001 | Hệ thống phải đảm bảo với cùng `Showtime + Seat`, tối đa một Seat Hold hợp lệ tồn tại tại một thời điểm. |
| NFR-CONC-002 | Hai hoặc nhiều concurrent requests mua cùng Seat không được tạo nhiều successful bookings cho cùng Seat/Showtime. |
| NFR-CONC-003 | Check-in đồng thời cùng Ticket chỉ được tối đa một operation thành công. |
| NFR-CONC-004 | Payment event retry/concurrency không được tạo duplicate Ticket hoặc duplicate Booking finalization. |
| NFR-CONC-005 | Concurrency control phải có timeout/failure behavior xác định; request không được chờ lock vô hạn. |
| NFR-CONC-006 | Hệ thống phải có automated concurrency test cho hot-seat scenario với nhiều requests cạnh tranh cùng Seat. |
| NFR-CONC-007 | Khi contention xảy ra, hệ thống phải trả lỗi nghiệp vụ xác định thay vì tạo inconsistent data. |

---

# 4.3. Security

| NFR ID | Requirement |
|---|---|
| NFR-SEC-001 | Credential/password phải được lưu bằng password hashing algorithm phù hợp; không lưu plaintext password. |
| NFR-SEC-002 | Protected API phải yêu cầu authentication hợp lệ. |
| NFR-SEC-003 | Authorization phải được thực thi server-side bằng Role, ownership và Cinema Scope tương ứng. |
| NFR-SEC-004 | Token/session phải có thời hạn và cơ chế revoke/renew phù hợp với security design. |
| NFR-SEC-005 | Transport trong môi trường production-like phải sử dụng TLS/HTTPS. |
| NFR-SEC-006 | Input từ client phải được validate server-side. |
| NFR-SEC-007 | Hệ thống phải áp dụng biện pháp phòng ngừa thích hợp đối với các nhóm rủi ro OWASP Top 10 liên quan. |
| NFR-SEC-008 | Payment callback/webhook phải kiểm tra authenticity/signature khi provider hỗ trợ/bắt buộc. |
| NFR-SEC-009 | QR token không được chứa dữ liệu nhạy cảm dưới dạng plaintext không cần thiết. |
| NFR-SEC-010 | Log không được chứa plaintext password, token bí mật, payment secret hoặc dữ liệu nhạy cảm không cần thiết. |
| NFR-SEC-011 | API lỗi authentication/authorization không được làm lộ thông tin nội bộ vượt mức cần thiết. |
| NFR-SEC-012 | Rate limiting/throttling nên được áp dụng cho authentication, QR validation và endpoint nhạy cảm theo deployment policy. |

---

# 4.4. Reliability & Availability

| NFR ID | Requirement |
|---|---|
| NFR-REL-001 | Production target dài hạn của hệ thống là availability 99.9%, không tính planned maintenance được công bố. |
| NFR-REL-002 | Core booking transaction phải duy trì tính nhất quán khi một downstream notification service thất bại. |
| NFR-REL-003 | Duplicate external events phải được xử lý idempotent. |
| NFR-REL-004 | Failure giữa Payment Success và Ticket Generation phải có khả năng phát hiện và recovery/reconciliation mà không phát hành duplicate ticket. |
| NFR-REL-005 | Dữ liệu transaction quan trọng phải được persistent trước khi trả trạng thái thành công cuối cùng. |
| NFR-REL-006 | System clock/timezone handling phải thống nhất; server-side time được sử dụng cho expiry và state validation. |

---

# 4.5. Scalability

| NFR ID | Requirement |
|---|---|
| NFR-SCALE-001 | Application layer phải được thiết kế để có thể chạy nhiều instance khi cần mà không phá Seat Hold/Booking consistency. |
| NFR-SCALE-002 | Session/critical state không được phụ thuộc vào memory của một application instance duy nhất nếu hệ thống scale horizontally. |
| NFR-SCALE-003 | Realtime channel phải có khả năng mở rộng cho nhiều client theo Showtime. |
| NFR-SCALE-004 | Kiến trúc phải cho phép horizontal scaling/autoscaling ở deployment phase mà không yêu cầu thay đổi business model. |
| NFR-SCALE-005 | Reporting workload nên được tách logic để không tranh chấp quá mức với transactional workload. |

**Lưu ý:** Autoscaling là capability target ở deployment architecture, không bắt buộc phải triển khai Kubernetes trong MVP.

---

# 4.6. Maintainability

| NFR ID | Requirement |
|---|---|
| NFR-MAINT-001 | Backend phải được tổ chức theo modular boundaries rõ ràng giữa các domain chính. |
| NFR-MAINT-002 | Business rules quan trọng phải có automated unit/integration tests. |
| NFR-MAINT-003 | API contract phải được document và version khi có breaking change. |
| NFR-MAINT-004 | Configuration như Hold TTL không được hard-code vào business logic nếu cần thay đổi vận hành. |
| NFR-MAINT-005 | Error codes/business exceptions phải có quy ước thống nhất. |
| NFR-MAINT-006 | Source code phải hỗ trợ dependency separation giữa domain/application và external providers ở mức kiến trúc phù hợp. |

---

# 4.7. Observability

| NFR ID | Requirement |
|---|---|
| NFR-OBS-001 | Hệ thống phải tạo structured application logs có timestamp, severity và request/correlation identifier khi khả thi. |
| NFR-OBS-002 | Critical flow phải có khả năng trace từ Booking → Payment → Ticket. |
| NFR-OBS-003 | Hệ thống nên expose metrics cho request rate, error rate, latency và critical transaction events. |
| NFR-OBS-004 | Payment webhook failure, seat contention và ticket validation failure phải có log/metric phù hợp. |
| NFR-OBS-005 | Health/readiness information nên tồn tại cho deployment monitoring. |
| NFR-OBS-006 | Audit Log và technical log phải được phân biệt về mục đích. |

---

# 4.8. Usability

| NFR ID | Requirement |
|---|---|
| NFR-UX-001 | Customer phải nhận được trạng thái Seat rõ ràng và không thể chọn Seat được đánh dấu BOOKED/UNAVAILABLE. |
| NFR-UX-002 | Seat Hold countdown phải hiển thị dựa trên expiration time do Backend cung cấp. |
| NFR-UX-003 | Staff check-in UI phải hiển thị kết quả đủ rõ để quyết định cho phép/từ chối vào rạp. |
| NFR-UX-004 | Error nghiệp vụ như `SEAT_ALREADY_HELD`, `HOLD_EXPIRED`, `PAYMENT_FAILED` phải được chuyển thành thông báo người dùng dễ hiểu. |

---

# 5. DATA REQUIREMENTS

## 5.1. Logical Entities

### User

Core attributes:

- User ID
- Email/Username
- Password Credential
- Full Name
- Phone
- Role
- Account Status
- Created At
- Updated At

---

### Cinema Assignment

- Assignment ID
- User
- Cinema
- Assignment Type/Role
- Status
- Effective Time

---

### Movie

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

### Genre

- Genre ID
- Name
- Status

---

### Cinema

- Cinema ID
- Name
- Address
- Contact
- Status
- Operating Information

---

### Hall

- Hall ID
- Cinema
- Name
- Capacity
- Type
- Status

---

### Seat

- Seat ID
- Hall
- Row
- Number
- Seat Type
- Physical Status

Logical uniqueness:

```text
Hall + Row + Seat Number
```

---

### Showtime

- Showtime ID
- Movie
- Hall
- Start Time
- End Time
- Base Price
- Status
- Booking Cut-off Information

Cinema được suy ra qua Hall.

---

### Seat Hold

- Hold ID
- Showtime
- Seat
- Customer/Session Owner
- Created At
- Expires At
- Status

---

### Booking

- Booking ID
- Booking Code
- Customer
- Showtime
- Status
- Subtotal
- Discount
- Final Amount
- Pricing Snapshot
- Promotion Reference
- Created At
- Expires At
- Paid At

---

### Booking Seat / Booking Item

- Booking
- Seat
- Seat Type Snapshot
- Unit Price Snapshot
- Discount Allocation nếu cần
- Final Seat Price

---

### Concession Item — Optional / Derived

- Item ID
- Name
- Category
- Selling Price
- Status

Không bao gồm inventory.

---

### Booking Concession — Optional / Derived

- Booking
- Concession Item
- Quantity
- Unit Price Snapshot
- Total Price

---

### Promotion

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

### Payment Transaction

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
- Provider Response Metadata cần thiết

---

### Ticket

- Ticket ID
- Booking
- Seat
- Token
- Status
- Issued At
- Checked In At
- Checked In By

---

### Audit Record

- Audit ID
- Actor
- Action
- Resource Type
- Resource ID
- Timestamp
- Relevant Metadata

---

### Notification

- Notification ID
- Recipient
- Channel
- Type
- Status
- Created At
- Sent At
- Failure Information nếu có

---

# 5.2. Logical Relationships

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
  1 ───── N Payment Transaction

Booking
  1 ───── N Ticket

Booking Seat
  1 ───── 1 Ticket
  after successful payment
```

---

# 5.3. Data Integrity Constraints

**DR-001:** Một Seat thuộc đúng một Hall.

**DR-002:** Một Hall thuộc đúng một Cinema.

**DR-003:** Một Showtime thuộc đúng một Movie và một Hall.

**DR-004:** Một Booking thuộc đúng một Customer và một Showtime trong MVP.

**DR-005:** Booking Seat không được chứa Seat thuộc Hall khác với Hall của Showtime.

**DR-006:** Với một Showtime + Seat không được tồn tại nhiều quyền Booking thành công.

**DR-007:** Tại cùng thời điểm không được tồn tại nhiều active Seat Hold cho cùng Showtime + Seat.

**DR-008:** Ticket chỉ tồn tại hợp lệ đối với Booking được thanh toán thành công.

**DR-009:** Một Booking Seat chỉ sinh tối đa một valid Ticket.

**DR-010:** Ticket Token phải unique.

**DR-011:** Payment reference cần đủ uniqueness theo provider/integration contract.

**DR-012:** Booking final amount không được âm.

**DR-013:** Showtime End Time phải sau Start Time.

**DR-014:** Seat Hold Expires At phải sau Created At.

**DR-015:** Historical pricing snapshot không bị sửa khi master price thay đổi.

**DR-016:** Không hard-delete dữ liệu transaction lịch sử nếu việc xóa phá audit/reconciliation.

---

# 6. EXTERNAL INTERFACE REQUIREMENTS

# 6.1. User Interfaces

## Customer UI

Các màn hình chính:

```text
Home
Movie List
Movie Detail
Cinema Selection
Showtime Selection
Seat Map
Booking Summary
Promotion
Payment
Payment Result
My Bookings
My Tickets
QR Ticket
Profile
```

Seat Map phải:

- phân biệt trạng thái ghế;
- phản ánh Seat Type;
- hiển thị selection;
- hiển thị Hold countdown;
- xử lý realtime state change;
- nhận lỗi khi Backend từ chối stale selection.

---

## Staff UI

```text
Login
QR Scanner
Manual Ticket Lookup
Validation Result
Check-in History (nếu được cấp)
```

Kết quả phải rõ:

- VALID;
- INVALID;
- ALREADY_USED;
- WRONG_CINEMA;
- CANCELLED;
- TOO_EARLY/TOO_LATE theo policy;
- NOT_PAID.

---

## Manager UI

```text
Cinema Dashboard
Hall Management
Seat Management
Showtime Management
Staff Management
Booking View
Reports
```

UI không được cho phép lựa chọn resource ngoài Cinema Scope; Backend vẫn phải tái kiểm tra.

---

## Admin UI

```text
Chain Dashboard
Cinema Management
Movie Management
User/Manager Management
Promotion Management
Reports
Audit View
```

---

# 6.2. API Interfaces

Frontend ↔ Backend sử dụng **RESTful API** làm giao tiếp chính trong MVP.

Data exchange:

```text
HTTPS
JSON
UTF-8
```

API phải sử dụng:

- standardized request validation;
- standardized success/error response;
- authentication headers/session mechanism;
- pagination cho list phù hợp;
- server timestamps theo format thống nhất;
- deterministic error codes.

GraphQL không thuộc MVP trừ khi architecture được thay đổi chính thức.

---

# 6.3. Payment Gateway Interface

Integration phải hỗ trợ tối thiểu:

```text
Create Payment Request
        ↓
Payment Provider
        ↓
Callback
        +
Webhook / Verification
        ↓
Backend Verification
```

Backend phải xác minh:

- transaction reference;
- booking reference;
- amount;
- payment status;
- signature/authenticity;
- duplicate event;
- provider-specific validation.

Provider-specific contract được mô tả trong Integration/API Specification sau.

---

# 6.4. Email / SMS / Zalo Interface

Notification integration phải có abstraction đủ để core business không phụ thuộc trực tiếp vào một provider duy nhất nếu được triển khai.

Failure:

```text
Payment Success
      ↓
Ticket Created
      ↓
Notification Failed
```

không được rollback:

```text
Booking PAID
Ticket VALID
```

---

# 6.5. Realtime Interface

MVP ưu tiên **WebSocket** cho realtime Seat state.

Logical event categories:

```text
SEAT_HELD
SEAT_RELEASED
SEAT_BOOKED
```

Event phải scoped theo Showtime.

Client nhận event phải cập nhật UI nhưng:

> Realtime event không phải source of truth cho hành động Booking.

Mọi command Hold/Booking vẫn phải được Backend validate lại.

Server-Sent Events có thể được cân nhắc thay thế trong System Design nhưng không triển khai đồng thời nếu không có nhu cầu.

---

# 7. AUTHORIZATION REQUIREMENTS

## 7.1. Authorization Model

```text
Authentication
      ↓
Role-Based Access Control
      ↓
Resource Ownership
      ↓
Cinema Scope
```

---

# 7.2. RBAC Matrix

| Resource / Operation | Customer | Staff | Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Register/Login | ✓ | ✓ | ✓ | ✓ |
| View public Movie | ✓ | ✓ | ✓ | ✓ |
| Manage Movie | ✗ | ✗ | ✗ | ✓ |
| View Cinema | ✓ | ✓ | ✓ | ✓ |
| Create/Update Cinema | ✗ | ✗ | ✗ | ✓ |
| Manage Hall | ✗ | ✗ | Scope | ✓ |
| Manage Seat | ✗ | ✗ | Scope | ✓ |
| View Showtime | ✓ | ✓ | ✓ | ✓ |
| Manage Showtime | ✗ | ✗ | Scope | ✓ |
| View Seat Map | ✓ | ✓ | ✓ | ✓ |
| Hold Seat | Own | ✗ | ✗ | ✗ |
| Create Booking | Own | ✗ | ✗ | ✗ |
| View Booking | Own | Authorized operational view | Scope | ✓ |
| Apply Promotion | Own Booking | ✗ | ✗ | ✓ manage |
| Create Payment | Own Booking | ✗ | ✗ | ✗ |
| View Ticket | Own | Operational | Scope if needed | ✓ |
| Scan/Check-in Ticket | ✗ | Scope | Scope if explicitly allowed | ✓/Operational |
| Manage Staff | ✗ | ✗ | Scope | ✓ |
| Assign Manager | ✗ | ✗ | ✗ | ✓ |
| View Cinema Dashboard | ✗ | Limited/None | Scope | ✓ |
| View Chain Dashboard | ✗ | ✗ | ✗ | ✓ |
| View Audit | ✗ | Limited own check-in if allowed | Scope subset | ✓ |

`Scope` nghĩa là quyền chỉ tồn tại đối với Cinema được gán.

---

# 7.3. Customer Ownership Rules

Customer được phép:

```text
View/update own profile
View own booking
Pay own booking
View own ticket
Cancel own eligible pending booking
```

Customer không được:

```text
View another customer's private booking
Use another customer's Seat Hold
Pay/modify another customer's Booking
Access staff/admin resource
```

---

# 7.4. Staff Cinema Scope

Ví dụ:

```text
Staff A
assignedCinema = CINEMA_01
```

Ticket:

```text
Ticket T1
Cinema = CINEMA_02
```

Kết quả:

```text
CHECK-IN DENIED
```

dù Staff A có role `STAFF`.

---

# 7.5. Manager Cinema Scope

Manager chỉ được:

- manage Hall trong assigned Cinema;
- manage Seat trong assigned Cinema;
- manage Showtime trong assigned Cinema;
- manage Staff trong assigned Cinema;
- xem operational data/report trong assigned Cinema.

Backend phải suy ra Cinema từ resource.

Ví dụ Manager request:

```text
Update Showtime ST100
```

không được tin một field:

```text
cinemaId = CinemaA
```

do client truyền nếu actual Showtime thuộc CinemaB.

Backend phải resolve:

```text
Showtime
   ↓
Hall
   ↓
Cinema
```

rồi authorization.

---

# 7.6. Admin Scope

Admin có quyền toàn chuỗi theo các action được định nghĩa.

Admin vẫn phải:

- authenticated;
- pass operation-level authorization;
- chịu audit đối với sensitive operation.

Admin privilege không loại bỏ business validation.

---

# 8. STATE & LIFECYCLE REQUIREMENTS

# 8.1. Seat Availability / Seat Hold Lifecycle

Logical lifecycle:

```text
          ┌─────────────────────┐
          │      AVAILABLE      │
          └──────────┬──────────┘
                     │ acquire hold
                     ▼
          ┌─────────────────────┐
          │       HOLDING       │
          └──────┬────────┬─────┘
                 │        │
          expires│        │ booking/payment finalized
                 ▼        ▼
          AVAILABLE    RESERVED/BOOKED
```

Additional state:

```text
UNAVAILABLE
```

khi physical/business rule không cho bán.

Rules:

**SR-SEAT-01:** AVAILABLE → HOLDING chỉ khi acquire hold atomic thành công.

**SR-SEAT-02:** HOLDING → AVAILABLE khi release hoặc expire.

**SR-SEAT-03:** HOLDING → BOOKED chỉ khi booking finalization hợp lệ.

**SR-SEAT-04:** BOOKED không quay lại AVAILABLE trong MVP trừ cancellation/refund policy được mở rộng.

**SR-SEAT-05:** Expired Hold không được transition sang BOOKED.

---

# 8.2. Booking Lifecycle

```text
                    Payment Verified
                  ┌──────────────────→ PAID
                  │
                  │
PENDING ──────────┼──────────────────→ EXPIRED
                  │
                  └──────────────────→ CANCELLED
```

Rules:

**SR-BOOK-01:** Booking mới bắt đầu ở PENDING.

**SR-BOOK-02:** PENDING → PAID chỉ sau verified Payment Success.

**SR-BOOK-03:** PENDING → EXPIRED khi expiration rule đạt.

**SR-BOOK-04:** PENDING → CANCELLED khi cancellation hợp lệ.

**SR-BOOK-05:** PAID → CANCELLED không thuộc automatic flow MVP.

**SR-BOOK-06:** State transition phải idempotent.

---

# 8.3. Payment Lifecycle

MVP logical state:

```text
             ┌──────────→ SUCCESS
             │
INITIATED ───┼──────────→ FAILED
             │
             └──────────→ CANCELLED
```

Có thể có:

```text
PENDING
```

nếu provider yêu cầu asynchronous waiting.

`REFUNDED` được định nghĩa cho khả năng mở rộng nhưng automatic refund là Out-of-Scope MVP.

Rules:

**SR-PAY-01:** Payment bắt đầu INITIATED/PENDING.

**SR-PAY-02:** Chỉ verified provider result mới chuyển SUCCESS.

**SR-PAY-03:** SUCCESS event lặp không được tạo side-effect lặp.

**SR-PAY-04:** FAILED không tạo Ticket.

**SR-PAY-05:** REFUNDED không được implement tự động trong MVP nếu chưa có BRD change.

---

# 8.4. Ticket Lifecycle

Recommended logical lifecycle:

```text
             ┌──────────────→ CHECKED_IN / USED
             │
VALID ───────┼──────────────→ EXPIRED
             │
             └──────────────→ CANCELLED
```

Rules:

**SR-TICKET-01:** Ticket chỉ được tạo vào VALID khi Booking PAID.

**SR-TICKET-02:** VALID → CHECKED_IN chỉ qua successful backend validation.

**SR-TICKET-03:** CHECKED_IN không được check-in lại.

**SR-TICKET-04:** CANCELLED không được Check-in.

**SR-TICKET-05:** EXPIRED không được Check-in.

**SR-TICKET-06:** Ticket time-validity được tính theo Showtime và check-in window policy.

---

# 8.5. Showtime Lifecycle

Recommended lifecycle:

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

Optional terminal state:

```text
CANCELLED
```

MVP implementation có thể rút gọn field status nếu thời gian đủ để suy ra state, nhưng behavior phải đáp ứng:

- chưa mở bán → không Booking;
- đang mở bán → Booking được phép;
- đã bắt đầu → không Booking mới;
- cancelled → không Booking mới.

---

# 9. TRACEABILITY MATRIX

Mục tiêu của matrix này là đảm bảo toàn bộ `BR-001 → BR-064` của BRD v1.0 có requirement kỹ thuật tương ứng.

| BR ID | Business Requirement | FR / NFR Mapping |
|---|---|---|
| BR-001 | Customer Account Management | FR-AUTH-001, 002, 004, 005 |
| BR-002 | RBAC | FR-AUTH-007, NFR-SEC-003 |
| BR-003 | Cinema Scope Authorization | FR-AUTH-008, FR-ORG-005, NFR-SEC-003 |
| BR-004 | Unauthorized Access Prevention | FR-AUTH-007, 008, 009, NFR-SEC-002, 003 |
| BR-005 | Centralized Movie Catalog | FR-MOVIE-001, 004, 005 |
| BR-006 | Movie Information Management | FR-MOVIE-004, 005, 006, 007 |
| BR-007 | Movie Discovery | FR-MOVIE-001, 002, 003, 008 |
| BR-008 | Cinema Branch Management | FR-CINEMA-003, 004, 005 |
| BR-009 | Screening Room Management | FR-CINEMA-006, 007, 008 |
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
| BR-022 | Double Booking Prevention | FR-SEAT-011, 012, FR-BOOKING-001, NFR-CONC-002 |
| BR-023 | Backend Seat Validation | FR-SEAT-016 |
| BR-024 | Automatic Seat Release | FR-SEAT-009, 010, 014 |
| BR-025 | Realtime Seat Synchronization | FR-SEAT-013, 014, 015, NFR-PERF-005 |
| BR-026 | Booking Creation | FR-BOOKING-001 |
| BR-027 | Single Showtime per Booking | FR-BOOKING-002 |
| BR-028 | Multiple Seats per Booking | FR-BOOKING-003 |
| BR-029 | Booking Lifecycle | FR-BOOKING-004, SR-BOOK-01 → 06 |
| BR-030 | Booking Expiration | FR-BOOKING-005 |
| BR-031 | Pricing Snapshot | FR-BOOKING-006 |
| BR-032 | Booking History | FR-BOOKING-009, 010 |
| BR-033 | Promotion Management | FR-PROMO-001 |
| BR-034 | Promotion Validation | FR-PROMO-002 → 006 |
| BR-035 | Server-Side Price Calculation | FR-BOOKING-007, FR-PAYMENT-002 |
| BR-036 | Payment Creation | FR-PAYMENT-001 |
| BR-037 | Payment Gateway Integration | FR-PAYMENT-003 → 006 |
| BR-038 | Backend Payment Verification | FR-PAYMENT-005, 006, 012, 013 |
| BR-039 | Frontend Payment Distrust | FR-PAYMENT-004, 006 |
| BR-040 | Payment Failure Handling | FR-PAYMENT-008, FR-BOOKING-012 |
| BR-041 | Payment Idempotency | FR-PAYMENT-010, FR-TICKET-008, NFR-CONC-004, NFR-REL-003 |
| BR-042 | Payment Traceability | FR-PAYMENT-011, 015, NFR-OBS-002 |
| BR-043 | Ticket Generation | FR-TICKET-001, FR-BOOKING-012 |
| BR-044 | One Ticket per Seat | FR-TICKET-002 |
| BR-045 | Unique Ticket Identifier | FR-TICKET-003 |
| BR-046 | QR Ticket | FR-TICKET-004 |
| BR-047 | Ticket Ownership View | FR-TICKET-005, FR-AUTH-009 |
| BR-048 | QR Scan | FR-CHECKIN-001 |
| BR-049 | Ticket Validation | FR-CHECKIN-002, 003, 005, 007 |
| BR-050 | Cinema Validation | FR-CHECKIN-004, FR-AUTH-008 |
| BR-051 | Duplicate Check-in Prevention | FR-CHECKIN-006, NFR-CONC-003 |
| BR-052 | Check-in Audit | FR-CHECKIN-008, 010, FR-AUDIT-004 |
| BR-053 | Staff Assignment | FR-ORG-002, 004, 005 |
| BR-054 | Manager Assignment | FR-ORG-001, 003, 005 |
| BR-055 | Limited Staff Management | FR-ORG-001 → 004 |
| BR-056 | No HRM Expansion | Scope constraint; no implementation FR |
| BR-057 | Manager Dashboard | FR-REPORT-001 |
| BR-058 | Admin Dashboard | FR-REPORT-002 |
| BR-059 | Revenue Accuracy | FR-REPORT-003 |
| BR-060 | Cinema Performance Reporting | FR-REPORT-004 → 007 |
| BR-061 | Administrative Audit Log | FR-AUDIT-001, 002, 003 |
| BR-062 | Ticket Check-in Audit | FR-AUDIT-004, FR-CHECKIN-010 |
| BR-063 | Booking Notification | FR-NOTIFY-001, 002, 004 |
| BR-064 | Notification Failure Isolation | FR-NOTIFY-003, NFR-REL-002 |

---

# 9.1. Traceability Coverage Result

BRD Requirement Range:

```text
BR-001 → BR-064
```

Kết quả:

- 63 Business Requirements có FR/NFR triển khai hoặc kiểm thử tương ứng.
- `BR-056 — No HRM Expansion` là **scope exclusion requirement**, do đó được đáp ứng bằng việc **không tạo functional implementation cho HRM**.

=> **BRD v1.0 Coverage: 100%.**

---

# 9.2. Derived Requirements not yet in BRD

Các requirement sau xuất phát từ yêu cầu bổ sung trong SRS nhưng chưa có BR tương ứng trong BRD v1.0:

```text
FR-BOOKING-013
Concession Selection

FR-BOOKING-014
Concession Pricing Snapshot

FR-BOOKING-015
Concession Total Integration
```

Nếu giữ các chức năng này trong official MVP:

> BRD phải được revision thành **BRD v1.1** và bổ sung Business Requirement cho limited concession add-on.

Nếu không revision BRD:

> FR-BOOKING-013 → 015 phải được loại khỏi baseline MVP và chuyển Future Scope.

---

# 10. SRS ACCEPTANCE BASELINE

SRS v1.0 được xem là đủ điều kiện chuyển sang các bước thiết kế khi các invariant sau được giữ nguyên.

### Authentication / Authorization

```text
Role
+
Ownership
+
Cinema Scope
```

được Backend thực thi.

### Seat

```text
Same Showtime + Same Seat
→ maximum one valid holder
```

### Booking

```text
One Booking
→ One Showtime
→ One or More Seats
```

### Payment

```text
Frontend Success
≠
Payment Success

Verified Backend Payment
=
Payment Success
```

### Ticket

```text
Payment not verified
→ No valid Ticket
```

### Check-in

```text
One Ticket
→ maximum one successful Check-in
```

### Realtime

```text
WebSocket
=
UI synchronization

Backend
=
Source of Truth
```

---

# 11. REQUIREMENTS PRIORITY FOR IMPLEMENTATION

## Phase 1 — Foundation

```text
AUTH
MOVIE
CINEMA
HALL
SEAT
SHOWTIME
```

## Phase 2 — Core Transaction

```text
SEAT AVAILABILITY
SEAT HOLD
CONCURRENCY
BOOKING
PRICING
```

## Phase 3 — Transaction Completion

```text
PAYMENT
PAYMENT VERIFICATION
TICKET
QR
CHECK-IN
```

## Phase 4 — Operational Features

```text
PROMOTION
STAFF ASSIGNMENT
DASHBOARD
REPORTING
AUDIT
```

## Phase 5 — Enhancements

```text
WEBSOCKET
NOTIFICATION
CONCESSION ADD-ON
```

---

# 12. BASELINE CONCLUSION

Smart Cinema SRS v1.0 xác định hệ thống phần mềm cho một chuỗi rạp duy nhất với nhiều Cinema Branch.

Core software responsibilities là:

```text
Authentication
      ↓
Movie / Cinema / Showtime
      ↓
Seat Availability
      ↓
Atomic Seat Holding
      ↓
Booking
      ↓
Payment Verification
      ↓
Ticket Generation
      ↓
QR Check-in
```

Hệ thống phải ưu tiên **transaction integrity** hơn convenience của client.

Các nguyên tắc không được phá ở các bước thiết kế tiếp theo:

1. Backend là source of truth.
2. Không double booking.
3. Seat Hold có ownership và expiration.
4. Không Ticket trước verified Payment.
5. Payment processing phải idempotent.
6. Ticket chỉ được Check-in một lần.
7. Manager/Staff bị giới hạn bởi Cinema Scope.
8. Pricing của Booking phải được snapshot.
9. External notification failure không phá core transaction.
10. Realtime synchronization không thay thế concurrency validation.

SRS v1.0 là baseline đầu vào cho:

```text
SRS v1.0
   ↓
Actor & Use Case Specification
   ↓
Detailed Business Rules
   ↓
Domain Model / ERD
   ↓
Logical Database Design
   ↓
System Architecture
   ↓
API Specification
   ↓
Implementation
   ↓
Test Specification
```