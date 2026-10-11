package com.smartcinema.booking;

import java.time.Instant;
import java.util.List;

public record BookingTicketsResponse(String bookingId, String bookingStatus, Instant serverTime,
        String bookingQr, List<CustomerTicket> tickets) {
    @Override public String toString() { return "BookingTicketsResponse[redacted]"; }
}
