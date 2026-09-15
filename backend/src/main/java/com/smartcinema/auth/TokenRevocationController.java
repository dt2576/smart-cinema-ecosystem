package com.smartcinema.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcinema.auth.dto.TokenRevocationRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth/token-revocations")
public class TokenRevocationController {

	private final TokenRevocationService tokenRevocationService;

	public TokenRevocationController(TokenRevocationService tokenRevocationService) {
		this.tokenRevocationService = tokenRevocationService;
	}

	@PostMapping
	ResponseEntity<Void> revoke(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody TokenRevocationRequest request) {
		tokenRevocationService.revokeCurrent(jwt.getSubject(), request);
		return ResponseEntity.noContent().build();
	}
}
