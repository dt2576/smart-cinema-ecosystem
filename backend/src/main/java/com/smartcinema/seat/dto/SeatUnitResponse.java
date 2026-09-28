package com.smartcinema.seat.dto;

public record SeatUnitResponse(String id, String row, String number, String type,
        int guestCount, String availability) { }
