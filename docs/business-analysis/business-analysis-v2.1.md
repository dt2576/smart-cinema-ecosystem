# SMART CINEMA ECOSYSTEM
## BUSINESS ANALYSIS v2.1

**Project:** Smart Cinema Ecosystem  
**Document:** Business Analysis  
**Version:** 2.1  
**Business Model:** Single Cinema Chain – Multiple Branches  
**Status:** Baseline for BRD/SRS

---

# REVISION HISTORY

| Version | Date | Description |
|---|---|---|
| 2.0 | 09/09/2026 | Single-chain / multiple-branch business baseline |
| 2.1 | 13/09/2026 | Added limited Concession Add-on and revised QR model to one Booking QR with ticket-level check-in |

---

# 1. Mục đích

Smart Cinema Ecosystem là hệ thống quản lý và đặt vé trực tuyến được xây dựng cho **một chuỗi rạp chiếu phim duy nhất**.

Chuỗi Smart Cinema có thể sở hữu nhiều chi nhánh tại nhiều địa điểm khác nhau.

Ví dụ:

```text
SMART CINEMA
│
├── Smart Cinema Cầu Giấy
├── Smart Cinema Hà Đông
├── Smart Cinema Long Biên
└── Smart Cinema Hai Bà Trưng
```

Hệ thống phục vụ đồng thời hai nhóm nghiệp vụ:

1. Nghiệp vụ phục vụ khách hàng.
2. Nghiệp vụ vận hành nội bộ chuỗi rạp.

Trọng tâm của hệ thống là quản lý chính xác toàn bộ vòng đời:

```text
Movie
  ↓
Cinema Branch
  ↓
Showtime
  ↓
Seat Selection
  ↓
Seat Hold
  ↓
Booking
  ↓
Payment
  ↓
Ticket
  ↓
Check-in
```

---

# 2. Business Boundary

## 2.1. Smart Cinema là gì?

Trong phạm vi đồ án:

> Smart Cinema là một thương hiệu/chuỗi rạp duy nhất.

Toàn bộ hệ thống thuộc quyền quản lý của Smart Cinema.

Không tồn tại:

```text
Smart Cinema Platform
├── CGV
├── Lotte
├── Galaxy
└── ...
```

Do đó hệ thống **không phải cinema aggregator/marketplace**.

---

# 3. Cinema trong hệ thống có nghĩa gì?

Trong toàn bộ tài liệu từ đây:

> **Cinema = Cinema Branch = một chi nhánh/cụm rạp vật lý của Smart Cinema.**

Ví dụ:

```text
Smart Cinema
│
├── Cinema #01
│   Smart Cinema Cầu Giấy
│
├── Cinema #02
│   Smart Cinema Hà Đông
│
└── Cinema #03
    Smart Cinema Long Biên
```

Không cần entity `CinemaBrand` trong MVP vì tất cả Cinema mặc định thuộc Smart Cinema.

---

# 4. Cấu trúc tổ chức

Mô hình tổ chức:

```text
                  SMART CINEMA
                       │
                    ADMIN
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      CINEMA A      CINEMA B      CINEMA C
          │            │            │
       MANAGER       MANAGER       MANAGER
          │            │            │
        STAFF         STAFF         STAFF
```

Trong đó:

- Admin hoạt động ở cấp toàn chuỗi.
- Manager hoạt động theo chi nhánh được phân công.
- Staff hoạt động tại chi nhánh được phân công.
- Customer không thuộc một chi nhánh cụ thể.

---

# 5. Các Business Domain

Smart Cinema được chia thành:

```text
Smart Cinema
│
├── Identity & Access
├── Organization
├── Movie Catalog
├── Cinema Operations
├── Showtime
├── Seat Inventory
├── Seat Holding
├── Booking
├── Concession Add-on
├── Promotion
├── Payment
├── Ticket
├── Check-in
├── Notification
├── Reporting
└── Audit
```

Critical path:

```text
Showtime
   ↓
Seat Availability
   ↓
Seat Hold
   ↓
Booking
   ↓
Payment
   ↓
Ticket
   ↓
Check-in
```

---

# 6. User và Role

Hệ thống có bốn role chính:

```text
CUSTOMER
STAFF
MANAGER
ADMIN
```

Role xác định **người dùng có loại quyền gì**.

Tuy nhiên với Staff và Manager, role chưa đủ.

Hệ thống còn phải xác định:

> Người đó được phép thao tác trên Cinema nào?

