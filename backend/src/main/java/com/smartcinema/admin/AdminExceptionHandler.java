package com.smartcinema.admin;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.movie.*;

@RestControllerAdvice(assignableTypes={AdminMovieController.class,AdminController.class})
public class AdminExceptionHandler {
    @ExceptionHandler(InvalidMovieRequestException.class)
    ProblemDetail invalid(InvalidMovieRequestException exception) {
        ProblemDetail problem=problem(HttpStatus.BAD_REQUEST,"Invalid request",exception.getMessage());
        problem.setProperty("errors",Map.of(exception.getParameter(),exception.getMessage()));
        return problem;
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail malformed() { return problem(HttpStatus.BAD_REQUEST,"Invalid request","Supply a valid JSON object."); }
    @ExceptionHandler(MovieNotFoundException.class)
    ProblemDetail missing() { return problem(HttpStatus.NOT_FOUND,"Movie unavailable","Movie is unavailable."); }
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied() { return problem(HttpStatus.FORBIDDEN,"Admin access denied","Active Admin access is required."); }
    @ExceptionHandler(ConcurrencyFailureException.class)
    ProblemDetail conflict() { return problem(HttpStatus.CONFLICT,"Movie conflict","Movie changed concurrently. Reload and try again."); }
    @ExceptionHandler(DataAccessException.class)
    ProblemDetail unavailable() { return problem(HttpStatus.SERVICE_UNAVAILABLE,"Admin service unavailable","Movie management is temporarily unavailable. Please try again."); }
    private ProblemDetail problem(HttpStatus status,String title,String detail) {
        ProblemDetail problem=ProblemDetail.forStatusAndDetail(status,detail); problem.setTitle(title); return problem;
    }
}
