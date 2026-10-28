package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static com.smartcinema.manager.LocalManagerTestSupport.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Unmocked HTTP to the running local Spring Boot; only separately approved fresh QA rows. */
@EnabledIfEnvironmentVariable(named="MANAGER_HTTP_TESTS",matches="true")
class ManagerOperationsHttpPostgresTests {
    static final JsonMapper JSON=JsonMapper.builder().build();
    static final String ROOT="/api/v1/manager",ADMIN="/api/v1/admin/managers";
    static final List<Map<String,Object>> CALLS=new ArrayList<>();
    static HttpClient CLIENT;
    long admin,manager,cinema,foreignCinema,hall,foreignHall,assignment,movie;
    String adminToken,managerToken;
    final Instant start=Instant.now().plusSeconds(86400*40).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
    @BeforeAll static void ready()throws Exception{
        preflight();System.setProperty("jdk.httpclient.disableRetryConnect","true");
        CLIENT=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
    }
    @AfterAll static void finish()throws Exception{preserved();Files.writeString(EVIDENCE.resolve("real-http.json"),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(CALLS),StandardCharsets.UTF_8);}
    @BeforeEach void fixtures()throws Exception{
        var a=account("ADMIN");admin=a.id();adminToken=login(a);
        var m=account("MANAGER");manager=m.id();managerToken=login(m);
        cinema=cinema(admin);foreignCinema=cinema(admin);
        assignment=send("POST",ADMIN+"/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(cinema),"effectiveAt",Instant.now().minusSeconds(60).truncatedTo(java.time.temporal.ChronoUnit.MICROS).toString()),201).get("id").asLong();
        hall=send("POST",ROOT+"/cinemas/"+cinema+"/halls",managerToken,hallBody(),201).get("id").asLong();
        foreignHall=hall(admin,foreignCinema,2);
        send("POST",ROOT+"/halls/"+hall+"/seats",managerToken,Map.of("units",List.of(seatBody("ACTIVE"))),201);
        try(var db=runtime()){scalar(db,"SELECT configure_hall_layout(?,?,?::jsonb)",admin,foreignHall,JSON.writeValueAsString(List.of(seatBody("ACTIVE"))));}
        try(var db=operator()){movie=Long.parseLong(scalar(db,"INSERT INTO movies(title,duration,status) VALUES (?,100,'PUBLISHED') RETURNING id","QA Manager HTTP "+UUID.randomUUID()));}
    }
    static String login(Account account)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080/api/v1/auth/tokens")).timeout(Duration.ofSeconds(10)).header("Content-Type","application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(Map.of("email",account.email(),"password",PASSWORD)))).build();
        var response=CLIENT.send(request,HttpResponse.BodyHandlers.ofString());assertThat(response.statusCode()).as("Real synthetic-account login").isEqualTo(200);
        return JSON.readTree(response.body()).get("accessToken").asText();
    }
    static JsonNode send(String method,String path,String token,Object body,int expected)throws Exception{
        return raw(method,path,token,body==null?null:JSON.writeValueAsString(body),expected);
    }
    static JsonNode raw(String method,String path,String token,String body,int expected)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080"+path)).timeout(Duration.ofSeconds(15)).header("Accept","application/json");
        if(token!=null)request.header("Authorization","Bearer "+token);
        if(body!=null)request.header("Content-Type","application/json");
        request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body));
        var response=CLIENT.send(request.build(),HttpResponse.BodyHandlers.ofString());
        CALLS.add(Map.of("method",method,"path",path,"status",response.statusCode()));
        assertThat(response.statusCode()).as(method+" "+path).isEqualTo(expected);
        if(expected!=401&&expected!=403)assertThat(response.headers().firstValue("cache-control").orElse("")).isEqualTo("no-store");
        assertThat(response.body()).doesNotContain("password_hash","token_digest","org.postgresql","stackTrace");
        return response.body().isBlank()?null:JSON.readTree(response.body());
    }
    static Map<String,Object> hallBody(){return Map.of("name","QA HTTP Hall","capacity",2,"type","2D","status","ACTIVE");}
    static Map<String,Object> seatBody(String status){return Map.of("row","A","number","1-2","type","COUPLE","physicalStatus",status);}
    Map<String,Object> showtimeBody(long targetHall,String status){return Map.of("movieId",Long.toString(movie),"hallId",Long.toString(targetHall),"startsAt",start.toString(),"basePrice","12345.6789","status",status);}
    private long showtime()throws Exception{return send("POST",ROOT+"/showtimes",managerToken,showtimeBody(hall,"DRAFT"),201).get("showtime").get("id").asLong();}
    private long seat(long targetHall)throws Exception{try(var db=runtimeRead()){return Long.parseLong(scalar(db,"SELECT id FROM seats WHERE hall_id=?",targetHall));}}
    @Test void allManagerEndpointsUseRealOwnedScopeAndSharedRules()throws Exception{
        var cinemas=send("GET",ROOT+"/cinemas",managerToken,null,200);assertThat(cinemas.size()).isEqualTo(1);assertThat(cinemas.get(0).get("id").asText()).isEqualTo(Long.toString(cinema));
        send("GET",ROOT+"/cinemas/"+cinema,managerToken,null,200);
        assertThat(send("GET",ROOT+"/cinemas/"+cinema+"/halls",managerToken,null,200).size()).isEqualTo(1);
        var detail=send("GET",ROOT+"/halls/"+hall,managerToken,null,200);assertThat(detail.get("cinemaId").isTextual()).isTrue();
        send("PUT",ROOT+"/halls/"+hall,managerToken,hallBody(),200);
        var units=send("GET",ROOT+"/halls/"+hall+"/seats",managerToken,null,200);assertThat(units.size()).isEqualTo(1);assertThat(units.get(0).get("guestCapacity").asInt()).isEqualTo(2);
        long seat=seat(hall);send("GET",ROOT+"/seats/"+seat,managerToken,null,200);send("PUT",ROOT+"/seats/"+seat,managerToken,seatBody("MAINTENANCE"),200);send("PUT",ROOT+"/seats/"+seat,managerToken,seatBody("ACTIVE"),200);
        assertThat(send("GET",ROOT+"/cinemas/"+cinema+"/staff",managerToken,null,200).isEmpty()).isTrue();
        long id=showtime();var show=send("GET",ROOT+"/showtimes/"+id,managerToken,null,200).get("showtime");assertThat(show.get("basePrice").asText()).isEqualTo("12345.6789");assertThat(Instant.parse(show.get("endsAt").asText())).isEqualTo(start.plusSeconds(6000));
        var list=send("GET",ROOT+"/showtimes?cinemaId="+cinema+"&hallId="+hall+"&movieId="+movie,managerToken,null,200);assertThat(list.get("items").size()).isEqualTo(1);assertThat(list.get("timeZone").asText()).isEqualTo("Asia/Ho_Chi_Minh");
        send("PUT",ROOT+"/showtimes/"+id,managerToken,showtimeBody(hall,"OPEN_FOR_BOOKING"),200);send("PUT",ROOT+"/showtimes/"+id,managerToken,showtimeBody(hall,"CANCELLED"),200);
        assertThat(auditCount(manager)).isGreaterThanOrEqualTo(8);
    }
    @Test void everyForeignAndNestedResourceIsRejectedWithoutMutation()throws Exception{
        long own=showtime(),otherSeat=seat(foreignHall),foreignShowtime;
        try(var db=runtime()){foreignShowtime=Long.parseLong(scalar(db,"SELECT configure_showtime(?,NULL,?,?,?::timestamptz,1,'DRAFT')",admin,movie,foreignHall,start.toString()));}
        long before=auditCount(manager);
        for(String path:List.of("/cinemas/"+foreignCinema,"/cinemas/"+foreignCinema+"/halls","/cinemas/"+foreignCinema+"/staff","/halls/"+foreignHall,"/halls/"+foreignHall+"/seats","/seats/"+otherSeat,"/showtimes/"+foreignShowtime,"/showtimes?cinemaId="+foreignCinema,"/showtimes?hallId="+foreignHall))send("GET",ROOT+path,managerToken,null,404);
        send("POST",ROOT+"/cinemas/"+foreignCinema+"/halls",managerToken,hallBody(),404);send("PUT",ROOT+"/halls/"+foreignHall,managerToken,hallBody(),404);
        send("POST",ROOT+"/halls/"+foreignHall+"/seats",managerToken,Map.of("units",List.of(seatBody("ACTIVE"))),404);send("PUT",ROOT+"/seats/"+otherSeat,managerToken,seatBody("ACTIVE"),404);
        send("POST",ROOT+"/showtimes",managerToken,showtimeBody(foreignHall,"DRAFT"),404);send("PUT",ROOT+"/showtimes/"+own,managerToken,showtimeBody(foreignHall,"DRAFT"),404);send("PUT",ROOT+"/showtimes/"+foreignShowtime,managerToken,showtimeBody(hall,"DRAFT"),404);
        var list=send("GET",ROOT+"/showtimes",managerToken,null,200);assertThat(list.get("items").size()).isEqualTo(1);assertThat(auditCount(manager)).isEqualTo(before);
    }
    @Test void liveJwtRoleCurrentAccountAndAssignmentChangesAreAuthoritative()throws Exception{
        List<String> reads=List.of("/cinemas","/cinemas/"+cinema,"/cinemas/"+cinema+"/halls","/halls/"+hall,"/halls/"+hall+"/seats","/seats/"+seat(hall),"/showtimes","/cinemas/"+cinema+"/staff");
        for(String role:List.of("CUSTOMER","STAFF","ADMIN")){String token=login(account(role));for(String path:reads)send("GET",ROOT+path,token,null,403);send("POST",ROOT+"/cinemas/"+cinema+"/halls",token,hallBody(),403);}
        for(String path:reads)send("GET",ROOT+path,null,null,401);
        send("POST",ADMIN+"/"+manager+"/cinema-assignments",managerToken,Map.of("cinemaId",Long.toString(foreignCinema),"effectiveAt",start.toString()),403);
        try(var db=operator()){scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",manager);}send("GET",ROOT+"/cinemas",managerToken,null,403);
        try(var db=operator()){scalar(db,"UPDATE users SET status='ACTIVE' WHERE id=? RETURNING id",manager);}
        send("PUT",ADMIN+"/"+manager+"/cinema-assignments/"+assignment+"/status",adminToken,Map.of("status","INACTIVE"),200);send("GET",ROOT+"/cinemas",managerToken,null,403);
        var future=send("POST",ADMIN+"/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(foreignCinema),"effectiveAt",start.toString()),201);
        send("GET",ROOT+"/cinemas",managerToken,null,403);
        send("PUT",ADMIN+"/"+manager+"/cinema-assignments/"+assignment+"/status",adminToken,Map.of("status","ACTIVE"),200);assertThat(send("GET",ROOT+"/cinemas",managerToken,null,200).size()).isEqualTo(1);
        send("PUT",ADMIN+"/"+manager+"/cinema-assignments/"+assignment+"/status",adminToken,Map.of("status","INACTIVE"),200);
        send("PUT",ADMIN+"/"+manager+"/cinema-assignments/"+future.get("id").asText()+"/status",adminToken,Map.of("status","INACTIVE"),200);
        send("POST",ADMIN+"/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(foreignCinema),"effectiveAt",Instant.now().minusSeconds(60).truncatedTo(java.time.temporal.ChronoUnit.MICROS).toString()),201);
        send("GET",ROOT+"/cinemas/"+cinema,managerToken,null,404);send("GET",ROOT+"/cinemas/"+foreignCinema,managerToken,null,200);
    }
    @Test void realAssignmentContractValidationAndAdminPermissionsRemainIntact()throws Exception{
        assertThat(send("GET",ADMIN,adminToken,null,200).isArray()).isTrue();assertThat(send("GET",ADMIN+"/"+manager+"/cinema-assignments",adminToken,null,200).size()).isEqualTo(1);
        send("POST",ADMIN+"/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(cinema),"effectiveAt",start.toString()),409);
        send("PUT",ADMIN+"/"+manager+"/cinema-assignments/"+assignment+"/status",adminToken,Map.of("status","INACTIVE","effectiveAt",start.toString()),400);
        send("GET",ROOT+"/halls/01",managerToken,null,400);send("GET",ROOT+"/showtimes?hallId=01",managerToken,null,400);send("GET",ROOT+"/showtimes?cinemaId="+cinema+"&cinemaId="+foreignCinema,managerToken,null,400);
        raw("PUT",ROOT+"/halls/"+hall,managerToken,"{\"name\":\"A\",\"name\":\"B\"}",400);
        var injected=new LinkedHashMap<>(hallBody());injected.put("actorId",Long.toString(admin));send("PUT",ROOT+"/halls/"+hall,managerToken,injected,400);
        var capacity=new LinkedHashMap<>(hallBody());capacity.put("capacity",3);send("PUT",ROOT+"/halls/"+hall,managerToken,capacity,409);
        long id=showtime();send("POST",ROOT+"/showtimes",managerToken,showtimeBody(hall,"DRAFT"),409);
        var numeric=new LinkedHashMap<>(showtimeBody(hall,"DRAFT"));numeric.put("basePrice",123);send("PUT",ROOT+"/showtimes/"+id,managerToken,numeric,400);
        send("GET","/api/v1/admin/cinemas/"+cinema,adminToken,null,200);
        send("POST","/api/v1/admin/cinemas/"+cinema+"/halls",adminToken,hallBody(),201);
        send("GET","/api/v1/admin/reports/summary?from=2026-10-01&to=2026-11-01",adminToken,null,200);
        send("POST","/api/v1/admin/cinemas",managerToken,Map.of(),403);
    }
    @Test void staffReadOnlyProjectionIsLimitedToCurrentAssignedCinema()throws Exception{
        long ownStaff=blockedStaffFixture(cinema,"QA Scoped Staff"),foreignStaff=blockedStaffFixture(foreignCinema,"QA Foreign Staff");
        var staff=send("GET",ROOT+"/cinemas/"+cinema+"/staff",managerToken,null,200);assertThat(staff.size()).isEqualTo(1);assertThat(staff.get(0).get("id").asText()).isEqualTo(Long.toString(ownStaff));assertThat(staff.get(0).get("status").asText()).isEqualTo("BLOCKED");
        assertThat(staff.get(0).get("id").asText()).isNotEqualTo(Long.toString(foreignStaff));
        assertThat(staff.toString()).doesNotContain("password","invitation","delivery");
        send("GET",ROOT+"/cinemas/"+foreignCinema+"/staff",managerToken,null,404);
    }
    private long blockedStaffFixture(long targetCinema,String name)throws Exception{
        // Complete the real invitation-intent invariant, then revoke inside the same transaction.
        // The ephemeral fixture key is never persisted/configured and no deliverable work is committed.
        byte[] key=new byte[32];new java.security.SecureRandom().nextBytes(key);
        var env=new org.springframework.mock.env.MockEnvironment().withProperty("staff.invitations.active-key-id","manager-fixture")
            .withProperty("staff.invitations.encryption-keys","manager-fixture:"+Base64.getEncoder().encodeToString(key))
            .withProperty("staff.invitations.activation-base-url","https://fixture.example.test/staff/activate");
        var crypto=new com.smartcinema.staff.StaffInvitationCrypto(new com.smartcinema.staff.StaffInvitationSettings(env));
        try(var db=runtime()){
            db.setAutoCommit(false);
            long id=Long.parseLong(scalar(db,"SELECT staff_create_account(?,?,?,?)",admin,"qa-manager-staff-"+UUID.randomUUID()+"@example.test",name,"+84910000000"));
            var token=crypto.token();var encrypted=crypto.encrypt(id,token);
            scalar(db,"SELECT staff_issue_invitation(?,?,?,?,?,?)",admin,id,token.digest(),encrypted.keyId(),encrypted.nonce(),encrypted.ciphertext());
            scalar(db,"SELECT staff_set_status(?,?,'BLOCKED')",admin,id);
            scalar(db,"SELECT staff_assign_cinema(?,?,?,?::timestamptz,NULL,'ACTIVE')",admin,id,targetCinema,Instant.now().minusSeconds(60).toString());
            db.commit();
            return id;
        }
    }
}
