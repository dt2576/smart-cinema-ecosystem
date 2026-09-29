package com.smartcinema.promotion;

import java.util.Locale;
import java.util.Map;
import com.smartcinema.seat.SeatRequestException;

public record PromotionRequest(String code) {
    public static PromotionRequest parse(Map<String, ?> body) {
        if (body == null || body.size() != 1 || !(body.get("code") instanceof String value)) {
            throw new SeatRequestException("code", "Supply only a Promotion code string.");
        }
        String code = value.strip().toUpperCase(Locale.ROOT);
        if (code.isBlank() || code.length() > 50) {
            throw new SeatRequestException("code", "Promotion code must contain 1 to 50 characters.");
        }
        return new PromotionRequest(code);
    }
}
