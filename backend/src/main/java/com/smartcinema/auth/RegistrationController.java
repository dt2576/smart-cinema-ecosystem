package com.smartcinema.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.dto.RegisterUserResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class RegistrationController {

	private final RegistrationService registrationService;

	public RegistrationController(RegistrationService registrationService) {
		this.registrationService = registrationService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public RegisterUserResponse register(@Valid @RequestBody RegisterUserRequest request) {
		return registrationService.register(request);
	}
}
