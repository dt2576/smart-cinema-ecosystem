package com.smartcinema.staff;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.staff.StaffRequest.*;

@RestController
@RequestMapping("/api/v1/staff/pos")
public class StaffPosController {
    private final StaffPosService service;
    public StaffPosController(StaffPosService service) {this.service=service;}
    @GetMapping("/movies")
    public ResponseEntity<?> movies(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");return ok(service.movies(actor(jwt),StaffPosRequest.cinema(q)));
    }
    @GetMapping("/showtimes")
    public ResponseEntity<?> showtimes(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId","movieId","date");return ok(service.showtimes(actor(jwt),StaffPosRequest.cinema(q),id(q.getFirst("movieId")),StaffPosRequest.date(q.getFirst("date"))));
    }
    @GetMapping("/showtimes/{showtimeId}/seats")
    public ResponseEntity<?> map(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");return ok(service.map(actor(jwt),StaffPosRequest.cinema(q),id(showtimeId)));
    }
    @GetMapping("/showtimes/{showtimeId}/seat-holds")
    public ResponseEntity<?> holds(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");return ok(service.holds(actor(jwt),StaffPosRequest.cinema(q),id(showtimeId)));
    }
    @PostMapping("/showtimes/{showtimeId}/seat-holds")
    public ResponseEntity<?> acquire(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q);var b=body(raw,"cinemaId","seatIds");return ok(service.acquire(actor(jwt),id(text(b,"cinemaId")),id(showtimeId),StaffPosRequest.ids(b,"seatIds")));
    }
    @DeleteMapping("/showtimes/{showtimeId}/seat-holds/{holdId}")
    public ResponseEntity<?> release(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@PathVariable String holdId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");service.release(actor(jwt),StaffPosRequest.cinema(q),id(showtimeId),id(holdId));return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
    @PostMapping("/bookings")
    public ResponseEntity<?> create(@AuthenticationPrincipal Jwt jwt,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q);var b=body(raw,"cinemaId","showtimeId","holdIds");return ok(service.create(actor(jwt),id(text(b,"cinemaId")),id(text(b,"showtimeId")),StaffPosRequest.ids(b,"holdIds")));
    }
    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<?> receipt(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");return ok(service.receipt(actor(jwt),StaffPosRequest.cinema(q),id(bookingId)));
    }
    @DeleteMapping("/bookings/{bookingId}")
    public ResponseEntity<?> cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");service.cancel(actor(jwt),StaffPosRequest.cinema(q),id(bookingId));return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
    @PostMapping("/bookings/{bookingId}/payment-transactions")
    public ResponseEntity<?> initiate(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q);var b=body(raw,"cinemaId");return ok(service.initiate(actor(jwt),id(text(b,"cinemaId")),id(bookingId)));
    }
    @PostMapping("/bookings/{bookingId}/payment-transactions/{paymentId}/cash-confirmations")
    public ResponseEntity<?> cash(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@PathVariable String paymentId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q);var b=body(raw,"cinemaId","expectedAmount");return ok(service.cash(actor(jwt),id(text(b,"cinemaId")),id(bookingId),id(paymentId),StaffPosRequest.amount(b)));
    }
    @PostMapping("/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission")
    public ResponseEntity<?> submit(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@PathVariable String paymentId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q,HttpServletRequest request) {
        noQuery(q);var b=body(raw,"cinemaId");return ok(service.submit(actor(jwt),id(text(b,"cinemaId")),id(bookingId),id(paymentId),request.getRemoteAddr()));
    }
    @PutMapping("/bookings/{bookingId}/promotion")
    public ResponseEntity<?> promotion(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q);var b=body(raw,"cinemaId","code");String code=text(b,"code");if(code.length()>50) throw new StaffFailure(400);
        return ok(service.promotion(actor(jwt),id(text(b,"cinemaId")),id(bookingId),code,"APPLY"));
    }
    @DeleteMapping("/bookings/{bookingId}/promotion")
    public ResponseEntity<?> removePromotion(@AuthenticationPrincipal Jwt jwt,@PathVariable String bookingId,@RequestParam MultiValueMap<String,String> q) {
        StaffPosRequest.query(q,"cinemaId");return ok(service.promotion(actor(jwt),StaffPosRequest.cinema(q),id(bookingId),null,"REMOVE"));
    }
    private ResponseEntity<?> ok(Object result) {return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);}
}
