package com.smartcinema.auth;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smartcinema.auth.dto.TokenRevocationRequest;
import com.smartcinema.user.User;

@ExtendWith(MockitoExtension.class)
class TokenRevocationServiceTests {

	@Mock private RefreshTokenService refreshTokenService;
	private TokenRevocationService service;

	@BeforeEach
	void setUp() {
		service = new TokenRevocationService(refreshTokenService);
	}

	@Test
	void revokesRefreshTokenOwnedByAuthenticatedSubject() {
		User user = mock(User.class);
		when(user.getId()).thenReturn(42L);
		RefreshToken token = mock(RefreshToken.class);
		when(token.getUser()).thenReturn(user);
		when(refreshTokenService.findForUpdate("current-refresh")).thenReturn(Optional.of(token));

		service.revokeCurrent("42", new TokenRevocationRequest("current-refresh"));

		verify(refreshTokenService).revoke(token);
	}

	@Test
	void doesNotRevokeTokenOwnedByAnotherUser() {
		User user = mock(User.class);
		when(user.getId()).thenReturn(7L);
		RefreshToken token = mock(RefreshToken.class);
		when(token.getUser()).thenReturn(user);
		when(refreshTokenService.findForUpdate("other-refresh")).thenReturn(Optional.of(token));

		service.revokeCurrent("42", new TokenRevocationRequest("other-refresh"));

		verify(refreshTokenService, never()).revoke(token);
	}

	@Test
	void missingTokenIsAnIdempotentSuccess() {
		when(refreshTokenService.findForUpdate("already-gone")).thenReturn(Optional.empty());

		service.revokeCurrent("42", new TokenRevocationRequest("already-gone"));

		verify(refreshTokenService, never()).revoke(org.mockito.ArgumentMatchers.any());
	}
}
