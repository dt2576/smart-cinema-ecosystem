// HTTP/unit fixtures only. No production route imports this module. This is not
// proof of live VNPAY settlement, issuance, QR resolution or Staff admission.
import type { Booking } from "@/features/booking/booking.types";
import type { BookingHistoryItem, BookingHistoryResponse, BookingTicketsResponse } from "@/features/booking/booking-read.types";

export const ENTITLEMENT_ID = "9007199254741101";
export const QR_FIXTURE = "  vé-đặt:á-🎬-fixture  ";
export function bookingFixture(status: Booking["status"] = "PAID"): Booking {
  return { id: ENTITLEMENT_ID, bookingCode: "SC-FIXTURE-1101", status,
    movieId: "9223372036854775807", movieTitle: "Dune: Phần Hai", cinemaId: "9007199254740993", cinemaName: "Smart Cinema Landmark", hallId: "9007199254740994", hallName: "Phòng chiếu 1", showtimeId: "9007199254740995",
    startsAt: "2030-01-01T03:00:00Z", createdAt: "2029-12-31T23:59:00Z", expiresAt: "2030-01-01T00:10:00Z", serverTime: "2030-01-01T02:00:00Z", paymentStartedAt: "2030-01-01T00:00:00Z",
    seatUnitCount: 3, guestCount: 4, seatAmount: "270004.2963", concessionAmount: "30000.0000", subtotal: "300004.2963", discount: "10000.0000", finalAmount: "290004.2963",
    seats: (["STANDARD", "VIP", "COUPLE"] as const).map((type, i) => ({ id: `${BigInt("9007199254741") + BigInt(i)}00`, seatId: `${BigInt("9007199254742") + BigInt(i)}00`, holdId: `${BigInt("9007199254743") + BigInt(i)}00`, row: "H", number: ["7", "8", "9-10"][i], type, guestCount: type === "COUPLE" ? 2 : 1, unitPrice: "90001.4321", finalPrice: "90001.4321" })),
    concessions: [{ id: "11", itemId: "12", name: "Bắp rang", category: "POPCORN", quantity: 1, unitPrice: "30000.0000", totalPrice: "30000.0000" }],
    promotion: { id: "13", code: "FIXTURE10", type: "FIXED_AMOUNT", value: "10000.0000", minimumOrderAmount: "0.0000", maxDiscountAmount: null } };
}
export function ticketsFixture(b: Booking): BookingTicketsResponse {
  return { bookingId: b.id, bookingStatus: b.status, serverTime: b.serverTime, bookingQr: b.status === "PAID" ? QR_FIXTURE : null,
    tickets: b.status === "PAID" ? b.seats.map((s, i) => ({ id: `${BigInt("9007199254744") + BigInt(i)}00`, bookingSeatId: s.id, seatId: s.seatId, ticketCode: `TICKET-FIXTURE-${i}`, status: i < 2 ? "CHECKED_IN" : "VALID", seatType: s.type, guestCount: s.guestCount })) : [] };
}
export function historyFixture(b: Booking): BookingHistoryResponse {
  const item: BookingHistoryItem = { id: b.id, bookingCode: b.bookingCode, status: b.status, movieId: b.movieId, movieTitle: b.movieTitle, cinemaId: b.cinemaId, cinemaName: b.cinemaName, hallId: b.hallId, hallName: b.hallName, showtimeId: b.showtimeId, startsAt: b.startsAt, createdAt: b.createdAt, expiresAt: b.expiresAt, paymentStartedAt: b.paymentStartedAt, seatUnitCount: b.seatUnitCount, guestCount: b.guestCount, finalAmount: b.finalAmount };
  return { items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1, serverTime: b.serverTime };
}
