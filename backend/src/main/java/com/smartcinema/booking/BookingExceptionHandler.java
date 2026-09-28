package com.smartcinema.booking;

import java.sql.SQLException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.smartcinema.seat.SeatRequestException;
import com.smartcinema.seat.SeatUnavailableException;

@RestControllerAdvice(assignableTypes = BookingController.class)
public class BookingExceptionHandler {
    @ExceptionHandler(SeatRequestException.class)
    ProblemDetail invalid(SeatRequestException exception) {
        var result = problem(400, "Invalid request", exception.getMessage());
        result.setProperty("errors", Map.of(exception.getField(), exception.getMessage()));
        return result;
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail unreadable(HttpMessageNotReadableException exception) { return problem(400, "Invalid request", "A valid JSON object is required."); }
    @ExceptionHandler(SeatUnavailableException.class)
    ProblemDetail missing(SeatUnavailableException exception) { return problem(404, "Resource unavailable", "Booking is unavailable."); }
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied(AccessDeniedException exception) { return problem(403, "Access denied", "An active Customer account is required."); }
    @ExceptionHandler(DataAccessException.class)
    ProblemDetail database(DataAccessException exception) {
        String state = null;
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) { state = sql.getSQLState(); break; }
        }
        if ("P0001".equals(state)) { return problem(400, "Invalid request", "Invalid Hold selection."); }
        if ("P0002".equals(state)) { return problem(404, "Resource unavailable", "Booking or Showtime is unavailable."); }
        if ("P0004".equals(state)) { return denied(null); }
        if ("P0003".equals(state) || "23505".equals(state)) {
            return problem(409, "Booking conflict", "The Holds are unavailable or already attached. Reload your selection.");
        }
        if ("55P03".equals(state) || "40P01".equals(state) || "40001".equals(state) || "57014".equals(state)) {
            return problem(409, "Booking contention", "The request could not complete in time. Reload and retry.");
        }
        return problem(503, "Booking service unavailable", "Booking data is temporarily unavailable. Please try again.");
    }
    private ProblemDetail problem(int status, String title, String detail) {
        var result = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status), detail);
        result.setTitle(title);
        return result;
    }
}
