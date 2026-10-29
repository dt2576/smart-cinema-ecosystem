package com.smartcinema.manager;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.manager.ManagerReportResponse.*;

@RestController
@RequestMapping("/api/v1/manager")
public class ManagerReportingController {
    private final ManagerReportService service;
    public ManagerReportingController(ManagerReportService service) { this.service=service; }

    @GetMapping({"/dashboard","/reports/summary"})
    public ResponseEntity<Summary> summary(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.summary(ManagerRequest.actor(jwt),ManagerReportRequest.parse(query,false)));
    }
    @GetMapping("/reports/daily")
    public ResponseEntity<Daily> daily(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.daily(ManagerRequest.actor(jwt),ManagerReportRequest.parse(query,false)));
    }
    @GetMapping("/reports/breakdowns")
    public ResponseEntity<Breakdowns> breakdown(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.breakdown(ManagerRequest.actor(jwt),ManagerReportRequest.parse(query,true)));
    }
    @GetMapping("/reports/concessions")
    public ResponseEntity<Concessions> concessions(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.concessions(ManagerRequest.actor(jwt),ManagerReportRequest.concessions(query)));
    }
    private static <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