Do đó authorization gồm hai lớp:

```text
Authentication
      ↓
Role Authorization
      ↓
Cinema Scope Authorization
```

---

# 7. Customer

Customer là khách hàng của toàn chuỗi Smart Cinema.

Customer **không thuộc một Cinema cụ thể**.

Ví dụ một tài khoản có thể:

```text
Thứ 2 → đặt tại Smart Cinema Cầu Giấy

Thứ 7 → đặt tại Smart Cinema Hà Đông
```

Customer có thể:

- Đăng ký.
- Đăng nhập.
- Quản lý profile.
- Xem phim.
- Tìm Cinema.
- Xem Showtime.
- Xem Seat Map.
- Chọn ghế.
- Giữ ghế.
- Tạo Booking.
- Chọn Concession Add-on.
- Áp dụng Promotion.
- Thanh toán.
- Nhận Ticket.
- Xem Booking QR và trạng thái các Ticket.
- Xem lịch sử Booking/Ticket.

---

# 8. Staff

Staff là nhân viên vận hành tại Cinema.

Ví dụ:

```text
Staff Nguyễn A
        │
        ▼
Smart Cinema Cầu Giấy
```

Staff có thể:

- Đăng nhập.
- Tra cứu Ticket cần thiết.
- Scan QR.
- Validate Ticket.
- Check-in.

Staff không được mặc định thao tác trên toàn chuỗi.

Ví dụ:

```text
Ticket
Cinema = Hà Đông

Staff
Cinema = Cầu Giấy

→ CHECK-IN REJECTED
```

---

# 9. Manager

Manager quản lý nghiệp vụ của Cinema được phân công.

Manager có thể:

- Quản lý Room.
- Quản lý Seat.
- Quản lý Showtime.
- Quản lý Staff.
- Theo dõi Booking.
- Xem tình hình bán vé.
- Xem doanh thu.
- Xem báo cáo chi nhánh.

Ví dụ:

```text
Manager A
    │
    ▼
Cinema Cầu Giấy
```

Manager A không được sửa:

```text
Cinema Hà Đông
└── Showtime 19:30
```

chỉ vì người đó có role `MANAGER`.

Backend phải kiểm tra cả:

```text
role == MANAGER
```

và:

```text
cinema ∈ assignedCinemas
```

Trong MVP có thể thiết kế Manager quản lý một Cinema.

Kiến trúc nghiệp vụ vẫn nên cho phép mở rộng thành một Manager quản lý nhiều Cinema nếu cần.

---

# 10. Admin

Admin là người quản trị cấp chuỗi.

Phạm vi:

```text
                  ADMIN
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Cinema A     Cinema B     Cinema C
```

Admin có thể:

- Quản lý User.
- Quản lý Cinema.
- Quản lý Manager.
- Quản lý Movie Catalog.
- Quản lý Promotion toàn chuỗi.
- Theo dõi hoạt động hệ thống.
- Xem báo cáo toàn chuỗi.
- Quản lý cấu hình cần thiết.

Admin không đại diện cho một "hãng trung gian".

Admin chính là quản trị viên của Smart Cinema.

---

# 11. Movie Catalog

Movie Catalog được quản lý ở **cấp chuỗi**.

Ví dụ:

```text
SMART CINEMA
│
└── Movie Catalog
    ├── Movie A
    ├── Movie B
    └── Movie C
```

Không cần mỗi Cinema tạo một bản Movie riêng.

Movie chứa thông tin như:

- Title.
- Description.
- Duration.
- Release Date.
- Age Rating.
- Language.
- Poster.
- Trailer.
- Genre.
- Status.

---

# 12. Movie và Cinema

Việc Movie tồn tại trong Catalog:

```text
Movie A
```

không đồng nghĩa:

> Tất cả Cinema đều đang chiếu Movie A.

Cinema nào chiếu phim được xác định thông qua **Showtime**.

Ví dụ:

```text
Movie: Interstellar

├── Cầu Giấy
│   ├── 14:00
│   └── 20:00
│
├── Hà Đông
│   └── 18:30
│
└── Long Biên
    └── Không có Showtime
```

Customer vì vậy có thể tìm:

```text
Movie
 ↓
Cinema có chiếu Movie
 ↓
Showtime
```

hoặc:

```text
Cinema
 ↓
Movie đang chiếu tại Cinema
 ↓
Showtime
```

---

# 13. Cinema Branch

Cinema là địa điểm kinh doanh vật lý.

