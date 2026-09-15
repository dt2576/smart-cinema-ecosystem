package com.smartcinema.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartcinema.user.User;

@Service
public class AccessTokenService {

	private static final String ISSUER = "https://smartcinema.local";

	private final JwtEncoder jwtEncoder;
	private final Duration accessTokenTtl;
	private final Clock clock;

	@Autowired
	public AccessTokenService(JwtEncoder jwtEncoder, Duration accessTokenTtl) {
		this(jwtEncoder, accessTokenTtl, Clock.systemUTC());
	}

	AccessTokenService(JwtEncoder jwtEncoder, Duration accessTokenTtl, Clock clock) {
		this.jwtEncoder = jwtEncoder;
		this.accessTokenTtl = accessTokenTtl;
		this.clock = clock;
	}

	public IssuedAccessToken issue(User user) {
		Instant issuedAt = clock.instant();
		Instant expiresAt = issuedAt.plus(accessTokenTtl);
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer(ISSUER)
				.subject(user.getId().toString())
				.issuedAt(issuedAt)
				.expiresAt(expiresAt)
				.claim("email", user.getEmail())
				.claim("role", user.getRole().name())
				.build();

		String token = jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
		return new IssuedAccessToken(token, accessTokenTtl.toSeconds());
	}

	public record IssuedAccessToken(String value, long expiresIn) {
	}
}
