package com.smartcinema.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LoginRequest(
		@NotBlank(message = "Email is required.")
		@Size(max = 254, message = "Email must contain at most 254 characters.")
		@Pattern(regexp = "^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$", message = "Email must be valid.")
		String email,

		@NotBlank(message = "Password is required.")
		@Size(max = 72, message = "Password must contain at most 72 characters.")
		String password) {

	@Override
	public String toString() {
		return "LoginRequest[email=" + email + ", password=[REDACTED]]";
	}
}
