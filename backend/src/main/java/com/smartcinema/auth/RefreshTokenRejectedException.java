package com.smartcinema.auth;

public class RefreshTokenRejectedException extends RuntimeException {
	public RefreshTokenRejectedException() {
		super("Refresh token is invalid, expired, or revoked.");
	}
}
