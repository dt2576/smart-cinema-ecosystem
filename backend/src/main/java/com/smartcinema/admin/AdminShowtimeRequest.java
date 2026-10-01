package com.smartcinema.admin;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.util.MultiValueMap;
import com.smartcinema.discovery.DiscoveryQuery;
import com.smartcinema.movie.InvalidMovieRequestException;
import static com.smartcinema.movie.MovieQuery.positiveId;

public final class AdminShowtimeRequest {
    private AdminShowtimeRequest() {}
    public static final Set<String> STATUSES=Set.of("DRAFT","SCHEDULED","OPEN_FOR_BOOKING","STARTED","ENDED","CANCELLED");
    public record Input(long movieId,long hallId,Instant startsAt,BigDecimal basePrice,String status) {}
    public record Filter(LocalDate date,Long movieId,Long cinemaId,Long hallId,String status) {}
    public static Input parse(Map<String,Object> body) {
        Set<String> fields=Set.of("movieId","hallId","startsAt","basePrice","status");
        for(String field:body.keySet()) if(!fields.contains(field)) throw invalid(field,"Unsupported Showtime field.");
        long movie=positiveId("movieId",text(body,"movieId")); long hall=positiveId("hallId",text(body,"hallId"));
        Instant start;
        try {
            var parsed=OffsetDateTime.parse(text(body,"startsAt")); start=parsed.toInstant();
            if(parsed.getYear()<1 || parsed.getYear()>9999 || start.getNano()%1000!=0) throw new DateTimeException("precision");
        } catch(DateTimeException error) { throw invalid("startsAt","Supply an ISO-8601 instant with offset, years 0001–9999 and at most six fractional digits."); }
        String price=text(body,"basePrice"); BigDecimal amount;
        try {
            if(!price.matches("[0-9]+(\\.[0-9]{1,4})?")) throw new NumberFormatException();
            amount=new BigDecimal(price);
            if(amount.compareTo(new BigDecimal("1000000000000000"))>=0) throw new NumberFormatException();
        } catch(NumberFormatException error) { throw invalid("basePrice","Supply exact nonnegative decimal text below 1000000000000000, with at most four fractional digits."); }
        String status=text(body,"status");
        if(!Set.of("DRAFT","SCHEDULED","OPEN_FOR_BOOKING","CANCELLED").contains(status)) throw invalid("status","Use an approved Admin authoring status.");
        return new Input(movie,hall,start,amount,status);
    }
    public static Filter filter(MultiValueMap<String,String> query) {
        DiscoveryQuery.validate(query,"date","movieId","cinemaId","hallId","status");
        String status=query.getFirst("status");
        if(status!=null && !STATUSES.contains(status)) throw invalid("status","Use an existing Showtime status.");
        return new Filter(DiscoveryQuery.date(query.getFirst("date")),id(query,"movieId"),id(query,"cinemaId"),id(query,"hallId"),status);
    }
    private static Long id(MultiValueMap<String,String> query,String name) { return query.containsKey(name)?positiveId(name,query.getFirst(name)):null; }
    private static String text(Map<String,Object> body,String name) { if(!(body.get(name) instanceof String value)) throw invalid(name,"Supply a text value."); return value; }
    private static InvalidMovieRequestException invalid(String field,String message) { return new InvalidMovieRequestException(field,message); }
}
