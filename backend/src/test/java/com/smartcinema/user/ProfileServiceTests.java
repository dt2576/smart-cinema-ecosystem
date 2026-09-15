package com.smartcinema.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smartcinema.user.dto.ProfileResponse;
import com.smartcinema.user.dto.UpdateProfileRequest;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTests {

	@Mock
	private UserRepository userRepository;

	private ProfileService profileService;

	@BeforeEach
	void setUp() {
		profileService = new ProfileService(userRepository);
	}

	@Test
	void retrievesOnlyAuthenticatedCustomerProfileData() {
		User user = User.registeredCustomer(
				"customer@example.com", "stored-hash", "Nguyen Van A", "+84912345678");
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		ProfileResponse response = profileService.getProfile(42L);

		assertThat(response.fullName()).isEqualTo("Nguyen Van A");
		assertThat(response.email()).isEqualTo("customer@example.com");
		assertThat(response.phone()).isEqualTo("+84912345678");
		assertThat(response.role()).isEqualTo(UserRole.CUSTOMER);
		assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
		assertThat(response.toString()).doesNotContain("stored-hash");
	}

	@Test
	void updatesOnlyPermittedFieldsAndNormalizesPhone() {
		User user = User.registeredCustomer(
				"customer@example.com", "stored-hash", "Nguyen Van A", "+84912345678");
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		ProfileResponse response = profileService.updateProfile(
				42L, new UpdateProfileRequest("  Tran Thi B  ", "0987 654 321"));

		assertThat(response.fullName()).isEqualTo("Tran Thi B");
		assertThat(response.phone()).isEqualTo("+84987654321");
		assertThat(user.getEmail()).isEqualTo("customer@example.com");
		assertThat(user.getPasswordHash()).isEqualTo("stored-hash");
		assertThat(user.getRole()).isEqualTo(UserRole.CUSTOMER);
		assertThat(user.getStatus()).isEqualTo(AccountStatus.ACTIVE);
	}

	@Test
	void rejectsMissingAuthenticatedProfile() {
		when(userRepository.findById(42L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> profileService.getProfile(42L))
				.isInstanceOf(ProfileUnavailableException.class)
				.hasMessage("The customer profile is unavailable.");
	}

	@Test
	void rejectsBlockedCustomer() {
		User user = org.mockito.Mockito.mock(User.class);
		when(user.getRole()).thenReturn(UserRole.CUSTOMER);
		when(user.getStatus()).thenReturn(AccountStatus.BLOCKED);
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> profileService.getProfile(42L))
				.isInstanceOf(ProfileAccessDeniedException.class);
	}

	@Test
	void rejectsNonCustomerAccount() {
		User user = org.mockito.Mockito.mock(User.class);
		when(user.getRole()).thenReturn(UserRole.STAFF);
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> profileService.getProfile(42L))
				.isInstanceOf(ProfileAccessDeniedException.class);
	}
}