Một Cinema có:

- Name.
- Address.
- Contact information.
- Opening information.
- Status.
- Screening Rooms.
- Managers/Staff.

Ví dụ:

```text
Smart Cinema Cầu Giấy
│
├── Room 01
├── Room 02
├── Room 03
└── Room 04
```

Cinema có thể có trạng thái:

```text
ACTIVE
TEMPORARILY_CLOSED
INACTIVE
```

Cinema không hoạt động không được nhận Booking mới.

---

# 14. Screening Room

Screening Room thuộc đúng một Cinema.

```text
Cinema
   1
   │
   └──── N
       Screening Room
```

Ví dụ:

```text
Smart Cinema Cầu Giấy
│
├── Room 01
├── Room 02
└── Room 03
```

Room có thể chứa:

- Name.
- Capacity.
- Type.
- Status.

Status:

```text
ACTIVE
MAINTENANCE
INACTIVE
```

---

# 15. Seat

Seat là ghế vật lý thuộc Screening Room.

```text
Cinema
  ↓
Room
  ↓
Seat
```

Ví dụ:

```text
Room 01

       SCREEN

A1 A2 A3 A4 A5 A6
B1 B2 B3 B4 B5 B6
C1 C2 C3 C4 C5 C6
```

Seat có thể có:

- Row.
- Number.
- Seat Type.
- Physical Status.

Seat Type MVP:

```text
STANDARD
VIP
COUPLE
```

---

# 16. Physical Seat ≠ Showtime Seat Status

Đây là một nguyên tắc quan trọng.

Ghế:

```text
Room 01 / A5
```

là một tài sản vật lý.

Nhưng trạng thái bán A5 phụ thuộc vào từng Showtime.

Ví dụ:

```text
Showtime 10:00
A5 = BOOKED

Showtime 14:00
A5 = AVAILABLE

Showtime 18:00
A5 = HELD
```

Do đó:

```text
Seat physical state
```

và:

```text
Seat availability for Showtime
```

là hai khái niệm khác nhau.

---

# 17. Showtime

Showtime là một lần chiếu cụ thể của Movie tại một Screening Room.

```text
Movie
   +
Screening Room
   +
Start Time
   +
End Time
   +
Pricing
```

Từ Room có thể suy ra:

```text
Showtime
 ↓
Room
 ↓
Cinema
```

Vì vậy Showtime không cần thuộc một hãng khác hay partner bên ngoài.

---

# 18. Showtime Scheduling

Ví dụ:

```text
Movie duration = 120 phút

Start = 14:00
End   = 16:00

Cleaning buffer = 15 phút

Room available again = 16:15
```

Một Room không được có Showtime khác xung đột với khoảng sử dụng phòng.

Ví dụ:

```text
14:00 ───────────────── 16:15
             15:30 ─────────────
                  ❌
```

Manager chỉ được tạo Showtime tại Cinema thuộc phạm vi của mình.

---

# 19. Pricing

Giá vé không nên gắn cố định trực tiếp vào Seat.

Giá có thể được xác định dựa trên:

```text
Showtime Base Price
        +
Seat Type Adjustment
        +
Promotion
```

Ví dụ:

```text
Base Price = 80.000

STANDARD = +0
VIP      = +20.000
```

Giá cuối cùng của Booking phải được snapshot tại thời điểm giao dịch.

Nếu giá được thay đổi sau đó, Booking cũ không thay đổi.

---

# 20. Customer Discovery Flow

Customer có hai cách tìm suất chiếu phổ biến.

## Theo Movie

```text
Movie
 ↓
Choose Cinema
 ↓
Choose Date
 ↓
Showtime
```

## Theo Cinema

```text
Cinema
 ↓
Choose Date
 ↓
Movies available
 ↓
Showtime
```

Cả hai cuối cùng đều dẫn tới một Showtime cụ thể.

---

# 21. Seat Map

Sau khi Customer chọn Showtime:

```text
Showtime
   ↓
Load Seat Map
```

Hệ thống trả về trạng thái:

```text
AVAILABLE
HELD
BOOKED
UNAVAILABLE
```

### AVAILABLE

Có thể giữ.

### HELD

Đang được giữ tạm thời.

### BOOKED

Đã được bán.

### UNAVAILABLE

Không thể bán cho Showtime đó.

---

# 22. Seat Holding

Khi Customer chọn ghế:

