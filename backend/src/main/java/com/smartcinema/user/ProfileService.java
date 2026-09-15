package com.smartcinema.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcinema.auth.validation.VietnamPhoneValidator;
import com.smartcinema.user.dto.ProfileResponse;
import com.smartcinema.user.dto.UpdateProfileRequest;

@Service
public class ProfileService {

	private final UserRepository userRepository;

	public ProfileService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Transactional(readOnly = true)
	public ProfileResponse getProfile(Long authenticatedUserId) {
		return ProfileResponse.from(loadActiveCustomer(authenticatedUserId));
	}

	@Transactional
	public ProfileResponse updateProfile(Long authenticatedUserId, UpdateProfileRequest request) {
		User user = loadActiveCustomer(authenticatedUserId);
		user.updateProfile(
				request.fullName().trim(),
				VietnamPhoneValidator.normalize(request.phone()));
		return ProfileResponse.from(user);
	}

	private User loadActiveCustomer(Long authenticatedUserId) {
		User user = userRepository.findById(authenticatedUserId)
				.orElseThrow(ProfileUnavailableException::new);
		if (user.getRole() != UserRole.CUSTOMER || user.getStatus() != AccountStatus.ACTIVE) {
			throw new ProfileAccessDeniedException();
		}
		return user;
	}
}
