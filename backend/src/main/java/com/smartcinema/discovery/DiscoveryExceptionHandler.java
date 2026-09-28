package com.smartcinema.discovery;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DiscoveryController.class)
public class DiscoveryExceptionHandler {
    @ExceptionHandler(DiscoveryRequestException.class)
    ProblemDetail invalid(DiscoveryRequestException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        problem.setTitle("Invalid request");
        problem.setProperty("errors", Map.of(exception.getParameter(), exception.getMessage()));
        return problem;
    }

    @ExceptionHandler(DiscoveryUnavailableException.class)
    ProblemDetail missing(DiscoveryUnavailableException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
        problem.setTitle("Resource unavailable");
        return problem;
    }

    @ExceptionHandler(DataAccessException.class)
    ProblemDetail databaseFailure(DataAccessException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                "Discovery is temporarily unavailable. Please try again.");
        problem.setTitle("Discovery unavailable");
        return problem;
    }
}
