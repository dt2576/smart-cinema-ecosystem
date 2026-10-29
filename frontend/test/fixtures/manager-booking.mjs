// Synthetic HTTP fixtures. Not accounts, bookings, financial success or issuance on Neon.
/** @type {import('../../src/features/manager/manager-booking.types').ManagerBookingDetail} */
export const managerBookingFixture = {
  booking: {
    id: "9007199254740993", bookingCode: "BK-88421", status: "PAID", storedStatus: "PAID",
    cinemaId: "11", cinemaName: "Smart Cinema Landmark 81", hallId: "21", hallName: "Phòng 01",
    movieId: "51", movieTitle: "Dune: Part Two", showtimeId: "41", startsAt: "2026-04-14T12:30:00Z",
    createdAt: "2026-04-14T11:42:00.123456Z", expiresAt: "2026-04-14T11:52:00.123456Z", paymentStartedAt: "2026-04-14T11:42:30Z", paidAt: "2026-04-14T11:43:02Z",
    seatUnitCount: 2, guestCount: 2, issuedTicketCount: 2, finalAmount: "380000.0000",
    latestPayment: { id: "9223372036854775807", status: "SUCCESS", amount: "380000.0000", currency: "VND", provider: "VNPAY", initiatedAt: "2026-04-14T11:42:30Z", completedAt: "2026-04-14T11:43:02Z", reconciliationRequired: false },
  },
  amounts: { seatAmount: "280000.0000", concessionAmount: "100000.0000", subtotal: "380000.0000", discount: "0.0000", finalAmount: "380000.0000" },
  seats: [
    { id: "71", seatId: "31", row: "F", number: "08", type: "VIP", guestCount: 1, unitPrice: "140000.0000", finalPrice: "140000.0000" },
    { id: "72", seatId: "32", row: "F", number: "09", type: "VIP", guestCount: 1, unitPrice: "140000.0000", finalPrice: "140000.0000" },
  ],
  concessions: [{ id: "81", itemId: "91", name: "Combo Mega Duo", category: "COMBO", quantity: 1, unitPrice: "100000.0000", totalPrice: "100000.0000" }],
  payments: [{ id: "9223372036854775807", status: "SUCCESS", amount: "380000.0000", currency: "VND", provider: "VNPAY", initiatedAt: "2026-04-14T11:42:30Z", completedAt: "2026-04-14T11:43:02Z", reconciliationRequired: false }],
  tickets: [
    { id: "101", bookingSeatId: "71", seatId: "31", status: "VALID", issuedAt: "2026-04-14T11:43:02Z", checkedInAt: null },
    { id: "102", bookingSeatId: "72", seatId: "32", status: "VALID", issuedAt: "2026-04-14T11:43:02Z", checkedInAt: null },
  ],
  serverTime: "2026-10-29T03:00:00Z",
};
/** @returns {import('../../src/features/manager/manager-booking.types').ManagerBookingPage} */
export function managerBookingPageFixture() {
  return { items: [structuredClone(managerBookingFixture.booking)], page: 0, size: 20, totalElements: 1, totalPages: 1, serverTime: managerBookingFixture.serverTime };
}
