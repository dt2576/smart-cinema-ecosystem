package com.smartcinema.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProfileExceptionHandler {

	@ExceptionHandler(ProfileUnavailableException.class)
	ProblemDetail handleUnavailable(ProfileUnavailableException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
		problem.setTitle("Profile unavailable");
		return problem;
	}

	@ExceptionHandler(ProfileAccessDeniedException.class)
	ProblemDetail handleAccessDenied(ProfileAccessDeniedException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
		problem.setTitle("Profile access denied");
		return problem;
	}
}
