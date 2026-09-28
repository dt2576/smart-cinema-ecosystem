package com.smartcinema.movie;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = MovieController.class)
public class MovieExceptionHandler {
	@ExceptionHandler(InvalidMovieRequestException.class)
	ProblemDetail invalid(InvalidMovieRequestException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
		problem.setTitle("Invalid request");
		problem.setProperty("errors", Map.of(exception.getParameter(), exception.getMessage()));
		return problem;
	}

	@ExceptionHandler(MovieNotFoundException.class)
	ProblemDetail unavailable(MovieNotFoundException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
		problem.setTitle("Movie unavailable");
		return problem;
	}
}
