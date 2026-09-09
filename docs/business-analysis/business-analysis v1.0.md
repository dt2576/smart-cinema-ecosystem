# SMART CINEMA ECOSYSTEM
## BUSINESS ANALYSIS v1.0

**Project:** Smart Cinema Ecosystem  
**Document:** Business Analysis  
**Version:** 1.0  
**Status:** Draft for Requirement Analysis

---

# 1. Mục đích tài liệu

Tài liệu này phân tích nghiệp vụ cốt lõi của hệ thống Smart Cinema Ecosystem trước khi thực hiện thiết kế Use Case, cơ sở dữ liệu, API và triển khai phần mềm.

Mục tiêu chính:

- Xác định các đối tượng nghiệp vụ.
- Xác định mối quan hệ giữa các đối tượng.
- Phân tích vòng đời của một giao dịch đặt vé.
- Xác định trạng thái của Booking, Seat Hold, Payment và Ticket.
- Xác định các quy tắc nghiệp vụ quan trọng.
- Xác định các tình huống ngoại lệ.
- Làm nền tảng cho BRD, SRS, Use Case, ERD và API Specification.

---

# 2. Tổng quan nghiệp vụ

Smart Cinema Ecosystem phục vụ bốn nhóm người dùng:

- Customer
- Staff
- Manager
- Admin

Nghiệp vụ trung tâm của hệ thống là quá trình bán vé xem phim.

Luồng tổng quát:

```text
Movie
  ↓
Cinema
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
QR Check-in
```

Ngoài luồng bán vé, hệ thống còn hỗ trợ quản lý:

- Movie.
- Genre.
- Cinema.
- Screening Room.
- Seat.
- Showtime.
- Promotion.
- User và Role.
- Staff.
- Revenue.
- Reports.

---

# 3. Các Domain chính

Hệ thống được chia về mặt nghiệp vụ thành các domain sau:

```text
Smart Cinema
│
├── Identity & Access
│
├── Movie
│
├── Cinema
│
├── Showtime
│
├── Seat Availability
│
├── Booking
│
├── Payment
│
├── Ticket
│
├── Promotion
│
├── Notification
│
└── Reporting
```

Trong đó:

```text
CORE BUSINESS

Showtime
   ↓
Seat
   ↓
Seat Hold
   ↓
Booking
   ↓
Payment
   ↓
Ticket
```

là phần quan trọng nhất.

---

# 4. Identity & Access

## 4.1. User

User đại diện cho tài khoản có thể đăng nhập vào hệ thống.

Các nhóm chính:

```text
CUSTOMER
STAFF
MANAGER
ADMIN
```

Không nên coi Customer, Staff, Manager và Admin là bốn hệ thống tài khoản hoàn toàn độc lập.

Chúng cùng thuộc khái niệm User nhưng có quyền và phạm vi hoạt động khác nhau.

---

# 5. Customer

Customer là người mua vé.

Customer có thể:

```text
Register
Login
Browse Movie
View Cinema
View Showtime
Select Seat
Hold Seat
Create Booking
Apply Promotion
Pay
Receive Ticket
View Ticket
View Booking History
```

Customer không được:

- Quản lý phim.
- Tạo suất chiếu.
- Quản lý rạp.
- Check-in vé.
- Truy cập dashboard quản trị.

---

# 6. Staff

Staff là nhân viên làm việc tại một rạp.

Nghiệp vụ chính:

```text
Login
 ↓
Scan QR
 ↓
Validate Ticket
 ↓
Check-in
```

Staff chỉ nên thao tác trong phạm vi rạp được phân công.

Ví dụ:

```text
Staff thuộc Cinema A

→ có thể check-in vé tại Cinema A
→ không được check-in vé thuộc Cinema B
```

Quy tắc này giúp tránh một QR hợp lệ bị sử dụng tại sai địa điểm.

---

# 7. Manager

Manager chịu trách nhiệm quản lý một hoặc một phạm vi Cinema được phân công.

Manager có thể quản lý:

```text
Cinema
Room
Seat
Showtime
Staff
Booking
Revenue
Report
```

Nhưng quyền phải có giới hạn tài nguyên.

Ví dụ:

```text
Manager A
   ↓
Cinema A

Manager B
   ↓
Cinema B
```

Manager A không được sửa Showtime của Cinema B dù cả hai đều có role `MANAGER`.

