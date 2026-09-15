package com.smartcinema.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TokenRevocationRequest(
		@NotBlank(message = "Refresh token is required.")
		@Size(max = 512, message = "Refresh token is invalid.")
		String refreshToken) {

	@Override
	public String toString() {
		return "TokenRevocationRequest[refreshToken=[REDACTED]]";
	}
}
