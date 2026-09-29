package com.smartcinema.promotion;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.booking.BookingResponse;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

@RestController
@RequestMapping("/api/v1/bookings/{bookingId}/promotion")
public class PromotionController {
    private final PromotionService service;
    public PromotionController(PromotionService service) { this.service = service; }

    @PutMapping
    public ResponseEntity<BookingResponse> apply(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body, @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        var request = PromotionRequest.parse(body);
        return response(service.edit(SeatRequest.id("bookingId", bookingId), actor(jwt), request.code(), "APPLY"));
    }

    @DeleteMapping
    public ResponseEntity<BookingResponse> remove(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.edit(SeatRequest.id("bookingId", bookingId), actor(jwt), null, "REMOVE"));
    }

    private long actor(Jwt jwt) {
        try { return SeatRequest.id("subject", jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
    }
    private ResponseEntity<BookingResponse> response(BookingResponse body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
