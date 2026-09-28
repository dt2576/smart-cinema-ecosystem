package com.smartcinema.discovery.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ShowtimeSchedule(String timeZone, Instant serverTime, LocalDate date,
        List<LocalDate> dates, List<ShowtimeResponse> items) { }