Do đó hệ thống cần phân biệt:

```text
Role-based authorization
```

và:

```text
Resource-based authorization
```

---

# 8. Admin

Admin quản trị toàn hệ thống.

Admin có thể:

```text
Manage Users
Manage Roles
Manage Movies
Manage Cinemas
Manage Promotions
Manage System
View Global Reports
```

Admin có phạm vi toàn hệ thống.

---

# 9. Movie

Movie đại diện cho một bộ phim.

Thông tin nghiệp vụ cơ bản:

```text
Title
Description
Duration
Release Date
Age Rating
Language
Poster
Trailer
Status
Genres
```

Movie không trực tiếp xác định:

- rạp nào chiếu;
- phòng nào chiếu;
- giờ nào chiếu.

Những thông tin đó thuộc Showtime.

---

# 10. Movie Status

Có thể định nghĩa trạng thái:

```text
COMING_SOON
NOW_SHOWING
ENDED
```

Trạng thái này có thể được xác định hoặc cập nhật dựa trên chiến lược triển khai sau này.

Không nên sử dụng Movie Status để thay thế việc kiểm tra Showtime thực tế.

---

# 11. Genre

Một Movie có thể thuộc nhiều Genre.

Ví dụ:

```text
Interstellar

├── Science Fiction
├── Adventure
└── Drama
```

Một Genre cũng có nhiều Movie.

---

# 12. Cinema

Cinema đại diện cho một địa điểm rạp vật lý.

Ví dụ:

```text
Cinema
├── Name
├── Address
├── City
├── Contact
└── Status
```

Một Cinema có:

```text
Cinema
│
├── Room 01
├── Room 02
├── Room 03
└── ...
```

---

# 13. Screening Room

Screening Room là phòng chiếu vật lý.

Một Room thuộc đúng một Cinema.

Ví dụ:

```text
Cinema A
│
├── Room 01
│
├── Room 02
│
└── Room 03
```

Room có thể có:

```text
Name
Capacity
Status
```

Ví dụ status:

```text
ACTIVE
MAINTENANCE
INACTIVE
```

Room đang bảo trì không được tạo Showtime mới trong thời gian không khả dụng.

---

# 14. Seat

Seat là ghế vật lý thuộc một Screening Room.

Ví dụ:

```text
Room 01

A1 A2 A3 A4 A5
B1 B2 B3 B4 B5
C1 C2 C3 C4 C5
```

Seat có các đặc tính:

```text
Row
Number
Seat Type
Status
```

---

# 15. Seat Type

Phiên bản đầu hỗ trợ:

```text
STANDARD
VIP
COUPLE
```

Seat Type là đặc điểm tương đối ổn định của ghế vật lý.

Ví dụ:

```text
A1 → STANDARD
D5 → VIP
E5/E6 → COUPLE
```

Seat Type không nên chứa trực tiếp trạng thái bán vé của một Showtime.

---

# 16. Physical Seat và Showtime Seat

Đây là một phân biệt rất quan trọng.

Ghế vật lý:

```text
Room 01
└── A5
```

không đồng nghĩa với trạng thái A5 trong từng suất chiếu.

Ví dụ:

```text
Showtime 10:00
A5 = BOOKED

Showtime 14:00
A5 = AVAILABLE

Showtime 18:00
A5 = HELD
```

Do đó phải phân biệt:

```text
Seat
```

với:

```text
Seat availability for a Showtime
```

Chi tiết triển khai thành entity/table nào sẽ được quyết định ở bước thiết kế database.

---

# 17. Showtime

Showtime đại diện cho một lần chiếu cụ thể.

Một Showtime liên kết:

```text
Movie
+
Screening Room
+
Start Time
+
End Time
+
Pricing Information
```

Thông qua Room có thể xác định Cinema.

---

# 18. Showtime Scheduling

Manager tạo Showtime.

Hệ thống phải kiểm tra:

### Movie duration

Ví dụ:

```text
Start: 14:00
Duration: 120 phút

Expected movie end: 16:00
```

Có thể cộng thêm:

```text
Cleaning / preparation buffer
```

Ví dụ 15 phút:

```text
14:00 ───────── 16:00 ── 16:15
Movie             Buffer
```

Showtime tiếp theo của cùng Room không được bắt đầu trước thời điểm phòng sẵn sàng.

---

# 19. Showtime Conflict

