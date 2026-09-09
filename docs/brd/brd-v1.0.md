# SMART CINEMA ECOSYSTEM
## BUSINESS REQUIREMENTS DOCUMENT — BRD v1.0

**Project Name:** Smart Cinema Ecosystem  
**Document Type:** Business Requirements Document  
**Version:** 1.0  
**Business Model:** Single Cinema Chain – Multiple Branches  
**Status:** Baseline  
**Prepared For:** Smart Cinema Ecosystem Project

---

# 1. Target & Business Goals

## 1.1. Business Vision

Smart Cinema Ecosystem hướng tới xây dựng một nền tảng số tập trung cho một chuỗi rạp chiếu phim, cho phép khách hàng thực hiện toàn bộ quy trình mua vé trực tuyến và hỗ trợ đội ngũ vận hành quản lý các chi nhánh rạp trên cùng một hệ thống.

Hệ thống phải hỗ trợ đầy đủ vòng đời giao dịch:

```text
Movie Discovery
      ↓
Cinema Selection
      ↓
Showtime Selection
      ↓
Seat Selection
      ↓
Seat Holding
      ↓
Booking
      ↓
Payment
      ↓
Ticket Generation
      ↓
QR Check-in
```

Mục tiêu không chỉ là số hóa quy trình bán vé mà còn đảm bảo:

- tính chính xác của dữ liệu;
- tính nhất quán của trạng thái ghế;
- khả năng xử lý nhiều khách hàng đồng thời;
- giảm rủi ro đặt trùng ghế;
- kiểm soát thanh toán;
- kiểm soát việc sử dụng vé;
- phân quyền vận hành theo chi nhánh;
- cung cấp dữ liệu phục vụ quản lý và báo cáo.

---

# 1.2. Business Goal tổng quát

> Xây dựng một hệ thống quản lý và đặt vé cho chuỗi Smart Cinema, cho phép khách hàng đặt vé trực tuyến xuyên suốt nhiều chi nhánh, đồng thời cung cấp công cụ quản trị tập trung cho Admin và công cụ vận hành theo phạm vi chi nhánh cho Manager và Staff.

---

# 1.3. SMART Business Goals

| Goal ID | Mục tiêu | Chỉ số đo lường | Mục tiêu |
|---|---|---|---|
| BG-01 | Số hóa toàn bộ quy trình đặt vé | Tỷ lệ các bước booking thực hiện trên hệ thống | 100% luồng MVP từ chọn phim đến nhận QR được thực hiện trên hệ thống |
| BG-02 | Đảm bảo không xảy ra double booking | Số trường hợp hai khách hàng mua thành công cùng một ghế/showtime | 0 trường hợp |
| BG-03 | Tự động hóa Seat Hold | Tỷ lệ Seat Hold được tự giải phóng sau expiration | 100% |
| BG-04 | Đảm bảo tính chính xác của Payment | Tỷ lệ Booking chuyển PAID không có Payment hợp lệ | 0% |
| BG-05 | Kiểm soát Ticket | Số Ticket được check-in thành công nhiều hơn một lần | 0 |
| BG-06 | Hỗ trợ realtime seat availability | Thời gian trạng thái ghế được đồng bộ tới các client khác | Mục tiêu ≤ 3 giây trong điều kiện vận hành bình thường |
| BG-07 | Giảm thao tác thủ công tại cửa rạp | Thời gian trung bình xác thực Ticket | Mục tiêu ≤ 3 giây/lần scan trong môi trường kiểm thử |
| BG-08 | Quản trị theo đúng phạm vi | Số trường hợp Manager/Staff truy cập trái phép Cinema khác | 0 |
| BG-09 | Hỗ trợ quản lý hiệu quả | Khả năng xem KPI vận hành | Manager xem được KPI chi nhánh; Admin xem được KPI toàn chuỗi |
| BG-10 | Hoàn thiện MVP end-to-end | Tỷ lệ test case critical flow đạt | 100% Critical Test Cases Pass trước nghiệm thu |

---

# 2. Stakeholders

## 2.1. Stakeholder Classification

Stakeholders được chia thành hai nhóm:

- Internal Stakeholders.
- External Stakeholders.

---

# 2.2. Internal Stakeholders

