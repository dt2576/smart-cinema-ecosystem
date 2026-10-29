package com.smartcinema.manager;

import java.util.Map;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.admin.AdminReportFailure;

@RestControllerAdvice(assignableTypes=ManagerReportingController.class)
public class ManagerReportExceptionHandler {
    @ExceptionHandler(AdminReportFailure.class)
    ResponseEntity<ProblemDetail> invalid(AdminReportFailure failure) { return problem(failure.status(),failure.field()); }
    @ExceptionHandler(ManagerFailure.class)
    ResponseEntity<ProblemDetail> scope(ManagerFailure failure) { return problem(failure.status(),null); }
    @ExceptionHandler({DataAccessException.class,TransactionException.class})
    ResponseEntity<ProblemDetail> unavailable() { return problem(503,null); }

    private ResponseEntity<ProblemDetail> problem(int status,String field) {
        String detail=switch(status) {
            case 400->"Supply a valid reporting period and filters.";
            case 403->"Current Manager account and effective Cinema assignment are required.";
            case 404->"Resource is unavailable in the authorized Cinema scope.";
            default->"Reporting is temporarily unavailable. Try the read again later.";
        };
        var body=ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status),detail);
        body.setTitle(HttpStatus.valueOf(status).getReasonPhrase());
        if(field!=null&&Set.of("from","to","cinemaId","movieId","showtimeId","dimension","page","size").contains(field))
            body.setProperty("errors",Map.of(field,"Supply a valid value for this field."));
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
