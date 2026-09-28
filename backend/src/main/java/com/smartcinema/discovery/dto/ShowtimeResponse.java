package com.smartcinema.discovery.dto;

import java.time.Instant;

public record ShowtimeResponse(String id, String movieId, String cinemaId, HallSummary hall,
        Instant startsAt, Instant endsAt, Instant bookingCutOff) { }
