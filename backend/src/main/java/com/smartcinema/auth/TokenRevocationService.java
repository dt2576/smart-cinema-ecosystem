package com.smartcinema.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcinema.auth.dto.TokenRevocationRequest;

@Service
public class TokenRevocationService {

	private final RefreshTokenService refreshTokenService;

	public TokenRevocationService(RefreshTokenService refreshTokenService) {
		this.refreshTokenService = refreshTokenService;
	}

	@Transactional
	public void revokeCurrent(String authenticatedSubject, TokenRevocationRequest request) {
		refreshTokenService.findForUpdate(request.refreshToken())
				.filter(token -> token.getUser().getId().toString().equals(authenticatedSubject))
				.ifPresent(refreshTokenService::revoke);
	}
}
