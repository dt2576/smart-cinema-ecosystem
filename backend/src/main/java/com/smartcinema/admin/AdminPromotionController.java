package com.smartcinema.admin;

import java.net.URI;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.admin.AdminPromotionRequest.*;

@RestController
@RequestMapping("/api/v1/admin/promotions")
public class AdminPromotionController {
    private final AdminPromotionService service;
    public AdminPromotionController(AdminPromotionService service) { this.service=service; }
    @GetMapping public ResponseEntity<List<AdminPromotion>> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.list(actor(jwt)));
    }
    @GetMapping("/{promotionId}") public ResponseEntity<AdminPromotion> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String promotionId,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.detail(actor(jwt),id(promotionId)));
    }
    @PostMapping(consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminPromotion> create(@AuthenticationPrincipal Jwt jwt,@RequestBody AdminPromotionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); var result=service.create(actor(jwt),AdminPromotionRequest.create(body));
        return ResponseEntity.created(URI.create("/api/v1/admin/promotions/"+result.id())).cacheControl(CacheControl.noStore()).body(result);
    }
    @PutMapping(value="/{promotionId}",consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminPromotion> update(@AuthenticationPrincipal Jwt jwt,@PathVariable String promotionId,@RequestBody AdminPromotionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.update(actor(jwt),id(promotionId),AdminPromotionRequest.update(body)));
    }
    @PutMapping(value="/{promotionId}/status",consumes=MediaType.APPLICATION_JSON_VALUE) public ResponseEntity<AdminPromotion> status(@AuthenticationPrincipal Jwt jwt,@PathVariable String promotionId,@RequestBody AdminPromotionBody body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.status(actor(jwt),id(promotionId),AdminPromotionRequest.status(body)));
    }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