| Stakeholder | Nhóm | Vai trò | Trách nhiệm chính |
|---|---|---|---|
| System Owner / Project Sponsor | Internal | Chủ sở hữu nghiệp vụ/hệ thống | Phê duyệt phạm vi, mục tiêu, yêu cầu cấp cao và tiêu chí nghiệm thu |
| Admin | Internal | Quản trị toàn chuỗi Smart Cinema | Quản lý Cinema, User, Movie, Manager, Promotion và theo dõi báo cáo toàn chuỗi |
| Cinema Manager | Internal | Quản lý một hoặc nhiều chi nhánh được phân công | Quản lý Room, Seat, Showtime, Staff, Booking và báo cáo theo Cinema Scope |
| Staff | Internal | Nhân viên vận hành tại rạp | Kiểm tra Ticket, Scan QR và thực hiện Check-in |
| Development Team | Internal | Thiết kế và phát triển hệ thống | Phân tích, thiết kế, lập trình, tích hợp và triển khai hệ thống |
| QA/Test Team | Internal | Đảm bảo chất lượng | Xây dựng test case, kiểm thử chức năng, concurrency, payment, security và regression |
| System Administrator / DevOps | Internal | Vận hành kỹ thuật | Quản lý môi trường triển khai, cấu hình, database, Redis, reverse proxy, backup và monitoring |

---

# 2.3. External Stakeholders

| Stakeholder | Nhóm | Vai trò | Trách nhiệm/Tương tác |
|---|---|---|---|
| Customer | External | Người mua vé | Tìm phim, chọn rạp, đặt ghế, thanh toán, nhận Ticket và sử dụng QR |
| Payment Gateway | External | Nhà cung cấp dịch vụ thanh toán | Xử lý giao dịch và cung cấp cơ chế callback/webhook/xác minh trạng thái |
| Email Service | External | Dịch vụ gửi thông báo | Gửi thông tin booking, payment hoặc ticket khi được tích hợp |
| Future Integration Partners | External/Future | Hệ thống bên thứ ba | Có thể tích hợp API Smart Cinema trong các giai đoạn mở rộng sau |

---

# 3. Scope

## 3.1. In-Scope

### 3.1.1. Identity & Access Management

Bao gồm:

- Đăng ký Customer.
- Đăng nhập.
- Đăng xuất.
- Access Token.
- Refresh Token.
- Quản lý User Status.
- Role-Based Access Control.
- Cinema Scope Authorization.

Các role chính:

```text
CUSTOMER
STAFF
MANAGER
ADMIN
```

---

## 3.1.2. Movie Catalog Management

Bao gồm:

- Movie.
- Genre.
- Thông tin phim.
- Poster.
- Trailer.
- Duration.
- Release Date.
- Age Rating.
- Language.
- Movie Status.

Movie Catalog được quản lý ở cấp toàn chuỗi.

---

## 3.1.3. Cinema Branch Management

Bao gồm:

- Quản lý Cinema.
- Địa chỉ.
- Thông tin liên hệ.
- Status.
- Screening Rooms.
- Seat Layout.

Trong toàn bộ hệ thống:

> Cinema được hiểu là một chi nhánh vật lý của Smart Cinema.

---

## 3.1.4. Screening Room Management

Bao gồm:

- Room.
- Capacity.
- Room Status.
- Room Type nếu cần.
- Seat Layout.
- Room Maintenance Status.

---

## 3.1.5. Seat Management

Bao gồm:

- Physical Seat.
- Row.
- Seat Number.
- Seat Type.
- Seat Status.
- STANDARD.
- VIP.
- COUPLE.

---

## 3.1.6. Showtime Management

Bao gồm:

- Tạo Showtime.
- Chỉnh sửa Showtime.
- Hủy/disable Showtime.
- Gắn Movie với Screening Room.
- Start Time.
- End Time.
- Giá cơ bản.
- Kiểm tra xung đột lịch phòng.
- Buffer time nếu được cấu hình.

---

## 3.1.7. Seat Availability

Hệ thống xác định trạng thái ghế theo từng Showtime:

```text
AVAILABLE
HELD
BOOKED
UNAVAILABLE
```

Physical Seat và Showtime Seat Availability phải được phân biệt về mặt nghiệp vụ.

---

## 3.1.8. Seat Holding

Bao gồm:

- Customer chọn một hoặc nhiều ghế.
- Backend xác minh availability.
- Hold ghế tạm thời.
- Gắn Seat Hold với Customer/session.
- Xác định expiration.
- Tự giải phóng ghế khi hết thời gian.
- Ngăn người khác chiếm Seat đang có Hold hợp lệ.

