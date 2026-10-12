package com.smartcinema.staff;

import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.staff.StaffRepository.*;
import static com.smartcinema.staff.StaffRequest.*;

@RestController
@RequestMapping("/api/v1/admin/staff")
public class AdminStaffController {
    private final StaffOnboardingService service;
    public AdminStaffController(StaffOnboardingService service) { this.service=service; }
    @PostMapping public ResponseEntity<StaffAccount> create(@AuthenticationPrincipal Jwt jwt,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); var b=body(raw,"fullName","email","phone"); var saved=service.create(actor(jwt),text(b,"fullName"),text(b,"email"),text(b,"phone"));
        return ResponseEntity.created(URI.create("/api/v1/admin/staff/"+saved.id())).cacheControl(CacheControl.noStore()).body(saved);
    }
    @GetMapping public ResponseEntity<List<StaffAccount>> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q) { var p=page(q); return ok(service.accounts(actor(jwt),p[0],p[1])); }
    @GetMapping("/{staffId}") public ResponseEntity<StaffAccount> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@RequestParam MultiValueMap<String,String> q) { noQuery(q); return ok(service.account(actor(jwt),id(staffId))); }
    @PostMapping("/{staffId}/invitations") public ResponseEntity<StaffAccount> reissue(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) { noQuery(q); body(raw); return ok(service.reissue(actor(jwt),id(staffId))); }
    @PutMapping("/{staffId}/status") public ResponseEntity<StaffAccount> state(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) { noQuery(q); return ok(service.status(actor(jwt),id(staffId),status(body(raw,"status"),Set.of("ACTIVE","BLOCKED")))); }
    @GetMapping("/{staffId}/cinema-assignments") public ResponseEntity<List<Assignment>> assignments(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@RequestParam MultiValueMap<String,String> q) { noQuery(q); return ok(service.assignments(actor(jwt),id(staffId))); }
    @PostMapping("/{staffId}/cinema-assignments") public ResponseEntity<Assignment> assign(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); var b=body(raw,"cinemaId","effectiveAt"); return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.assign(actor(jwt),id(staffId),id(text(b,"cinemaId")),instant(text(b,"effectiveAt"))));
    }
    @PutMapping("/{staffId}/cinema-assignments/{assignmentId}/status") public ResponseEntity<Assignment> assignmentState(@AuthenticationPrincipal Jwt jwt,@PathVariable String staffId,@PathVariable String assignmentId,@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.assignmentStatus(actor(jwt),id(staffId),id(assignmentId),status(body(raw,"status"),Set.of("ACTIVE","INACTIVE"))));
    }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
