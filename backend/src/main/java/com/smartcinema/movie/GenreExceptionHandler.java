package com.smartcinema.movie;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = GenreController.class)
public class GenreExceptionHandler {
	@ExceptionHandler(InvalidMovieRequestException.class)
	ProblemDetail invalid(InvalidMovieRequestException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
		problem.setTitle("Invalid request");
		problem.setProperty("errors", Map.of(exception.getParameter(), exception.getMessage()));
		return problem;
	}

	@ExceptionHandler(DataAccessException.class)
	ProblemDetail unavailable() {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
				"Genre options are temporarily unavailable. Please try again.");
		problem.setTitle("Genre options unavailable");
		return problem;
	}
}
