package com.smartcinema.seat;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.seat.dto.*;

@RestController
@RequestMapping("/api/v1/showtimes/{showtimeId}")
public class SeatController {
    private final SeatService service;
    public SeatController(SeatService service) { this.service=service; }

    @GetMapping("/seats")
    public ResponseEntity<SeatMapResponse> map(@PathVariable String showtimeId, @RequestParam MultiValueMap<String,String> query) {
        SeatRequest.noQuery(query);
        return response(service.map(SeatRequest.id("showtimeId",showtimeId)));
    }

    @PostMapping("/seat-holds")
    public ResponseEntity<SeatHoldBatch> acquire(@PathVariable String showtimeId,
            @AuthenticationPrincipal Jwt jwt, @RequestBody Map<String,Object> body, @RequestParam MultiValueMap<String,String> query) {
        SeatRequest.noQuery(query);
        return response(service.acquire(SeatRequest.id("showtimeId",showtimeId),actor(jwt),SeatRequest.seats(body)));
    }

    @GetMapping("/seat-holds")
    public ResponseEntity<SeatHoldBatch> mine(@PathVariable String showtimeId,
            @AuthenticationPrincipal Jwt jwt, @RequestParam MultiValueMap<String,String> query) {
        SeatRequest.noQuery(query);
        return response(service.mine(SeatRequest.id("showtimeId",showtimeId),actor(jwt)));
    }

    @DeleteMapping("/seat-holds/{holdId}")
    public ResponseEntity<Void> release(@PathVariable String showtimeId, @PathVariable String holdId,
            @AuthenticationPrincipal Jwt jwt, @RequestParam MultiValueMap<String,String> query) {
        SeatRequest.noQuery(query);
        service.release(SeatRequest.id("showtimeId",showtimeId),actor(jwt),SeatRequest.id("holdId",holdId));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private long actor(Jwt jwt) {
        try { return SeatRequest.id("subject",jwt == null ? null : jwt.getSubject()); }
        catch (SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
    }
    private <T> ResponseEntity<T> response(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
