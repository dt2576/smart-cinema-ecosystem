package com.smartcinema.booking;

import java.time.Instant;
import java.util.List;

public record BookingResponse(String id, String bookingCode, String status, String showtimeId,
        String movieId, String movieTitle, String cinemaId, String cinemaName, String hallId, String hallName,
        Instant startsAt, Instant createdAt, Instant expiresAt, Instant serverTime,
        int seatUnitCount, int guestCount, String seatAmount, String concessionAmount,
        String subtotal, String discount, String finalAmount, List<SeatLine> seats) {
    public record SeatLine(String id, String seatId, String holdId, String row, String number,
            String type, int guestCount, String unitPrice, String finalPrice) { }
}
