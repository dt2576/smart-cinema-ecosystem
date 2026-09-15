package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.auth.dto.LoginRequest;
import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;
import com.smartcinema.user.UserRole;

@ExtendWith(MockitoExtension.class)
class LoginServiceTests {

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private AccessTokenService accessTokenService;

	private LoginService loginService;

	@BeforeEach
	void setUp() {
		loginService = new LoginService(userRepository, passwordEncoder, accessTokenService);
	}

	@Test
	void authenticatesNormalizedEmailAndIssuesTokenForActiveAccount() {
		User user = user(AccountStatus.ACTIVE);
		when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("securePassword", "stored-hash")).thenReturn(true);
		when(accessTokenService.issue(user)).thenReturn(new IssuedAccessToken("signed-token", 900));

		LoginResponse response = loginService.login(
				new LoginRequest("  Customer@Example.COM  ", "securePassword"));

		assertThat(response.accessToken()).isEqualTo("signed-token");
		assertThat(response.tokenType()).isEqualTo("Bearer");
		assertThat(response.expiresIn()).isEqualTo(900);
		assertThat(response.email()).isEqualTo("customer@example.com");
		assertThat(response.role()).isEqualTo(UserRole.CUSTOMER);
	}

	@Test
	void rejectsUnknownEmailWithStandardizedError() {
		when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
		when(passwordEncoder.matches("password", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"))
				.thenReturn(false);

		assertAuthenticationFailed(new LoginRequest("missing@example.com", "password"));
		verify(accessTokenService, never()).issue(org.mockito.ArgumentMatchers.any());
	}

	@Test
	void rejectsIncorrectPasswordWithSameStandardizedError() {
		User user = user(AccountStatus.ACTIVE);
		when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("wrong-password", "stored-hash")).thenReturn(false);

		assertAuthenticationFailed(new LoginRequest("customer@example.com", "wrong-password"));
		verify(accessTokenService, never()).issue(user);
	}

	@Test
	void rejectsBlockedAccountWithSameStandardizedError() {
		User user = user(AccountStatus.BLOCKED);
		when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("securePassword", "stored-hash")).thenReturn(true);

		assertAuthenticationFailed(new LoginRequest("customer@example.com", "securePassword"));
		verify(accessTokenService, never()).issue(user);
	}

	@Test
	void redactsPasswordFromRequestString() {
		LoginRequest request = new LoginRequest("customer@example.com", "secret-password");

		assertThat(request.toString()).doesNotContain("secret-password").contains("[REDACTED]");
	}

	@Test
	void redactsAccessTokenFromResponseString() {
		LoginResponse response = new LoginResponse(
				"secret-token", "Bearer", 900, 1L, "customer@example.com", "Nguyen Van A", UserRole.CUSTOMER);

		assertThat(response.toString()).doesNotContain("secret-token").contains("accessToken=[REDACTED]");
	}

	@Test
	void verifiesPasswordUsingBcrypt() {
		User user = user(AccountStatus.ACTIVE);
		PasswordEncoder bcrypt = new BCryptPasswordEncoder(4);
		when(user.getPasswordHash()).thenReturn(bcrypt.encode("securePassword"));
		when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
		when(accessTokenService.issue(user)).thenReturn(new IssuedAccessToken("signed-token", 900));
		LoginService bcryptLoginService = new LoginService(userRepository, bcrypt, accessTokenService);

		LoginResponse response = bcryptLoginService.login(
				new LoginRequest("customer@example.com", "securePassword"));

		assertThat(response.accessToken()).isEqualTo("signed-token");
	}

	private void assertAuthenticationFailed(LoginRequest request) {
		assertThatThrownBy(() -> loginService.login(request))
				.isInstanceOf(AuthenticationFailedException.class)
				.hasMessage("Email or password is invalid, or the account is unavailable.");
	}

	private User user(AccountStatus status) {
		User user = mock(User.class);
		lenient().when(user.getId()).thenReturn(1L);
		lenient().when(user.getEmail()).thenReturn("customer@example.com");
		lenient().when(user.getPasswordHash()).thenReturn("stored-hash");
		lenient().when(user.getFullName()).thenReturn("Nguyen Van A");
		lenient().when(user.getRole()).thenReturn(UserRole.CUSTOMER);
		lenient().when(user.getStatus()).thenReturn(status);
		return user;
	}
}
