package com.smartcinema.staff;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.util.MultiValueMap;

public final class StaffPosRequest {
    private StaffPosRequest() { }
    public static void query(MultiValueMap<String,String> query,String... allowed) {
        if(!Set.of(allowed).containsAll(query.keySet()) || query.values().stream().anyMatch(v->v==null || v.size()!=1)) throw new StaffFailure(400);
    }
    public static long cinema(MultiValueMap<String,String> query) { return StaffRequest.id(query.getFirst("cinemaId")); }
    public static LocalDate date(String value) {
        if(value==null) return null;
        try { if(!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException(); var day=LocalDate.parse(value);if(day.getYear()<1) throw new IllegalArgumentException();return day; }
        catch(RuntimeException failure) { throw new StaffFailure(400); }
    }
    public static List<Long> ids(Map<String,Object> input,String key) {
        Object value=input.get(key);
        if(!(value instanceof List<?> list) || list.isEmpty()) throw new StaffFailure(400);
        var ids=new ArrayList<Long>();var unique=new HashSet<Long>();
        for(Object item:list) {
            if(!(item instanceof String text)) throw new StaffFailure(400);
            long id=StaffRequest.id(text);if(!unique.add(id)) throw new StaffFailure(400);ids.add(id);
        }
        return List.copyOf(ids);
    }
    public static BigDecimal amount(Map<String,Object> input) {
        String value=StaffRequest.text(input,"expectedAmount");
        if(!value.matches("(0|[1-9][0-9]{0,14})(\\.[0-9]{1,4})?")) throw new StaffFailure(400);
        return new BigDecimal(value);
    }
}
