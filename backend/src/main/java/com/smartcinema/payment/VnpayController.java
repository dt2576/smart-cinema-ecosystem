package com.smartcinema.payment;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.seat.SeatRequest;
import com.smartcinema.seat.SeatRequestException;

@RestController
public class VnpayController {
    private final VnpayService service;
    private final VnpaySettings settings;
    public VnpayController(VnpayService service,VnpaySettings settings) { this.service=service; this.settings=settings; }
    @PostMapping("/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission")
    public ResponseEntity<VnpayRedirectResponse> submit(@PathVariable String bookingId,@PathVariable String paymentId,
            @AuthenticationPrincipal Jwt jwt,@RequestBody Map<String,Object> body,
            @RequestParam MultiValueMap<String,String> query,HttpServletRequest request) {
        SeatRequest.noQuery(query);
        if(body==null || !body.isEmpty()) { throw new SeatRequestException("body","Supply an empty JSON object."); }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.submit(
                SeatRequest.id("bookingId",bookingId),SeatRequest.id("paymentId",paymentId),actor(jwt),request.getRemoteAddr()));
    }
    @GetMapping("/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}")
    public ResponseEntity<VnpayPaymentResponse> detail(@PathVariable String bookingId,@PathVariable String paymentId,
            @AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        SeatRequest.noQuery(query);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.detail(
                SeatRequest.id("bookingId",bookingId),SeatRequest.id("paymentId",paymentId),actor(jwt)));
    }
    @GetMapping("/api/v1/payments/vnpay/ipn")
    public ResponseEntity<Map<String,String>> ipn(@RequestParam MultiValueMap<String,String> query) {
        String code;
        try { code=service.ipn(query); }
        catch(VnpayUnavailableException exception) { code="99"; }
        catch(IllegalArgumentException exception) { code="97"; }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("RspCode",code,"Message","Provider notification processed"));
    }
    @GetMapping("/api/v1/payments/vnpay/return")
    public ResponseEntity<?> returned(@RequestParam MultiValueMap<String,String> query) {
        boolean valid=false;
        try { valid=service.validReturn(query); } catch(IllegalArgumentException | VnpayUnavailableException ignored) { }
        String target=settings.value("frontend-result-url","");
        if(!target.isBlank()) {
            try {
                var uri=java.net.URI.create(target);
                if("https".equals(uri.getScheme()) && uri.getHost()!=null && uri.getUserInfo()==null) {
                    return ResponseEntity.status(303).cacheControl(CacheControl.noStore()).location(uri).build();
                }
            } catch(IllegalArgumentException ignored) { }
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("verifiedRedirect",valid,
                "message","Return received. Retrieve your owned Booking Payment state; this redirect does not confirm payment."));
    }
    private long actor(Jwt jwt) {
        if(jwt==null) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
        try { return SeatRequest.id("subject",jwt.getSubject()); }
        catch(SeatRequestException exception) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
    }
}
