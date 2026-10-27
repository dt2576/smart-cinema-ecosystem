package com.smartcinema.admin;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;

/** Half-open local calendar periods; bounds protect the synchronous reporting workload. */
public record AdminReportQuery(LocalDate from, LocalDate to, Long cinemaId, Long movieId,
        Long showtimeId, Dimension dimension, int page, int size) {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public enum Dimension { CINEMA, MOVIE, SHOWTIME }

    public static AdminReportQuery parse(MultiValueMap<String,String> values, boolean breakdown) {
        var allowed = breakdown ? Set.of("from","to","cinemaId","movieId","showtimeId","dimension","page","size")
                : Set.of("from","to","cinemaId","movieId","showtimeId");
        values.forEach((key, list) -> {
            if (!allowed.contains(key) || list.size()!=1 || list.getFirst()==null || list.getFirst().isBlank()) throw invalid(key);
        });
        LocalDate from=date(values.getFirst("from"),"from"), to=date(values.getFirst("to"),"to");
        if (!from.isBefore(to) || ChronoUnit.DAYS.between(from,to)>366) throw invalid("to");
        Dimension dimension=null;
        if (breakdown) {
            try { dimension=Dimension.valueOf(values.getFirst("dimension")); }
            catch (IllegalArgumentException | NullPointerException failure) { throw invalid("dimension"); }
        }
        return new AdminReportQuery(from,to,optionalId(values,"cinemaId"),optionalId(values,"movieId"),
                optionalId(values,"showtimeId"),dimension,integer(values,"page",0,0,Integer.MAX_VALUE),
                integer(values,"size",20,1,100));
    }
    private static LocalDate date(String value,String field) {
        try {
            if (value==null || !value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw invalid(field);
            var result=LocalDate.parse(value);
            if (result.getYear()<1) throw invalid(field);
            return result;
        } catch (DateTimeParseException failure) { throw invalid(field); }
    }
    private static Long optionalId(MultiValueMap<String,String> values,String key) {
        return values.containsKey(key) ? id(values.getFirst(key),key) : null;
    }
    private static long id(String value,String field) {
        try {
            if (value==null || !value.matches("[1-9][0-9]{0,18}")) throw invalid(field);
            return Long.parseLong(value);
        } catch (NumberFormatException failure) { throw invalid(field); }
    }
    private static int integer(MultiValueMap<String,String> values,String key,int fallback,int min,int max) {
        if (!values.containsKey(key)) return fallback;
        try {
            String value=values.getFirst(key);
            if (!value.matches("0|[1-9][0-9]{0,9}")) throw invalid(key);
            int result=Integer.parseInt(value);
            if (result<min || result>max) throw invalid(key);
            return result;
        } catch (NumberFormatException failure) { throw invalid(key); }
    }
    public Instant start() { return from.atStartOfDay(ZONE).toInstant(); }
    public Instant end() { return to.atStartOfDay(ZONE).toInstant(); }
    public static long actor(Jwt jwt) {
        try { return id(jwt==null?null:jwt.getSubject(),null); }
        catch (AdminReportFailure failure) { throw new AdminReportFailure(403,null); }
    }
    private static AdminReportFailure invalid(String field) { return new AdminReportFailure(400,field); }
}
