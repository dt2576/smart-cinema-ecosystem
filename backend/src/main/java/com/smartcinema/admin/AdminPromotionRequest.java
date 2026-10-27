package com.smartcinema.admin;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

public final class AdminPromotionRequest {
    static final int MAX_BODY_BYTES = 1048576;
    private static final JsonMapper JSON = JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private AdminPromotionRequest() { }
    public record Input(String code, String discountType, BigDecimal discountValue, Instant validFrom,
        Instant validUntil, BigDecimal minimumOrderAmount, Integer usageLimit, BigDecimal maxDiscountAmount, String status) {
        @Override public String toString() { return "AdminPromotionInput[redacted]"; }
    }
    public static Input create(AdminPromotionBody raw) {
        var b = body(raw, "code", "discountType", "discountValue", "validFrom", "validUntil", "minimumOrderAmount", "usageLimit", "maxDiscountAmount", "status");
        return content(b, code(b), status(b));
    }
    public static Input update(AdminPromotionBody raw) {
        return content(body(raw, "discountType", "discountValue", "validFrom", "validUntil", "minimumOrderAmount", "usageLimit", "maxDiscountAmount"), null, null);
    }
    public static String status(AdminPromotionBody raw) { return status(body(raw, "status")); }
    private static Input content(Map<String,Object> b, String code, String status) {
        if (!(b.get("discountType") instanceof String type) || !Set.of("FIXED_AMOUNT", "PERCENTAGE").contains(type)) throw invalid("discountType");
        var value = amount(b, "discountValue", false);
        var minimum = amount(b, "minimumOrderAmount", false);
        var cap = amount(b, "maxDiscountAmount", true);
        if (type.equals("PERCENTAGE") && value.compareTo(new BigDecimal("100")) > 0) throw invalid("discountValue");
        if (type.equals("FIXED_AMOUNT") && cap != null) throw invalid("maxDiscountAmount");
        Instant from = instant(b, "validFrom"), until = instant(b, "validUntil");
        if (!until.isAfter(from)) throw invalid("validUntil");
        Object limit = b.get("usageLimit");
        if (limit != null && (!(limit instanceof Integer n) || n <= 0)) throw invalid("usageLimit");
        return new Input(code, type, value, from, until, minimum, (Integer)limit, cap, status);
    }
    private static BigDecimal amount(Map<String,Object> b, String key, boolean nullable) {
        Object v = b.get(key);
        if (v == null && nullable) return null;
        if (!(v instanceof String s) || !s.matches("(0|[1-9][0-9]{0,14})(\\.[0-9]{1,4})?")) throw invalid(key);
        return new BigDecimal(s);
    }
    private static Instant instant(Map<String,Object> b, String key) {
        try {
            if (!(b.get(key) instanceof String s)) throw invalid(key);
            var time = OffsetDateTime.parse(s);
            // ISO four-digit years and PostgreSQL timestamp(6) precision; never silently round a deadline.
            if (time.getYear() < 1 || time.getYear() > 9999 || time.getNano() % 1000 != 0) throw invalid(key);
            return time.toInstant();
        } catch (DateTimeParseException failure) { throw invalid(key); }
    }
    private static String code(Map<String,Object> b) {
        if (!(b.get("code") instanceof String s)) throw invalid("code");
        String code = s.strip().toUpperCase(Locale.ROOT);
        if (code.isBlank() || code.length() > 50) throw invalid("code");
        for (int i=0; i<code.length(); i++) {
            char c = code.charAt(i);
            if (c == 0 || Character.isLowSurrogate(c)) throw invalid("code");
            if (Character.isHighSurrogate(c) && (++i >= code.length() || !Character.isLowSurrogate(code.charAt(i)))) throw invalid("code");
        }
        return code;
    }
    private static String status(Map<String,Object> b) {
        if (!(b.get("status") instanceof String s) || !Set.of("ACTIVE", "INACTIVE").contains(s)) throw invalid("status");
        return s;
    }
    @SuppressWarnings("unchecked")
    private static Map<String,Object> body(AdminPromotionBody raw, String... keys) {
        try {
            if (raw == null || raw.value() == null || raw.value().getBytes(StandardCharsets.UTF_8).length > MAX_BODY_BYTES) throw invalid(null);
            Object v = JSON.readValue(raw.value(), Object.class);
            if (!(v instanceof Map<?,?> map) || !map.keySet().equals(Set.of(keys))) throw invalid(null);
            return (Map<String,Object>)map;
        } catch (AdminPromotionFailure failure) { throw failure; }
        catch (RuntimeException failure) { throw invalid(null); }
    }
    public static long id(String v) {
        try { if (v == null || !v.matches("[1-9][0-9]{0,18}")) throw new NumberFormatException(); return Long.parseLong(v); }
        catch (NumberFormatException failure) { throw invalid("promotionId"); }
    }
    public static long actor(Jwt jwt) {
        try { return id(jwt == null ? null : jwt.getSubject()); }
        catch (AdminPromotionFailure failure) { throw new AdminPromotionFailure(403); }
    }
    public static void noQuery(MultiValueMap<String,String> query) { if (!query.isEmpty()) throw invalid(null); }
    private static AdminPromotionFailure invalid(String field) { return new AdminPromotionFailure(400, field); }
}
