package com.smartcinema.seat.dto;

import java.time.Instant;
import java.util.List;

public record SeatMapResponse(String showtimeId, String movieId, String cinemaId, String hallId,
        Instant serverTime, List<SeatUnitResponse> units) { }
