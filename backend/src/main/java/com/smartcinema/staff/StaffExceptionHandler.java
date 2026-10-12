package com.smartcinema.staff;

import java.sql.SQLException;
import java.net.URI;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes={AdminStaffController.class,StaffPasswordSetupController.class})
public class StaffExceptionHandler {
    @ExceptionHandler(StaffFailure.class) ResponseEntity<ProblemDetail> failure(StaffFailure failure) { return problem(failure.status(),failure.retryAfter()); }
    @ExceptionHandler(HttpMessageNotReadableException.class) ResponseEntity<ProblemDetail> malformed() { return problem(400); }
    @ExceptionHandler(DataAccessException.class) ResponseEntity<ProblemDetail> database(DataAccessException failure) {
        for (Throwable cause=failure;cause!=null;cause=cause.getCause()) if (cause instanceof SQLException sql) {
            String code=sql.getSQLState(); if (code==null) continue;
            if (code.equals("P0004") || code.equals("42501")) return problem(403);
            if (code.equals("P0002")) return problem(404);
            if (code.equals("P0001") || code.equals("22001") || code.equals("23502")) return problem(400);
            if (code.equals("P0003") || code.equals("23505") || code.equals("23503")) return problem(409);
        }
        return problem(503);
    }
    static ResponseEntity<ProblemDetail> problem(int status) {
        return problem(status,60);
    }
    private static ResponseEntity<ProblemDetail> problem(int status,int retryAfter) {
        String detail=switch(status) { case 400 -> "The request or invitation is unavailable."; case 403 -> "Current administrative access is unavailable."; case 404 -> "Staff resource is unavailable."; case 409 -> "The request conflicts with current Staff state."; case 429 -> "Please wait before trying again."; default -> "Staff service is temporarily unavailable."; };
        var body=ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status),detail); body.setTitle(HttpStatus.valueOf(status).getReasonPhrase()); body.setInstance(URI.create("/api/v1/staff"));
        var response=ResponseEntity.status(status).cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PROBLEM_JSON);
        if (status==429) response.header("Retry-After",Integer.toString(retryAfter)); return response.body(body);
    }
}
