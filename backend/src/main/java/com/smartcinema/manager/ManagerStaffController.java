package com.smartcinema.manager;

import java.net.URI;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.staff.StaffRepository.Assignment;
import com.smartcinema.manager.ManagerStaffRepository.*;
import static com.smartcinema.manager.ManagerRequest.*;

@RestController
@RequestMapping("/api/v1/manager/cinemas/{cinemaId}")
public class ManagerStaffController {
    private final ManagerStaffService service;
    public ManagerStaffController(ManagerStaffService service) { this.service=service; }
    @GetMapping("/staff-assignments")
    public ResponseEntity<List<Membership>> list(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);return ok(service.memberships(actor(jwt),id(cinemaId)));
    }
    @GetMapping("/staff/{staffId}")
    public ResponseEntity<Detail> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@PathVariable String staffId,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);return ok(service.detail(actor(jwt),id(cinemaId),id(staffId)));
    }
    @PostMapping(value="/staff/{staffId}/cinema-assignments",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Assignment> assign(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@PathVariable String staffId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);bounded(raw);var saved=service.assign(actor(jwt),id(cinemaId),id(staffId),assignment(raw));
        return ResponseEntity.created(URI.create("/api/v1/manager/cinemas/"+saved.cinemaId()+"/staff/"+saved.userId())).cacheControl(CacheControl.noStore()).body(saved);
    }
    @PutMapping(value="/staff/{staffId}/cinema-assignments/{assignmentId}/status",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Assignment> status(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@PathVariable String staffId,@PathVariable String assignmentId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);bounded(raw);return ok(service.status(actor(jwt),id(cinemaId),id(staffId),id(assignmentId),ManagerRequest.status(raw)));
    }
    private void bounded(byte[] raw) { if(raw==null||raw.length>65536)throw new ManagerFailure(400); }
    private <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
