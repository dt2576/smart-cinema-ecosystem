package com.smartcinema.staff;

import java.time.Instant;
import java.util.List;
import com.smartcinema.booking.BookingResponse;

public final class StaffPosResponse {
    private StaffPosResponse() { }
    public record Movies(Instant serverTime,List<com.smartcinema.discovery.DiscoveryRepository.SaleMovie> items) { }
    public record Payment(String id,String status,String amount,String currency,String method,Instant initiatedAt,
            Instant completedAt,boolean reconciliationRequired) { }
    public record Receipt(BookingResponse booking,List<Payment> payments,List<StaffBookingResponse.Ticket> tickets,String bookingQr) {
        @Override public String toString() { return "StaffCounterReceipt[redacted]"; }
    }
}
