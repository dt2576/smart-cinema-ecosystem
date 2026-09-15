package com.smartcinema.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import com.smartcinema.user.User;

@Service
public class RefreshTokenService {

	private static final int TOKEN_BYTES = 32;
	private final RefreshTokenRepository refreshTokenRepository;
	private final Duration refreshTokenTtl;
	private final SecureRandom secureRandom;
	private final Clock clock;

	@Autowired
	public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
			@Qualifier("refreshTokenTtl") Duration refreshTokenTtl) {
		this(refreshTokenRepository, refreshTokenTtl, new SecureRandom(), Clock.systemUTC());
	}

	RefreshTokenService(RefreshTokenRepository refreshTokenRepository, Duration refreshTokenTtl,
			SecureRandom secureRandom, Clock clock) {
		this.refreshTokenRepository = refreshTokenRepository;
		this.refreshTokenTtl = refreshTokenTtl;
		this.secureRandom = secureRandom;
		this.clock = clock;
	}

	public IssuedRefreshToken issue(User user) {
		byte[] tokenBytes = new byte[TOKEN_BYTES];
		secureRandom.nextBytes(tokenBytes);
		String value = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
		Instant issuedAt = clock.instant();
		refreshTokenRepository.save(RefreshToken.issued(
				user, hash(value), issuedAt, issuedAt.plus(refreshTokenTtl)));
		return new IssuedRefreshToken(value, refreshTokenTtl.toSeconds());
	}

	public RefreshToken requireUsable(String value) {
		RefreshToken token = findForUpdate(value)
				.orElseThrow(RefreshTokenRejectedException::new);
		if (!token.isUsableAt(clock.instant())) throw new RefreshTokenRejectedException();
		return token;
	}

	public Optional<RefreshToken> findForUpdate(String value) {
		return refreshTokenRepository.findForUpdateByTokenHash(hash(value));
	}

	public void revoke(RefreshToken token) {
		token.revoke(clock.instant());
	}

	private String hash(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
					.digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is unavailable.", exception);
		}
	}

	public record IssuedRefreshToken(String value, long expiresIn) { }
}
