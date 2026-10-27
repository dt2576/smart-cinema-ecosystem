package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real localhost HTTP and PostgreSQL. Uses only approved ADMIN login plus read endpoints. */
@EnabledIfEnvironmentVariable(named="ADMIN_REPORT_HTTP_TESTS",matches="true")
class AdminReportHttpPostgresTests {
    static final JsonMapper JSON=JsonMapper.builder().build();
    static final String PERIOD="?from=2026-10-01&to=2026-11-01";
    static final List<String> PATHS=List.of("/api/v1/admin/dashboard","/api/v1/admin/reports/summary","/api/v1/admin/reports/daily","/api/v1/admin/reports/breakdowns");
    static HttpClient client;
    static String token;
    static final List<Map<String,Object>> calls=new ArrayList<>();
    @BeforeAll static void setup()throws Exception {
        LocalReportTestSupport.preflight();
        System.setProperty("jdk.httpclient.disableRetryConnect","true");
        client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
        var p=LocalReportTestSupport.read(Path.of(".env.local-test-admin"));assertThat(p.getProperty("DEV_ADMIN_EMAIL")).endsWith("@example.test");
        var login=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080/api/v1/auth/tokens")).timeout(Duration.ofSeconds(10))
            .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(Map.of("email",p.getProperty("DEV_ADMIN_EMAIL"),"password",p.getProperty("DEV_ADMIN_PASSWORD"))))).build();
        var response=client.send(login,HttpResponse.BodyHandlers.ofString());assertThat(response.statusCode()).isEqualTo(200);
        var node=JSON.readTree(response.body());assertThat(node.get("role").asText()).isEqualTo("ADMIN");token=node.get("accessToken").asText();
    }
    @AfterAll static void save()throws Exception {
        LocalReportTestSupport.preserved();
        Files.writeString(LocalReportTestSupport.EVIDENCE.resolve("real-http.json"),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(calls),StandardCharsets.UTF_8);
    }
    static JsonNode get(String path,String auth,int expected)throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080"+path)).timeout(Duration.ofSeconds(15)).GET();
        if(auth!=null)request.header("Authorization","Bearer "+auth);
        var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
        calls.add(Map.of("method","GET","path",path,"status",response.statusCode()));
        assertThat(response.statusCode()).as(path).isEqualTo(expected);
        if(expected==200)assertThat(response.headers().firstValue("cache-control").orElse("")).isEqualTo("no-store");
        return JSON.readTree(response.body());
    }
    @Test void realDashboardSummaryDailyAndEveryBreakdownAgree()throws Exception {
        var summary=get(PATHS.get(1)+PERIOD,token,200);assertThat(get(PATHS.getFirst()+PERIOD,token,200)).isEqualTo(summary);
        Files.writeString(LocalReportTestSupport.EVIDENCE.resolve("real-summary.json"),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(summary),StandardCharsets.UTF_8);
        var metrics=summary.get("metrics");assertThat(metrics.get("confirmedRevenue").asText()).isEqualTo("0.0000");
        assertThat(summary.get("period").get("paymentEnvironment").asText()).isEqualTo("SANDBOX");
        var daily=get(PATHS.get(2)+PERIOD,token,200);assertThat(daily.get("items").size()).isEqualTo(31);
        assertSums(daily.get("items"),metrics);
        for(String dimension:List.of("CINEMA","MOVIE","SHOWTIME")) {
            var rows=get(PATHS.getLast()+PERIOD+"&dimension="+dimension+"&size=100",token,200);
            assertThat(rows.get("totalElements").isTextual()).isTrue();
            assertThat(rows.get("totalElements").asInt()).isLessThanOrEqualTo(100);assertSums(rows.get("items"),metrics);
            var page=get(PATHS.getLast()+PERIOD+"&dimension="+dimension+"&size=1",token,200);
            if(!rows.get("items").isEmpty())assertThat(page.get("items").get(0)).isEqualTo(rows.get("items").get(0));
        }
        assertThat(metrics.get("bookingsCreated").asInt()).isGreaterThan(0);
    }
    static void assertSums(JsonNode rows,JsonNode metrics) {
        for(String key:List.of("confirmedRevenue","grossAmount","discountAmount","concessionGrossAmount","ticketsSold","bookingsCreated","showtimes","capacitySeatUnits","soldSeatUnits")) {
            BigDecimal sum=BigDecimal.ZERO;for(var row:rows)sum=sum.add(new BigDecimal(row.get("metrics").get(key).asText()));
            assertThat(sum).as(key).isEqualByComparingTo(metrics.get(key).asText());
        }
    }
    @Test void realAuthenticationAndInvalidQueries()throws Exception {
        for(String path:PATHS){get(path+PERIOD,null,401);get(path+PERIOD,"tampered-token",401);}
        for(String suffix:List.of("", "?from=2026-10-27&to=2026-10-27",PERIOD+"&cinemaId=01",PERIOD+"&movieId=9223372036854775808",PERIOD+"&from=2026-10-02",PERIOD+"&unknown=x"))get(PATHS.getFirst()+suffix,token,400);
        get(PATHS.getLast()+PERIOD,token,400);get(PATHS.getLast()+PERIOD+"&dimension=MOVIE&size=101",token,400);
    }
    @Test void realEmptyAndIntersectedFilters()throws Exception {
        for(String filter:List.of("cinemaId","movieId","showtimeId")) {
            var result=get(PATHS.getFirst()+PERIOD+"&"+filter+"=9223372036854775807",token,200);
            assertThat(result.get("metrics").get("bookingsCreated").asText()).isEqualTo("0");assertThat(result.get("metrics").get("occupancyPercent").isNull()).isTrue();
        }
        var result=get(PATHS.get(2)+"?from=2000-01-01&to=2000-01-03",token,200);assertThat(result.get("items").size()).isEqualTo(2);
        for(var day:result.get("items"))assertThat(day.get("metrics").get("confirmedRevenue").asText()).isEqualTo("0.0000");
        get(PATHS.getLast()+PERIOD+"&dimension=CINEMA&cinemaId=1&movieId=1&showtimeId=1",token,200);
    }
}
