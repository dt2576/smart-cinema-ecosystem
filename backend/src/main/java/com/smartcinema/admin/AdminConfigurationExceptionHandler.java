package com.smartcinema.admin;

import java.sql.SQLException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.movie.InvalidMovieRequestException;

@RestControllerAdvice(assignableTypes=AdminConfigurationController.class)
public class AdminConfigurationExceptionHandler {
    @ExceptionHandler(InvalidMovieRequestException.class) ProblemDetail invalid(InvalidMovieRequestException error) {
        ProblemDetail result=problem(HttpStatus.BAD_REQUEST,error.getMessage()); result.setProperty("errors",Map.of(error.getParameter(),error.getMessage())); return result;
    }
    @ExceptionHandler(HttpMessageNotReadableException.class) ProblemDetail malformed() { return problem(HttpStatus.BAD_REQUEST,"Supply a valid JSON object."); }
    @ExceptionHandler(AdminConfigurationException.class) ProblemDetail missing() { return problem(HttpStatus.NOT_FOUND,"Configuration resource is unavailable."); }
    @ExceptionHandler(AccessDeniedException.class) ProblemDetail denied() { return problem(HttpStatus.FORBIDDEN,"Active Admin access is required."); }
    @ExceptionHandler(DataAccessException.class) ProblemDetail database(DataAccessException error) {
        for(Throwable cause=error;cause!=null;cause=cause.getCause()) if(cause instanceof SQLException sql) {
            String state=sql.getSQLState();
            if("P0004".equals(state) || "42501".equals(state)) return denied();
            if("P0002".equals(state)) return missing();
            if("P0001".equals(state) || "23502".equals(state) || "22001".equals(state)) return problem(HttpStatus.BAD_REQUEST,"Invalid configuration data.");
            if(java.util.Set.of("P0003","23514","23505","23503","40001","40P01","55P03","57014").contains(state==null?"":state)) {
                return problem(HttpStatus.CONFLICT,"Configuration conflicts with layout capacity, existing identities or referenced history. Reload and check your changes.");
            }
        }
        return problem(HttpStatus.SERVICE_UNAVAILABLE,"Configuration management is temporarily unavailable. Please try again.");
    }
    private ProblemDetail problem(HttpStatus status,String detail) {
        ProblemDetail result=ProblemDetail.forStatusAndDetail(status,detail); result.setTitle(status.getReasonPhrase()); return result;
    }
}
