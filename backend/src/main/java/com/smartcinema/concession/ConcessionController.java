package com.smartcinema.concession;

import java.util.List;
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
@RequestMapping("/api/v1")
public class ConcessionController {
    private final ConcessionService service;
    public ConcessionController(ConcessionService service) { this.service = service; }

    @GetMapping("/concession-items")
    public ResponseEntity<List<ConcessionItemResponse>> catalog(@RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.catalog());
    }
    @PostMapping("/bookings/{bookingId}/concessions")
    public ResponseEntity<BookingResponse> add(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body, @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        var request = ConcessionRequest.add(body);
        return response(service.edit(SeatRequest.id("bookingId", bookingId), actor(jwt), null, request.itemId(), request.quantity(), "ADD"));
    }
    @PatchMapping("/bookings/{bookingId}/concessions/{lineId}")
    public ResponseEntity<BookingResponse> update(@PathVariable String bookingId, @PathVariable String lineId, @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body, @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.edit(SeatRequest.id("bookingId", bookingId), actor(jwt), SeatRequest.id("lineId", lineId), null, ConcessionRequest.update(body), "UPDATE"));
    }
    @DeleteMapping("/bookings/{bookingId}/concessions/{lineId}")
    public ResponseEntity<BookingResponse> remove(@PathVariable String bookingId, @PathVariable String lineId, @AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        return response(service.edit(SeatRequest.id("bookingId", bookingId), actor(jwt), SeatRequest.id("lineId", lineId), null, null, "REMOVE"));
    }
    private long actor(Jwt jwt) {
        try { return SeatRequest.id("subject", jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
    }
    private <T> ResponseEntity<T> response(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