```text
Customer
   ↓
Select A5
   ↓
Request Hold
   ↓
Backend checks availability
   ↓
Hold successful
```

Thời gian MVP:

```text
10 minutes
```

Giá trị phải configurable.

Ví dụ:

```text
10:00 → A5 HELD

expiresAt = 10:10
```

Nếu Customer không tiếp tục:

```text
10:10

HELD
 ↓
AVAILABLE
```

---

# 23. Seat Hold Ownership

Seat Hold phải thuộc một Customer/session cụ thể.

```text
A5
 ↓
heldBy = Customer A
```

Customer B không được sử dụng hold của A để tạo Booking.

Backend chịu trách nhiệm xác minh ownership.

---

# 24. Concurrency

Đây là nghiệp vụ kỹ thuật trung tâm.

```text
Customer A ───┐
              ▼
              A5
              ▲
Customer B ───┘
```

Hai request có thể đến cùng lúc.

Chỉ cho phép:

```text
A → SUCCESS
B → FAILED
```

hoặc:

```text
B → SUCCESS
A → FAILED
```

Tuyệt đối không:

```text
A → SUCCESS
B → SUCCESS
```

Invariant:

> Với một Showtime + Seat, tại cùng một thời điểm chỉ tồn tại tối đa một quyền giữ/đặt hợp lệ.

---

# 25. Realtime Seat Availability

Khi A giữ A5:

```text
Customer A
   ↓
Backend confirms A5
   ↓
WebSocket Event
   ↓
Customer B
   ↓
A5 becomes HELD
```

Nhưng WebSocket chỉ phục vụ cập nhật UI.

Backend vẫn là **source of truth**.

Ví dụ B chưa nhận WebSocket và vẫn thấy A5 AVAILABLE:

```text
B clicks A5
 ↓
Backend checks
 ↓
A5 already HELD
 ↓
REJECT
```

---

# 26. Booking

Booking đại diện cho một giao dịch mua vé.

MVP chốt:

> Một Booking chỉ thuộc một Showtime.

Một Booking có thể chứa nhiều Seat.

Ví dụ:

```text
Booking #BK001

Customer: A
Showtime: ST001

Seats:
A5
A6
A7
```

---

# 27. Booking Lifecycle

```text
             ┌──→ PAID
             │
PENDING ─────┼──→ EXPIRED
             │
             └──→ CANCELLED
```

### PENDING

Booking được tạo nhưng chưa xác nhận thanh toán.

### PAID

Payment đã được xác nhận thành công.

### EXPIRED

Booking không hoàn tất đúng thời hạn.

### CANCELLED

Booking bị hủy theo policy.

---

# 28. Booking Pricing Snapshot

Booking phải lưu lại giá tại thời điểm mua.

Ví dụ:

```text
September 1
VIP = 100.000

Customer buys A5
Price snapshot = 100.000
```

Ngày sau:

```text
VIP = 120.000
```

Booking cũ vẫn:

```text
100.000
```

Điều này cần thiết cho:

- lịch sử giao dịch;
- payment;
- revenue;
- audit;
- refund trong tương lai.

---

# 29. Promotion

Promotion thuộc Smart Cinema.

Có thể có hai phạm vi trong tương lai:

```text
Chain-wide Promotion
```

hoặc:

```text
Cinema-specific Promotion
```

Đối với MVP, ưu tiên promotion toàn chuỗi để tránh business rule quá phức tạp.

Backend kiểm tra:

```text
Code exists?
 ↓
Active?
 ↓
Valid period?
 ↓
Usage limit?
 ↓
Minimum order?
 ↓
Eligible?
 ↓
Apply
```

Backend tính final amount.

---

# 29A. Concession Add-on

Trong MVP, F&B chỉ là **Concession Add-on** đi kèm Booking.

Customer có thể chọn các item ACTIVE như:

```text
Popcorn
Drink
Combo
```

Business rules:

- Concession là optional; Booking có thể không có Concession.
- Quantity phải > 0.
- Giá Concession được snapshot vào Booking.
- Backend tính Concession Amount và Final Amount.
- Không quản Inventory, Warehouse, Supplier, Kitchen, Stock Movement hoặc standalone POS trong MVP.

Logical relationship:

```text
Booking
 └── N Booking Concession
      └── Concession Item snapshot
```

---

# 30. Payment

Payment Gateway chỉ đóng vai trò **nhà cung cấp thanh toán**.

Ví dụ kiến trúc:

