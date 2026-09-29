package com.smartcinema.concession;

import java.util.Map;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

public record ConcessionRequest(long itemId, int quantity) {
    public static ConcessionRequest add(Map<String, ?> body) {
        if (body == null || body.size() != 2 || !(body.get("itemId") instanceof String item)) {
            throw new SeatRequestException("itemId", "Supply only a string itemId and integer quantity.");
        }
        return new ConcessionRequest(SeatRequest.id("itemId", item), quantity(body));
    }
    public static int update(Map<String, ?> body) {
        if (body == null || body.size() != 1) { throw new SeatRequestException("quantity", "Supply only quantity."); }
        return quantity(body);
    }
    private static int quantity(Map<String, ?> body) {
        if (!(body.get("quantity") instanceof Integer value) || value <= 0) {
            throw new SeatRequestException("quantity", "Quantity must be a JSON integer from 1 to 2147483647.");
        }
        return value;
    }
}
