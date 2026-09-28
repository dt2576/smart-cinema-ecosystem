package com.smartcinema.seat;

import java.sql.SQLException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes=SeatController.class)
public class SeatExceptionHandler {
    @ExceptionHandler(SeatRequestException.class)
    ProblemDetail invalid(SeatRequestException exception) {
        var problem=problem(400,"Invalid request",exception.getMessage());
        problem.setProperty("errors",Map.of(exception.getField(),exception.getMessage()));
        return problem;
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail unreadable(HttpMessageNotReadableException exception) { return problem(400,"Invalid request","A valid JSON object is required."); }
    @ExceptionHandler(SeatUnavailableException.class)
    ProblemDetail unavailable(SeatUnavailableException exception) { return problem(404,"Resource unavailable",exception.getMessage()); }
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied(AccessDeniedException exception) { return problem(403,"Access denied","An active Customer account is required."); }

    @ExceptionHandler(DataAccessException.class)
    ProblemDetail database(DataAccessException exception) {
        String state=null;
        for(Throwable cause=exception;cause!=null;cause=cause.getCause()) {
            if(cause instanceof SQLException sql) { state=sql.getSQLState(); break; }
        }
        if("P0001".equals(state)) { return problem(400,"Invalid request","Invalid Seat selection."); }
        if("P0002".equals(state)) { return problem(404,"Resource unavailable","Showtime or Hold is unavailable."); }
        if("P0004".equals(state)) { return problem(403,"Access denied","An active Customer account is required."); }
        if("P0003".equals(state) || "23505".equals(state)) {
            return problem(409,"Seat selection conflict","Seat selection changed or is unavailable. Reload the Seat map.");
        }
        if("55P03".equals(state) || "40P01".equals(state) || "40001".equals(state) || "57014".equals(state)) {
            return problem(409,"Seat Hold contention","The request could not complete in time. Reload and retry.");
        }
        return problem(503,"Seat service unavailable","Seat data is temporarily unavailable. Please try again.");
    }
    private ProblemDetail problem(int status,String title,String detail) {
        var problem=ProblemDetail.forStatusAndDetail(org.springframework.http.HttpStatus.valueOf(status),detail);
        problem.setTitle(title);
        return problem;
    }
}