```text
Customer
   │
   ▼
SMART CINEMA
   │
   ▼
Payment Gateway
```

Payment Gateway không quản:

```text
Cinema
Room
Seat
Staff
Showtime
Ticket
```

Smart Cinema vẫn sở hữu nghiệp vụ Cinema.

---

# 31. Payment Flow

```text
Booking PENDING
      ↓
Create Payment
      ↓
Payment Gateway
      ↓
Customer Pays
      ↓
Callback / Webhook
      ↓
Backend Verify
      ↓
Payment SUCCESS
      ↓
Booking PAID
```

Frontend không có quyền tự xác nhận Payment thành công.

---

# 32. Payment Idempotency

Payment Gateway có thể gửi cùng kết quả nhiều lần:

```text
Webhook #1
Webhook #2
Webhook #3
```

Backend phải xử lý idempotent.

Không được:

```text
3 Webhooks
 ↓
3 × Ticket Generation
```

Cùng một giao dịch chỉ tạo kết quả nghiệp vụ một lần.

---

# 33. Ticket

MVP chốt:

> Một Seat/Seat Unit đã mua tương ứng với một Ticket.

Ví dụ:

```text
Booking BK001

A5 → Ticket T001
A6 → Ticket T002
A7 → Ticket T003
```

Ticket chỉ được tạo sau khi Payment được xác nhận thành công.

Mỗi Ticket có mã định danh và trạng thái riêng để hỗ trợ check-in độc lập.

---

# 34. Booking QR

Mỗi Booking đã thanh toán có **một Booking QR duy nhất** dùng để truy xuất toàn bộ Booking.

```text
Booking
   │
   ├── Booking QR
   │
   ├── Ticket T001 — A5
   ├── Ticket T002 — A6
   └── Ticket T003 — A7
```

Booking QR không đồng nghĩa với một Ticket duy nhất. QR chỉ định danh Booking và cho phép Backend truy xuất:

- Booking information;
- danh sách Ticket;
- trạng thái từng Ticket;
- Concession Add-on thuộc Booking.

Booking QR có thể được scan nhiều lần; việc scan không tự làm mất hiệu lực toàn bộ Booking.

---

# 35. Booking & Ticket Validation

Khi Staff scan Booking QR, Backend kiểm tra tối thiểu:

```text
Booking exists?
      ↓
Booking PAID?
      ↓
Correct Cinema?
      ↓
Correct Showtime / Check-in Window?
      ↓
Load Tickets
      ↓
Validate each selected Ticket
```

Ticket vẫn là đơn vị kiểm soát check-in.

Ví dụ một Booking có mixed states hợp lệ:

```text
F7      CHECKED_IN
F8      CHECKED_IN
H9-10   VALID
```

Điều này cho phép các Customer trong cùng Booking vào rạp ở thời điểm khác nhau.

---

# 36. Check-in

Staff tại Cinema thực hiện:

```text
Staff Login
    ↓
Scan Booking QR
    ↓
Backend loads Booking + Tickets
    ↓
Staff selects eligible Ticket(s)
    ↓
Backend validates
    ↓
CHECKED_IN per Ticket
```

Hệ thống lưu trên từng Ticket:

- checkedInAt;
- Staff thực hiện;
- Cinema;
- Ticket status.

Booking QR có thể scan lại để xem trạng thái mới nhất. Ticket đã CHECKED_IN không được Check-in lần hai.

---

# 37. Booking Cancellation

## PENDING Booking

Có thể:

```text
PENDING
 ↓
CANCELLED
```

Seat liên quan được giải phóng.

## PAID Booking

Hủy booking đã thanh toán liên quan tới:

```text
Cancellation Policy
Refund Policy
Payment Refund
```

Đây là nghiệp vụ khá lớn.

MVP chưa hỗ trợ automated refund.

Có thể đưa vào Future Development.

---

# 38. Staff Management

Vì đây là hệ thống của chính chuỗi Smart Cinema nên quản lý Staff là hợp lý.

Quan hệ nghiệp vụ:

```text
Smart Cinema
 ↓
Cinema
 ↓
Staff
```

Manager có thể quản lý Staff thuộc phạm vi Cinema của mình theo quyền được cấp.

MVP chỉ quản lý những thông tin cần thiết cho hệ thống:

- Account.
- Name.
- Role.
- Cinema assignment.
- Status.

Không xây dựng HRM hoàn chỉnh.

Ngoài phạm vi:

