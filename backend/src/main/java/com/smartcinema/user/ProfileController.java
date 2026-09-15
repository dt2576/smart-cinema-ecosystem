package com.smartcinema.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcinema.user.dto.ProfileResponse;
import com.smartcinema.user.dto.UpdateProfileRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

	private final ProfileService profileService;

	public ProfileController(ProfileService profileService) {
		this.profileService = profileService;
	}

	@GetMapping
	ProfileResponse getProfile(@AuthenticationPrincipal Jwt jwt) {
		return profileService.getProfile(authenticatedUserId(jwt));
	}

	@PatchMapping
	ProfileResponse updateProfile(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody UpdateProfileRequest request) {
		return profileService.updateProfile(authenticatedUserId(jwt), request);
	}

	private Long authenticatedUserId(Jwt jwt) {
		try {
			return Long.valueOf(jwt.getSubject());
		} catch (NumberFormatException exception) {
			throw new ProfileAccessDeniedException();
		}
	}
}
