package com.smartcinema.manager;

import java.time.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import com.smartcinema.admin.AdminShowtimeRequest;

public final class ManagerRequest {
    private static final JsonMapper JSON=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private ManagerRequest() { }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> body(byte[] raw) {
        try {
            if(raw==null||raw.length>1048576)throw new ManagerFailure(400);
            Object value=JSON.readValue(raw,Object.class);
            if(!(value instanceof Map<?,?> map))throw new ManagerFailure(400);
            return (Map<String,Object>)map;
        } catch(ManagerFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw new ManagerFailure(400); }
    }
    public static long id(String value) {
        try { if(value==null||!value.matches("[1-9][0-9]{0,18}"))throw new NumberFormatException();return Long.parseLong(value); }
        catch(NumberFormatException failure){throw new ManagerFailure(400);}
    }
    public static long actor(Jwt jwt) {
        try{return id(jwt==null?null:jwt.getSubject());}catch(ManagerFailure failure){throw new ManagerFailure(403);}
    }
    public static void noQuery(MultiValueMap<String,String> query) { if(!query.isEmpty())throw new ManagerFailure(400); }
    public static AdminShowtimeRequest.Filter filter(MultiValueMap<String,String> query) {
        for(String key:List.of("movieId","cinemaId","hallId"))if(query.containsKey(key))id(query.getFirst(key));
        return AdminShowtimeRequest.filter(query);
    }
    public static AdminShowtimeRequest.Input showtime(byte[] raw) {
        var value=body(raw);id(value.get("movieId") instanceof String s?s:null);id(value.get("hallId") instanceof String s?s:null);
        return AdminShowtimeRequest.parse(value);
    }
    public record Assignment(long cinemaId,Instant effectiveAt) { }
    public static Assignment assignment(byte[] raw) {
        var value=body(raw);if(!value.keySet().equals(Set.of("cinemaId","effectiveAt")))throw new ManagerFailure(400);
        long cinema=id(value.get("cinemaId") instanceof String s?s:null);
        try {
            if(!(value.get("effectiveAt") instanceof String s))throw new ManagerFailure(400);
            var instant=OffsetDateTime.parse(s);
            if(instant.getYear()<1||instant.getYear()>9999||instant.getNano()%1000!=0)throw new ManagerFailure(400);
            return new Assignment(cinema,instant.toInstant());
        }catch(DateTimeException failure){throw new ManagerFailure(400);}
    }
    public static String status(byte[] raw) {
        var value=body(raw);
        if(!value.keySet().equals(Set.of("status"))||!(value.get("status") instanceof String s)||!Set.of("ACTIVE","INACTIVE").contains(s))throw new ManagerFailure(400);
        return s;
    }
}
