package com.smartcinema.manager;

import java.time.*;
import java.util.Set;
import org.springframework.util.MultiValueMap;

/** Optional exact filters; creation period is [createdFrom, createdTo) in explicit-offset instants. */
public record ManagerBookingQuery(Long cinemaId, Long showtimeId, Long bookingId, String bookingCode,
        String status, String paymentStatus, Instant createdFrom, Instant createdTo, int page, int size) {
    public static ManagerBookingQuery parse(MultiValueMap<String,String> values) {
        var keys=Set.of("cinemaId","showtimeId","bookingId","bookingCode","status","paymentStatus","createdFrom","createdTo","page","size");
        values.forEach((key,list)->{if(!keys.contains(key)||list==null||list.size()!=1||list.getFirst()==null||list.getFirst().isBlank())throw new ManagerFailure(400);});
        String code=values.getFirst("bookingCode");
        if(code!=null&&(code.codePointCount(0,code.length())>40||code.codePoints().anyMatch(Character::isISOControl)))throw new ManagerFailure(400);
        String status=state(values,"status",Set.of("PENDING","PAID","EXPIRED","CANCELLED"));
        String payment=state(values,"paymentStatus",Set.of("INITIATED","PENDING","SUCCESS","FAILED","CANCELLED"));
        Instant from=instant(values.getFirst("createdFrom")),to=instant(values.getFirst("createdTo"));
        if(from!=null&&to!=null&&!from.isBefore(to))throw new ManagerFailure(400);
        return new ManagerBookingQuery(id(values,"cinemaId"),id(values,"showtimeId"),id(values,"bookingId"),code,status,payment,from,to,
                number(values,"page",0,0,Integer.MAX_VALUE),number(values,"size",20,1,100));
    }
    private static Long id(MultiValueMap<String,String> values,String key){return values.containsKey(key)?ManagerRequest.id(values.getFirst(key)):null;}
    private static String state(MultiValueMap<String,String> values,String key,Set<String> allowed){String value=values.getFirst(key);if(value!=null&&!allowed.contains(value))throw new ManagerFailure(400);return value;}
    private static Instant instant(String value){
        if(value==null)return null;
        try {var parsed=OffsetDateTime.parse(value);if(parsed.getYear()<1||parsed.getYear()>9999||parsed.getNano()%1000!=0)throw new ManagerFailure(400);return parsed.toInstant();}
        catch(DateTimeException failure){throw new ManagerFailure(400);}
    }
    private static int number(MultiValueMap<String,String> values,String key,int fallback,int min,int max){
        if(!values.containsKey(key))return fallback;
        try{String value=values.getFirst(key);if(!value.matches("0|[1-9][0-9]{0,9}"))throw new NumberFormatException();int parsed=Integer.parseInt(value);if(parsed<min||parsed>max)throw new NumberFormatException();return parsed;}
        catch(NumberFormatException failure){throw new ManagerFailure(400);}
    }
    public long offset(){return (long)page*size;}
}
