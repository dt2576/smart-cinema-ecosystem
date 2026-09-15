package com.smartcinema.user;

public class ProfileAccessDeniedException extends RuntimeException {

	public ProfileAccessDeniedException() {
		super("The authenticated account cannot access a Customer profile.");
	}
}
