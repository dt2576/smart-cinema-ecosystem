package com.smartcinema.manager;

import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.manager.ManagerBookingResponse.*;

@RestController
@RequestMapping("/api/v1/manager/bookings")
public class ManagerBookingController {
    private final ManagerBookingService service;
    public ManagerBookingController(ManagerBookingService service){this.service=service;}
    @GetMapping
    public ResponseEntity<Page> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(ManagerRequest.actor(jwt),ManagerBookingQuery.parse(query)));
    }
    @GetMapping("/{bookingId}")
    public ResponseEntity<Detail> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestParam MultiValueMap<String,String> query){
        ManagerRequest.noQuery(query);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.detail(ManagerRequest.actor(jwt),ManagerRequest.id(bookingId)));
    }
}
