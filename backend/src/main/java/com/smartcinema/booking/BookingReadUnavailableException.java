package com.smartcinema.booking;

public class BookingReadUnavailableException extends RuntimeException {
    public BookingReadUnavailableException() { super("Booking data is temporarily unavailable."); }
}
