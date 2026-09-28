package com.smartcinema.seat;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record SeatHoldSettings(Duration ttl, Duration lockTimeout, Duration statementTimeout, Duration idleTimeout) {
    public SeatHoldSettings(
            @Value("${seat-hold.ttl:PT10M}") Duration ttl,
            @Value("${seat-hold.lock-timeout:PT2S}") Duration lockTimeout,
            @Value("${seat-hold.statement-timeout:PT5S}") Duration statementTimeout,
            @Value("${seat-hold.idle-timeout:PT10S}") Duration idleTimeout) {
        for (Duration duration : new Duration[] {ttl, lockTimeout, statementTimeout, idleTimeout}) {
            if (duration == null || duration.isNegative() || duration.toMillis() < 1) {
                throw new IllegalArgumentException("Seat Hold durations must be positive and at least one millisecond.");
            }
        }
        for (Duration timeout : new Duration[] {lockTimeout, statementTimeout, idleTimeout}) {
            if (timeout.toMillis() > Integer.MAX_VALUE) { throw new IllegalArgumentException("Seat Hold timeout exceeds PostgreSQL milliseconds range."); }
        }
        if (lockTimeout.compareTo(statementTimeout) > 0) { throw new IllegalArgumentException("Lock timeout must not exceed statement timeout."); }
        this.ttl = ttl;
        this.lockTimeout = lockTimeout;
        this.statementTimeout = statementTimeout;
        this.idleTimeout = idleTimeout;
    }
}