Seat Hold mặc định:

```text
10 phút
```

và phải configurable.

---

## 3.1.9. Booking Management

Bao gồm:

- Tạo Booking.
- Một Booking thuộc một Showtime.
- Một Booking có thể chứa nhiều Seat.
- Pricing Snapshot.
- Promotion.
- Total Amount.
- Booking Status.

Các trạng thái MVP:

```text
PENDING
PAID
EXPIRED
CANCELLED
```

---

## 3.1.10. Promotion

MVP hỗ trợ:

- Promotion Code.
- Discount Type.
- Discount Value.
- Validity Period.
- Minimum Order.
- Usage Limit.
- Promotion Status.

Ưu tiên Promotion toàn chuỗi.

---

## 3.1.11. Payment

Bao gồm:

- Tạo Payment cho Booking.
- Payment Sandbox.
- Payment Gateway Integration.
- Callback/Webhook.
- Backend Verification.
- Transaction Reference.
- Payment Status.
- Idempotent processing.

---

## 3.1.12. Ticket

Bao gồm:

- Sinh Ticket sau Payment thành công.
- Một Seat đã mua tương ứng một Ticket.
- Ticket Token.
- QR Code.
- Ticket Status.
- Ticket Validation.

---

## 3.1.13. QR Check-in

Bao gồm:

- Staff scan QR.
- Backend validate Ticket.
- Kiểm tra Cinema.
- Kiểm tra Showtime.
- Kiểm tra Ticket Status.
- Kiểm tra Booking.
- Check-in.
- Chống check-in lặp.

---

## 3.1.14. Realtime Seat Update

Bao gồm:

- WebSocket.
- Seat HELD event.
- Seat RELEASED event.
- Seat BOOKED event.
- Đồng bộ trạng thái ghế tới các Customer đang xem cùng Showtime.

---

## 3.1.15. Staff & Manager Assignment

Bao gồm:

- Gán Staff cho Cinema.
- Gán Manager cho Cinema.
- User Status.
- Cinema Scope.
- Kiểm tra quyền theo Cinema.

Không bao gồm HRM đầy đủ.

---

## 3.1.16. Dashboard & Reporting

### Manager

- Revenue.
- Tickets Sold.
- Bookings.
- Occupancy.
- Popular Movies.
- Showtime Performance.

Phạm vi theo Cinema được phân công.

### Admin

- Total Revenue.
- Revenue by Cinema.
- Total Bookings.
- Tickets Sold.
- Top Movies.
- Top Cinemas.
- User Statistics.

---

## 3.1.17. Notification

Có thể hỗ trợ:

- Payment Success.
- Ticket Created.
- Booking Cancelled.
- Showtime Change.

Email không nằm trên critical transaction path.

---

## 3.1.18. Audit Log

Các nghiệp vụ nhạy cảm được phép ghi log:

- Cinema changes.
- Showtime changes.
- Staff assignment.
- Manager assignment.
- Ticket check-in.
- Các hành động quản trị quan trọng.

---

# 3.2. Out-of-Scope

Các hạng mục sau **không thuộc phạm vi MVP**.

### Multi-Brand / Cinema Aggregator

Không triển khai hệ thống kiểu:

```text
Platform
├── CGV
├── Lotte
├── Galaxy
└── ...
```

Smart Cinema chỉ phục vụ một chuỗi rạp duy nhất.

---

### Multi-Tenant SaaS

Không xây hệ thống cho nhiều công ty rạp độc lập cùng sử dụng dưới dạng SaaS.

---

### Human Resource Management

Không triển khai:

- Payroll.
- Salary Calculation.
- Attendance.
- Recruitment.
- Employee Contracts.
- Shift Optimization.
- Performance Appraisal.

---

### Automated Refund

Không triển khai hoàn tiền tự động cho Paid Booking trong MVP.

---

### Production Payment

Không xử lý giao dịch tiền thật trong phạm vi đồ án.

Sử dụng Sandbox/Test Environment.

---

### Mobile Native Application

Không xây Android/iOS native app trong MVP.

---

### Microservices

Không sử dụng kiến trúc Microservices ở giai đoạn đầu.

Ưu tiên Modular Monolith.

---

### Kafka / Distributed Messaging

Không triển khai Kafka hoặc event streaming infrastructure quy mô lớn.

---

### Kubernetes

Không triển khai orchestration bằng Kubernetes.

---

### AI phức tạp

