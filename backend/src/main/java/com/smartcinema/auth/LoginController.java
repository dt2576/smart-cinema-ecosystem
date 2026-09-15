package com.smartcinema.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcinema.auth.dto.LoginRequest;
import com.smartcinema.auth.dto.LoginResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth/tokens")
public class LoginController {

	private final LoginService loginService;

	public LoginController(LoginService loginService) {
		this.loginService = loginService;
	}

	@PostMapping
	ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(loginService.login(request));
	}
}
