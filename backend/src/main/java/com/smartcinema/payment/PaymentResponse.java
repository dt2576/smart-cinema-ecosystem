package com.smartcinema.payment;

import java.time.Instant;

public record PaymentResponse(String id, String bookingId, String internalReference, String status,
        String amount, String currency, String provider, Instant initiatedAt, Instant expiresAt) { }
