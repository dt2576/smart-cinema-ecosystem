# SMART CINEMA ECOSYSTEM
## PROJECT SCOPE v1.0

### 1. Tên đề tài

**Tiếng Việt:**  
Xây dựng hệ sinh thái rạp chiếu phim thông minh – Smart Cinema Ecosystem

**Tiếng Anh:**  
Design and Development of a Smart Cinema Ecosystem

---

## 2. Bối cảnh và lý do chọn đề tài

Trong hoạt động của một hệ thống rạp chiếu phim, nhiều nghiệp vụ cần được phối hợp chặt chẽ như quản lý phim, rạp, phòng chiếu, ghế, lịch chiếu, đặt vé, thanh toán và kiểm soát vé tại rạp.

Đặc biệt, quá trình đặt vé trực tuyến phát sinh những vấn đề kỹ thuật quan trọng như nhiều khách hàng cùng lựa chọn một ghế, giữ ghế trong thời gian thanh toán, tự động giải phóng ghế khi hết hạn, xác nhận kết quả thanh toán và kiểm soát việc sử dụng vé.

Đề tài **Smart Cinema Ecosystem** được xây dựng nhằm mô phỏng một hệ thống quản lý và đặt vé rạp chiếu phim tương đối hoàn chỉnh, trong đó tập trung vào tính nhất quán dữ liệu, xử lý đồng thời, cập nhật trạng thái ghế theo thời gian thực và quản lý toàn bộ vòng đời của một giao dịch đặt vé.

---

## 3. Mục tiêu của đề tài

### 3.1. Mục tiêu tổng quát

Xây dựng một hệ thống web hỗ trợ khách hàng đặt vé xem phim trực tuyến và hỗ trợ nhân viên, quản lý, quản trị viên thực hiện các nghiệp vụ vận hành hệ thống rạp chiếu phim.

Hệ thống cần đảm bảo một quy trình hoàn chỉnh:

**Tìm phim → Chọn rạp → Chọn suất chiếu → Chọn và giữ ghế → Đặt vé → Thanh toán → Nhận vé QR → Check-in tại rạp**

### 3.2. Mục tiêu kỹ thuật

Đề tài tập trung giải quyết các vấn đề kỹ thuật chính:

- Xây dựng RESTful API bằng Java và Spring Boot.
- Xác thực và phân quyền người dùng.
- Thiết kế cơ sở dữ liệu có tính toàn vẹn và nhất quán.
- Xử lý transaction trong nghiệp vụ đặt vé.
- Ngăn nhiều người đặt thành công cùng một ghế.
- Xây dựng cơ chế giữ ghế có thời hạn.
- Tự động giải phóng ghế hết thời gian giữ.
- Cập nhật trạng thái ghế theo thời gian thực.
- Tích hợp môi trường thanh toán thử nghiệm.
- Xác minh kết quả thanh toán tại Backend.
- Sinh vé điện tử sử dụng QR Code.
- Ngăn một vé được check-in nhiều lần.
- Container hóa và triển khai hệ thống.

---

# 4. Đối tượng sử dụng

Hệ thống có bốn nhóm người dùng chính.

## 4.1. Customer

Khách hàng sử dụng hệ thống để:

- Đăng ký và đăng nhập.
- Xem danh sách phim.
- Xem thông tin chi tiết phim.
- Tìm rạp và lịch chiếu.
- Chọn suất chiếu.
- Xem sơ đồ ghế.
- Chọn và giữ ghế.
- Tạo booking.
- Sử dụng mã khuyến mãi.
- Thanh toán.
- Nhận vé điện tử.
- Xem QR Code của vé.
- Xem lịch sử đặt vé.

## 4.2. Staff

Nhân viên tại rạp có thể:

- Đăng nhập vào hệ thống nhân viên.
- Quét QR Code trên vé.
- Kiểm tra tính hợp lệ của vé.
- Check-in khách hàng.
- Tra cứu thông tin booking cần thiết phục vụ vận hành tại rạp.

## 4.3. Manager

Manager quản lý trong phạm vi rạp được phân công.

Các chức năng chính:

- Quản lý thông tin rạp thuộc phạm vi phụ trách.
- Quản lý phòng chiếu.
- Quản lý ghế.
- Quản lý suất chiếu.
- Quản lý nhân viên thuộc phạm vi rạp.
- Theo dõi booking.
- Theo dõi doanh thu.
- Xem báo cáo và dashboard của rạp.

