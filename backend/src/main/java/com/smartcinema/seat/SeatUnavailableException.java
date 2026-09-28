package com.smartcinema.seat;

public class SeatUnavailableException extends RuntimeException {
    public SeatUnavailableException() { super("Showtime is unavailable."); }
}
