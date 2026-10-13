import type { StaffAssignments, StaffBooking, StaffCheckIn } from "../../src/features/staff/staff.types";

// HTTP/backend-state fixtures only. No real settlement, staff admission or customer QR.
export const STAFF_QR_FIXTURE = "  Vé e\u0301 É 😀 /?+%  ";
export function staffAssignmentsFixture(multiple = false): StaffAssignments {
  return { serverTime: "2026-10-13T12:00:05Z", assignments: [{ id: "1", cinemaId: "71", cinemaName: "Smart Cinema Landmark", effectiveAt: "2026-10-12T00:00:00Z" }, ...(multiple ? [{ id: "2", cinemaId: "72", cinemaName: "Smart Cinema Thủ Đức", effectiveAt: "2026-10-12T00:00:00Z" }] : [])] };
}
export function staffBookingFixture(cinema = "71"): StaffBooking {
  return { bookingId: "9007199254740993", bookingCode: "SC-STAFF-FIXTURE", bookingStatus: "PAID", movieId: "11", movieTitle: "Hành trình điện ảnh Việt Nam", cinemaId: cinema, cinemaName: cinema === "71" ? "Smart Cinema Landmark" : "Smart Cinema Thủ Đức", hallId: "51", hallName: "Phòng 1", showtimeId: "91", startsAt: "2026-10-13T12:00:00Z", endsAt: "2026-10-13T14:00:00Z", showtimeStatus: "OPEN_FOR_BOOKING", serverTime: "2026-10-13T12:00:05Z", admissionAllowed: true, admissionReason: null,
    tickets: [
      { id: "9007199254741001", bookingSeatId: "201", seatId: "301", ticketCode: "T-FIXTURE-1", row: "A", number: "1", seatType: "STANDARD", guestCount: 1, status: "VALID", checkedInAt: null, canCheckIn: true },
      { id: "9007199254741002", bookingSeatId: "202", seatId: "302", ticketCode: "T-FIXTURE-2", row: "A", number: "2", seatType: "VIP", guestCount: 1, status: "CHECKED_IN", checkedInAt: "2026-10-13T12:00:04Z", canCheckIn: false },
      { id: "9007199254741003", bookingSeatId: "203", seatId: "303", ticketCode: "T-FIXTURE-3", row: "H", number: "9-10", seatType: "COUPLE", guestCount: 2, status: "VALID", checkedInAt: null, canCheckIn: true },
    ], concessions: [{ name: "Combo bắp và hai ly nước", category: "COMBO", quantity: 1 }] };
}
export function staffCheckInFixture(previous: StaffBooking, ids: string[]): StaffCheckIn {
  const booking = structuredClone(previous); booking.serverTime = new Date(Date.parse(previous.serverTime) + 1000).toISOString();
  for (const t of booking.tickets) if (ids.includes(t.id)) { t.status = "CHECKED_IN"; t.canCheckIn = false; t.checkedInAt = booking.serverTime; }
  return { checkedInTicketIds: [...ids], booking };
}
