package com.smartcinema.seat.dto;

import java.time.Instant;
import java.util.List;

public record SeatHoldBatch(Instant serverTime, List<SeatHoldResponse> holds) { }
