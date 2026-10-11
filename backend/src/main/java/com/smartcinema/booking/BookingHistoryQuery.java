package com.smartcinema.booking;

import java.util.Set;
import org.springframework.util.MultiValueMap;
import com.smartcinema.seat.SeatRequestException;

public record BookingHistoryQuery(int page, int size) {
    public static BookingHistoryQuery parse(MultiValueMap<String, String> query) {
        query.forEach((key, values) -> {
            if (!Set.of("page", "size").contains(key)) {
                throw new SeatRequestException("query", "Unsupported query parameter.");
            }
            if (values.size() != 1) { throw new SeatRequestException(key, "Parameter must occur once."); }
        });
        return new BookingHistoryQuery(number(query, "page", 0, 0, Integer.MAX_VALUE),
                number(query, "size", 20, 1, 100));
    }

    private static int number(MultiValueMap<String, String> query, String key, int fallback, int min, int max) {
        if (!query.containsKey(key)) { return fallback; }
        try {
            String value = query.getFirst(key);
            if (value == null || !value.matches("[0-9]+")) { throw new NumberFormatException(); }
            long parsed = Long.parseLong(value);
            if (parsed < min || parsed > max) { throw new NumberFormatException(); }
            return (int) parsed;
        } catch (NumberFormatException exception) {
            throw new SeatRequestException(key, "Invalid pagination value.");
        }
    }

    public long offset() { return (long) page * size; }
}
