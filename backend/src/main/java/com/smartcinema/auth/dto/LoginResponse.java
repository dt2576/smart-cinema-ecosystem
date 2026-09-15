package com.smartcinema.auth.dto;

import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;
import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.auth.RefreshTokenService.IssuedRefreshToken;

public record LoginResponse(
		String accessToken,
		String tokenType,
		long expiresIn,
		String refreshToken,
		long refreshExpiresIn,
		Long userId,
		String email,
		String fullName,
		UserRole role) {

	public static LoginResponse from(User user, IssuedAccessToken accessToken, IssuedRefreshToken refreshToken) {
		return new LoginResponse(
				accessToken.value(),
				"Bearer",
				accessToken.expiresIn(),
				refreshToken.value(),
				refreshToken.expiresIn(),
				user.getId(),
				user.getEmail(),
				user.getFullName(),
				user.getRole());
	}

	@Override
	public String toString() {
		return "LoginResponse[accessToken=[REDACTED], refreshToken=[REDACTED], tokenType=" + tokenType
				+ ", expiresIn=" + expiresIn
				+ ", userId=" + userId
				+ ", email=" + email
				+ ", fullName=" + fullName
				+ ", role=" + role + "]";
	}
}
