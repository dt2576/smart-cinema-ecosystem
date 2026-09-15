package com.smartcinema.user.dto;

import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;

public record ProfileResponse(
		String fullName,
		String email,
		String phone,
		UserRole role,
		AccountStatus status) {

	public static ProfileResponse from(User user) {
		return new ProfileResponse(
				user.getFullName(),
				user.getEmail(),
				user.getPhone(),
				user.getRole(),
				user.getStatus());
	}
}
