package com.smartcinema.booking;

import java.time.Instant;
import java.util.List;

public record BookingResponse(String id, String bookingCode, String status, String showtimeId,
        String movieId, String movieTitle, String cinemaId, String cinemaName, String hallId, String hallName,
        Instant startsAt, Instant createdAt, Instant expiresAt, Instant serverTime,
        int seatUnitCount, int guestCount, String seatAmount, String concessionAmount,
        String subtotal, String discount, String finalAmount, List<SeatLine> seats, List<ConcessionLine> concessions,
        PromotionSnapshot promotion, Instant paymentStartedAt) {
    public record PromotionSnapshot(String id, String code, String type, String value,
            String minimumOrderAmount, String maxDiscountAmount) { }
    public record SeatLine(String id, String seatId, String holdId, String row, String number,
            String type, int guestCount, String unitPrice, String finalPrice) { }
    public record ConcessionLine(String id, String itemId, String name, String category,
            int quantity, String unitPrice, String totalPrice) { }
}