Ví dụ:

```text
Room 01

Showtime A
14:00 ───────────── 16:15

Showtime B
          15:30 ───────────
```

Showtime B không hợp lệ.

Quy tắc:

> Trong cùng một Screening Room, hai Showtime không được có khoảng thời gian sử dụng phòng bị chồng lấn.

---

# 20. Showtime và giá vé

Không nên giả định:

```text
Seat.price = giá vé cuối cùng
```

Giá bán có thể phụ thuộc vào:

```text
Showtime
+
Seat Type
+
Pricing Rule
```

Ví dụ:

```text
Showtime base price: 80.000

STANDARD → +0
VIP      → +20.000
COUPLE   → pricing riêng
```

Trong MVP có thể dùng mô hình đơn giản.

Điểm quan trọng là giá của giao dịch cần được xác định tại thời điểm booking và lưu lại để lịch sử không bị thay đổi khi bảng giá tương lai được cập nhật.

---

# 21. Seat Availability

Khi Customer mở sơ đồ ghế:

```text
GET Seat Map
```

hệ thống cần xác định ghế nào:

```text
AVAILABLE
HELD
BOOKED
UNAVAILABLE
```

Trong đó:

### AVAILABLE

Ghế có thể được chọn.

### HELD

Ghế đang được một Customer giữ tạm thời.

### BOOKED

Ghế đã thuộc một booking hợp lệ đã hoàn tất theo quy tắc hệ thống.

### UNAVAILABLE

Ghế không được bán cho Showtime đó.

---

# 22. Seat Hold

Seat Hold giải quyết vấn đề Customer cần thời gian để hoàn tất checkout.

Luồng:

```text
Customer
   ↓
Select A5
   ↓
Request Hold
   ↓
Backend Validate
   ↓
Hold A5
```

Ví dụ thời gian giữ:

```text
10 phút
```

Seat Hold cần ít nhất các khái niệm:

```text
Seat
Showtime
Customer/Session
Created Time
Expiration Time
Status
```

---

# 23. Seat Hold Ownership

Một Seat Hold phải thuộc về một Customer hoặc booking session cụ thể.

Ví dụ:

```text
User A holds A5
```

User B không được:

```text
Create Booking
using
User A's hold
```

Backend phải kiểm tra ownership.

Frontend không phải nguồn tin cậy cho việc này.

---

# 24. Seat Hold Expiration

Ví dụ:

```text
10:00
A5 → HELD

expiresAt = 10:10
```

Nếu đến 10:10 chưa hoàn tất bước cần thiết:

```text
HELD
 ↓
AVAILABLE
```

Ghế phải được phép cho người khác giữ.

---

# 25. Concurrency Problem

Tình huống:

```text
User A ───┐
          ▼
          A5
          ▲
User B ───┘
```

A và B gửi request gần như cùng lúc.

Hệ thống không được thực hiện:

```text
A → Hold Success
B → Hold Success
```

Kết quả hợp lệ:

```text
A → SUCCESS
B → REJECT
```

hoặc:

```text
B → SUCCESS
A → REJECT
```

Đây là một invariant quan trọng của domain:

> Với một Showtime và một Seat, tại một thời điểm chỉ có tối đa một quyền giữ/đặt hợp lệ.

---

# 26. Không tin Seat Map trên Frontend

Ví dụ:

```text
10:00:00
A xem A5 = AVAILABLE

10:00:03
B giữ A5

10:00:05
A click A5
```

Frontend của A vẫn có thể đang hiển thị:

```text
AVAILABLE
```

nhưng Backend phải trả:

```text
Seat no longer available
```

Do đó:

> Backend là nguồn quyết định cuối cùng về availability.

WebSocket chỉ giúp UI cập nhật nhanh hơn, không thay thế kiểm tra concurrency ở Backend.

---

# 27. Booking

Booking đại diện cho giao dịch mua vé của Customer.

Một Booking có thể chứa:

```text
Customer
Showtime
Selected Seats
Pricing Snapshot
Promotion
Total Amount
Status
Created Time
Expiration
```

Một Booking chỉ thuộc **một Showtime** trong phạm vi MVP.

Nếu Customer muốn mua vé của hai Showtime khác nhau thì tạo hai Booking khác nhau.

Điều này làm nghiệp vụ payment, expiration và ticket đơn giản, rõ ràng hơn.

---

# 28. Booking State