Không triển khai các mô hình AI/ML phức tạp trong MVP.

---

### Recommendation Engine nâng cao

Movie Recommendation có thể được đưa vào future development.

---

### Dynamic Pricing nâng cao

Không xây pricing engine theo demand, machine learning hoặc tối ưu giá thời gian thực trong MVP.

---

### IoT Cinema Management

Không tích hợp thiết bị:

- cửa tự động;
- cảm biến;
- thiết bị chiếu;
- smart seat;
- IoT hardware.

---

### Food & Beverage Management hoàn chỉnh

Không triển khai inventory, kitchen, supply-chain hoặc POS đồ ăn hoàn chỉnh trong MVP.

---

# 4. Business Requirements List

## 4.1. Identity & Authorization Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-001 | Customer Account Management | Hệ thống phải cho phép Customer đăng ký, đăng nhập và sử dụng một tài khoản duy nhất tại tất cả Cinema thuộc chuỗi Smart Cinema. | Must | Customer / Admin |
| BR-002 | Role-Based Access Control | Hệ thống phải phân quyền tối thiểu theo CUSTOMER, STAFF, MANAGER và ADMIN. | Must | Admin |
| BR-003 | Cinema Scope Authorization | Manager và Staff chỉ được thực hiện nghiệp vụ tại Cinema nằm trong phạm vi được phân công. | Must | Admin / Manager |
| BR-004 | Unauthorized Access Prevention | Mọi yêu cầu truy cập tài nguyên ngoài quyền hoặc Cinema Scope phải bị từ chối bởi Backend. | Must | Admin / Security |

---

## 4.2. Movie Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-005 | Centralized Movie Catalog | Hệ thống phải duy trì một Movie Catalog chung cho toàn chuỗi Smart Cinema. | Must | Admin |
| BR-006 | Movie Information Management | Admin phải có khả năng quản lý thông tin Movie, bao gồm Title, Description, Duration, Release Date, Age Rating, Genre, Poster, Trailer và Status. | Must | Admin |
| BR-007 | Movie Discovery | Customer phải có khả năng xem và tìm Movie đang hoặc sắp được chiếu trong chuỗi. | Must | Customer |

---

## 4.3. Cinema & Room Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-008 | Cinema Branch Management | Admin phải có khả năng quản lý các chi nhánh Cinema thuộc Smart Cinema. | Must | Admin |
| BR-009 | Screening Room Management | Manager/Admin phải quản lý được Screening Room trong phạm vi Cinema được cấp quyền. | Must | Manager / Admin |
| BR-010 | Room Availability | Room ở trạng thái không hoạt động hoặc bảo trì không được sử dụng cho Showtime mới trong khoảng thời gian không khả dụng. | Must | Manager |
| BR-011 | Seat Layout Management | Hệ thống phải quản lý sơ đồ Seat cố định theo từng Screening Room. | Must | Manager |

---

## 4.4. Showtime Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-012 | Showtime Creation | Manager/Admin phải có thể tạo Showtime cho Movie tại Screening Room hợp lệ. | Must | Manager |
| BR-013 | Showtime Conflict Prevention | Hệ thống không được cho phép hai Showtime sử dụng cùng Screening Room trong khoảng thời gian bị chồng lấn. | Must | Manager |
| BR-014 | Showtime Duration Validation | End Time của Showtime phải phù hợp với thời lượng phim và quy tắc buffer nếu được cấu hình. | Should | Manager |
| BR-015 | Started Showtime Booking Prevention | Customer không được tạo Booking cho Showtime đã bắt đầu. | Must | Customer / Manager |
| BR-016 | Cinema-Specific Showtime | Customer phải xem được Showtime theo Movie, Cinema và Date. | Must | Customer |

---

