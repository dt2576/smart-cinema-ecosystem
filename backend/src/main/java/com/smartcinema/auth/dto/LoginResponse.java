package com.smartcinema.auth.dto;

import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;

public record LoginResponse(
		String accessToken,
		String tokenType,
		long expiresIn,
		Long userId,
		String email,
		String fullName,
		UserRole role) {

	public static LoginResponse from(User user, String accessToken, long expiresIn) {
		return new LoginResponse(
				accessToken,
				"Bearer",
				expiresIn,
				user.getId(),
				user.getEmail(),
				user.getFullName(),
				user.getRole());
	}

	@Override
	public String toString() {
		return "LoginResponse[accessToken=[REDACTED], tokenType=" + tokenType
				+ ", expiresIn=" + expiresIn
				+ ", userId=" + userId
				+ ", email=" + email
				+ ", fullName=" + fullName
				+ ", role=" + role + "]";
	}
}
