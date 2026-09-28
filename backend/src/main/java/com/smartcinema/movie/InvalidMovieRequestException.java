package com.smartcinema.movie;

public class InvalidMovieRequestException extends RuntimeException {
	private final String parameter;

	public InvalidMovieRequestException(String parameter, String message) {
		super(message);
		this.parameter = parameter;
	}

	public String getParameter() { return parameter; }
}
