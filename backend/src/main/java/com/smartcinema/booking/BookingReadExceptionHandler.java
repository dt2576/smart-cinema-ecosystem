package com.smartcinema.booking;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.smartcinema.seat.SeatRequestException;
import com.smartcinema.seat.SeatUnavailableException;

@RestControllerAdvice(assignableTypes = BookingReadController.class)
public class BookingReadExceptionHandler {
    @ExceptionHandler(SeatRequestException.class)
    ResponseEntity<ProblemDetail> invalid() { return problem(400, "Invalid request", "The Booking read request is invalid."); }
    @ExceptionHandler(SeatUnavailableException.class)
    ResponseEntity<ProblemDetail> missing() { return problem(404, "Resource unavailable", "Booking is unavailable."); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> denied() { return problem(403, "Access denied", "An active Customer account is required."); }
    @ExceptionHandler({DataAccessException.class, BookingReadUnavailableException.class})
    ResponseEntity<ProblemDetail> unavailable() {
        return problem(503, "Booking service unavailable", "Booking data is temporarily unavailable. Please try again.");
    }

    private ResponseEntity<ProblemDetail> problem(int status, String title, String detail) {
        var body = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status), detail);
        body.setTitle(title);
        // A fixed instance avoids reflecting an attacker-supplied path/token into errors.
        body.setInstance(java.net.URI.create("/api/v1/bookings"));
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
    }
}