Manager không được tự ý truy cập hoặc quản lý dữ liệu của những rạp nằm ngoài phạm vi được phân công.

## 4.4. Admin

Admin quản trị toàn bộ hệ thống:

- Quản lý người dùng.
- Quản lý role và permission.
- Quản lý phim.
- Quản lý hệ thống rạp.
- Quản lý chương trình khuyến mãi.
- Theo dõi hoạt động toàn hệ thống.
- Xem dashboard và báo cáo tổng hợp.

---

# 5. Phạm vi chức năng MVP

## 5.1. Authentication & Authorization

Hệ thống hỗ trợ:

- Register.
- Login.
- Access Token.
- Refresh Token.
- Logout.
- Role-Based Access Control.

Các role chính:

- CUSTOMER
- STAFF
- MANAGER
- ADMIN

Ngoài kiểm tra role, một số tài nguyên phải được kiểm tra theo phạm vi quản lý. Ví dụ Manager chỉ được thao tác với rạp được phân công.

---

## 5.2. Movie Management

Quản lý:

- Movie.
- Genre.
- Thông tin phim.
- Thời lượng phim.
- Ngày phát hành.
- Phân loại độ tuổi.
- Poster.
- Trailer.
- Trạng thái phát hành.

Khách hàng có thể xem phim đang chiếu, phim sắp chiếu và thông tin chi tiết phim.

---

## 5.3. Cinema Management

Cấu trúc chính:

**Cinema → Screening Room → Seat**

Hệ thống quản lý:

- Rạp.
- Phòng chiếu.
- Sơ đồ ghế.
- Loại ghế.

Các loại ghế ban đầu có thể gồm:

- STANDARD
- VIP
- COUPLE

---

## 5.4. Showtime Management

Một suất chiếu liên kết tối thiểu với:

- Movie.
- Cinema.
- Screening Room.
- Start Time.
- End Time.
- Giá vé cơ bản.

Hệ thống phải ngăn việc tạo các suất chiếu bị chồng thời gian trong cùng một phòng.

Có thể áp dụng thêm khoảng thời gian buffer giữa hai suất để phục vụ việc khách rời phòng và chuẩn bị phòng chiếu.

---

## 5.5. Seat Availability & Seat Holding

Khách hàng có thể xem trạng thái ghế của một suất chiếu.

Các trạng thái nghiệp vụ chính:

**AVAILABLE → HELD → BOOKED**

Khi khách chọn ghế:

1. Backend kiểm tra ghế còn khả dụng.
2. Ghế được giữ tạm thời cho khách.
3. Thời gian giữ ghế được giới hạn.
4. Trong thời gian giữ, người khác không được đặt ghế đó.
5. Nếu thanh toán thành công, ghế trở thành BOOKED.
6. Nếu hết thời gian mà giao dịch chưa hoàn tất, ghế được giải phóng.

Thời gian giữ ghế dự kiến ban đầu: **10 phút**.

Giá trị này phải được cấu hình thay vì hard-code để có thể thay đổi sau này.

---

## 5.6. Booking

Customer có thể tạo booking từ các ghế đang được giữ hợp lệ.

Các trạng thái booking chính:

- PENDING
- PAID
- EXPIRED
- CANCELLED

Hệ thống không cho phép:

- Đặt suất chiếu đã bắt đầu.
- Đặt ghế đã được người khác mua.
- Sử dụng seat hold của người khác.
- Hoàn tất booking khi seat hold đã hết hạn.

---

## 5.7. Concurrency Control

Đây là một trong những phạm vi kỹ thuật trọng tâm của đề tài.

Nếu hai hoặc nhiều người đồng thời yêu cầu cùng một ghế, hệ thống phải đảm bảo:

> Tại một thời điểm, chỉ một người có thể giành quyền giữ hoặc đặt thành công ghế đó.

Giải pháp sẽ được nghiên cứu và thiết kế dựa trên:

- Database transaction.
- Database locking.
- Unique constraint.
- Isolation.
- Atomic operation.
- Redis.
- Cơ chế xử lý race condition.

Không sử dụng trạng thái hiển thị trên Frontend làm nguồn xác định cuối cùng về việc ghế có còn khả dụng hay không.

---

## 5.8. Payment

Hệ thống sử dụng **Payment Gateway Sandbox** trong phạm vi đồ án.

