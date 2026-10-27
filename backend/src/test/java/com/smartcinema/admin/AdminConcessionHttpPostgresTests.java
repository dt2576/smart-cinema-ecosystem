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
@EnabledIfEnvironmentVariable(named="ADMIN_CONCESSION_DB_TESTS",matches="true")
class AdminConcessionHttpPostgresTests {
    private static final String BASE="/api/v1/admin/concession-items";
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private static final String RUN=UUID.randomUUID().toString();
    private static final List<Map<String,Object>> calls=new ArrayList<>();
    private static HttpClient client;
    private static String adminToken;
    private static long adminId;
    @BeforeAll static void connect()throws Exception {
        LocalConcessionTestSupport.preflight();
        System.setProperty("jdk.httpclient.disableRetryConnect","true");
        client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
        var credential=LocalConcessionTestSupport.read(Path.of(".env.local-test-admin"));
        assertThat(credential.getProperty("DEV_ADMIN_EMAIL").endsWith("@example.test")).as("Approved synthetic ADMIN account").isTrue();
        JsonNode login=login(credential.getProperty("DEV_ADMIN_EMAIL"),credential.getProperty("DEV_ADMIN_PASSWORD"));
        adminToken=login.get("accessToken").asText();adminId=Long.parseLong(login.get("userId").asText());
        assertThat(login.get("role").asText()).isEqualTo("ADMIN");
    }
    @AfterAll static void finish()throws Exception {
        try {
            LocalConcessionTestSupport.verifyPreserved();
            save();System.out.println("REAL_HTTP_REQUESTS="+calls.size()+"; evidence="+evidence());
        }finally {if(client!=null)client.close();adminToken=null;}
    }
    private static Path evidence(){return LocalConcessionTestSupport.EVIDENCE.resolve("http-"+RUN+".json");}
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
    private static Map<String,Object> body(String name,Object price,String status) {
        var map=new LinkedHashMap<String,Object>();map.put("name",name);map.put("description",null);map.put("category","POPCORN");map.put("sellingPrice",price);if(status!=null)map.put("status",status);return map;
    }
    private static String id(JsonNode item) {
        assertThat(item.get("id").isTextual()).isTrue();String id=item.get("id").asText();assertThat(id).matches("[1-9][0-9]*");return id;
    }
    private static boolean includes(JsonNode catalog,String id){for(var item:catalog)if(id.equals(item.get("id").asText()))return true;return false;}
    private static String sql(String statement,Object... args)throws Exception {
        try(var db=LocalConcessionTestSupport.operator()){db.setReadOnly(true);return LocalConcessionTestSupport.scalar(db,statement,args);}
    }
    private static long audits(String id)throws Exception{return Long.parseLong(sql("SELECT count(*) FROM audit_records WHERE resource_type='CONCESSION_ITEM' AND resource_id=?",Long.parseLong(id)));}

