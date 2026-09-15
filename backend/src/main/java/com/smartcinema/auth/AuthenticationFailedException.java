package com.smartcinema.auth;

public class AuthenticationFailedException extends RuntimeException {

	private static final String MESSAGE = "Email or password is invalid, or the account is unavailable.";

	public AuthenticationFailedException() {
		super(MESSAGE);
	}
}
