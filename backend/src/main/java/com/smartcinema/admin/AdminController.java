package com.smartcinema.admin;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminAccessService access;
    public AdminController(AdminAccessService access) { this.access = access; }

    @GetMapping
    @Transactional
    public ResponseEntity<AdminAccessService.AdminIdentity> identity(@AuthenticationPrincipal Jwt jwt,
            @RequestParam MultiValueMap<String, String> query) {
        AdminMovieController.noQuery(query);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(access.requireAdmin(AdminMovieController.actor(jwt)));
    }
}
