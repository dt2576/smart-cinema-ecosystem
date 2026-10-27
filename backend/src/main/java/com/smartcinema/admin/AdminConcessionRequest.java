package com.smartcinema.admin;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;

public final class AdminConcessionRequest {
    static final int MAX_BODY_BYTES=1048576;
    private static final JsonMapper JSON=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private AdminConcessionRequest() { }
    public record Input(String name,String description,String category,BigDecimal sellingPrice,String status) {
        @Override public String toString() { return "AdminConcessionInput[redacted]"; }
    }
    public static Input create(AdminConcessionBody raw) {
        var body=body(raw,"name","description","category","sellingPrice","status");
        return content(body,status(body));
    }
    public static Input update(AdminConcessionBody raw) { return content(body(raw,"name","description","category","sellingPrice"),null); }
    public static String status(AdminConcessionBody raw) { return status(body(raw,"status")); }
    private static Input content(Map<String,Object> body,String status) {
        String name=text(body,"name",true),description=text(body,"description",false);
        if(name.codePointCount(0,name.length())>150) throw invalid("name");
        if(!(body.get("category") instanceof String category) || !Set.of("POPCORN","DRINK","COMBO").contains(category)) throw invalid("category");
        if(!(body.get("sellingPrice") instanceof String price) || !price.matches("(0|[1-9][0-9]{0,14})(\\.[0-9]{1,4})?")) throw invalid("sellingPrice");
        return new Input(name,description,category,new BigDecimal(price),status);
    }
    private static String status(Map<String,Object> body) {
        if(!(body.get("status") instanceof String status) || !Set.of("ACTIVE","INACTIVE").contains(status)) throw invalid("status");
        return status;
    }
    private static String text(Map<String,Object> body,String key,boolean required) {
        Object value=body.get(key); if(value==null && !required) return null;
        if(!(value instanceof String text)) throw invalid(key);
        String normalized=text.strip(); if(normalized.isEmpty()) throw invalid(key);
        for(int i=0;i<normalized.length();i++) {
            char c=normalized.charAt(i);
            if(c==0 || Character.isLowSurrogate(c)) throw invalid(key);
            if(Character.isHighSurrogate(c)) { if(++i>=normalized.length() || !Character.isLowSurrogate(normalized.charAt(i))) throw invalid(key); }
        }
        return normalized;
    }
    @SuppressWarnings("unchecked")
    private static Map<String,Object> body(AdminConcessionBody raw,String... keys) {
        try {
            if(raw==null || raw.value()==null || raw.value().getBytes(StandardCharsets.UTF_8).length>MAX_BODY_BYTES) throw invalid(null);
            Object value=JSON.readValue(raw.value(),Object.class);
            if(!(value instanceof Map<?,?> map) || !map.keySet().equals(Set.of(keys))) throw invalid(null);
            return (Map<String,Object>)map;
        } catch(AdminConcessionFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw invalid(null); }
    }
    public static long id(String value) {
        try { if(value==null || !value.matches("[1-9][0-9]{0,18}")) throw new NumberFormatException(); return Long.parseLong(value); }
        catch(NumberFormatException failure) { throw invalid("itemId"); }
    }
    public static long actor(Jwt jwt) {
        try { return id(jwt==null?null:jwt.getSubject()); }
        catch(AdminConcessionFailure failure) { throw new AdminConcessionFailure(403); }
    }
    public static void noQuery(MultiValueMap<String,String> query) { if(!query.isEmpty()) throw invalid(null); }
    private static AdminConcessionFailure invalid(String field) { return new AdminConcessionFailure(400,field); }
}
