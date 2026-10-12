package com.smartcinema.staff;

import org.springframework.http.*;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.staff.StaffRequest.*;

@RestController
@RequestMapping("/api/v1/staff/password-setups")
public class StaffPasswordSetupController {
    private final StaffOnboardingService service;
    public StaffPasswordSetupController(StaffOnboardingService service) { this.service=service; }
    @PostMapping public ResponseEntity<Void> password(@RequestBody StaffSensitiveBody raw,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); var b=body(raw,"token","password"); service.password(text(b,"token"),text(b,"password")); return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