Các trạng thái chính:

```text
             ┌────→ PAID
             │
PENDING ─────┼────→ EXPIRED
             │
             └────→ CANCELLED
```

### PENDING

Booking đã được tạo nhưng chưa được xác nhận thanh toán thành công.

### PAID

Payment đã được Backend xác nhận.

### EXPIRED

Booking hết thời gian hoàn tất.

### CANCELLED

Booking bị hủy theo quy định.

Không sử dụng `COMPLETED` trong MVP nếu chưa có định nghĩa nghiệp vụ rõ ràng khác với `PAID` hoặc việc sử dụng ticket.

---

# 29. Booking Price Snapshot

Đây là một quy tắc quan trọng.

Giả sử:

```text
Ngày 1:
VIP = 100.000

Ngày 10:
VIP = 120.000
```

Booking được tạo ngày 1 không được tự động biến thành 120.000 khi bảng giá thay đổi.

Do đó booking phải giữ thông tin giá tại thời điểm giao dịch.

Khái niệm này gọi là:

```text
Pricing Snapshot
```

---

# 30. Promotion Application

Customer có thể nhập Promotion Code trước khi thanh toán.

Backend kiểm tra:

```text
Promotion exists?
      ↓
Active?
      ↓
Within valid period?
      ↓
Usage limit?
      ↓
Minimum amount?
      ↓
Customer eligible?
      ↓
Apply discount
```

Frontend chỉ hiển thị kết quả.

Backend tính số tiền cuối cùng.

---

# 31. Payment

Sau khi Booking được tạo:

```text
Booking
  ↓
PENDING
  ↓
Create Payment
```

Payment lưu thông tin liên quan đến giao dịch thanh toán.

Ví dụ:

```text
Booking
Amount
Provider
Transaction Reference
Status
Created Time
Paid Time
```

---

# 32. Payment State

Có thể sử dụng:

```text
PENDING
SUCCESS
FAILED
CANCELLED
```

Payment và Booking là hai khái niệm khác nhau.

Ví dụ:

```text
Payment = SUCCESS
      ↓
Booking = PAID
```

Không nên sử dụng một field `booking.paymentStatus` để thay thế hoàn toàn Payment nếu hệ thống cần lưu lịch sử giao dịch.

---

# 33. Payment Verification

Luồng:

```text
Customer
   ↓
Payment Gateway
   ↓
Payment
   ↓
Gateway Callback / Webhook
   ↓
Backend
   ↓
Verify
   ↓
Update Payment
   ↓
Update Booking
```

Backend không tin request kiểu:

```json
{
  "paymentSuccess": true
}
```

từ Frontend.

Nguồn xác nhận phải đến từ quy trình xác minh với Payment Gateway.

---

# 34. Payment Idempotency

Một vấn đề quan trọng:

Payment Gateway có thể gửi callback/webhook nhiều lần.

Ví dụ:

```text
Webhook #1 → SUCCESS
Webhook #2 → SUCCESS
Webhook #3 → SUCCESS
```

Backend không được:

```text
Create 3 tickets
```

Kết quả phải tương đương xử lý một lần.

Đây là yêu cầu:

```text
Idempotent Payment Processing
```

---

# 35. Ticket

Ticket chỉ được tạo sau khi:

```text
Payment SUCCESS
+
Booking PAID
```

Ticket đại diện cho quyền vào xem phim tương ứng với một ghế.

Với MVP nên chọn:

> **Một ghế đã mua = một Ticket.**

Ví dụ Booking:

```text
A5
A6
A7
```

sẽ sinh:

```text
Ticket 01 → A5
Ticket 02 → A6
Ticket 03 → A7
```

Điều này thuận tiện cho QR check-in và kiểm soát từng vé.

---

# 36. Ticket QR

Mỗi Ticket có một mã/token duy nhất.

QR Code chứa dữ liệu đủ để Backend xác định ticket cần kiểm tra.

Không nên coi dữ liệu hiển thị trong QR là bằng chứng ticket hợp lệ.

Luồng đúng:

```text
Scan QR
   ↓
Get Token
   ↓
Send Backend
   ↓
Backend Validate
```

---

# 37. Ticket Validation

Backend kiểm tra:

```text
Ticket exists?
      ↓
Valid?
      ↓
Booking PAID?
      ↓
Correct Cinema?
      ↓
Correct Showtime?
      ↓
Not Cancelled?
      ↓
Not Checked-in?
      ↓
Check-in
```

