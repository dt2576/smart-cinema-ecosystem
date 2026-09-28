package com.smartcinema.movie;

public class MovieNotFoundException extends RuntimeException {
	public MovieNotFoundException() {
		super("Movie is unavailable.");
	}
}
