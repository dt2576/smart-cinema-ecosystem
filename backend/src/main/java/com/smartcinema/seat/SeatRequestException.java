package com.smartcinema.seat;

public class SeatRequestException extends RuntimeException {
    private final String field;
    public SeatRequestException(String field, String message) { super(message); this.field = field; }
    public String getField() { return field; }
}
