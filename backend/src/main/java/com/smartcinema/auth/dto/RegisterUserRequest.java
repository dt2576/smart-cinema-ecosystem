package com.smartcinema.auth.dto;

import com.smartcinema.auth.validation.VietnamPhone;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterUserRequest(
		@NotBlank(message = "Full name is required.") @Size(max = 150, message = "Full name must not exceed 150 characters.") String fullName,
		@NotBlank(message = "Email is required.") @Size(max = 254, message = "Email must not exceed 254 characters.") @Pattern(regexp = "^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$", message = "Email must be valid.") String email,
		@NotBlank(message = "Phone is required.") @Size(max = 30, message = "Phone must not exceed 30 characters.") @VietnamPhone String phone,
		@NotBlank(message = "Password is required.") @Size(min = 8, max = 72, message = "Password must contain between 8 and 72 characters.") String password) {

	@Override
	public String toString() {
		return "RegisterUserRequest[fullName=" + fullName + ", email=" + email + ", phone=" + phone
				+ ", password=[REDACTED]]";
	}
}
