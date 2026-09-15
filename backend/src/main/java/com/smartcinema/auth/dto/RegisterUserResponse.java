package com.smartcinema.auth.dto;

import java.time.OffsetDateTime;

import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;

public record RegisterUserResponse(
		Long id,
		String email,
		String fullName,
		String phone,
		UserRole role,
		AccountStatus status,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {

	public static RegisterUserResponse from(User user) {
		return new RegisterUserResponse(
				user.getId(),
				user.getEmail(),
				user.getFullName(),
				user.getPhone(),
				user.getRole(),
				user.getStatus(),
				user.getCreatedAt(),
				user.getUpdatedAt());
	}
}
