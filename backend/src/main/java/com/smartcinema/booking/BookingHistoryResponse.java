package com.smartcinema.booking;

import java.time.Instant;
import java.util.List;

public record BookingHistoryResponse(List<BookingHistoryItem> items, int page, int size,
        long totalElements, long totalPages, Instant serverTime) {
    @Override public String toString() { return "BookingHistoryResponse[redacted]"; }
}
