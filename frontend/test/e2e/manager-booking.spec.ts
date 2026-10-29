import { expect, test } from "@playwright/test";
import { installManagerBookingFixtures } from "../fixtures/manager-booking-browser.mjs";

// Labeled HTTP fixtures. Real PRIMARY startup/anonymous reads are separate evidence.
test("Booking navigation, scoped GET list/detail and reload retain bigint IDs", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); await page.goto("/manager/bookings");
  await expect(page.getByRole("heading", { name: "Quản lý đặt vé", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quản lý đặt vé", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Xem chi tiết" }).first().click(); await expect(page).toHaveURL(/\/9007199254740993$/);
  await expect(page.getByRole("heading", { name: "Đơn đặt vé #BK-88421" })).toBeVisible();
  await page.reload(); await expect(page.getByRole("heading", { name: "Ghế đã đặt" })).toBeVisible();
  expect(state.requests.filter(r => r.path.includes("bookings")).every(r => r.method === "GET" && r.authorization === "Bearer fixture-manager-booking")).toBe(true);
  expect(state.writes).toEqual([]);
});
test("exact code and bigint ID search, empty results and reset send supported parameters", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); await page.goto("/manager/bookings");
  await page.getByLabel("Tìm mã đặt vé hoặc ID").fill("BK-88421"); await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/bookingCode=BK-88421/); await expect(page.getByText(/Hiển thị 1 trên 1 đơn/)).toBeVisible();
  await page.getByRole("button", { name: "Bộ lọc khác", exact: true }).click(); await page.getByLabel("Tìm theo", { exact: true }).selectOption("id");
  await page.getByLabel("Tìm mã đặt vé hoặc ID").fill("9007199254740993"); await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(page).toHaveURL(/bookingId=9007199254740993/);
  await page.getByLabel("Tìm mã đặt vé hoặc ID").fill("999"); await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(page.getByRole("heading", { name: "Không có đơn đặt vé" })).toBeVisible();
  await page.getByRole("link", { name: "Đặt lại bộ lọc" }).click(); await expect(page).toHaveURL(/\/manager\/bookings$/);
  await page.getByLabel("Tìm mã đặt vé hoặc ID").fill("Chưa gửi tìm kiếm"); await page.getByRole("link", {name:"Đặt lại bộ lọc"}).click(); await expect(page.getByLabel("Tìm mã đặt vé hoặc ID")).toHaveValue(""); expect(state.writes).toEqual([]);
});
test("status, Cinema, latest Payment, Showtime and Vietnam day filters are exact", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); await page.goto("/manager/bookings");
  await page.getByLabel("Trạng thái đặt vé", { exact: true }).selectOption("PAID"); await page.getByLabel("Thời gian tạo đơn").selectOption("custom");
  await page.getByLabel("Tạo từ ngày").fill("2026-04-14"); await page.getByLabel("Đến hết ngày").fill("2026-04-14");
  await page.getByRole("button", { name: "Bộ lọc khác", exact: true }).click(); await page.getByLabel("Rạp chiếu phim", { exact: true }).selectOption("11"); await page.getByLabel("Thanh toán gần nhất").selectOption("SUCCESS"); await page.getByLabel("ID suất chiếu").fill("41");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(page.getByText(/Hiển thị 3 trên 3 đơn/)).toBeVisible();
  const q = new URLSearchParams(state.requests.filter(r=>r.path==="/api/v1/manager/bookings").at(-1)!.query);
  expect(Object.fromEntries(q)).toMatchObject({status:"PAID",cinemaId:"11",paymentStatus:"SUCCESS",showtimeId:"41",createdFrom:"2026-04-13T17:00:00.000Z",createdTo:"2026-04-14T17:00:00.000Z"});
});
test("pagination, browser back and forward preserve filters without mutation", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); state.large = true; await page.goto("/manager/bookings?size=5");
  await expect(page.getByText(/Hiển thị 5 trên 25 đơn/)).toBeVisible(); await page.getByRole("button", { name: "Trang sau", exact: true }).click(); await expect(page).toHaveURL(/page=1/); await expect(page.getByText(/Trang 2 \/ 5/)).toBeVisible();
  await page.goBack(); await expect(page.getByText(/Trang 1 \/ 5/)).toBeVisible(); await page.goForward(); await expect(page.getByText(/Trang 2 \/ 5/)).toBeVisible(); expect(state.writes).toEqual([]);
});
test("unsupported and repeated URL filters reject before Booking GET", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); await page.goto("/manager/bookings?status=PAID&status=PENDING"); await expect(page.getByRole("heading", { name: "Bộ lọc chưa hợp lệ" })).toBeVisible();
  expect(state.requests.some(r=>r.path==="/api/v1/manager/bookings")).toBe(false);
  await page.goto("/manager/bookings/9223372036854775808"); await expect(page.getByRole("heading", { name: "Mã đặt vé chưa hợp lệ" })).toBeVisible(); expect(state.writes).toEqual([]);
});
test("SUCCESS with PENDING Booking and absent Tickets never promises issuance or QR", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); state.detail.booking.status = "PENDING"; state.detail.booking.storedStatus = "PENDING"; state.detail.booking.paidAt = null; state.detail.tickets = []; state.detail.booking.issuedTicketCount = 0;
  await page.goto(`/manager/bookings/${state.detail.booking.id}`); await expect(page.getByText("Chưa có vé được phát hành.")).toBeVisible(); await expect(page.getByText("Chờ thanh toán", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toHaveCount(0); await expect(page.locator("canvas, img[alt*=QR], svg[aria-label*=QR]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Hủy đơn|Hoàn tiền|Xác nhận thanh toán|Phát hành|Soát vé/ })).toHaveCount(0);
});
test("Concession snapshots, whole COUPLE and individual Ticket states use safe IDs only", async ({ page }) => {
  const state = await installManagerBookingFixtures(page); state.detail.seats[0].type = "COUPLE"; state.detail.seats[0].guestCount = 2; state.detail.booking.guestCount = 3; state.detail.tickets[1].status = "CHECKED_IN"; state.detail.tickets[1].checkedInAt = "2026-04-14T12:25:00Z";
  await page.goto(`/manager/bookings/${state.detail.booking.id}`); await expect(page.getByText("Ghế đôi", {exact:true})).toBeVisible(); await expect(page.getByText("2 ghế · 3 khách")).toBeVisible(); await expect(page.getByText("Đã soát vé",{exact:true})).toBeVisible(); await expect(page.getByText("Combo Mega Duo",{exact:true})).toBeVisible();
  await expect(page.getByText(/TIC-|customer@example|signature|IPN|QueryDR/)).toHaveCount(0);
});
for (const status of [401,403,404,409,429,503]) test(`safe ${status} read error requires explicit GET recheck`, async ({page})=>{
  const state=await installManagerBookingFixtures(page);state.failure=status;await page.goto(`/manager/bookings/${state.detail.booking.id}`);
  await expect(page.getByRole("heading",{name:"Chưa tải được đặt vé"})).toBeVisible();await expect(page.getByText(/private SQL|signature/)).toHaveCount(0);
  const before=state.requests.filter(r=>r.path.includes("/bookings/")).length;state.failure=0;
  await page.getByRole("button",{name:"Tải lại thông tin",exact:true}).click();await expect(page.getByRole("heading",{name:"Ghế đã đặt"})).toBeVisible();
  expect(state.requests.filter(r=>r.path.includes("/bookings/")).length).toBe(before+1);expect(state.writes).toEqual([]);
});
test("network and malformed/mismatched responses hide prior sensitive detail", async ({page})=>{
  const state=await installManagerBookingFixtures(page);await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByRole("heading",{name:"Ghế đã đặt"})).toBeVisible();
  state.detail.booking.id="999";await page.route("**/api/v1/manager/bookings/*",r=>r.fulfill({json:state.detail}));await page.getByRole("button",{name:"Tải lại thông tin",exact:true}).click();await expect(page.getByRole("heading",{name:"Chưa tải được đặt vé"})).toBeVisible();await expect(page.getByText("Combo Mega Duo",{exact:true})).toHaveCount(0);
  await page.route("**/api/v1/manager/bookings/*",r=>r.abort());await page.getByRole("button",{name:"Tải lại thông tin",exact:true}).click();await expect(page.getByRole("heading",{name:"Chưa tải được đặt vé"})).toBeVisible();expect(state.writes).toEqual([]);
});
test("delayed search responses cannot overwrite newer result", async ({page})=>{
  const state=await installManagerBookingFixtures(page);state.delay=400;await page.goto("/manager/bookings");await expect(page.getByText("Đang tải thông tin đặt vé…")).toBeVisible();
  await page.getByLabel("Tìm mã đặt vé hoặc ID").fill("BK-88421");await page.getByRole("button",{name:"Tìm kiếm",exact:true}).click();await expect(page.getByText(/Hiển thị 1 trên 1 đơn/)).toBeVisible();
});
for(const role of ["ADMIN","CUSTOMER","STAFF"])test(`${role} cannot enter with forged Manager hint`,async({page})=>{
  await installManagerBookingFixtures(page,role);await page.goto("/manager/bookings");await expect(page.getByRole("heading",{name:"Chưa tải được thông tin"})).toBeVisible();await expect(page.getByRole("heading",{name:"Quản lý đặt vé",exact:true})).toHaveCount(0);
});
test("revoked scope on detail navigation removes workspace",async({page})=>{
  const state=await installManagerBookingFixtures(page);await page.goto("/manager/bookings");await expect(page.getByRole("link",{name:"Xem chi tiết"}).first()).toBeVisible();state.denied=true;await page.getByRole("link",{name:"Xem chi tiết"}).first().click();await expect(page.getByRole("heading",{name:"Chưa tải được thông tin"})).toBeVisible();
});
test("anonymous direct entry offers canonical login resume",async({page})=>{
  await page.goto("/manager/bookings/9007199254740993");await expect(page.getByRole("link",{name:"Đăng nhập",exact:true})).toHaveAttribute("href","/login?returnTo=%2Fmanager%2Fbookings%2F9007199254740993");
});
test("login form resumes canonical Booking detail using a labeled auth fixture",async({page})=>{
  const state=await installManagerBookingFixtures(page);
  await page.route("**/api/v1/auth/tokens",r=>r.fulfill({status:200,json:{accessToken:"fixture-manager-booking",tokenType:"Bearer",expiresIn:3600,refreshToken:"fixture-only",refreshExpiresIn:86400,userId:61,email:"manager@example.test",fullName:"Quản lý QA",role:"MANAGER"}}));
  await page.goto(`/login?returnTo=${encodeURIComponent(`/manager/bookings/${state.detail.booking.id}`)}`);
  await page.getByLabel("Địa chỉ email",{exact:true}).fill("manager@example.test");await page.getByLabel("Mật khẩu",{exact:true}).fill("fixture-only-password");await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/manager/bookings/${state.detail.booking.id}$`));await expect(page.getByRole("heading",{name:"Ghế đã đặt"})).toBeVisible();expect(state.writes).toEqual([]);
});
test("replacement attempts and reconciliation remain separate from Booking state",async({page})=>{
  const state=await installManagerBookingFixtures(page),latest=state.detail.payments[0];
  latest.status="PENDING";latest.completedAt=null;latest.reconciliationRequired=true;state.detail.booking.latestPayment={...latest};state.detail.booking.status="EXPIRED";state.detail.booking.storedStatus="PENDING";
  state.detail.payments.push({...latest,id:"99",status:"FAILED",reconciliationRequired:false,initiatedAt:"2026-04-14T11:42:01Z",completedAt:"2026-04-14T11:42:02Z"});
  await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByText("Đã hết hạn",{exact:true}).first()).toBeVisible();await expect(page.getByText("Cần kiểm tra thanh toán",{exact:true})).toBeVisible();
  await page.getByText("Chi tiết số tiền và thanh toán",{exact:true}).click();await expect(page.getByText("Đang xử lý",{exact:true})).toBeVisible();await expect(page.getByText("Không thành công",{exact:true})).toBeVisible();expect(state.writes).toEqual([]);
});
test("unavailable attempt and Ticket data stay absent",async({page})=>{
  const state=await installManagerBookingFixtures(page);state.detail.payments=[];state.detail.booking.latestPayment=null;state.detail.tickets=[];state.detail.booking.issuedTicketCount=0;
  await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByText("Chưa có lần thanh toán.")).toBeVisible();await expect(page.getByText("Chưa có vé được phát hành.")).toBeVisible();expect(state.writes).toEqual([]);
});
test("malformed JSON and DTO render safe errors without private content",async({page})=>{
  const state=await installManagerBookingFixtures(page);state.malformed=true;await page.goto("/manager/bookings");await expect(page.getByRole("heading",{name:"Chưa tải được đặt vé"})).toBeVisible();await expect(page.getByText("must not render")).toHaveCount(0);
  await page.route("**/api/v1/manager/bookings/*",r=>r.fulfill({body:"{broken-private",contentType:"application/json"}));await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByRole("heading",{name:"Chưa tải được đặt vé"})).toBeVisible();await expect(page.getByText("broken-private")).toHaveCount(0);
});
test("independent tabs read current backend fixtures and never share local financial authority",async({page,context})=>{
  const first=await installManagerBookingFixtures(page);await page.goto(`/manager/bookings/${first.detail.booking.id}`);await expect(page.getByRole("heading",{name:"Ghế đã đặt"})).toBeVisible();
  const other=await context.newPage(),second=await installManagerBookingFixtures(other);second.detail.booking.status="CANCELLED";second.detail.booking.storedStatus="CANCELLED";
  await other.goto(`/manager/bookings/${second.detail.booking.id}`);await expect(other.getByText("Đã hủy",{exact:true}).first()).toBeVisible();await expect(page.getByText("Đã thanh toán",{exact:true}).first()).toBeVisible();expect(first.writes.concat(second.writes)).toEqual([]);await other.close();
});
test("long Vietnamese content and exact fractional amounts do not overflow mobile",async({page})=>{
  const state=await installManagerBookingFixtures(page);state.detail.booking.movieTitle="Bộ phim điện ảnh tiếng Việt có tựa đề rất dài để kiểm tra khả năng hiển thị";state.detail.booking.finalAmount="999999999999999.1234";state.detail.amounts.finalAmount=state.detail.booking.finalAmount;
  await page.setViewportSize({width:390,height:844});await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByText("999.999.999.999.999,1234 đ",{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const width of [390,768,1280,1440])test(`responsive ${width}, real fonts and keyboard navigation`,async({page})=>{
  const state=await installManagerBookingFixtures(page);await page.setViewportSize({width,height:1024});await page.goto("/manager/bookings");await expect(page.getByRole("heading",{name:"Quản lý đặt vé",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel("Tìm mã đặt vé hoặc ID").focus();await expect(page.getByLabel("Tìm mã đặt vé hoặc ID")).toBeFocused();expect(await page.getByLabel("Tìm mã đặt vé hoặc ID").evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe("none");
  if(width<1024){await page.getByRole("button",{name:"Mở điều hướng quản lý rạp"}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Mở điều hướng quản lý rạp"})).toBeFocused();}
  await page.goto(`/manager/bookings/${state.detail.booking.id}`);await expect(page.getByRole("heading",{name:"Ghế đã đặt"})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>document.fonts.ready);expect(await page.getByRole("heading",{name:"Ghế đã đặt"}).evaluate(e=>getComputedStyle(e).fontFamily)).toContain("Space Grotesk");
});
