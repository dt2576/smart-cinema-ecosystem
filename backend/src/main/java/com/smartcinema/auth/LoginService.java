package com.smartcinema.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.auth.dto.LoginRequest;
import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;

@Service
public class LoginService {

	private static final String UNKNOWN_ACCOUNT_PASSWORD_HASH =
			"$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AccessTokenService accessTokenService;

	public LoginService(UserRepository userRepository, PasswordEncoder passwordEncoder,
			AccessTokenService accessTokenService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.accessTokenService = accessTokenService;
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
		User user = userRepository.findByEmail(normalizedEmail).orElse(null);
		String passwordHash = user == null ? UNKNOWN_ACCOUNT_PASSWORD_HASH : user.getPasswordHash();

		if (!passwordEncoder.matches(request.password(), passwordHash)
				|| user == null
				|| user.getStatus() != AccountStatus.ACTIVE) {
			throw new AuthenticationFailedException();
		}

		IssuedAccessToken accessToken = accessTokenService.issue(user);
		return LoginResponse.from(user, accessToken.value(), accessToken.expiresIn());
	}
}
