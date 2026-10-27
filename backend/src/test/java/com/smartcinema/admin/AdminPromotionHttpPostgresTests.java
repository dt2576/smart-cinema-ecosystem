package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Unmocked HTTP to the already-running local application and SQL audit/persistence assertions. */
@EnabledIfEnvironmentVariable(named="ADMIN_PROMOTION_DB_TESTS",matches="true")
class AdminPromotionHttpPostgresTests {
    private static final String BASE="/api/v1/admin/promotions";
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private static final String RUN=UUID.randomUUID().toString().toUpperCase(Locale.ROOT);
    private static final List<Map<String,Object>> calls=new ArrayList<>();
    private static HttpClient client;
    private static String adminToken;
    private static long adminId;
    @BeforeAll static void connect()throws Exception {
        LocalPromotionTestSupport.preflight();
        System.setProperty("jdk.httpclient.disableRetryConnect","true");
        client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
        var credential=LocalPromotionTestSupport.read(Path.of(".env.local-test-admin"));
        assertThat(credential.getProperty("DEV_ADMIN_EMAIL").endsWith("@example.test")).as("Approved synthetic ADMIN account").isTrue();
        JsonNode login=login(credential.getProperty("DEV_ADMIN_EMAIL"),credential.getProperty("DEV_ADMIN_PASSWORD"));
        adminToken=login.get("accessToken").asText();adminId=Long.parseLong(login.get("userId").asText());
        assertThat(login.get("role").asText()).isEqualTo("ADMIN");
    }

