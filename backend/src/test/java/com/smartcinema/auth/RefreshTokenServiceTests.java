package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.smartcinema.user.User;

class RefreshTokenServiceTests {
	private static final Instant NOW = Instant.parse("2026-09-15T10:00:00Z");

	@Test
	void issuesOpaqueTokenAndStoresOnlyItsHash() {
		RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
		RefreshTokenService service = service(repository);
		User user = mock(User.class);

		RefreshTokenService.IssuedRefreshToken issued = service.issue(user);

		ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
		verify(repository).save(tokenCaptor.capture());
		assertThat(issued.value()).hasSize(43);
		assertThat(issued.expiresIn()).isEqualTo(2_592_000);
		assertThat(tokenCaptor.getValue().getTokenHash()).hasSize(64).isNotEqualTo(issued.value());
	}

	@Test
	void acceptsActiveTokenThenRejectsItAfterRevocation() {
		RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
		RefreshTokenService service = service(repository);
		RefreshToken token = RefreshToken.issued(mock(User.class), hashPlaceholder(), NOW, NOW.plusSeconds(60));
		when(repository.findForUpdateByTokenHash(any(String.class))).thenReturn(Optional.of(token));

		assertThat(service.requireUsable("raw-token")).isSameAs(token);
		service.revoke(token);
		assertThatThrownBy(() -> service.requireUsable("raw-token"))
				.isInstanceOf(RefreshTokenRejectedException.class);
	}

	@Test
	void rejectsMissingAndExpiredTokensWithSameError() {
		RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
		RefreshTokenService service = service(repository);
		when(repository.findForUpdateByTokenHash(any(String.class)))
				.thenReturn(Optional.empty())
				.thenReturn(Optional.of(RefreshToken.issued(
						mock(User.class), hashPlaceholder(), NOW.minusSeconds(120), NOW.minusSeconds(1))));

		assertThatThrownBy(() -> service.requireUsable("missing-token"))
				.isInstanceOf(RefreshTokenRejectedException.class)
				.hasMessage("Refresh token is invalid, expired, or revoked.");
		assertThatThrownBy(() -> service.requireUsable("expired-token"))
				.isInstanceOf(RefreshTokenRejectedException.class)
				.hasMessage("Refresh token is invalid, expired, or revoked.");
	}

	private RefreshTokenService service(RefreshTokenRepository repository) {
		return new RefreshTokenService(repository, Duration.ofDays(30), new SecureRandom(),
				Clock.fixed(NOW, ZoneOffset.UTC));
	}

	private String hashPlaceholder() {
		return "a".repeat(64);
	}
}
