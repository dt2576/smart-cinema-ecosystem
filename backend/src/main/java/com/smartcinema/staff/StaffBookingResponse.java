package com.smartcinema.staff;

import java.time.Instant;
import java.util.List;

/** Operational allowlist: no Customer, financial, raw QR or operator data. */
public record StaffBookingResponse(String bookingId,String bookingCode,String bookingStatus,
        String movieId,String movieTitle,String cinemaId,String cinemaName,String hallId,String hallName,String showtimeId,
        Instant startsAt,Instant endsAt,String showtimeStatus,Instant serverTime,boolean admissionAllowed,String admissionReason,
        List<Ticket> tickets,List<Concession> concessions) {
    @Override public String toString() { return "StaffBookingResponse[redacted]"; }
    public record Ticket(String id,String bookingSeatId,String seatId,String ticketCode,String row,String number,
            String seatType,int guestCount,String status,Instant checkedInAt,boolean canCheckIn) { }
    public record Concession(String name,String category,int quantity) { }
}
