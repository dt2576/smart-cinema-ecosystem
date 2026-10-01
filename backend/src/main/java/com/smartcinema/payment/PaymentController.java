package com.smartcinema.payment;

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
@RequestMapping("/api/v1/bookings/{bookingId}/payment-transactions")
public class PaymentController {
    private final PaymentService service;
    public PaymentController(PaymentService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<PaymentResponse> initiate(@PathVariable String bookingId, @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body, @RequestParam MultiValueMap<String, String> query) {
        SeatRequest.noQuery(query);
        if (body == null || !body.isEmpty()) {
            throw new SeatRequestException("body", "Supply an empty JSON object; Payment terms are server-owned.");
        }
        long actor;
        try { actor = SeatRequest.id("subject", jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.initiate(SeatRequest.id("bookingId", bookingId), actor));
    }
}
