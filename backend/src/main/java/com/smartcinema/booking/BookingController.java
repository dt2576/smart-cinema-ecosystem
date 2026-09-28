package com.smartcinema.booking;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {
    private final BookingService service;
    public BookingController(BookingService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<BookingResponse> create(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body,
            @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.create(actor(jwt), BookingRequest.parse(body)));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponse> detail(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.detail(SeatRequest.id("bookingId", bookingId), actor(jwt)));
    }

    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Void> cancel(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        service.cancel(SeatRequest.id("bookingId", bookingId), actor(jwt));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private long actor(Jwt jwt) {
        try { return SeatRequest.id("subject", jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
    }

    private ResponseEntity<BookingResponse> response(BookingResponse body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
