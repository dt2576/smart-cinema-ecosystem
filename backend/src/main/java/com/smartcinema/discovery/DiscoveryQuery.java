package com.smartcinema.discovery;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Set;
import org.springframework.util.MultiValueMap;

public final class DiscoveryQuery {
    private DiscoveryQuery() { }

    public static void validate(MultiValueMap<String, String> parameters, String... allowed) {
        Set<String> names = Set.of(allowed);
        parameters.forEach((key, values) -> {
            if (!names.contains(key)) { throw new DiscoveryRequestException(key, "Unsupported parameter."); }
            if (values.size() != 1) { throw new DiscoveryRequestException(key, "Parameter must occur once."); }
        });
    }

    public static long id(String name, String value) {
        try {
            if (value == null || !value.matches("[0-9]{1,19}")) { throw new NumberFormatException(); }
            long id = Long.parseLong(value);
            if (id <= 0) { throw new NumberFormatException(); }
            return id;
        } catch (NumberFormatException exception) {
            throw new DiscoveryRequestException(name, "A positive bigint ID is required.");
        }
    }

    public static LocalDate date(String value) {
        if (value == null) { return null; }
        try {
            if (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) { throw new DateTimeParseException("date", value, 0); }
            LocalDate date = LocalDate.parse(value);
            if (date.getYear() < 1) { throw new DateTimeParseException("date", value, 0); }
            return date;
        } catch (DateTimeParseException exception) {
            throw new DiscoveryRequestException("date", "Use a valid date in YYYY-MM-DD format, years 0001 through 9999.");
        }
    }
}
