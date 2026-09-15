package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;

class AccessTokenServiceTests {

	@Test
	void issuesSignedAccessTokenWithExpectedIdentityAndExpiry() {
		SecretKey key = new SecretKeySpec(
				"test-secret-with-at-least-thirty-two-bytes".getBytes(), "HmacSHA256");
		NimbusJwtEncoder encoder = NimbusJwtEncoder.withSecretKey(key)
				.build();
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key)
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
		Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
		AccessTokenService service = new AccessTokenService(
				encoder, Duration.ofMinutes(15), Clock.fixed(now, ZoneOffset.UTC));
		User user = mock(User.class);
		when(user.getId()).thenReturn(42L);
		when(user.getEmail()).thenReturn("customer@example.com");
		when(user.getRole()).thenReturn(UserRole.CUSTOMER);

		IssuedAccessToken issued = service.issue(user);
		Jwt jwt = decoder.decode(issued.value());

		assertThat(issued.expiresIn()).isEqualTo(900);
		assertThat(jwt.getIssuer().toString()).isEqualTo("https://smartcinema.local");
		assertThat(jwt.getSubject()).isEqualTo("42");
		assertThat(jwt.getIssuedAt()).isEqualTo(now);
		assertThat(jwt.getExpiresAt()).isEqualTo(now.plusSeconds(900));
		assertThat(jwt.getClaimAsString("email")).isEqualTo("customer@example.com");
		assertThat(jwt.getClaimAsString("role")).isEqualTo("CUSTOMER");
	}
}