    private static Map<String,Object> body(String code, String type, String value, String status) {
        var b=new LinkedHashMap<String,Object>();
        if(code!=null)b.put("code",code);
        b.put("discountType",type);b.put("discountValue",value);
        b.put("validFrom","2020-01-01T07:00:00+07:00");b.put("validUntil","2099-01-01T00:00:00Z");
        b.put("minimumOrderAmount","0");b.put("usageLimit",null);b.put("maxDiscountAmount",null);
        if(status!=null)b.put("status",status);return b;
    }
    private static String sql(String statement,Object... args)throws Exception {
        try(var db=LocalPromotionTestSupport.operator()){db.setReadOnly(true);return LocalPromotionTestSupport.scalar(db,statement,args);}
    }
    private static long audits(String id)throws Exception{return Long.parseLong(sql("SELECT count(*) FROM audit_records WHERE resource_type='PROMOTION' AND resource_id=?",Long.parseLong(id)));}
    private static JsonNode created(String code) throws Exception {
        var result=send("POST",BASE,adminToken,body(code,"FIXED_AMOUNT","1.1234","ACTIVE"),201);
        var p=json(result);assertThat(p.get("id").isTextual()).isTrue();
        assertThat(result.headers().firstValue("location").orElse("")).isEqualTo(BASE+"/"+p.get("id").asText());return p;
    }
    @Test void fiveEndpointsExactAmountsValidationAndAudit() throws Exception {
        String code="QA-HTTP-"+RUN;var p=created(code);String id=p.get("id").asText();
        assertThat(p.get("discountValue").asText()).isEqualTo("1.1234");assertThat(p.get("validFrom").asText()).isEqualTo("2020-01-01T00:00:00Z");
        assertThat(json(send("GET",BASE+"/"+id,adminToken,null,200))).isEqualTo(p);
        boolean found=false;for(var row:json(send("GET",BASE,adminToken,null,200)))if(row.get("id").asText().equals(id))found=true;assertThat(found).isTrue();
        var update=body(null,"PERCENTAGE","12.1234",null);update.put("maxDiscountAmount","9.4321");update.put("usageLimit",2);
        send("PUT",BASE+"/"+id,adminToken,update,200);send("PUT",BASE+"/"+id,adminToken,update,200);assertThat(audits(id)).isEqualTo(2);
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","INACTIVE"),200);send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","INACTIVE"),200);send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","ACTIVE"),200);assertThat(audits(id)).isEqualTo(4);
        var persisted=json(send("GET",BASE+"/"+id,adminToken,null,200));assertThat(persisted.get("discountValue").asText()).isEqualTo("12.1234");assertThat(persisted.get("maxDiscountAmount").asText()).isEqualTo("9.4321");assertThat(persisted.get("code").asText()).isEqualTo(code);
        send("POST",BASE,adminToken,body(code,"FIXED_AMOUNT","1","ACTIVE"),409);
        for(String value:List.of("-1","01","1e2","100.0001","0.00001","1000000000000000")){var invalid=new LinkedHashMap<>(update);invalid.put("discountValue",value);send("PUT",BASE+"/"+id,adminToken,invalid,400);}
        var numeric=new LinkedHashMap<>(update);numeric.put("discountValue",12);send("PUT",BASE+"/"+id,adminToken,numeric,400);
        var rename=new LinkedHashMap<>(update);rename.put("code","RENAME");send("PUT",BASE+"/"+id,adminToken,rename,400);
        var badTime=new LinkedHashMap<>(update);badTime.put("validUntil","2010-01-01T00:00:00Z");send("PUT",BASE+"/"+id,adminToken,badTime,400);
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","EXPIRED"),400);
        send("GET",BASE+"/01",adminToken,null,400);send("GET",BASE+"?page=1",adminToken,null,400);send("GET",BASE+"/9223372036854775807",adminToken,null,404);send("DELETE",BASE+"/"+id,adminToken,null,405);
        assertThat(json(send("GET",BASE+"/"+id,adminToken,null,200))).isEqualTo(persisted);assertThat(audits(id)).isEqualTo(4);
        assertThat(sql("SELECT metadata::text FROM audit_records WHERE resource_type='PROMOTION' AND resource_id=? AND action='PROMOTION_UPDATED'",Long.parseLong(id))).contains("1.1234","12.1234","changedFields");
        raw("GET",BASE+"/"+id,adminToken,null,200,"http://127.0.0.1:3000");
    }
    private static void denied(String id,String token,int status)throws Exception {
        send("GET",BASE,token,null,status);send("GET",BASE+"/"+id,token,null,status);
        send("POST",BASE,token,body("QA-DENIED-"+RUN,"FIXED_AMOUNT","1","ACTIVE"),status);
        send("PUT",BASE+"/"+id,token,body(null,"FIXED_AMOUNT","1",null),status);
        send("PUT",BASE+"/"+id+"/status",token,Map.of("status","INACTIVE"),status);
    }
    private static JsonNode newLogin(String role) throws Exception {
        String email="qa-promo-http-"+UUID.randomUUID()+"@example.test",password="QA-"+UUID.randomUUID();
        try(var db=LocalPromotionTestSupport.operator()) {LocalPromotionTestSupport.scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,?,'QA Promotion HTTP','0910000000',?,'ACTIVE') RETURNING id",email,new BCryptPasswordEncoder().encode(password),role);}
        return login(email,password);
    }
    @Test void realAuthenticationEveryRoleAndCurrentBlockedAdmin() throws Exception {
        String id=created("QA-AUTH-"+RUN).get("id").asText();denied(id,null,401);send("GET",BASE,"tampered-token",null,401);
        for(String role:List.of("CUSTOMER","STAFF","MANAGER","ADMIN")) {
            var login=newLogin(role);String token=login.get("accessToken").asText();
            if(role.equals("ADMIN"))try(var db=LocalPromotionTestSupport.operator()){LocalPromotionTestSupport.scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",login.get("userId").asLong());}
            denied(id,token,403);
        }
        assertThat(audits(id)).isEqualTo(1);
    }
    @Test void customerHttpSnapshotReviewFreezeAndOwnership() throws Exception {
        var login=newLogin("CUSTOMER");String token=login.get("accessToken").asText();long customer=login.get("userId").asLong();
        long b=AdminPromotionPostgresTests.booking(customer);String path="/api/v1/bookings/"+b;
        String code="QA-CUSTOMER-"+RUN,id=created(code).get("id").asText();
        var applied=json(send("PUT",path+"/promotion",token,Map.of("code",code),200));
        assertThat(applied.get("discount").asText()).isEqualTo("1.1234");String expiry=applied.get("expiresAt").asText();
        send("PUT",BASE+"/"+id,adminToken,body(null,"FIXED_AMOUNT","2.1234",null),200);
        var saved=json(send("GET",path,token,null,200));assertThat(saved.get("discount").asText()).isEqualTo("1.1234");assertThat(saved.get("expiresAt").asText()).isEqualTo(expiry);
        send("POST",path+"/payment-transactions",token,Map.of(),409);
        var refreshed=json(send("PUT",path+"/promotion",token,Map.of("code",code),200));assertThat(refreshed.get("discount").asText()).isEqualTo("2.1234");
        var payment=json(send("POST",path+"/payment-transactions",token,Map.of(),200));assertThat(payment.get("status").asText()).isEqualTo("INITIATED");
        var frozen=json(send("GET",path,token,null,200));
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","INACTIVE"),200);
        send("PUT",path+"/promotion",token,Map.of("code",code),409);send("DELETE",path+"/promotion",token,null,409);
        var other=newLogin("CUSTOMER");send("PUT",path+"/promotion",other.get("accessToken").asText(),Map.of("code",code),404);
        var reread=json(send("GET",path,token,null,200));
        // serverTime is intentionally fresh on each owned read, never part of the persisted snapshot.
        for(String field:List.of("id","status","expiresAt","paymentStartedAt","seatAmount","concessionAmount","subtotal","discount","finalAmount","promotion","seats","concessions"))
            assertThat(reread.get(field)).as("Frozen HTTP field %s",field).isEqualTo(frozen.get(field));
        send("GET","/api/v1/concession-items",null,null,200);
        assertThat(sql("SELECT count(*) FROM tickets t JOIN booking_seats s ON s.id=t.booking_seat_id WHERE s.booking_id=?",b)).isEqualTo("0");
    }

    @AfterAll static void finish()throws Exception {
        try {
            LocalPromotionTestSupport.verifyPreserved();
            save();System.out.println("REAL_HTTP_REQUESTS="+calls.size()+"; evidence="+evidence());
        }finally {if(client!=null)client.close();adminToken=null;}
    }
    private static Path evidence(){return LocalPromotionTestSupport.EVIDENCE.resolve("http-"+RUN+".json");}
    private static void save()throws Exception {
        Files.writeString(evidence(),JSON.writeValueAsString(Map.of("run",RUN,"at",Instant.now().toString(),"mocked",false,"requests",calls)),StandardCharsets.UTF_8);
    }
    private static JsonNode login(String email,String password)throws Exception {
        JsonNode login=json(send("POST","/api/v1/auth/tokens",null,Map.of("email",email,"password",password),200));
        assertThat(login.has("accessToken")&&login.get("accessToken").isTextual()).as("Actual backend-issued access token").isTrue();
        return login;
    }
    private static HttpResponse<String> send(String method,String path,String token,Object body,int expected)throws Exception {
        return raw(method,path,token,body==null?null:JSON.writeValueAsString(body).getBytes(StandardCharsets.UTF_8),expected,"http://127.0.0.1:8080");
    }
    private static HttpResponse<String> raw(String method,String path,String token,byte[] body,int expected,String origin)throws Exception {
        assertThat(Set.of("http://127.0.0.1:8080","http://127.0.0.1:3000").contains(origin)).isTrue();
        var record=new LinkedHashMap<String,Object>();record.put("method",method);record.put("path",path);record.put("authenticated",token!=null);record.put("origin",origin);record.put("outcome","ATTEMPTED");calls.add(record);save();
        var request=HttpRequest.newBuilder(URI.create(origin+path)).timeout(Duration.ofSeconds(15)).header("Accept","application/json");
        if(token!=null)request.header("Authorization","Bearer "+token);
        if(body!=null)request.header("Content-Type","application/json");
        var response=client.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(body)).build(),HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        record.put("outcome","RECEIVED");record.put("status",response.statusCode());record.put("expected",expected);save();
        assertThat(response.statusCode()).as("Real %s %s; body/tokens withheld",method,path).isEqualTo(expected);
        if(path.startsWith(BASE)||path.equals("/api/v1/concession-items"))assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
        return response;
    }
    private static JsonNode json(HttpResponse<String> response){return JSON.readTree(response.body());}

}
