package com.smartcinema.admin;

import java.util.*;
import com.smartcinema.movie.InvalidMovieRequestException;

/** Strict physical configuration inputs, using only approved existing columns. */
public final class AdminConfigurationRequest {
    private AdminConfigurationRequest() {}
    public record Cinema(String name,String address,String contact,String operatingInformation,String status) {}
    public record Hall(String name,int capacity,String type,String status) {}
    public record Seat(String row,String number,String type,String physicalStatus) {}
    public static Cinema cinema(Map<String,Object> body) {
        fields(body,Set.of("name","address","contact","operatingInformation","status"));
        return new Cinema(text(body,"name",150,true),text(body,"address",Integer.MAX_VALUE,true),
            text(body,"contact",255,false),text(body,"operatingInformation",Integer.MAX_VALUE,false),
            choice(body,"status",Set.of("ACTIVE","TEMPORARILY_CLOSED","INACTIVE")));
    }
    public static Hall hall(Map<String,Object> body) {
        fields(body,Set.of("name","capacity","type","status"));
        if (!(body.get("capacity") instanceof Integer capacity) || capacity<=0) throw invalid("capacity","Supply a positive integer people capacity.");
        return new Hall(text(body,"name",100,true),capacity,text(body,"type",50,true),
            choice(body,"status",Set.of("ACTIVE","MAINTENANCE","INACTIVE")));
    }
    public static Seat seat(Map<String,Object> body) {
        fields(body,Set.of("row","number","type","physicalStatus"));
        return new Seat(text(body,"row",20,true),text(body,"number",20,true),
            choice(body,"type",Set.of("STANDARD","VIP","COUPLE")),choice(body,"physicalStatus",Set.of("ACTIVE","MAINTENANCE","INACTIVE")));
    }
    public static List<Seat> layout(Map<String,Object> body) {
        fields(body,Set.of("units"));
        if (!(body.get("units") instanceof List<?> units) || units.isEmpty()) throw invalid("units","Supply a complete nonempty Seat Unit layout.");
        List<Seat> result=new ArrayList<>(); Set<String> identities=new HashSet<>();
        for(Object unit:units) {
            if (!(unit instanceof Map<?,?> map) || map.keySet().stream().anyMatch(key->!(key instanceof String))) throw invalid("units","Each Seat Unit must be an object.");
            Map<String,Object> values=new HashMap<>(); map.forEach((key,value)->values.put((String)key,value));
            Seat seat=seat(values);
            if (!identities.add(seat.row()+"\u0000"+seat.number())) throw invalid("units","Duplicate Seat identity within Hall.");
            result.add(seat);
        }
        return List.copyOf(result);
    }
    private static void fields(Map<String,Object> body,Set<String> allowed) {
        for(String key:body.keySet()) if (!allowed.contains(key)) throw invalid(key,"Unknown configuration field.");
    }
    private static String text(Map<String,Object> body,String field,int max,boolean required) {
        Object value=body.get(field);
        if (value==null && !required) return null;
        if (!(value instanceof String text)) throw invalid(field,"Supply a text value.");
        String normalized=text.strip();
        if (normalized.isEmpty() || normalized.indexOf('\u0000')>=0 || normalized.codePointCount(0,normalized.length())>max) throw invalid(field,"Supply nonblank text within the approved field length.");
        return normalized;
    }
    private static String choice(Map<String,Object> body,String field,Set<String> choices) {
        Object value=body.get(field);
        if (!(value instanceof String text) || !choices.contains(text)) throw invalid(field,"Use an approved configuration value.");
        return text;
    }
    private static InvalidMovieRequestException invalid(String field,String message) { return new InvalidMovieRequestException(field,message); }
}