- Payroll.
- Salary.
- Attendance.
- Recruitment.
- Labor contracts.
- Shift optimization.

Điều này tránh biến Smart Cinema thành hệ thống nhân sự.

---

# 39. Manager Management

Admin chịu trách nhiệm phân công Manager.

Ví dụ:

```text
ADMIN
  ↓
Assign
  ↓
Manager A
  ↓
Cinema Cầu Giấy
```

Manager không tự cấp quyền cho mình ở Cinema khác.

---

# 40. Dashboard – Cinema Level

Manager xem dữ liệu thuộc Cinema được giao.

Ví dụ:

```text
Smart Cinema Cầu Giấy

Revenue
Bookings
Tickets Sold
Occupancy Rate
Popular Movies
Showtime Performance
```

Manager không được xem dữ liệu chi tiết của Cinema khác nếu không được cấp quyền.

---

# 41. Dashboard – Chain Level

Admin có dashboard toàn chuỗi:

```text
SMART CINEMA

├── Total Revenue
├── Total Bookings
├── Tickets Sold
├── Revenue by Cinema
├── Occupancy by Cinema
├── Top Movies
├── Top Cinemas
└── User Statistics
```

Điều này tạo ra sự khác biệt rõ ràng:

```text
Manager Dashboard
       ↓
Cinema scope
```

và:

```text
Admin Dashboard
       ↓
Chain scope
```

---

# 42. Reporting Rules

Revenue phải dựa trên giao dịch hợp lệ.

Không tính:

```text
PENDING Booking
```

như doanh thu.

Nguồn thích hợp là các Payment đã được xác nhận thành công theo quy tắc tài chính được xác định sau.

Các chỉ số phải có định nghĩa thống nhất trước khi triển khai dashboard.

---

# 43. Notification

Các sự kiện có thể tạo Notification:

```text
Payment Success
Ticket Created
Booking Cancelled
Showtime Changed
```

Email/notification không nằm trên critical transaction path.

Ví dụ:

```text
Payment SUCCESS
 ↓
Booking PAID
 ↓
Ticket created
 ↓
Email sending FAILED
```

Payment và Ticket không được rollback chỉ vì email gửi thất bại.

---

# 44. Audit

Các thao tác nhạy cảm nên được audit:

```text
Admin creates Cinema
Admin assigns Manager
Manager creates Showtime
Manager changes Showtime
Manager disables Seat
Staff checks in Ticket
```

Audit có thể ghi:

```text
Actor
Action
Resource
Timestamp
Relevant Metadata
```

---

# 45. End-to-End Customer Flow

```text
CUSTOMER
   │
   ▼
Register / Login
   │
   ▼
Browse Movies
   │
   ▼
Choose Movie
   │
   ▼
Choose Cinema
   │
   ▼
Choose Date
   │
   ▼
Choose Showtime
   │
   ▼
Load Seat Map
   │
   ▼
Select Seats
   │
   ▼
Hold Seats
   │
   ├── Failed → Select Again
   │
   ▼
Create Booking
   │
   ▼
Apply Promotion
   │
   ▼
Payment
   │
   ├── Failed
   │
   ▼
Backend Verification
   │
   ▼
Booking PAID
   │
   ▼
Generate Ticket(s)
   │
   ▼
Generate QR
   │
   ▼
Customer arrives at Cinema
   │
   ▼
Staff scans QR
   │
   ▼
Backend validates
   │
   ├── Invalid → REJECT
   │
   ▼
CHECKED_IN
```

---

# 46. End-to-End Manager Flow

Ví dụ Manager Cầu Giấy:

```text
MANAGER
   │
   ▼
Login
   │
   ▼
Cinema Scope Check
   │
   ▼
Smart Cinema Cầu Giấy
   │
   ├── Rooms
   ├── Seats
   ├── Showtimes
   ├── Staff
   ├── Bookings
   └── Reports
```

Mọi operation phải kiểm tra Cinema scope ở Backend.

---

# 47. End-to-End Staff Flow

```text
STAFF
  │
  ▼
Login
  │
  ▼
Cinema Assignment
  │
  ▼
Scan QR
  │
  ▼
Ticket Validation
  │
  ├── Wrong Cinema → REJECT
  ├── Invalid → REJECT
  ├── Already Used → REJECT
  │
  ▼
CHECKED_IN
```

---

# 48. Core Business Invariants

### INV-01 — Seat uniqueness

Một Seat của một Showtime không được bán thành công cho hai Customer.

