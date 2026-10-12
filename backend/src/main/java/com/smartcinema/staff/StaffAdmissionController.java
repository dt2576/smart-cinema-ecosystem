package com.smartcinema.staff;

import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.staff.StaffRequest.*;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffAdmissionController {
    private final StaffAdmissionService service;
    public StaffAdmissionController(StaffAdmissionService service) {this.service=service;}
    @GetMapping("/cinema-assignments")
    public ResponseEntity<StaffAssignmentResponse> assignments(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);return ok(service.assignments(actor(jwt)));
    }
    @PostMapping("/booking-qr-resolutions")
    public ResponseEntity<StaffBookingResponse> resolve(@AuthenticationPrincipal Jwt jwt,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);var input=body(raw,"cinemaId","bookingQr");
        return ok(service.resolve(actor(jwt),id(text(input,"cinemaId")),StaffAdmissionRequest.qr(input)));
    }
    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<StaffBookingResponse> recover(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.recover(actor(jwt),id(bookingId),StaffAdmissionRequest.cinema(query)));
    }
    @PostMapping("/bookings/{bookingId}/check-ins")
    public ResponseEntity<StaffCheckInResponse> checkIn(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);var input=body(raw,1048576,"cinemaId","ticketIds");
        return ok(service.checkIn(actor(jwt),id(bookingId),id(text(input,"cinemaId")),StaffAdmissionRequest.tickets(input)));
    }
    private <T> ResponseEntity<T> ok(T result) {return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);}
}
