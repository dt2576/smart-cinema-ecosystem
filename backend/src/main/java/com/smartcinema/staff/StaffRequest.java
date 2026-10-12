package com.smartcinema.staff;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.DeserializationFeature;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;

/** Strict local parser; does not alter historical controllers' JSON contracts. */
public final class StaffRequest {
    private static final JsonMapper JSON = JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private StaffRequest() { }
    @SuppressWarnings("unchecked")
    public static Map<String, Object> body(StaffSensitiveBody sensitive, String... keys) {
        try {
            String raw = sensitive == null ? null : sensitive.value();
            if (raw == null || raw.getBytes(StandardCharsets.UTF_8).length > 65536) throw new StaffFailure(400);
            Object value = JSON.readValue(raw, Object.class);
            if (!(value instanceof Map<?, ?> map) || !map.keySet().equals(Set.of(keys))) throw new StaffFailure(400);
            return (Map<String, Object>) map;
        } catch (StaffFailure failure) { throw failure; }
        catch (RuntimeException failure) { throw new StaffFailure(400); }
    }
    public static String text(Map<String, Object> body, String key) {
        if (!(body.get(key) instanceof String value) || value.isBlank()) throw new StaffFailure(400);
        return value;
    }
    public static long id(String value) {
        try {
            if (value == null || !value.matches("[1-9][0-9]{0,18}")) throw new NumberFormatException();
            return Long.parseLong(value);
        } catch (NumberFormatException failure) { throw new StaffFailure(400); }
    }
    public static long actor(Jwt principal) {
        try { return id(principal == null ? null : principal.getSubject()); }
        catch (StaffFailure failure) { throw new StaffFailure(403); }
    }
    public static Instant instant(String value) {
        try { return Instant.parse(value); } catch (RuntimeException failure) { throw new StaffFailure(400); }
    }
    public static String status(Map<String, Object> input, Set<String> allowed) {
        String status = text(input, "status"); if (!allowed.contains(status)) throw new StaffFailure(400); return status;
    }
    public static void noQuery(MultiValueMap<String, String> query) { if (!query.isEmpty()) throw new StaffFailure(400); }
    public static int[] page(MultiValueMap<String, String> query) {
        if (!Set.of("page", "size").containsAll(query.keySet())) throw new StaffFailure(400);
        int page = number(query, "page", 0), size = number(query, "size", 20);
        if (size < 1 || size > 100) throw new StaffFailure(400); return new int[] { page, size };
    }
    private static int number(MultiValueMap<String, String> query, String key, int fallback) {
        if (!query.containsKey(key)) return fallback;
        try {
            var values = query.get(key);
            if (values == null || values.size() != 1 || !values.getFirst().matches("0|[1-9][0-9]*")) throw new NumberFormatException();
            return Integer.parseInt(values.getFirst());
        } catch (RuntimeException failure) { throw new StaffFailure(400); }
    }
}
