package com.smartcinema.manager;

import static com.smartcinema.manager.LocalManagerTestSupport.*;
import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.Files;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real signed-JWT HTTP to the approved running local API. No mocked financial/email outcomes. */
@EnabledIfEnvironmentVariable(named="MANAGER_STAFF_HTTP_TESTS",matches="true")
class ManagerStaffHttpPostgresTests {
    static final JsonMapper JSON=JsonMapper.builder().build();
    static final List<Map<String,Object>> CALLS=new ArrayList<>();
    static HttpClient client;
    long admin,manager,source,destination,foreign,staff,other,staffGrant,foreignStaffGrant,managerSourceGrant,managerDestinationGrant;
    String adminToken,managerToken;
    @BeforeAll static void ready()throws Exception {
        LocalManagerStaffTestSupport.preflight();System.setProperty("jdk.httpclient.disableRetryConnect","true");
        client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
    }
    @AfterAll static void evidence()throws Exception {LocalManagerStaffTestSupport.preserved();Files.writeString(LocalManagerStaffTestSupport.EVIDENCE.resolve("real-http.json"),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(CALLS));}
    static Instant now(){return Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MICROS);}
    @BeforeEach void fixtures()throws Exception {
        var a=account("ADMIN");admin=a.id();adminToken=login(a);var m=account("MANAGER");manager=m.id();managerToken=login(m);
        source=cinema(admin);destination=cinema(admin);foreign=cinema(admin);
        managerSourceGrant=send("POST","/api/v1/admin/managers/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(source),"effectiveAt",now().toString()),201).get("id").asLong();
        managerDestinationGrant=send("POST","/api/v1/admin/managers/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(destination),"effectiveAt",now().toString()),201).get("id").asLong();
        staff=LocalManagerStaffTestSupport.staff(admin);other=LocalManagerStaffTestSupport.staff(admin);
        staffGrant=adminGrant(staff,source);foreignStaffGrant=adminGrant(staff,foreign);adminGrant(other,foreign);
    }
    long adminGrant(long user,long cinema)throws Exception {return send("POST","/api/v1/admin/staff/"+user+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(cinema),"effectiveAt",now().toString()),201).get("id").asLong();}
    String path(long cinema,long user){return "/api/v1/manager/cinemas/"+cinema+"/staff/"+user;}
    String base(){return path(source,staff);}
    String history(){return "/api/v1/manager/cinemas/"+source+"/staff-assignments";}
    static String login(Account account)throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080/api/v1/auth/tokens")).timeout(Duration.ofSeconds(10)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(Map.of("email",account.email(),"password",PASSWORD)))).build();
        var response=client.send(request,HttpResponse.BodyHandlers.ofString());assertThat(response.statusCode()).as("Real synthetic-account login").isEqualTo(200);return JSON.readTree(response.body()).get("accessToken").asText();
    }
    static JsonNode send(String method,String path,String token,Object body,int status)throws Exception {return raw(method,path,token,body==null?null:JSON.writeValueAsString(body),status);}
    static JsonNode raw(String method,String path,String token,String body,int status)throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080"+path)).timeout(Duration.ofSeconds(15)).header("Accept","application/json");if(token!=null)request.header("Authorization","Bearer "+token);if(body!=null)request.header("Content-Type","application/json");request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body));
        var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());CALLS.add(Map.of("method",method,"path",path,"status",response.statusCode()));assertThat(response.statusCode()).as(method+" "+path).isEqualTo(status);
        assertThat(response.body()).doesNotContain("password_hash","token_digest","ciphertext","org.postgresql","stackTrace");if(status!=401&&status!=403)assertThat(response.headers().firstValue("cache-control").orElse("")).isEqualTo("no-store");return response.body().isBlank()?null:JSON.readTree(response.body());
    }
    @Test void allFourOperationsUseRealOwnedContextAndPreserveAccountAndHistory()throws Exception {
        var list=send("GET",history(),managerToken,null,200);assertThat(list.size()).isEqualTo(1);assertThat(list.get(0).get("assignment").get("id").asText()).isEqualTo(Long.toString(staffGrant));
        var detail=send("GET",base(),managerToken,null,200);assertThat(detail.get("staff").size()).isEqualTo(5);assertThat(detail.get("staff").get("status").asText()).isEqualTo("BLOCKED");assertThat(detail.get("assignments").size()).isEqualTo(1);
        Instant effective=now().plusSeconds(86400);var created=send("POST",base()+"/cinema-assignments",managerToken,Map.of("cinemaId",Long.toString(destination),"effectiveAt",effective.toString()),201);long id=created.get("id").asLong();assertThat(created.get("assignmentType").asText()).isEqualTo("STAFF");assertThat(Instant.parse(created.get("effectiveAt").asText())).isEqualTo(effective);
        send("PUT",base()+"/cinema-assignments/"+id+"/status",managerToken,Map.of("status","INACTIVE"),404);
        var target=path(destination,staff)+"/cinema-assignments/"+id+"/status";
        send("PUT",target,managerToken,Map.of("status","INACTIVE"),200);var restored=send("PUT",target,managerToken,Map.of("status","ACTIVE"),200);assertThat(restored.get("effectiveAt").asText()).isEqualTo(created.get("effectiveAt").asText());
        assertThat(send("GET",path(destination,staff),managerToken,null,200).get("staff").get("status").asText()).isEqualTo("BLOCKED");
        assertThat(send("GET","/api/v1/manager/cinemas/"+destination+"/staff",managerToken,null,200).isEmpty()).isTrue();
        assertThat(send("GET","/api/v1/admin/staff/"+staff+"/cinema-assignments",adminToken,null,200).size()).isEqualTo(3);
    }
    @Test void everyWrongRoleAndNamespacePrivilegeEscalationIsDenied()throws Exception {
        for(String role:List.of("CUSTOMER","STAFF","ADMIN")) {
            String token=login(account(role));send("GET",history(),token,null,403);send("GET",base(),token,null,403);send("POST",base()+"/cinema-assignments",token,Map.of(),403);send("PUT",base()+"/cinema-assignments/"+staffGrant+"/status",token,Map.of(),403);
        }
        send("GET",history(),null,null,401);send("GET",base(),null,null,401);send("POST",base()+"/cinema-assignments",null,Map.of(),401);send("PUT",base()+"/cinema-assignments/"+staffGrant+"/status",null,Map.of(),401);
        send("POST","/api/v1/admin/staff",managerToken,Map.of("role","ADMIN"),403);send("POST","/api/v1/admin/staff/"+staff+"/invitations",managerToken,Map.of(),403);send("PUT","/api/v1/admin/staff/"+staff+"/status",managerToken,Map.of("status","ACTIVE"),403);
    }
    @Test void foreignAndNestedStaffScopeValidationAndMalformedCommandsDoNotAudit()throws Exception {
        long before=auditCount(manager);send("GET",path(foreign,staff),managerToken,null,404);send("GET",path(source,other),managerToken,null,404);
        send("POST",base()+"/cinema-assignments",managerToken,Map.of("cinemaId",Long.toString(foreign),"effectiveAt",now().toString()),404);
        send("PUT",base()+"/cinema-assignments/"+foreignStaffGrant+"/status",managerToken,Map.of("status","INACTIVE"),404);
        send("POST",base()+"/cinema-assignments",managerToken,Map.of("cinemaId",Long.toString(source),"effectiveAt",now().toString()),409);
        for(String body:List.of("{\"cinemaId\":\"1\",\"cinemaId\":\"2\",\"effectiveAt\":\"2030-01-01T00:00:00Z\"}","{\"cinemaId\":1,\"effectiveAt\":\"2030-01-01T00:00:00Z\"}","{\"cinemaId\":\"1\",\"effectiveAt\":\"2030-01-01T00:00:00Z\",\"role\":\"MANAGER\"}"))raw("POST",base()+"/cinema-assignments",managerToken,body,400);
        send("GET",history()+"?actor=1",managerToken,null,400);send("GET","/api/v1/manager/cinemas/01/staff/"+staff,managerToken,null,400);
        send("PUT",base()+"/cinema-assignments/"+staffGrant+"/status",managerToken,Map.of("status","ACTIVE","effectiveAt",now().toString()),400);assertThat(auditCount(manager)).isEqualTo(before);
    }
    @Test void revocationFutureGrantAndBlockedAccountTakeEffectWithSameJwt()throws Exception {
        String adminPath="/api/v1/admin/managers/"+manager+"/cinema-assignments/";
        send("PUT",adminPath+managerSourceGrant+"/status",adminToken,Map.of("status","INACTIVE"),200);send("GET",history(),managerToken,null,404);
        send("PUT",adminPath+managerDestinationGrant+"/status",adminToken,Map.of("status","INACTIVE"),200);send("GET",history(),managerToken,null,403);
        send("POST","/api/v1/admin/managers/"+manager+"/cinema-assignments",adminToken,Map.of("cinemaId",Long.toString(destination),"effectiveAt",now().plusSeconds(86400).toString()),201);send("GET",history(),managerToken,null,403);
        send("PUT",adminPath+managerSourceGrant+"/status",adminToken,Map.of("status","ACTIVE"),200);send("GET",base(),managerToken,null,200);
        try(var db=operator()){scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",manager);}send("GET",history(),managerToken,null,403);
    }
}
