package com.smartcinema.admin;

import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.admin.AdminReportResponse.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminReportingController {
    private final AdminReportService service;
    public AdminReportingController(AdminReportService service) { this.service=service; }
    @GetMapping({"/dashboard","/reports/summary"})
    public ResponseEntity<Summary> summary(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.summary(AdminReportQuery.actor(jwt),AdminReportQuery.parse(query,false)));
    }
    @GetMapping("/reports/daily")
    public ResponseEntity<Daily> daily(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.daily(AdminReportQuery.actor(jwt),AdminReportQuery.parse(query,false)));
    }
    @GetMapping("/reports/breakdowns")
    public ResponseEntity<Breakdowns> breakdown(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.breakdown(AdminReportQuery.actor(jwt),AdminReportQuery.parse(query,true)));
    }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