Có thể bổ sung kiểm tra thời gian check-in ở SRS.

---

# 38. Check-in

Sau lần quét hợp lệ:

```text
Ticket
   ↓
CHECKED_IN
```

Backend lưu:

```text
Checked-in Time
Staff
Cinema
```

Nếu scan lần hai:

```text
ALREADY_CHECKED_IN
```

và từ chối thao tác check-in lần nữa.

---

# 39. Cancellation

Cancellation cần tách thành hai trường hợp.

### Booking chưa thanh toán

Có thể hủy:

```text
PENDING
 ↓
CANCELLED
```

Các seat hold liên quan được giải phóng.

### Booking đã thanh toán

Đây là nghiệp vụ liên quan đến:

```text
Cancellation Policy
Refund
Payment Gateway
```

Để tránh làm MVP quá phức tạp, phiên bản đầu không cần hỗ trợ hoàn tiền tự động cho booking PAID.

Có thể đưa refund vào phạm vi mở rộng.

---

# 40. Realtime Seat Update

Ví dụ:

```text
User A holds A5
       ↓
Backend confirms
       ↓
Publish seat event
       ↓
WebSocket
       ↓
Users viewing same Showtime
       ↓
A5 = HELD
```

Tương tự khi hold hết hạn:

```text
HELD
 ↓
EXPIRED
 ↓
WebSocket event
 ↓
AVAILABLE
```

Tuy nhiên realtime chỉ phục vụ đồng bộ giao diện.

Backend vẫn phải kiểm tra availability khi nhận command.

---

# 41. Notification

Notification không nằm trên critical path của booking.

Có thể gửi sau các sự kiện:

```text
Payment Successful
Ticket Created
Booking Cancelled
Showtime Changed
```

Email thất bại không nên làm rollback một payment đã thành công.

---

# 42. Reporting

Reporting lấy dữ liệu từ các nghiệp vụ đã hoàn thành.

Ví dụ:

```text
Revenue
Tickets Sold
Bookings
Seat Occupancy
Movie Performance
Cinema Performance
```

Cần xác định rõ metric.

Ví dụ:

```text
Revenue
```

nên dựa trên giao dịch thanh toán thành công thay vì số Booking được tạo.

---

# 43. Audit Log

Các hành động quản trị quan trọng có thể được ghi lại:

```text
Admin creates Movie
Manager creates Showtime
Manager cancels Showtime
Admin updates Cinema
Staff checks in Ticket
```

Audit Log có thể lưu:

```text
Actor
Action
Resource
Timestamp
Metadata
```

---

# 44. End-to-End Business Flow

Luồng nghiệp vụ hoàn chỉnh:

```text
CUSTOMER
   │
   ▼
Login
   │
   ▼
Browse Movie
   │
   ▼
Select Cinema
   │
   ▼
Select Showtime
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
   ├────────── Hold Failed
   │               │
   │               └──→ Select Again
   │
   ▼
Create Booking
   │
   ▼
Apply Promotion
   │
   ▼
Create Payment
   │
   ▼
Payment Gateway
   │
   ├────────── FAILED
   │               │
   │               ▼
   │          Payment Failed
   │
   ▼
SUCCESS
   │
   ▼
Backend Verify
   │
   ▼
Booking PAID
   │
   ▼
Generate Tickets
   │
   ▼
Generate QR
   │
   ▼
Customer arrives at Cinema
   │
   ▼
Staff Scan
   │
   ▼
Backend Validate
   │
   ├──── Invalid → REJECT
   │
   ▼
CHECKED_IN
```

---

# 45. Các Invariant quan trọng

Đây là những điều hệ thống phải luôn đảm bảo.

### INV-01

Một ghế của một Showtime không được bán thành công cho hai người.

### INV-02

Seat Hold hết hạn không được sử dụng để tạo giao dịch hợp lệ.

### INV-03

Customer không được sử dụng Seat Hold thuộc người khác.

### INV-04

Ticket không được tạo trước khi Payment được xác nhận thành công.

### INV-05

Một Ticket không được check-in thành công hai lần.

### INV-06

Manager không được quản lý tài nguyên ngoài phạm vi được giao.

### INV-07

Hai Showtime không được sử dụng cùng Room trong khoảng thời gian bị chồng lấn.

