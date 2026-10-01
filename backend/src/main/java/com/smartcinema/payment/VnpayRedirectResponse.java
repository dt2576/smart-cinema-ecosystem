package com.smartcinema.payment;

import java.time.Instant;

public record VnpayRedirectResponse(String paymentId,String bookingId,String status,String provider,String environment,
        String currency,String amount,Instant expiresAt,String redirectUrl) {
    @Override public String toString() { return "VnpayRedirectResponse[redacted]"; }
}