Luồng tổng quát:

**Booking PENDING → Create Payment → Payment Gateway → Callback/Webhook → Backend Verify → Payment SUCCESS → Booking PAID**

Backend chịu trách nhiệm xác minh kết quả thanh toán.

Frontend không được phép tự quyết định một booking đã thanh toán thành công.

---

## 5.9. Ticket & QR Code

Chỉ tạo Ticket sau khi hệ thống xác nhận thanh toán thành công.

Mỗi ticket có mã định danh hoặc token được biểu diễn dưới dạng QR Code.

Luồng:

**Payment SUCCESS → Create Ticket → Generate QR → Customer → Staff Scan → Validate → Check-in**

Một ticket hợp lệ chỉ được check-in theo quy định một lần.

Ticket đã:

- bị hủy;
- không hợp lệ;
- hoặc đã check-in

phải bị từ chối khi quét lại.

---

## 5.10. Promotion

Phiên bản MVP hỗ trợ promotion ở mức cơ bản:

- Promotion code.
- Loại giảm giá.
- Giá trị giảm.
- Thời gian bắt đầu.
- Thời gian kết thúc.
- Giá trị đơn hàng tối thiểu.
- Giới hạn sử dụng.

Promotion engine phức tạp không thuộc mục tiêu của phiên bản đầu tiên.

---

## 5.11. Dashboard

### Manager Dashboard

Có thể hiển thị:

- Revenue.
- Number of bookings.
- Tickets sold.
- Occupancy.
- Popular movies.
- Showtime performance.

Dữ liệu phải giới hạn theo phạm vi rạp mà Manager quản lý.

### Admin Dashboard

Có thể hiển thị:

- Tổng doanh thu.
- Tổng booking.
- Tổng vé bán.
- Doanh thu theo rạp.
- Phim phổ biến.
- Rạp hoạt động tốt.
- Thống kê người dùng.

---

# 6. Phạm vi kỹ thuật nâng cao

Các chức năng sau thuộc phạm vi dự án nhưng được triển khai **sau khi luồng MVP cơ bản hoạt động ổn định**.

## 6.1. Redis

Ưu tiên sử dụng cho:

- Seat holding.
- TTL.
- Expiration.
- Atomic operation cần thiết cho quá trình giữ ghế.

## 6.2. WebSocket

Sử dụng để đồng bộ trạng thái ghế theo thời gian thực.

Ví dụ:

Khách A giữ ghế A5 → Backend xử lý thành công → phát sự kiện → giao diện của khách B cập nhật A5 thành HELD mà không cần tải lại trang.

## 6.3. Email Notification

Có thể gửi:

- Xác nhận booking.
- Xác nhận thanh toán.
- Thông tin vé.
- Thông báo liên quan tới booking.

## 6.4. Audit Log

Lưu lại những hành động quản trị quan trọng để phục vụ theo dõi và kiểm tra hệ thống.

## 6.5. Advanced Analytics

Mở rộng báo cáo:

- Doanh thu theo thời gian.
- Tỷ lệ lấp đầy.
- Hiệu quả suất chiếu.
- Phim có doanh thu cao.
- Khung giờ phổ biến.

---

# 7. Chức năng mở rộng nếu còn thời gian

Các chức năng sau không phải điều kiện để đồ án được xem là hoàn thành:

- Movie Recommendation.
- Dynamic Pricing.
- Review/Rating.
- Combo/Food.
- Analytics nâng cao.

Recommendation hoặc các chức năng AI chỉ được triển khai khi toàn bộ nghiệp vụ đặt vé cốt lõi đã ổn định.

---

# 8. Ngoài phạm vi

Phiên bản chính của đồ án không triển khai:

- Microservices.
- Kafka.
- Kubernetes.
- Native Mobile Application.
- IoT.
- Payment production bằng tiền thật.
- Hệ thống AI phức tạp.
- Kiến trúc distributed system quy mô lớn.

Hệ thống ưu tiên kiến trúc **modular monolith** phù hợp với phạm vi đồ án.

---

# 9. Công nghệ dự kiến

## Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.

## Backend

- Java 21.
- Spring Boot.
- Spring Security.
- Spring Data JPA.
- Hibernate.
- Maven.
- RESTful API.
- OpenAPI/Swagger.

## Database

- PostgreSQL.
- Flyway.

## Infrastructure

- Redis.
- WebSocket.
- Docker.
- Nginx.

