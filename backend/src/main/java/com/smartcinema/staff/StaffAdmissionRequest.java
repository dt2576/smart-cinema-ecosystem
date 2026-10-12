package com.smartcinema.staff;

import java.util.*;
import org.springframework.util.MultiValueMap;

/** Contract-local validation; opaque tokens are never transformed. */
public final class StaffAdmissionRequest {
    private StaffAdmissionRequest() { }
    public static String qr(Map<String,Object> body) {
        String value=StaffRequest.text(body,"bookingQr");
        if (!safeText(value,128)) throw new StaffFailure(400);
        return value;
    }
    static boolean safeText(String value,int max) {
        if(value==null || value.isBlank() || value.codePointCount(0,value.length())>max) return false;
        for(int i=0;i<value.length();) {
            char c=value.charAt(i);
            if(Character.isLowSurrogate(c) || (Character.isHighSurrogate(c) && (i+1==value.length() || !Character.isLowSurrogate(value.charAt(i+1))))) return false;
            int point=value.codePointAt(i); if(Character.isISOControl(point)) return false; i+=Character.charCount(point);
        }
        return true;
    }
    public static List<Long> tickets(Map<String,Object> body) {
        if(!(body.get("ticketIds") instanceof List<?> values) || values.isEmpty()) throw new StaffFailure(400);
        var ids=new ArrayList<Long>(); var unique=new HashSet<Long>();
        for(Object value:values) {
            if(!(value instanceof String text)) throw new StaffFailure(400);
            long id=StaffRequest.id(text); if(!unique.add(id)) throw new StaffFailure(400); ids.add(id);
        }
        return List.copyOf(ids);
    }
    public static long cinema(MultiValueMap<String,String> query) {
        if(!query.keySet().equals(Set.of("cinemaId")) || query.get("cinemaId").size()!=1) throw new StaffFailure(400);
        return StaffRequest.id(query.getFirst("cinemaId"));
    }
}
