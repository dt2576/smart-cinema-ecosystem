package com.smartcinema.booking;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingReadController {
    private final BookingReadService service;
    public BookingReadController(BookingReadService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<BookingHistoryResponse> history(@AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.history(actor(jwt), BookingHistoryQuery.parse(query)));
    }

    @GetMapping("/{bookingId}/tickets")
    public ResponseEntity<BookingTicketsResponse> tickets(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        if (!query.isEmpty()) { throw new SeatRequestException("query", "Query parameters are not supported."); }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.tickets(SeatRequest.id("bookingId", bookingId), actor(jwt)));
    }

    private long actor(Jwt jwt) {
        try { return SeatRequest.id("subject", jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new AccessDeniedException("Customer unavailable"); }
    }
}