    @Test void allFiveEndpointsPersistExactPricesValidateAndAudit()throws Exception {
        String name="Phase5B HTTP "+RUN;
        var createResponse=send("POST",BASE,adminToken,body(name,"1.1234","ACTIVE"),201);var created=json(createResponse);String id=id(created);
        assertThat(createResponse.headers().firstValue("location").orElse("")).isEqualTo(BASE+"/"+id);
        assertThat(created.get("sellingPrice").isTextual()).isTrue();assertThat(created.get("sellingPrice").asText()).isEqualTo("1.1234");
        assertThat(created.get("imageUrl").isNull()).isTrue();String createdAt=created.get("createdAt").asText();
        assertThat(json(send("GET",BASE+"/"+id,adminToken,null,200)).get("name").asText()).isEqualTo(name);
        assertThat(includes(json(send("GET",BASE,adminToken,null,200)),id)).isTrue();
        assertThat(includes(json(send("GET","/api/v1/concession-items",null,null,200)),id)).isTrue();
        assertThat(includes(json(raw("GET",BASE,adminToken,null,200,"http://127.0.0.1:3000")),id)).isTrue();
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","INACTIVE"),200);
        assertThat(includes(json(send("GET","/api/v1/concession-items",null,null,200)),id)).isFalse();
        assertThat(includes(json(send("GET",BASE,adminToken,null,200)),id)).isTrue();
        var update=body(name+" updated","2.0001",null);update.put("description","local-private-description");update.put("category","COMBO");
        var updated=json(send("PUT",BASE+"/"+id,adminToken,update,200));
        assertThat(updated.get("status").asText()).isEqualTo("INACTIVE");assertThat(updated.get("createdAt").asText()).isEqualTo(createdAt);assertThat(updated.get("imageUrl").isNull()).isTrue();
        var active=json(send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","ACTIVE"),200));
        assertThat(active.get("sellingPrice").asText()).isEqualTo("2.0001");assertThat(active.get("name").asText()).isEqualTo(name+" updated");
        assertThat(includes(json(send("GET","/api/v1/concession-items",null,null,200)),id)).isTrue();
        assertThat(sql("SELECT name||':'||selling_price::text||':'||status FROM concession_items WHERE id=?",Long.parseLong(id))).isEqualTo(name+" updated:2.0001:ACTIVE");
        assertThat(audits(id)).isEqualTo(4);
        assertThat(sql("SELECT count(*) FROM audit_records WHERE resource_type='CONCESSION_ITEM' AND resource_id=? AND actor_user_id=?",Long.parseLong(id),adminId)).isEqualTo("4");
        String delta=sql("SELECT metadata::text FROM audit_records WHERE resource_type='CONCESSION_ITEM' AND resource_id=? AND action='CONCESSION_UPDATED'",Long.parseLong(id));
        assertThat(delta).contains("1.1234","2.0001","sellingPrice").doesNotContain("local-private-description",name,"password");
        assertThat(json(send("PUT",BASE+"/"+id,adminToken,update,200)).get("updatedAt").asText()).isEqualTo(active.get("updatedAt").asText());
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","ACTIVE"),200);assertThat(audits(id)).isEqualTo(4);

        String maxId=id(json(send("POST",BASE,adminToken,body(name,"999999999999999.9999","INACTIVE"),201)));
        String zeroId=id(json(send("POST",BASE,adminToken,body(name,"0","ACTIVE"),201)));
        assertThat(maxId).isNotEqualTo(zeroId);
        assertThat(sql("SELECT selling_price::text FROM concession_items WHERE id=?",Long.parseLong(maxId))).isEqualTo("999999999999999.9999");
        assertThat(sql("SELECT selling_price::text FROM concession_items WHERE id=?",Long.parseLong(zeroId))).isEqualTo("0.0000");
        String before=sql("SELECT count(*) FROM concession_items");String beforeAudit=sql("SELECT count(*) FROM audit_records WHERE resource_type='CONCESSION_ITEM'");
        for(Object invalid:List.of("-1","1.00001","1000000000000000","NaN","Infinity","01","1e3",1.25))send("POST",BASE,adminToken,body(name,invalid,"ACTIVE"),400);
        for(String invalidName:List.of(" ","a".repeat(151),"😀".repeat(151)))send("POST",BASE,adminToken,body(invalidName,"1","ACTIVE"),400);
        var missing=body(name,"1","ACTIVE");missing.remove("name");send("POST",BASE,adminToken,missing,400);
        send("POST",BASE,adminToken,body(name,"1",null),400);
        var extra=body(name,"1","ACTIVE");extra.put("imageUrl","/unsupported.png");send("POST",BASE,adminToken,extra,400);
        var category=body(name,"1","ACTIVE");category.put("category","UNSUPPORTED");send("POST",BASE,adminToken,category,400);
        send("POST",BASE,adminToken,body(name,"1","DELETED"),400);
        send("PUT",BASE+"/"+id,adminToken,body(name,"1","ACTIVE"),400);
        send("PUT",BASE+"/"+id+"/status",adminToken,Map.of("status","ACTIVE","name","extra"),400);
        for(String malformed:List.of("{\"name\":\"a\",\"name\":\"b\"}","{} {}","{not-json}"))raw("POST",BASE,adminToken,malformed.getBytes(StandardCharsets.UTF_8),400,"http://127.0.0.1:8080");
        raw("POST",BASE,adminToken,new byte[]{(byte)0xc3,0x28},400,"http://127.0.0.1:8080");
        raw("POST",BASE,adminToken,new byte[AdminConcessionRequest.MAX_BODY_BYTES+1],400,"http://127.0.0.1:8080");
        send("GET",BASE+"?sort=name",adminToken,null,400);
        for(String invalidId:List.of("0","01","-1","9223372036854775808","not-a-number"))send("GET",BASE+"/"+invalidId,adminToken,null,400);
        send("GET",BASE+"/9223372036854775807",adminToken,null,404);
        assertThat(sql("SELECT count(*) FROM concession_items")).isEqualTo(before);assertThat(sql("SELECT count(*) FROM audit_records WHERE resource_type='CONCESSION_ITEM'")).isEqualTo(beforeAudit);
        assertThat(json(send("GET",BASE+"/"+id,adminToken,null,200)).get("sellingPrice").asText()).isEqualTo("2.0001");
    }

    @Test void authenticationAndEveryRoleAndBlockedAdminAreEnforcedOnAllFiveEndpoints()throws Exception {
        String id=id(json(send("POST",BASE,adminToken,body("Phase5B auth "+RUN,"1","ACTIVE"),201)));
        deniedOnAllFive(id,null,401);send("GET",BASE,"tampered-token",null,401);
        for(String role:List.of("CUSTOMER","STAFF","MANAGER","ADMIN")) {
            String password="LocalTest-"+UUID.randomUUID();String email="phase5b-http-"+UUID.randomUUID()+"@example.test";
            long actor;
            try(var db=LocalConcessionTestSupport.operator()) {
                actor=Long.parseLong(LocalConcessionTestSupport.scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,?,'Phase5B HTTP synthetic','0910000000',?,'ACTIVE') RETURNING id",email,new BCryptPasswordEncoder().encode(password),role));
            }
            var login=login(email,password);String token=login.get("accessToken").asText();
            if(role.equals("ADMIN"))try(var db=LocalConcessionTestSupport.operator()) {
                assertThat(LocalConcessionTestSupport.scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? AND email=? RETURNING id",actor,email)).isEqualTo(Long.toString(actor));
            }
            deniedOnAllFive(id,token,403);
            if(role.equals("CUSTOMER"))send("GET","/api/v1/concession-items",token,null,200);
        }
        assertThat(audits(id)).isEqualTo(1);
        assertThat(json(send("GET",BASE+"/"+id,adminToken,null,200)).get("status").asText()).isEqualTo("ACTIVE");
    }
    private static void deniedOnAllFive(String id,String token,int expected)throws Exception {
        send("GET",BASE,token,null,expected);send("GET",BASE+"/"+id,token,null,expected);
        send("POST",BASE,token,body("Must not persist","1","ACTIVE"),expected);
        send("PUT",BASE+"/"+id,token,body("Must not persist","1",null),expected);
        send("PUT",BASE+"/"+id+"/status",token,Map.of("status","INACTIVE"),expected);
    }

    @Test void customerHttpCompositionRetainsSnapshotsOwnershipExpiryAndPaymentFreeze()throws Exception {
        JsonNode customer=customerLogin();long customerId=Long.parseLong(customer.get("userId").asText());String token=customer.get("accessToken").asText();
        String bookingId=unpaidBooking(customerId);String route="/api/v1/bookings/"+bookingId;
        var booking=json(send("GET",route,token,null,200));String expires=booking.get("expiresAt").asText();
        String itemId=id(json(send("POST",BASE,adminToken,body("Phase5B Customer "+RUN,"1.2345","ACTIVE"),201)));
        var added=json(send("POST",route+"/concessions",token,Map.of("itemId",itemId,"quantity",2),200));
        String lineId=added.get("concessions").get(0).get("id").asText();
        assertThat(added.get("concessionAmount").asText()).isEqualTo("2.4690");
        assertThat(added.get("concessions").get(0).get("unitPrice").asText()).isEqualTo("1.2345");
        send("PUT",BASE+"/"+itemId,adminToken,body("Phase5B Customer changed "+RUN,"9",null),200);
        send("PUT",BASE+"/"+itemId+"/status",adminToken,Map.of("status","INACTIVE"),200);
        var quantity=json(send("PATCH",route+"/concessions/"+lineId,token,Map.of("quantity",3),200));
        assertThat(quantity.get("concessionAmount").asText()).isEqualTo("3.7035");
        assertThat(quantity.get("concessions").get(0).get("name").asText()).isEqualTo("Phase5B Customer "+RUN);
        assertThat(quantity.get("expiresAt").asText()).isEqualTo(expires);
        var removed=json(send("DELETE",route+"/concessions/"+lineId,token,null,200));
        assertThat(removed.get("concessions").size()).isZero();assertThat(removed.get("finalAmount").asText()).isEqualTo("10.0000");
        send("POST",route+"/concessions",token,Map.of("itemId",itemId,"quantity",1),409);
        send("PUT",BASE+"/"+itemId+"/status",adminToken,Map.of("status","ACTIVE"),200);
        var readded=json(send("POST",route+"/concessions",token,Map.of("itemId",itemId,"quantity",1),200));
        lineId=readded.get("concessions").get(0).get("id").asText();assertThat(readded.get("concessions").get(0).get("unitPrice").asText()).isEqualTo("9.0000");
        var other=customerLogin();String foreignToken=other.get("accessToken").asText();
        send("GET",route,foreignToken,null,404);send("PATCH",route+"/concessions/"+lineId,foreignToken,Map.of("quantity",2),404);
        try(var db=LocalConcessionTestSupport.runtime()) { LocalConcessionTestSupport.scalar(db,"SELECT initiate_payment(?,?)",Long.parseLong(bookingId),customerId); }
        send("POST",route+"/concessions",token,Map.of("itemId",itemId,"quantity",1),409);
        send("PATCH",route+"/concessions/"+lineId,token,Map.of("quantity",2),409);
        send("DELETE",route+"/concessions/"+lineId,token,null,409);
        var frozen=json(send("GET",route,token,null,200));
        assertThat(frozen.get("paymentStartedAt").isNull()).isFalse();assertThat(frozen.get("status").asText()).isEqualTo("PENDING");
        assertThat(frozen.get("expiresAt").asText()).isEqualTo(expires);assertThat(frozen.get("finalAmount").asText()).isEqualTo("19.0000");
        assertThat(sql("SELECT status FROM payment_transactions WHERE booking_id=?",Long.parseLong(bookingId))).isEqualTo("INITIATED");
        assertThat(sql("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",Long.parseLong(bookingId))).isEqualTo("0");
    }
    private static JsonNode customerLogin()throws Exception {
        String email="phase5b-customer-"+UUID.randomUUID()+"@example.test",password="LocalTest-"+UUID.randomUUID();
        try(var db=LocalConcessionTestSupport.operator()) {
            LocalConcessionTestSupport.scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,?,'Phase5B Customer synthetic','0910000000','CUSTOMER','ACTIVE') RETURNING id",email,new BCryptPasswordEncoder().encode(password));
        }
        return login(email,password);
    }
    private static String unpaidBooking(long customer)throws Exception {
        long movie,cinema,hall,showtime,seat;
        try(var db=LocalConcessionTestSupport.operator()) {
            movie=Long.parseLong(LocalConcessionTestSupport.scalar(db,"INSERT INTO movies(title,duration,status) VALUES ('Phase5B HTTP synthetic',60,'PUBLISHED') RETURNING id"));
            cinema=Long.parseLong(LocalConcessionTestSupport.scalar(db,"INSERT INTO cinemas(name,address,status) VALUES ('Phase5B HTTP synthetic','Local test','ACTIVE') RETURNING id"));
            hall=Long.parseLong(LocalConcessionTestSupport.scalar(db,"INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Phase5B HTTP hall',1,'Configured','ACTIVE') RETURNING id",cinema));
            showtime=Long.parseLong(LocalConcessionTestSupport.scalar(db,"INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off) VALUES (?,?,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',statement_timestamp()+interval '2 hours',10,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id",movie,hall));
            LocalConcessionTestSupport.scalar(db,"SELECT initialize_hall_seats(?,CAST(? AS jsonb))",hall,"[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"}]");
            seat=Long.parseLong(LocalConcessionTestSupport.scalar(db,"SELECT id FROM seats WHERE hall_id=?",hall));
            LocalConcessionTestSupport.scalar(db,"SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",showtime,"{"+seat+"}");
        }
        try(var db=LocalConcessionTestSupport.runtime()) {
            String hold=LocalConcessionTestSupport.scalar(db,"SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '10 minutes')",showtime,customer,"{"+seat+"}");
            return LocalConcessionTestSupport.scalar(db,"SELECT create_booking(?,?,CAST(? AS bigint[]))",showtime,customer,"{"+hold+"}");
        }
    }
}
