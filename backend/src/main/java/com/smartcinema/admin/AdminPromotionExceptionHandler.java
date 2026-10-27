package com.smartcinema.admin;

import java.sql.SQLException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes=AdminPromotionController.class)
public class AdminPromotionExceptionHandler {
    @ExceptionHandler(AdminPromotionFailure.class) ResponseEntity<ProblemDetail> failure(AdminPromotionFailure failure) { return problem(failure.status(),failure.field()); }
    @ExceptionHandler(HttpMessageNotReadableException.class) ResponseEntity<ProblemDetail> malformed() { return problem(400,null); }
    @ExceptionHandler(AccessDeniedException.class) ResponseEntity<ProblemDetail> denied() { return problem(403,null); }
    @ExceptionHandler(DataAccessException.class) ResponseEntity<ProblemDetail> database(DataAccessException failure) {
        for(Throwable cause=failure;cause!=null;cause=cause.getCause()) if(cause instanceof SQLException sql) {
            String state=sql.getSQLState();
            if("P0004".equals(state)) return problem(403,null);
            if("P0002".equals(state)) return problem(404,null);
            if(java.util.Set.of("P0001","23502","22001","22003").contains(state==null?"":state)) return problem(400,null);
            if(java.util.Set.of("P0003","23514","23505","23503","40001","40P01","55P03","57014").contains(state==null?"":state)) return problem(409,null);
        }
        return problem(503,null);
    }
    private ResponseEntity<ProblemDetail> problem(int status,String field) {
        String detail=switch(status) {
            case 400 -> "Supply valid Promotion fields.";
            case 403 -> "Active Admin access is required.";
            case 404 -> "Promotion is unavailable.";
            case 409 -> "Catalog data is busy or changed. Reload and review before retrying.";
            default -> "Promotion management is temporarily unavailable. Review stored state before another write.";
        };
        var result=ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status),detail); result.setTitle(HttpStatus.valueOf(status).getReasonPhrase());
        if(field!=null) result.setProperty("errors",Map.of(field,"Supply a valid value for this field."));
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(result);
    }
}
