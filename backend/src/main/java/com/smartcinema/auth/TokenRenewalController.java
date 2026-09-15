package com.smartcinema.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.auth.dto.TokenRenewalRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth/token-renewals")
public class TokenRenewalController {
	private final TokenRenewalService tokenRenewalService;

	public TokenRenewalController(TokenRenewalService tokenRenewalService) {
		this.tokenRenewalService = tokenRenewalService;
	}

	@PostMapping
	ResponseEntity<LoginResponse> renew(@Valid @RequestBody TokenRenewalRequest request) {
		return ResponseEntity.ok(tokenRenewalService.renew(request));
	}
}