### INV-02 — Hold exclusivity

Tại một thời điểm chỉ một Customer/session có quyền giữ hợp lệ một Seat của một Showtime.

### INV-03 — Hold ownership

Customer không được sử dụng Seat Hold của người khác.

### INV-04 — Hold expiration

Seat Hold hết hạn không được sử dụng để hoàn tất Booking.

### INV-05 — Payment authority

Frontend không phải nguồn xác nhận Payment.

### INV-06 — Ticket creation

Không tạo Ticket khi Payment chưa được xác nhận thành công.

### INV-07 — Payment idempotency

Một Payment success event không được tạo kết quả nghiệp vụ nhiều lần.

### INV-08 — Ticket usage

Một Ticket không được check-in thành công nhiều lần; Booking QR có thể được scan nhiều lần.

### INV-09 — Cinema validation

Booking QR chỉ được dùng để Check-in tại Cinema phù hợp; mỗi Ticket vẫn được validate riêng.

### INV-10 — Showtime scheduling

Hai Showtime không được sử dụng cùng một Room trong khoảng thời gian chồng lấn.

### INV-11 — Manager scope

Manager chỉ thao tác trên Cinema được phân công.

### INV-12 — Staff scope

Staff chỉ thực hiện nghiệp vụ được phép trong Cinema được phân công.

### INV-13 — Price snapshot

Giá đã xác nhận của Booking không thay đổi khi bảng giá tương lai thay đổi.

### INV-14 — Backend authority

Backend là nguồn quyết định cuối cùng đối với:

- Seat availability.
- Seat hold ownership.
- Booking state.
- Payment state.
- Ticket validity.
- Authorization.

---

# 49. Critical Edge Cases

### EC-01

Hai Customer giữ A5 đồng thời.

**Expected:** chỉ một người thành công.

### EC-02

Seat Hold hết hạn đúng thời điểm Customer submit Booking.

**Expected:** Backend kiểm tra lại và không cho sử dụng hold hết hạn.

### EC-03

Customer mở nhiều browser/tab.

**Expected:** không ảnh hưởng tính nhất quán vì Backend là source of truth.

### EC-04

Customer thanh toán thành công nhưng đóng browser.

**Expected:** Backend vẫn hoàn tất qua verified callback/webhook.

### EC-05

Payment Gateway gửi webhook nhiều lần.

**Expected:** xử lý idempotent.

### EC-06

Payment thất bại.

**Expected:** không sinh Ticket.

### EC-07

QR bị screenshot.

**Expected:** lần check-in hợp lệ đầu tiên thành công; lần sau bị từ chối.

### EC-08

Manager Cầu Giấy cố sửa Showtime Hà Đông.

**Expected:** authorization failed.

### EC-09

Staff Cầu Giấy scan Ticket Hà Đông.

**Expected:** check-in rejected.

### EC-10

Manager tạo Showtime trùng lịch Room.

**Expected:** rejected.

### EC-11

Seat đang bảo trì nhưng Showtime tồn tại.

**Expected:** Seat không được bán theo quy tắc availability.

### EC-12

Giá thay đổi sau khi Booking đã được xác lập.

**Expected:** Booking giữ pricing snapshot.

---

# 50. Business Decisions chốt cho MVP

| Vấn đề | Quyết định |
|---|---|
| Số thương hiệu | 1 – Smart Cinema |
| Cinema | Chi nhánh vật lý |
| Số Cinema | Nhiều |
| Customer | Dùng chung toàn chuỗi |
| Movie Catalog | Cấp toàn chuỗi |
| Admin | Toàn chuỗi |
| Manager | Theo Cinema được giao |
| Staff | Theo Cinema được giao |
| Một Booking | Một Showtime |
| Một Booking | Có nhiều Seat |
| Một Seat/Seat Unit mua | Một Ticket |
| Booking QR | Một paid Booking có một Booking QR để truy xuất toàn bộ Booking |
| Seat Hold | 10 phút, configurable |
| Payment | Sandbox |
| Payment authority | Backend verification |
| Paid refund | Ngoài MVP |
| Promotion | Ưu tiên toàn chuỗi |
| Staff management | Chỉ account/assignment/status |
| HR/Payroll | Ngoài scope |
| Realtime | WebSocket |
| Seat Hold optimization | Redis |
| Architecture | Modular Monolith |

---

# 51. Những gì Smart Cinema KHÔNG phải

Smart Cinema không phải:

### Cinema Aggregator

