package com.smartcinema.admin;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes=AdminReportingController.class)
public class AdminReportExceptionHandler {
    @ExceptionHandler(AdminReportFailure.class) ResponseEntity<ProblemDetail> invalid(AdminReportFailure failure) { return problem(failure.status(),failure.field()); }
    @ExceptionHandler(AccessDeniedException.class) ResponseEntity<ProblemDetail> denied() { return problem(403,null); }
    @ExceptionHandler({DataAccessException.class,TransactionException.class}) ResponseEntity<ProblemDetail> unavailable() { return problem(503,null); }
    private ResponseEntity<ProblemDetail> problem(int status,String field) {
        String detail=switch(status) {
            case 400 -> "Supply a valid reporting period and filters.";
            case 403 -> "Active Admin access is required.";
            default -> "Reporting is temporarily unavailable. Try the read again later.";
        };
        var body=ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status),detail);
        body.setTitle(HttpStatus.valueOf(status).getReasonPhrase());
        // Unknown parameter names are not reflected into error output.
        if(field!=null && java.util.Set.of("from","to","cinemaId","movieId","showtimeId","dimension","page","size").contains(field))
            body.setProperty("errors",Map.of(field,"Supply a valid value for this field."));
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
