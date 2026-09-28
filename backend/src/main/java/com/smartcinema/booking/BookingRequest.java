package com.smartcinema.booking;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

public record BookingRequest(long showtimeId, List<Long> holdIds) {
    public static BookingRequest parse(Map<String, ?> body) {
        if (body == null || body.size() != 2 || !(body.get("showtimeId") instanceof String showtime)
                || !(body.get("holdIds") instanceof List<?> values) || values.isEmpty()) {
            throw new SeatRequestException("holdIds", "Supply only showtimeId and a nonempty holdIds array of string IDs.");
        }
        var ids = values.stream().map(value -> {
            if (!(value instanceof String text)) { throw new SeatRequestException("holdIds", "Hold IDs must be JSON strings."); }
            return SeatRequest.id("holdIds", text);
        }).sorted().toList();
        if (new HashSet<>(ids).size() != ids.size()) { throw new SeatRequestException("holdIds", "Duplicate Hold IDs are not allowed."); }
        return new BookingRequest(SeatRequest.id("showtimeId", showtime), ids);
    }
}
