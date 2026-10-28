package com.smartcinema.manager;

import java.sql.SQLException;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.admin.*;
import com.smartcinema.movie.InvalidMovieRequestException;
import com.smartcinema.discovery.DiscoveryRequestException;

@RestControllerAdvice(assignableTypes={ManagerController.class,AdminManagerController.class})
public class ManagerExceptionHandler {
    @ExceptionHandler(ManagerFailure.class) ResponseEntity<ProblemDetail> failure(ManagerFailure failure){return problem(failure.status());}
    @ExceptionHandler({InvalidMovieRequestException.class,DiscoveryRequestException.class,HttpMessageNotReadableException.class}) ResponseEntity<ProblemDetail> invalid(){return problem(400);}
    @ExceptionHandler(AdminConfigurationException.class) ResponseEntity<ProblemDetail> missing(){return problem(404);}
    @ExceptionHandler(AccessDeniedException.class) ResponseEntity<ProblemDetail> denied(){return problem(403);}
    @ExceptionHandler(DataAccessException.class) ResponseEntity<ProblemDetail> database(DataAccessException failure){
        for(Throwable cause=failure;cause!=null;cause=cause.getCause())if(cause instanceof SQLException sql){String state=sql.getSQLState()==null?"":sql.getSQLState();
            if(Set.of("P0004","42501").contains(state))return problem(403);
            if(state.equals("P0002"))return problem(404);
            if(Set.of("P0001","23502","22001","22003","22008").contains(state))return problem(400);
            if(Set.of("P0003","23514","23505","23503","23P01","40001","40P01","55P03","57014").contains(state))return problem(409);
        }return problem(503);
    }
    @ExceptionHandler(TransactionException.class) ResponseEntity<ProblemDetail> unavailable(){return problem(503);}
    private ResponseEntity<ProblemDetail> problem(int status){
        String detail=switch(status){case 400->"Supply valid Cinema operation fields.";case 403->"Current authorized account and Cinema scope are required.";case 404->"Resource is unavailable in the authorized scope.";case 409->"Operation conflicts with current assignment, layout, schedule or protected history. Reload before another write.";default->"Cinema operations are temporarily unavailable. Review stored state before another write.";};
        var body=ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status),detail);body.setTitle(HttpStatus.valueOf(status).getReasonPhrase());return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
