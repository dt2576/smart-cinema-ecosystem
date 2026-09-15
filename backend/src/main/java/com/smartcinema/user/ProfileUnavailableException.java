package com.smartcinema.user;

public class ProfileUnavailableException extends RuntimeException {

	public ProfileUnavailableException() {
		super("The customer profile is unavailable.");
	}
}