### INV-08

Giá đã xác nhận của Booking không tự thay đổi khi bảng giá tương lai thay đổi.

### INV-09

Một webhook thanh toán được gửi nhiều lần không được tạo ra nhiều kết quả nghiệp vụ giống nhau.

### INV-10

Backend là nguồn quyết định cuối cùng đối với seat availability, payment status và ticket validity.

---

# 46. Các Edge Case bắt buộc phải xử lý

## EC-01 – Hai người giữ cùng ghế

```text
A → A5
B → A5
```

Chỉ một người thành công.

## EC-02 – Hold hết hạn đúng lúc tạo Booking

Backend phải kiểm tra lại tính hợp lệ trước khi tiếp tục.

## EC-03 – User mở hai browser/tab

Không được dựa vào state của UI.

## EC-04 – Payment thành công nhưng Customer đóng browser

Webhook vẫn phải cho phép Backend hoàn tất Booking.

## EC-05 – Webhook gửi nhiều lần

Không sinh nhiều Ticket.

## EC-06 – Payment thất bại

Không tạo Ticket.

## EC-07 – QR được chụp màn hình và gửi cho người khác

Người sử dụng QR hợp lệ đầu tiên có thể check-in; lần tiếp theo phải bị từ chối.

## EC-08 – Manager sửa Showtime gây conflict

Backend từ chối.

## EC-09 – Staff scan ticket của Cinema khác

Backend từ chối.

## EC-10 – Giá thay đổi sau khi Booking được tạo

Booking giữ nguyên pricing snapshot theo quy tắc đã xác định.

---

# 47. Những quyết định nghiệp vụ cho MVP

Để tránh mơ hồ khi thiết kế hệ thống, phiên bản 1.0 chốt:

| Vấn đề | Quyết định MVP |
|---|---|
| Một Booking | Thuộc một Showtime |
| Một Booking | Có thể có nhiều Seat |
| Một Seat đã mua | Sinh một Ticket |
| Seat Hold | 10 phút, configurable |
| Manager | Quản lý theo Cinema được giao |
| Staff | Hoạt động theo Cinema được giao |
| Payment | Sandbox |
| Payment verification | Backend |
| Paid cancellation/refund | Chưa hỗ trợ tự động |
| Realtime | WebSocket |
| Seat holding | Redis ở giai đoạn nâng cao |
| Source of truth | Backend/Database |
| Architecture | Modular Monolith |

---

# 48. Các vấn đề chưa cần chốt ở Business Analysis

Không thiết kế ngay:

- Tên table.
- Tên column.
- Java Entity.
- Repository.
- Controller.
- API endpoint.
- Redis key format.
- Package structure.
- SQL index.
- Lock implementation cụ thể.
- DTO.
- WebSocket topic.

Các quyết định này thuộc các bước thiết kế sau.

---

# 49. Kết quả của Business Analysis

Sau bước phân tích nghiệp vụ, hệ thống đã xác định được chuỗi domain:

```text
User
 │
Movie
 │
Cinema
 │
Room
 │
Seat
 │
Showtime
 │
Seat Availability
 │
Seat Hold
 │
Booking
 │
Payment
 │
Ticket
 │
Check-in
```

và critical business path:

```text
Seat Selection
      ↓
Seat Holding
      ↓
Concurrency Control
      ↓
Booking
      ↓
Payment Verification
      ↓
Ticket Generation
      ↓
QR Validation
```

Đây là phần nghiệp vụ quan trọng nhất của Smart Cinema Ecosystem.

---

# 50. Kết luận

Smart Cinema không đơn thuần là hệ thống CRUD quản lý phim và rạp.

Phần cốt lõi của hệ thống là đảm bảo một giao dịch đặt vé được xử lý chính xác trong môi trường có nhiều người dùng đồng thời.

Các vấn đề:

- seat availability;
- seat holding;
- race condition;
- booking lifecycle;
- payment verification;
- idempotency;
- ticket lifecycle;
- QR check-in;
- authorization theo phạm vi rạp

là các vấn đề nghiệp vụ và kỹ thuật trọng tâm cần được giữ xuyên suốt quá trình thiết kế và triển khai.

Business Analysis v1.0 sẽ được sử dụng làm đầu vào cho BRD, SRS, Use Case, Business Rules và thiết kế hệ thống ở các bước tiếp theo.