## Integration

- Payment Gateway Sandbox.
- QR Code.
- Email Service.

---

# 10. Kiến trúc tổng quát dự kiến

```text
Client
  │
  ▼
Next.js Frontend
  │
  │ REST / WebSocket
  ▼
Spring Boot Backend
  │
  ├── PostgreSQL
  │
  ├── Redis
  │
  ├── Payment Gateway
  │
  └── Email Service
```

Hệ thống ban đầu được triển khai dưới dạng modular monolith. Các module nghiệp vụ được phân tách rõ trong Backend nhưng vẫn thuộc cùng một ứng dụng Spring Boot.

---

# 11. Business Rules cốt lõi

Các quy tắc sau được xem là bắt buộc:

**BR-01:** Không cho phép hai khách hàng đặt thành công cùng một ghế của cùng một suất chiếu.

**BR-02:** Ghế chỉ được giữ trong một khoảng thời gian xác định.

**BR-03:** Ghế phải được giải phóng khi thời gian giữ hết hạn mà giao dịch chưa hoàn tất.

**BR-04:** Không được tạo ticket khi payment chưa được xác nhận thành công.

**BR-05:** Không tin trạng thái thanh toán do Frontend tự khai báo.

**BR-06:** Backend phải xác minh kết quả thanh toán.

**BR-07:** Một ticket không được check-in thành công nhiều hơn số lần được quy định.

**BR-08:** Ticket không hợp lệ hoặc đã bị hủy không được check-in.

**BR-09:** Không cho phép đặt vé cho suất chiếu đã bắt đầu.

**BR-10:** Không được tạo hai suất chiếu chồng thời gian trong cùng một phòng.

**BR-11:** Người dùng chỉ được thực hiện các thao tác phù hợp với quyền của mình.

**BR-12:** Manager chỉ được quản lý tài nguyên thuộc phạm vi được phân công.

---

# 12. Tiêu chí hoàn thành MVP

MVP được xem là hoàn thành khi có thể demo thành công toàn bộ scenario sau:

**Customer đăng ký/đăng nhập**

↓

**Customer tìm và chọn Movie**

↓

**Chọn Cinema**

↓

**Chọn Showtime**

↓

**Xem Seat Map**

↓

**Chọn Seat**

↓

**Backend giữ Seat**

↓

**Người dùng khác không thể chiếm Seat đang được giữ**

↓

**Customer tạo Booking**

↓

**Thanh toán qua Sandbox**

↓

**Backend xác minh Payment**

↓

**Booking chuyển sang PAID**

↓

**Ticket được tạo**

↓

**Customer nhận QR Code**

↓

**Staff scan QR**

↓

**Backend validate**

↓

**Check-in thành công**

↓

**Scan QR lần tiếp theo bị từ chối**

Ngoài ra phải có test chứng minh trường hợp hai người cố gắng đặt cùng một ghế thì chỉ một người thành công.

---

# 13. Thứ tự ưu tiên phát triển

Dự án áp dụng nguyên tắc:

**Correctness → Complete Business Flow → Advanced Features**

Thứ tự ưu tiên:

**P0 – Bắt buộc**

Authentication, Movie, Cinema, Room, Seat, Showtime, Booking, concurrency, Payment, Ticket, QR Check-in và RBAC.

**P1 – Quan trọng**

Redis Seat Hold, realtime seat update, Promotion và Dashboard.

**P2 – Nâng cao**

Email, Audit Log và Advanced Analytics.

**P3 – Nếu còn thời gian**

Recommendation, Dynamic Pricing, Review và các tính năng Smart khác.

---

# 14. Kết luận phạm vi

Smart Cinema Ecosystem được định hướng là một hệ thống Full-stack, trong đó Backend là trọng tâm kỹ thuật.

Giá trị chính của đồ án không nằm ở số lượng chức năng mà nằm ở việc xây dựng đúng và chứng minh được vòng đời của một giao dịch đặt vé trong điều kiện có nhiều người dùng đồng thời.

Các nội dung **booking concurrency, transaction, seat holding, Redis, realtime synchronization, payment verification và QR check-in** sẽ là những phần kỹ thuật nổi bật của đề tài.

Project Scope v1.0 là đường biên cho các bước phân tích và thiết kế tiếp theo. Mọi chức năng mới phát sinh cần được đánh giá theo mức ưu tiên trước khi đưa vào phạm vi chính thức.