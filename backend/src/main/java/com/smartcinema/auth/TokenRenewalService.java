package com.smartcinema.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcinema.auth.AccessTokenService.IssuedAccessToken;
import com.smartcinema.auth.RefreshTokenService.IssuedRefreshToken;
import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.auth.dto.TokenRenewalRequest;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.User;

@Service
public class TokenRenewalService {
	private final RefreshTokenService refreshTokenService;
	private final AccessTokenService accessTokenService;

	public TokenRenewalService(RefreshTokenService refreshTokenService, AccessTokenService accessTokenService) {
		this.refreshTokenService = refreshTokenService;
		this.accessTokenService = accessTokenService;
	}

	@Transactional
	public LoginResponse renew(TokenRenewalRequest request) {
		RefreshToken storedToken = refreshTokenService.requireUsable(request.refreshToken());
		User user = storedToken.getUser();
		if (user.getStatus() != AccountStatus.ACTIVE) throw new RefreshTokenRejectedException();

		refreshTokenService.revoke(storedToken);
		IssuedAccessToken accessToken = accessTokenService.issue(user);
		IssuedRefreshToken refreshToken = refreshTokenService.issue(user);
		return LoginResponse.from(user, accessToken, refreshToken);
	}
}
