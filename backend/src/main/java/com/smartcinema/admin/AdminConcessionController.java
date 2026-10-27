package com.smartcinema.admin;

import java.net.URI;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.admin.AdminConcessionRequest.*;

@RestController
@RequestMapping("/api/v1/admin/concession-items")
public class AdminConcessionController {
    private final AdminConcessionService service;
    public AdminConcessionController(AdminConcessionService service) { this.service=service; }
    @GetMapping public ResponseEntity<List<AdminConcessionItem>> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.list(actor(jwt)));
    }
    @GetMapping("/{itemId}") public ResponseEntity<AdminConcessionItem> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String itemId,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.detail(actor(jwt),id(itemId)));
    }
    @PostMapping(consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminConcessionItem> create(@AuthenticationPrincipal Jwt jwt,@RequestBody AdminConcessionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); var result=service.create(actor(jwt),AdminConcessionRequest.create(body));
        return ResponseEntity.created(URI.create("/api/v1/admin/concession-items/"+result.id())).cacheControl(CacheControl.noStore()).body(result);
    }
    @PutMapping(value="/{itemId}",consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminConcessionItem> update(@AuthenticationPrincipal Jwt jwt,@PathVariable String itemId,@RequestBody AdminConcessionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.update(actor(jwt),id(itemId),AdminConcessionRequest.update(body)));
    }
    @PutMapping(value="/{itemId}/status",consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminConcessionItem> status(@AuthenticationPrincipal Jwt jwt,@PathVariable String itemId,@RequestBody AdminConcessionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.status(actor(jwt),id(itemId),AdminConcessionRequest.status(body)));
    }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
