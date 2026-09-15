package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.SQLException;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.dto.RegisterUserResponse;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;
import com.smartcinema.user.UserRole;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTests {

	@Mock
	private UserRepository userRepository;

	private BCryptPasswordEncoder passwordEncoder;
	private RegistrationService registrationService;

	@BeforeEach
	void setUp() {
		passwordEncoder = new BCryptPasswordEncoder(4);
		registrationService = new RegistrationService(userRepository, passwordEncoder);
	}

	@Test
	void registersNormalizedCustomerWithHashedPassword() {
		when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		RegisterUserResponse response = registrationService.register(new RegisterUserRequest(
				"  Nguyen Van A  ",
				"  Customer@Example.COM  ",
				"0912 345 678",
				"securePassword"));

		ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(userCaptor.capture());
		User savedUser = userCaptor.getValue();

		assertThat(savedUser.getEmail()).isEqualTo("customer@example.com");
		assertThat(savedUser.getFullName()).isEqualTo("Nguyen Van A");
		assertThat(savedUser.getPhone()).isEqualTo("+84912345678");
		assertThat(savedUser.getRole()).isEqualTo(UserRole.CUSTOMER);
		assertThat(savedUser.getStatus()).isEqualTo(AccountStatus.ACTIVE);
		assertThat(savedUser.getPasswordHash()).isNotEqualTo("securePassword");
		assertThat(passwordEncoder.matches("securePassword", savedUser.getPasswordHash())).isTrue();
		assertThat(response.email()).isEqualTo("customer@example.com");
		assertThat(response).hasNoNullFieldsOrPropertiesExcept("id", "createdAt", "updatedAt");
	}

	@Test
	void rejectsExistingNormalizedEmailBeforeHashingOrSaving() {
		when(userRepository.existsByEmail("customer@example.com")).thenReturn(true);

		assertThatThrownBy(() -> registrationService.register(new RegisterUserRequest(
				"Nguyen Van A",
				" Customer@Example.com ",
				"+84912345678",
				"securePassword")))
				.isInstanceOf(DuplicateEmailException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void doesNotMisreportUnrelatedDatabaseIntegrityFailuresAsDuplicateEmail() {
		when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
		DataIntegrityViolationException databaseFailure = new DataIntegrityViolationException("other constraint");
		when(userRepository.saveAndFlush(any(User.class))).thenThrow(databaseFailure);

		assertThatThrownBy(() -> registrationService.register(new RegisterUserRequest(
				"Nguyen Van A",
				"customer@example.com",
				"+84912345678",
				"securePassword")))
				.isSameAs(databaseFailure);
	}

	@Test
	void translatesUniqueEmailRaceIntoDuplicateEmailConflict() {
		when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
		ConstraintViolationException uniqueEmailFailure = new ConstraintViolationException(
				"duplicate email",
				new SQLException("unique violation"),
				"uq_users_email");
		when(userRepository.saveAndFlush(any(User.class)))
				.thenThrow(new DataIntegrityViolationException("unique violation", uniqueEmailFailure));

		assertThatThrownBy(() -> registrationService.register(new RegisterUserRequest(
				"Nguyen Van A",
				"customer@example.com",
				"+84912345678",
				"securePassword")))
				.isInstanceOf(DuplicateEmailException.class);
	}

	@Test
	void requestStringRepresentationRedactsPassword() {
		RegisterUserRequest request = new RegisterUserRequest(
				"Nguyen Van A",
				"customer@example.com",
				"+84912345678",
				"securePassword");

		assertThat(request.toString())
				.contains("password=[REDACTED]")
				.doesNotContain("securePassword");
	}
}
