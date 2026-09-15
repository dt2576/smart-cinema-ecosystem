package com.smartcinema.user.dto;

import com.smartcinema.auth.validation.VietnamPhone;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
		@NotBlank(message = "Full name is required.")
		@Size(max = 150, message = "Full name must not exceed 150 characters.")
		String fullName,

		@NotBlank(message = "Phone is required.")
		@Size(max = 30, message = "Phone must not exceed 30 characters.")
		@VietnamPhone
		String phone) {
}
