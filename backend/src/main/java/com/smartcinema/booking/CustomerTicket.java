package com.smartcinema.booking;

public record CustomerTicket(String id, String bookingSeatId, String seatId, String ticketCode,
        String status, String seatType, int guestCount) {
    @Override public String toString() { return "CustomerTicket[redacted]"; }
}