## 4.5. Seat Availability & Holding Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-017 | Showtime Seat Availability | Hệ thống phải xác định Seat Availability riêng cho từng Showtime. | Must | Customer |
| BR-018 | Seat Holding | Customer phải có thể giữ tạm thời Seat đang AVAILABLE trước khi hoàn tất Booking. | Must | Customer |
| BR-019 | Seat Hold Expiration | Seat Hold phải tự hết hiệu lực sau thời gian cấu hình nếu Customer không hoàn tất quy trình yêu cầu. | Must | Customer / System |
| BR-020 | Seat Hold Ownership | Seat Hold chỉ được sử dụng bởi Customer/session sở hữu Hold đó. | Must | Customer |
| BR-021 | Seat Hold Exclusivity | Cùng một Seat của cùng một Showtime không được có nhiều Seat Hold hợp lệ đồng thời. | Must | System |
| BR-022 | Double Booking Prevention | Hai Customer không được mua thành công cùng một Seat của cùng một Showtime. | Must | Customer / Business Owner |
| BR-023 | Backend Seat Validation | Backend phải xác minh Seat Availability tại thời điểm nhận command, không được tin hoàn toàn trạng thái đang hiển thị trên Frontend. | Must | System |
| BR-024 | Automatic Seat Release | Seat phải trở về trạng thái có thể đặt sau khi Hold hết hạn và không có Booking hợp lệ chiếm giữ. | Must | System |
| BR-025 | Realtime Seat Synchronization | Khi Seat thay đổi trạng thái HELD/AVAILABLE/BOOKED, các client đang xem cùng Showtime nên được cập nhật realtime. | Should | Customer |

---

## 4.6. Booking Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-026 | Booking Creation | Customer phải có thể tạo Booking từ Seat Hold hợp lệ. | Must | Customer |
| BR-027 | Single Showtime per Booking | Một Booking trong MVP chỉ được chứa Seat thuộc một Showtime. | Must | Business Owner |
| BR-028 | Multiple Seats per Booking | Một Booking được phép chứa nhiều Seat của cùng một Showtime. | Must | Customer |
| BR-029 | Booking Lifecycle | Booking phải hỗ trợ tối thiểu các trạng thái PENDING, PAID, EXPIRED và CANCELLED. | Must | System |
| BR-030 | Booking Expiration | Booking chưa hoàn tất đúng thời hạn phải được chuyển sang trạng thái phù hợp và không giữ tài nguyên vô thời hạn. | Must | System |
| BR-031 | Pricing Snapshot | Booking phải lưu giá được xác nhận tại thời điểm giao dịch để thay đổi bảng giá sau này không làm thay đổi Booking cũ. | Must | Finance / Admin |
| BR-032 | Booking History | Customer phải có thể xem các Booking thuộc tài khoản của mình. | Should | Customer |

---

## 4.7. Promotion Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-033 | Promotion Management | Admin phải có thể tạo và quản lý Promotion áp dụng trong chuỗi. | Should | Admin |
| BR-034 | Promotion Validation | Backend phải kiểm tra thời gian hiệu lực, status, usage limit, minimum amount và các điều kiện áp dụng trước khi giảm giá. | Should | Admin / Customer |
| BR-035 | Server-Side Price Calculation | Final Amount phải được Backend tính toán; Frontend không được tự quyết định giá cuối cùng. | Must | Business Owner |

---

## 4.8. Payment Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-036 | Payment Creation | Customer phải có thể tạo Payment cho Booking đang ở trạng thái phù hợp. | Must | Customer |
| BR-037 | Payment Gateway Integration | Hệ thống phải tích hợp ít nhất một Payment Gateway ở môi trường Sandbox/Test. | Must | System / External Provider |
| BR-038 | Backend Payment Verification | Booking chỉ được chuyển sang PAID khi Backend xác minh Payment thành công bằng cơ chế tin cậy từ Payment Gateway. | Must | System / Payment Provider |
| BR-039 | Frontend Payment Distrust | Frontend không được tự quyết định hoặc khai báo Booking đã thanh toán thành công. | Must | System |
| BR-040 | Payment Failure Handling | Payment thất bại không được tạo Ticket và Booking không được chuyển sang PAID. | Must | System |
| BR-041 | Payment Idempotency | Callback/Webhook được gửi lặp phải được xử lý idempotent và không tạo kết quả nghiệp vụ lặp. | Must | System / Payment Provider |
| BR-042 | Payment Traceability | Hệ thống phải lưu thông tin tham chiếu cần thiết để tra cứu và đối soát Payment. | Should | Admin / Finance |

---

## 4.9. Ticket Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-043 | Ticket Generation | Ticket chỉ được tạo sau khi Payment của Booking được xác nhận thành công. | Must | Customer / System |
| BR-044 | One Ticket per Seat | Mỗi Seat được mua trong Booking phải sinh một Ticket riêng. | Must | Business Owner |
| BR-045 | Unique Ticket Identifier | Mỗi Ticket phải có mã/token duy nhất để phục vụ việc xác minh. | Must | System |
| BR-046 | QR Ticket | Hệ thống phải cung cấp QR Code cho Ticket để sử dụng tại Check-in. | Must | Customer / Staff |
| BR-047 | Ticket Ownership View | Customer chỉ được xem Ticket thuộc Booking của mình trừ các role có quyền quản trị phù hợp. | Must | Customer / Security |

