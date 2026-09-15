package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.auth.RefreshTokenService.IssuedRefreshToken;
import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.auth.dto.TokenRenewalRequest;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRole;

@ExtendWith(MockitoExtension.class)
class TokenRenewalServiceTests {
	@Mock private RefreshTokenService refreshTokenService;
	@Mock private AccessTokenService accessTokenService;
	private TokenRenewalService service;

	@BeforeEach
	void setUp() {
		service = new TokenRenewalService(refreshTokenService, accessTokenService);
	}

	@Test
	void rotatesRefreshTokenAndPreservesCurrentUserClaims() {
		User user = mock(User.class);
		when(user.getId()).thenReturn(7L);
		when(user.getEmail()).thenReturn("customer@example.com");
		when(user.getFullName()).thenReturn("Nguyen Van A");
		when(user.getRole()).thenReturn(UserRole.CUSTOMER);
		when(user.getStatus()).thenReturn(AccountStatus.ACTIVE);
		RefreshToken stored = mock(RefreshToken.class);
		when(stored.getUser()).thenReturn(user);
		when(refreshTokenService.requireUsable("old-refresh")).thenReturn(stored);
		when(accessTokenService.issue(user)).thenReturn(new IssuedAccessToken("new-access", 900));
		when(refreshTokenService.issue(user)).thenReturn(new IssuedRefreshToken("new-refresh", 2592000));

		LoginResponse response = service.renew(new TokenRenewalRequest("old-refresh"));

		assertThat(response.accessToken()).isEqualTo("new-access");
		assertThat(response.refreshToken()).isEqualTo("new-refresh");
		assertThat(response.role()).isEqualTo(UserRole.CUSTOMER);
		verify(refreshTokenService).revoke(stored);
	}

	@Test
	void rejectsBlockedAccountWithoutIssuingTokens() {
		User user = mock(User.class);
		when(user.getStatus()).thenReturn(AccountStatus.BLOCKED);
		RefreshToken stored = mock(RefreshToken.class);
		when(stored.getUser()).thenReturn(user);
		when(refreshTokenService.requireUsable("refresh-token")).thenReturn(stored);

		assertThatThrownBy(() -> service.renew(new TokenRenewalRequest("refresh-token")))
				.isInstanceOf(RefreshTokenRejectedException.class);
		verify(refreshTokenService, never()).revoke(stored);
		verify(accessTokenService, never()).issue(user);
	}
}
