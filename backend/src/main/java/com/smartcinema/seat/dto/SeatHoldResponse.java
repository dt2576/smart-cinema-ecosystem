package com.smartcinema.seat.dto;

import java.time.Instant;

public record SeatHoldResponse(String id, String showtimeId, String seatId,
        Instant createdAt, Instant expiresAt, String status) { }