---

## 4.10. Check-in Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-048 | QR Scan | Staff phải có khả năng scan QR Ticket tại Cinema. | Must | Staff |
| BR-049 | Ticket Validation | Backend phải xác minh Ticket tồn tại, hợp lệ, thuộc Booking đã thanh toán và chưa bị vô hiệu hóa trước Check-in. | Must | Staff / System |
| BR-050 | Cinema Validation | Staff chỉ được Check-in Ticket thuộc Cinema phù hợp với phạm vi hoạt động. | Must | Staff / Manager |
| BR-051 | Duplicate Check-in Prevention | Một Ticket không được Check-in thành công nhiều hơn số lần được quy định; MVP mặc định là một lần. | Must | Staff |
| BR-052 | Check-in Audit Information | Hệ thống nên lưu thời gian Check-in và Staff thực hiện. | Should | Manager / Admin |

---

## 4.11. Staff & Manager Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-053 | Staff Assignment | Staff phải được gán Cinema làm việc để xác định phạm vi quyền. | Must | Manager / Admin |
| BR-054 | Manager Assignment | Manager phải được Admin gán Cinema được phép quản lý. | Must | Admin |
| BR-055 | Limited Staff Management | Hệ thống chỉ quản các thông tin Staff cần thiết cho vận hành như Account, Role, Cinema Assignment và Status. | Must | Admin / Manager |
| BR-056 | No HRM Expansion | Payroll, Attendance, Recruitment và các nghiệp vụ HR chuyên sâu không thuộc phạm vi hệ thống hiện tại. | Won't | Project Sponsor |

---

## 4.12. Dashboard & Reporting Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-057 | Manager Dashboard | Manager phải xem được Dashboard của Cinema nằm trong phạm vi quản lý. | Should | Manager |
| BR-058 | Admin Dashboard | Admin phải xem được Dashboard tổng hợp toàn chuỗi Smart Cinema. | Should | Admin |
| BR-059 | Revenue Accuracy | Revenue report không được tính Booking PENDING/FAILED như doanh thu thành công. | Must | Admin / Manager |
| BR-060 | Cinema Performance Reporting | Hệ thống nên cung cấp các chỉ số như Revenue, Ticket Sold, Occupancy và Showtime Performance. | Should | Manager / Admin |

---

## 4.13. Audit & Notification Requirements

| Req ID | Requirement Name | Description | Priority | Owner / Stakeholder |
|---|---|---|---|---|
| BR-061 | Administrative Audit Log | Các thao tác quản trị quan trọng nên được ghi lại để hỗ trợ truy vết. | Should | Admin |
| BR-062 | Ticket Check-in Audit | Hệ thống nên ghi lại sự kiện Check-in nhằm hỗ trợ xử lý tranh chấp và kiểm tra vận hành. | Should | Manager |
| BR-063 | Booking Notification | Hệ thống có thể gửi thông báo cho Customer khi Payment thành công hoặc Ticket được tạo. | Could | Customer |
| BR-064 | Notification Failure Isolation | Lỗi gửi Email/Notification không được làm rollback một Booking/Payment đã hoàn tất hợp lệ. | Must | System |

---

# 5. Success Criteria

## 5.1. Business Acceptance Criteria

Dự án được xem là đạt yêu cầu nghiệp vụ khi hoàn thành thành công scenario:

```text
Customer Login
     ↓
Browse Movie
     ↓
Choose Cinema
     ↓
Choose Showtime
     ↓
Load Seat Map
     ↓
Hold Seat
     ↓
Create Booking
     ↓
Payment Sandbox
     ↓
Backend Verify
     ↓
Booking PAID
     ↓
Ticket Generated
     ↓
QR Generated
     ↓
Staff Scan
     ↓
Ticket Validated
     ↓
Check-in Successful
```

---

# 5.2. KPI / Metric