```text
Platform
├── CGV
├── Lotte
└── Galaxy
```

### HR Management System

Không quản:

```text
Payroll
Recruitment
Salary
Contracts
```

### Payment Provider

Smart Cinema tích hợp Payment Gateway nhưng không tự đóng vai trò ngân hàng/ví điện tử.

### Multi-tenant SaaS

Không cung cấp một hệ thống cho nhiều hãng rạp độc lập cùng thuê sử dụng trong MVP.

---

# 52. System Boundary

Phạm vi có thể hình dung:

```text
┌──────────────── SMART CINEMA ────────────────┐
│                                             │
│  Customer                                   │
│     │                                       │
│     ▼                                       │
│  Movie → Cinema → Showtime → Seat           │
│                              │              │
│                              ▼              │
│                         Seat Hold            │
│                              │              │
│                              ▼              │
│                          Booking             │
│                              │              │
│                              ▼              │
│                          Payment ───────────────→ External Payment Gateway
│                              │              │
│                              ▼              │
│                           Ticket             │
│                              │              │
│                              ▼              │
│                          Check-in            │
│                                             │
│  Admin ───── Whole Chain                    │
│  Manager ─── Cinema Scope                   │
│  Staff ───── Cinema Scope                   │
│                                             │
└─────────────────────────────────────────────┘
```

Payment Gateway là external system.

Smart Cinema vẫn sở hữu Booking, Ticket và nghiệp vụ Cinema.

---

# 53. Domain Map sau khi phân tích lại

```text
SMART CINEMA
│
├── User
│   ├── Customer
│   ├── Staff ───────┐
│   ├── Manager ─────┤ Cinema Assignment
│   └── Admin        │
│                    │
├── Movie            │
│                    │
├── Cinema ◄─────────┘
│   └── Room
│       └── Seat
│
├── Showtime
│   ├── Movie
│   └── Room
│
├── Seat Availability
│
├── Seat Hold
│
├── Booking
│
├── Promotion
│
├── Payment
│
├── Ticket
│
├── Check-in
│
├── Notification
│
├── Reporting
│
└── Audit
```

---

# 54. Core Domain

Không phải mọi module đều quan trọng như nhau.

### Core Domain

```text
Showtime
Seat Availability
Seat Holding
Booking
Concession Add-on
Payment Coordination
Ticket
Check-in
```

### Supporting Domain

```text
Cinema
Room
Movie
Concession Catalog
Promotion
Reporting
```

### Generic / Infrastructure Concern

```text
Authentication
Notification
Audit
```

Điều này giúp ưu tiên thời gian phát triển đúng chỗ.

---

# 55. Critical Technical Business Flow

Phần có giá trị kỹ thuật cao nhất của đồ án:

```text
Customer selects A5
        ↓
Backend checks A5
        ↓
Concurrency Control
        ↓
Acquire Seat Hold
        ↓
10-minute TTL
        ↓
Create Booking
        ↓
Payment
        ↓
Backend verifies payment
        ↓
Atomic Booking transition
        ↓
Generate Ticket(s)
        ↓
Generate Booking QR
        ↓
Load Booking + Ticket states
        ↓
Atomic Check-in per Ticket
```

Nếu hệ thống chứng minh được flow này hoạt động đúng trong các tình huống concurrent request và retry thì phần Backend đã có chiều sâu rõ ràng.

---

# 56. Kết luận Business Analysis

Business model chính thức của Smart Cinema Ecosystem là:

> **Một chuỗi rạp Smart Cinema sở hữu và vận hành nhiều chi nhánh rạp.**

Customer sử dụng một hệ thống chung để đặt vé tại tất cả chi nhánh.

Admin quản trị toàn chuỗi.

Manager và Staff hoạt động theo phạm vi Cinema được phân công.

Smart Cinema trực tiếp quản lý Movie, Cinema, Room, Seat, Showtime, Booking, Payment coordination, Ticket và Check-in.

Các Payment Gateway hoặc dịch vụ bên ngoài chỉ là hệ thống tích hợp, không sở hữu nghiệp vụ rạp.

Trọng tâm của Smart Cinema không phải quản trị nhiều hãng và cũng không phải HRM. Trọng tâm là:

**Cinema Operations + Showtime + Seat Inventory + Booking Concurrency + Payment + Ticket + Check-in.**

Business Analysis v2.1 này là baseline để xây dựng/cập nhật BRD và SRS ở các bước tiếp theo.