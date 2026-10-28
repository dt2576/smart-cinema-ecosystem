package com.smartcinema.admin;

import java.net.URI;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.staff.StaffRepository.Assignment;
import static com.smartcinema.manager.ManagerRequest.*;

@RestController
@RequestMapping("/api/v1/admin/managers")
public class AdminManagerController {
    private final AdminManagerService service;
    public AdminManagerController(AdminManagerService service){this.service=service;}
    @GetMapping public ResponseEntity<List<AdminManagerRepository.ManagerAccount>> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.list(actor(jwt)));}
    @GetMapping("/{managerId}/cinema-assignments") public ResponseEntity<List<Assignment>> assignments(@AuthenticationPrincipal Jwt jwt,@PathVariable String managerId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.assignments(actor(jwt),id(managerId)));}
    @PostMapping(value="/{managerId}/cinema-assignments",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Assignment> assign(@AuthenticationPrincipal Jwt jwt,@PathVariable String managerId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);var saved=service.assign(actor(jwt),id(managerId),assignment(raw));return ResponseEntity.created(URI.create("/api/v1/admin/managers/"+managerId+"/cinema-assignments/"+saved.id())).cacheControl(CacheControl.noStore()).body(saved);}
    @PutMapping(value="/{managerId}/cinema-assignments/{assignmentId}/status",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Assignment> status(@AuthenticationPrincipal Jwt jwt,@PathVariable String managerId,@PathVariable String assignmentId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.status(actor(jwt),id(managerId),id(assignmentId),com.smartcinema.manager.ManagerRequest.status(raw)));}
    private <T> ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
}