| KPI ID | KPI | Cách đo | Target |
|---|---|---|---|
| KPI-01 | Double Booking Rate | Số Seat được bán thành công cho >1 Customer / tổng Seat bán | **0%** |
| KPI-02 | Hold Expiration Accuracy | Seat Hold hết hạn được release đúng / tổng Hold hết hạn | **100%** |
| KPI-03 | Invalid Paid Booking Rate | Booking PAID nhưng không có Payment hợp lệ | **0%** |
| KPI-04 | Ticket Generation Accuracy | Ticket hợp lệ được tạo đúng sau Payment Success | **100% trong Critical Flow** |
| KPI-05 | Duplicate Check-in Rate | Ticket Check-in thành công >1 lần | **0%** |
| KPI-06 | Unauthorized Cinema Access | Số thao tác Manager/Staff thành công ngoài Cinema Scope | **0** |
| KPI-07 | Payment Webhook Idempotency | Duplicate Webhook tạo duplicate side-effect | **0 trường hợp** |
| KPI-08 | Critical Test Pass Rate | Critical Test Cases pass / tổng Critical Test Cases | **100%** |
| KPI-09 | Seat Map Response Time | Response thời gian lấy Seat Map trong môi trường test tiêu chuẩn | **≤ 2 giây mục tiêu** |
| KPI-10 | Seat Hold Processing Time | Thời gian xử lý request Hold trong môi trường test | **≤ 1 giây mục tiêu** |
| KPI-11 | QR Validation Time | Thời gian Backend validate Ticket | **≤ 2 giây mục tiêu** |
| KPI-12 | Realtime Seat Sync | Thời gian client khác nhận Seat Status update | **≤ 3 giây mục tiêu** |
| KPI-13 | Booking Completion | Luồng Customer từ Seat Hold đến Ticket có thể hoàn tất end-to-end | **100% trong Acceptance Scenario** |
| KPI-14 | Payment Failure Safety | Payment failed nhưng Ticket vẫn được sinh | **0 trường hợp** |
| KPI-15 | Data Integrity | Critical integrity violations phát hiện trong test | **0** |

---

# 5.3. Critical Acceptance Tests

Các test sau bắt buộc phải PASS trước nghiệm thu.

### AT-01 — Normal Booking

Customer mua một Seat AVAILABLE.

**Expected:** Booking PAID và Ticket được tạo sau Payment Success.

---

### AT-02 — Concurrent Seat Hold

Hai Customer cùng yêu cầu A5 gần như đồng thời.

**Expected:** chỉ một Customer thành công.

---

### AT-03 — Seat Hold Expiration

Customer giữ ghế nhưng không hoàn tất.

**Expected:** hết TTL, Seat trở lại AVAILABLE.

---

### AT-04 — Expired Hold Usage

Customer cố sử dụng Seat Hold đã hết hạn.

**Expected:** Backend từ chối.

---

### AT-05 — Failed Payment

Payment Gateway trả failed.

**Expected:**

```text
Booking != PAID
Ticket = NOT CREATED
```

---

### AT-06 — Browser Closed After Payment

Customer thanh toán thành công nhưng đóng trình duyệt trước khi Frontend nhận kết quả.

**Expected:** Backend vẫn hoàn tất quy trình khi nhận và xác minh Webhook hợp lệ.

---

### AT-07 — Duplicate Payment Webhook

Gateway gửi cùng Payment Success nhiều lần.

**Expected:** không sinh duplicate Ticket hoặc duplicate Booking transition.

---

### AT-08 — First QR Scan

Staff scan Ticket hợp lệ.

**Expected:** Check-in SUCCESS.

---

### AT-09 — Duplicate QR Scan

Staff scan lại cùng Ticket.

**Expected:** REJECT — ALREADY CHECKED_IN.

---

### AT-10 — Wrong Cinema Check-in

Staff Cinema A scan Ticket của Cinema B.

**Expected:** REJECT.

---

### AT-11 — Manager Cross-Cinema Access

Manager Cinema A cố cập nhật Showtime Cinema B.

**Expected:** ACCESS DENIED.

---

### AT-12 — Showtime Conflict

Manager tạo Showtime mới trùng thời gian sử dụng Room.

**Expected:** REJECT.

---

### AT-13 — Pricing Snapshot

Giá Seat Type thay đổi sau khi Booking đã xác nhận giá.

**Expected:** giá Booking cũ không thay đổi.

---

# 6. Business Constraints

## BC-01 — Single Cinema Chain

Hệ thống chỉ phục vụ chuỗi Smart Cinema.

---

## BC-02 — Multiple Branches

Smart Cinema được phép có nhiều Cinema Branch.

---

## BC-03 — Payment Sandbox

MVP chỉ sử dụng Payment Gateway Sandbox/Test.

---

## BC-04 — Modular Monolith

