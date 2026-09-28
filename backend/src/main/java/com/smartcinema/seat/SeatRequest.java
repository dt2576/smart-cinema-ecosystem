package com.smartcinema.seat;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.util.MultiValueMap;

public final class SeatRequest {
    private SeatRequest() { }
    public static long id(String field, String value) {
        try {
            if (value == null || !value.matches("[0-9]{1,19}")) { throw new NumberFormatException(); }
            long parsed = Long.parseLong(value);
            if (parsed <= 0) { throw new NumberFormatException(); }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new SeatRequestException(field, "A positive bigint string ID is required.");
        }
    }

    public static void noQuery(MultiValueMap<String, String> parameters) {
        if (!parameters.isEmpty()) { throw new SeatRequestException(parameters.keySet().iterator().next(), "Query parameters are not supported."); }
    }

    public static List<Long> seats(Map<String, ?> body) {
        if (body == null || body.size() != 1 || !body.containsKey("seatIds")
                || !(body.get("seatIds") instanceof List<?> values) || values.isEmpty()) {
            throw new SeatRequestException("seatIds", "Supply only a nonempty seatIds array of string IDs.");
        }
        List<Long> ids = values.stream().map(value -> {
            if (!(value instanceof String text)) { throw new SeatRequestException("seatIds", "Seat IDs must be JSON strings."); }
            return id("seatIds", text);
        }).toList();
        if (new HashSet<>(ids).size() != ids.size()) { throw new SeatRequestException("seatIds", "Duplicate Seat IDs are not allowed."); }
        return ids.stream().sorted().toList();
    }
}
