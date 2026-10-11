package com.smartcinema.booking;

import java.time.Instant;

public record BookingHistoryItem(String id, String bookingCode, String status,
        String movieId, String movieTitle, String cinemaId, String cinemaName, String hallId, String hallName,
        String showtimeId, Instant startsAt, Instant createdAt, Instant expiresAt, Instant paymentStartedAt,
        int seatUnitCount, int guestCount, String finalAmount) { }
