package com.smartcinema.payment;

import java.math.BigDecimal;
import java.time.Instant;

/** Internal binding. Deliberately no generated toString: redirects and IPs are sensitive. */
public record VnpaySubmission(String paymentId, String bookingId, String status, BigDecimal amount,
        String merchant, String reference, String wireAmount, Instant createdAt, Instant expiresAt,
        String returnUrl, String clientIp, boolean reconciliationRequired) {
    @Override public String toString() { return "VnpaySubmission[redacted]"; }
}
