package com.smartcinema.admin;

import java.sql.SQLException;
import java.util.*;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.discovery.DiscoveryRequestException;
import com.smartcinema.movie.InvalidMovieRequestException;

@RestControllerAdvice(assignableTypes=AdminShowtimeController.class)
public class AdminShowtimeExceptionHandler {
    @ExceptionHandler(InvalidMovieRequestException.class) ProblemDetail invalid(InvalidMovieRequestException error) { return validation(error.getParameter(),error.getMessage()); }
    @ExceptionHandler(DiscoveryRequestException.class) ProblemDetail invalidQuery(DiscoveryRequestException error) { return validation(error.getParameter(),error.getMessage()); }
    @ExceptionHandler(HttpMessageNotReadableException.class) ProblemDetail malformed() { return problem(HttpStatus.BAD_REQUEST,"Supply a valid JSON Showtime object."); }
    @ExceptionHandler(AdminConfigurationException.class) ProblemDetail missing() { return problem(HttpStatus.NOT_FOUND,"Showtime or Hall is unavailable."); }
    @ExceptionHandler(AccessDeniedException.class) ProblemDetail denied() { return problem(HttpStatus.FORBIDDEN,"Active Admin access is required."); }
    @ExceptionHandler(DataAccessException.class) ProblemDetail database(DataAccessException error) {
        for(Throwable cause=error;cause!=null;cause=cause.getCause()) if(cause instanceof SQLException sql) {
            String state=sql.getSQLState()==null?"":sql.getSQLState();
            if(Set.of("P0004","42501").contains(state)) return denied();
            if(state.equals("P0002")) return missing();
            if(Set.of("P0001","22008","22003","23502","22001").contains(state)) return problem(HttpStatus.BAD_REQUEST,"Invalid Showtime time, price or status.");
            if(state.equals("23P01")) return problem(HttpStatus.CONFLICT,"This Showtime overlaps another screening in the same Hall. Choose another time.");
            if(Set.of("P0003","23514","23505","23503","40001","40P01","55P03","57014").contains(state)) return problem(HttpStatus.CONFLICT,"Showtime conflicts with parent eligibility, layout readiness, lifecycle or protected history. Reload and check your changes.");
        }
        return problem(HttpStatus.SERVICE_UNAVAILABLE,"Showtime management is temporarily unavailable. Please try again.");
    }
    private ProblemDetail validation(String field,String message) { var result=problem(HttpStatus.BAD_REQUEST,message); result.setProperty("errors",Map.of(field,message)); return result; }
    private ProblemDetail problem(HttpStatus status,String detail) { var result=ProblemDetail.forStatusAndDetail(status,detail); result.setTitle(status.getReasonPhrase()); return result; }
}