Hệ thống Backend ưu tiên Modular Monolith thay vì Microservices.

---

## BC-05 — Backend Authority

Backend là nguồn quyết định cuối cùng đối với:

- Authorization.
- Seat Availability.
- Seat Hold.
- Price.
- Booking State.
- Payment State.
- Ticket Validity.
- Check-in.

---

## BC-06 — External System Failure

Lỗi của hệ thống phụ trợ như Email không được phá vỡ kết quả giao dịch lõi đã được xác nhận hợp lệ.

---

# 7. Business Assumptions

## BA-01

Một Cinema Branch thuộc duy nhất chuỗi Smart Cinema.

## BA-02

Một Screening Room thuộc duy nhất một Cinema.

## BA-03

Một Physical Seat thuộc duy nhất một Screening Room.

## BA-04

Một Showtime diễn ra tại một Screening Room.

## BA-05

Một Booking thuộc một Showtime trong MVP.

## BA-06

Một Booking có thể chứa nhiều Seat.

## BA-07

Một Seat đã mua sinh một Ticket.

## BA-08

Một Ticket chỉ được Check-in một lần trong MVP.

## BA-09

Manager và Staff phải có Cinema Assignment.

## BA-10

Customer có thể sử dụng cùng tài khoản tại tất cả Cinema của Smart Cinema.

---

# 8. Requirement Priority Summary

### Must Have

Bao gồm các nhóm:

- Authentication.
- RBAC.
- Cinema Scope Authorization.
- Movie.
- Cinema.
- Room.
- Seat.
- Showtime.
- Seat Availability.
- Seat Holding.
- Concurrency.
- Booking.
- Payment.
- Payment Verification.
- Ticket.
- QR.
- Check-in.

Đây là các nghiệp vụ quyết định MVP có hoàn thành hay không.

### Should Have

- Promotion.
- Dashboard.
- Reporting.
- Realtime WebSocket.
- Audit.
- Booking History nâng cao.

### Could Have

- Email Notification.
- Advanced Analytics.
- Review.
- Một số cải tiến UX.

### Won't Have in MVP

- Multi-brand.
- Multi-tenant.
- HRM.
- Automatic Refund.
- Production Payment.
- Microservices.
- Kafka.
- Kubernetes.
- Native Mobile.
- AI nâng cao.
- IoT.

---

# 9. Project Success Definition

Smart Cinema Ecosystem được xem là thành công ở cấp Business Requirement khi hệ thống chứng minh được ba nhóm năng lực sau.

## 9.1. Customer Journey

Customer hoàn thành được:

```text
Movie
→ Cinema
→ Showtime
→ Seat
→ Booking
→ Payment
→ Ticket
```

trên một hệ thống thống nhất.

---

## 9.2. Transaction Integrity

Hệ thống chứng minh được:

```text
No Double Booking
No Invalid Paid Booking
No Ticket Before Payment
No Duplicate Ticket From Webhook
No Duplicate Check-in
```

---

## 9.3. Cinema Operation

Hệ thống chứng minh được:

```text
Admin → Whole Chain

Manager → Assigned Cinema

Staff → Assigned Cinema
```

và mọi quyền truy cập trái phạm vi đều bị Backend từ chối.

---

# 10. Final Business Requirement Statement

Smart Cinema Ecosystem phải cung cấp một nền tảng thống nhất cho một chuỗi rạp có nhiều chi nhánh, cho phép khách hàng tìm kiếm suất chiếu, giữ ghế, đặt vé, thanh toán và nhận Ticket điện tử; đồng thời cung cấp cho đội ngũ vận hành khả năng quản lý Cinema, Room, Seat, Showtime, Staff, Booking và Check-in theo đúng phạm vi được phân quyền.

Giá trị cốt lõi của hệ thống nằm ở khả năng bảo đảm:

- tính nhất quán của Seat Inventory;
- xử lý Booking đồng thời;
- kiểm soát Seat Hold;
- xác minh Payment;
- sinh Ticket chính xác;
- chống Check-in lặp;
- kiểm soát quyền theo Cinema;
- hỗ trợ quản lý vận hành nhiều chi nhánh trên cùng một chuỗi.

BRD này là tài liệu baseline cho các bước tiếp theo:

```text
BRD
 ↓
SRS
 ↓
Use Case
 ↓
Business Rules Specification
 ↓
ERD
 ↓
Database Design
 ↓
Architecture
 ↓
API Specification
```