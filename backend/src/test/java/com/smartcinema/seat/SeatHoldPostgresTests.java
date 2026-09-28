package com.smartcinema.seat;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(properties={"seat-hold.ttl=PT2S","seat-hold.cleanup-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SEAT_DB_TESTS",matches="true")
class SeatHoldPostgresTests {
    private static final String SCHEMA="seat_hold_suite_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource
    static void schema(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema",() -> SCHEMA);
        properties.add("spring.flyway.schemas",() -> SCHEMA+",public");
        properties.add("spring.jpa.properties.hibernate.default_schema",() -> SCHEMA);
        properties.add("spring.datasource.url",() -> {
            String url=System.getenv("DB_URL");
            return url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public";
        });
    }
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private MockMvc mvc;
    @Autowired private SeatService service;
    private long cinema,hall,movie,showtime,firstUser,otherUser,standard,vip,couple;

    @BeforeEach
    void seed() {
        // Dedicated schema isolates committed race fixtures from existing empty-catalog tests.
        long base=9_007_199_254_740_993L;
        jdbc.execute("SELECT setval('seats_id_seq',greatest((SELECT last_value FROM seats_id_seq),"+base+"))");
        firstUser=user(); otherUser=user();
        movie=jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES ('Hold test',60,'PUBLISHED') RETURNING id",Long.class);
        cinema=jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES ('Branch','Address','ACTIVE') RETURNING id",Long.class);
        hall=jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Hall',4,'Configured','ACTIVE') RETURNING id",Long.class,cinema);
        showtime=screening(hall);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))",Object.class,hall,"""
                [{"row":"A","number":"1","type":"STANDARD","physicalStatus":"ACTIVE"},
                 {"row":"A","number":"2","type":"VIP","physicalStatus":"ACTIVE"},
                 {"row":"H","number":"9-10","type":"COUPLE","physicalStatus":"ACTIVE"}]
                """);
        var ids=jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id",Long.class,hall);
        standard=ids.get(0); vip=ids.get(1); couple=ids.get(2);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,showtime,array(ids));
    }

    private long user() {
        return jdbc.queryForObject("""
                INSERT INTO users(email,password_hash,full_name,phone,role,status)
                VALUES (?,'hash','Hold Customer','+84912345678','CUSTOMER','ACTIVE') RETURNING id
                """,Long.class,UUID.randomUUID()+"@example.test");
    }
    private long screening(long hallId) {
        return jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',
                statement_timestamp()+interval '2 hours 1 minute',100,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id
                """,Long.class,movie,hallId);
    }
    private String path() { return "/api/v1/showtimes/"+showtime; }
    private RequestPostProcessor customer(long id) { return jwt().jwt(token -> token.subject(Long.toString(id))).authorities(() -> "ROLE_CUSTOMER"); }
    private String array(List<Long> ids) { return "{"+String.join(",",ids.stream().map(String::valueOf).toList())+"}"; }
    private String request(long... ids) {
        return "{\"seatIds\":["+String.join(",",java.util.Arrays.stream(ids).mapToObj(id -> "\""+id+"\"").toList())+"]}";
    }
    private int acquireHttp(long actor,long... ids) throws Exception {
        return mvc.perform(post(path()+"/seat-holds").with(customer(actor)).contentType("application/json").content(request(ids)))
                .andReturn().getResponse().getStatus();
    }
    private long holdId(long actor,long seat) {
        return jdbc.queryForObject("SELECT id FROM seat_holds WHERE showtime_id=? AND user_id=? AND seat_id=? AND status='ACTIVE'",Long.class,showtime,actor,seat);
    }

    @Test
    void publicMapAndOwnedHoldsKeepWholeCoupleAndPrivateIdentities() throws Exception {
        mvc.perform(get(path()+"/seats")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.units.length()").value(3)).andExpect(jsonPath("$.units[2].id").value(Long.toString(couple)))
                .andExpect(jsonPath("$.units[2].number").value("9-10")).andExpect(jsonPath("$.units[2].guestCount").value(2))
                .andExpect(jsonPath("$.units[1].type").value("VIP")).andExpect(jsonPath("$.units[1].guestCount").value(1));
        var first=service.acquire(showtime,firstUser,List.of(couple,standard));
        assertThat(first.holds()).hasSize(2);
        assertThat(first.holds().get(0).expiresAt()).isEqualTo(first.holds().get(1).expiresAt());
        assertThat(service.acquire(showtime,firstUser,List.of(couple,standard)).holds()).isEqualTo(first.holds());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isEqualTo(2);
        mvc.perform(get(path()+"/seats")).andExpect(jsonPath("$.units[2].availability").value("HELD"))
                .andExpect(jsonPath("$.units[2].holdId").doesNotExist()).andExpect(jsonPath("$.units[2].userId").doesNotExist());
        mvc.perform(get(path()+"/seat-holds").with(customer(firstUser))).andExpect(status().isOk()).andExpect(jsonPath("$.holds.length()").value(2));
        mvc.perform(get(path()+"/seat-holds").with(customer(otherUser))).andExpect(jsonPath("$.holds.length()").value(0));
    }

    @Test
    void twoCustomerOverlappingBatchRaceHasExactlyOneWholeWinner() throws Exception {
        try(var executor=Executors.newFixedThreadPool(2)) {
            var ready=new CountDownLatch(2); var start=new CountDownLatch(1);
            var a=executor.submit(() -> {ready.countDown(); start.await(); return acquireHttp(firstUser,standard,vip);});
            var b=executor.submit(() -> {ready.countDown(); start.await(); return acquireHttp(otherUser,vip,couple);});
            assertThat(ready.await(2,TimeUnit.SECONDS)).isTrue(); start.countDown();
            assertThat(List.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT count(DISTINCT user_id) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isEqualTo(1);
        }
    }

    @Test
    void oneConflictRollsBackBatchAndMalformedDuplicateForeignIdsFail() throws Exception {
        service.acquire(showtime,otherUser,List.of(vip));
        assertThat(acquireHttp(firstUser,standard,vip,couple)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE user_id=?",Integer.class,firstUser)).isZero();
        assertThat(acquireHttp(firstUser,standard,standard)).isEqualTo(400);
        assertThat(acquireHttp(firstUser,Long.MAX_VALUE)).isEqualTo(409);
        mvc.perform(post(path()+"/seat-holds").with(customer(firstUser)).contentType("application/json")
                .content("{\"seatIds\":[\""+standard+"\"],\"expiresAt\":\"2099-01-01\"}"))
                .andExpect(status().isBadRequest());
        long foreignHall=jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Other',1,'Configured','ACTIVE') RETURNING id",Long.class,cinema);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))",Object.class,foreignHall,
                "[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"}]");
        long foreign=jdbc.queryForObject("SELECT id FROM seats WHERE hall_id=?",Long.class,foreignHall);
        assertThat(acquireHttp(firstUser,foreign)).isEqualTo(409);
    }

    @Test
    void expiryReadsAndReacquisitionDoNotDependOnWorkerAndOldReleaseCannotTouchReplacement() throws Exception {
        var first=service.acquire(showtime,firstUser,List.of(couple)).holds().getFirst();
        waitUntil(first.expiresAt());
        mvc.perform(get(path()+"/seats")).andExpect(jsonPath("$.units[2].availability").value("AVAILABLE"));
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,Long.parseLong(first.id()))).isEqualTo("ACTIVE");
        var replacement=service.acquire(showtime,otherUser,List.of(couple)).holds().getFirst();
        assertThat(replacement.id()).isNotEqualTo(first.id());
        service.release(showtime,firstUser,Long.parseLong(first.id()));
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,Long.parseLong(first.id()))).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,Long.parseLong(replacement.id()))).isEqualTo("ACTIVE");
    }

    @Test
    void releaseChecksExactOwnerAndIsIdempotentEvenWhenShowtimeBecomesUnavailable() throws Exception {
        service.acquire(showtime,firstUser,List.of(couple));
        long hold=holdId(firstUser,couple);
        mvc.perform(delete(path()+"/seat-holds/"+hold).with(customer(otherUser))).andExpect(status().isNotFound());
        jdbc.update("UPDATE cinemas SET status='TEMPORARILY_CLOSED' WHERE id=?",cinema);
        mvc.perform(delete(path()+"/seat-holds/"+hold).with(customer(firstUser))).andExpect(status().isNoContent());
        mvc.perform(delete(path()+"/seat-holds/"+hold).with(customer(firstUser))).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,hold)).isEqualTo("RELEASED");
        mvc.perform(get(path()+"/seats")).andExpect(status().isNotFound());
    }

    @Test
    void cleanupRetainsHistoryAndExpiresOnlyElapsedHolds() throws Exception {
        var hold=service.acquire(showtime,firstUser,List.of(standard)).holds().getFirst();
        assertThat(service.expire(showtime)).isZero();
        waitUntil(hold.expiresAt());
        assertThat(service.expire(showtime)).isEqualTo(1);
        assertThat(service.expire(showtime)).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,Long.parseLong(hold.id()))).isEqualTo("EXPIRED");
    }

    @Test
    void cutoffIsRevalidatedAfterGateWaitUsingDatabaseClock() throws Exception {
        jdbc.update("UPDATE showtimes SET booking_cut_off=clock_timestamp()+interval '700 milliseconds' WHERE id=?",showtime);
        try(Connection gate=dataSource.getConnection(); var executor=Executors.newSingleThreadExecutor()) {
            gate.setAutoCommit(false);
            try(var lock=gate.prepareStatement("SELECT id FROM showtimes WHERE id=? FOR UPDATE")) {
                lock.setLong(1,showtime); lock.executeQuery().close();
                var result=executor.submit(() -> acquireHttp(firstUser,standard));
                waitForBlockedRequest(gate);
                Thread.sleep(950);
                gate.commit();
                assertThat(result.get(4,TimeUnit.SECONDS)).isEqualTo(404);
            } finally {gate.rollback();}
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isZero();
    }

    @Test
    void contentionTimesOutWithoutPartialWrites() throws Exception {
        try(Connection gate=dataSource.getConnection(); var executor=Executors.newSingleThreadExecutor()) {
            gate.setAutoCommit(false);
            try(var lock=gate.prepareStatement("SELECT id FROM showtimes WHERE id=? FOR UPDATE")) {
                lock.setLong(1,showtime); lock.executeQuery().close();
                var result=executor.submit(() -> acquireHttp(firstUser,standard));
                assertThat(result.get(4,TimeUnit.SECONDS)).isEqualTo(409);
            } finally {gate.rollback();}
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isZero();
    }

    @Test
    void authenticatedWritesRequireActiveCustomerNotJustJwtRole() throws Exception {
        mvc.perform(get(path()+"/seats")).andExpect(status().isOk());
        mvc.perform(post(path()+"/seat-holds").contentType("application/json").content(request(standard))).andExpect(status().isUnauthorized());
        mvc.perform(get(path()+"/seat-holds")).andExpect(status().isUnauthorized());
        mvc.perform(post(path()+"/seat-holds").with(jwt().authorities(() -> "ROLE_ADMIN"))
                .contentType("application/json").content(request(standard))).andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",firstUser);
        assertThat(acquireHttp(firstUser,standard)).isEqualTo(403);
        jdbc.update("UPDATE users SET status='ACTIVE',role='STAFF' WHERE id=?",firstUser);
        assertThat(acquireHttp(firstUser,standard)).isEqualTo(403);
        assertThat(acquireHttp(Long.MAX_VALUE,standard)).isEqualTo(403);
    }

    @Test
    void missingMembershipAndPhysicalUnavailableAreNeverImplicitlySellable() throws Exception {
        long newHall=jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Closed seat',1,'Configured','ACTIVE') RETURNING id",Long.class,cinema);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))",Object.class,newHall,
                "[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"MAINTENANCE\"}]");
        long missing=screening(newHall);
        long unit=jdbc.queryForObject("SELECT id FROM seats WHERE hall_id=?",Long.class,newHall);
        mvc.perform(get("/api/v1/showtimes/"+missing+"/seats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.units[0].availability").value("UNAVAILABLE"));
        showtime=missing;
        assertThat(acquireHttp(firstUser,unit)).isEqualTo(409);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,showtime,array(List.of(unit)));
        assertThat(acquireHttp(firstUser,unit)).isEqualTo(409);
    }

    @Test
    void ineligibleParentStatesAndStartedTimeRejectFreshWrites() throws Exception {
        for(String state:List.of("DRAFT","UNPUBLISHED")) {
            jdbc.update("UPDATE movies SET status=? WHERE id=?",state,movie);
            assertThat(acquireHttp(firstUser,standard)).isEqualTo(404);
        }
        jdbc.update("UPDATE movies SET status='PUBLISHED' WHERE id=?",movie);
        for(String state:List.of("MAINTENANCE","INACTIVE")) {
            jdbc.update("UPDATE halls SET status=? WHERE id=?",state,hall);
            assertThat(acquireHttp(firstUser,standard)).isEqualTo(404);
        }
        jdbc.update("UPDATE halls SET status='ACTIVE' WHERE id=?",hall);
        for(String state:List.of("TEMPORARILY_CLOSED","INACTIVE")) {
            jdbc.update("UPDATE cinemas SET status=? WHERE id=?",state,cinema);
            assertThat(acquireHttp(firstUser,standard)).isEqualTo(404);
        }
        jdbc.update("UPDATE cinemas SET status='ACTIVE' WHERE id=?",cinema);
        for(String state:List.of("DRAFT","SCHEDULED","CANCELLED","STARTED","ENDED")) {
            jdbc.update("UPDATE showtimes SET status=? WHERE id=?",state,showtime);
            assertThat(acquireHttp(firstUser,standard)).isEqualTo(404);
        }
        jdbc.update("UPDATE showtimes SET status='OPEN_FOR_BOOKING',start_time=statement_timestamp(),booking_cut_off=statement_timestamp() WHERE id=?",showtime);
        assertThat(acquireHttp(firstUser,standard)).isEqualTo(404);
    }

    @Test
    void samePhysicalSeatAtAnotherShowtimeIsIndependentAndFalseEligibilityStaysUnavailable() throws Exception {
        long later=jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,now()+interval '3 hours',now()+interval '4 hours',now()+interval '4 hours',100,
                'OPEN_FOR_BOOKING',now()+interval '3 hours') RETURNING id
                """,Long.class,movie,hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,later,array(List.of(couple)));
        service.acquire(showtime,firstUser,List.of(couple));
        service.acquire(later,otherUser,List.of(couple));
        mvc.perform(get("/api/v1/showtimes/"+later+"/seats")).andExpect(jsonPath("$.units[0].availability").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.units[2].availability").value("HELD"));
        showtime=later;
        assertThat(acquireHttp(otherUser,standard)).isEqualTo(409);
    }

    @Test
    void addingUnitsKeepsExistingDeadlineAndAcquisitionClampsToEarlyCutoff() throws Exception {
        var initial=service.acquire(showtime,firstUser,List.of(standard)).holds().getFirst();
        var extended=service.acquire(showtime,firstUser,List.of(standard,couple));
        assertThat(extended.holds()).allMatch(hold -> hold.expiresAt().equals(initial.expiresAt()));
        long early=jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,now()+interval '3 hours',now()+interval '4 hours',now()+interval '4 hours',100,
                'OPEN_FOR_BOOKING',now()+interval '1500 milliseconds') RETURNING id
                """,Long.class,movie,hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,early,array(List.of(standard)));
        var hold=service.acquire(early,firstUser,List.of(standard)).holds().getFirst();
        var cutoff=jdbc.queryForObject("SELECT booking_cut_off FROM showtimes WHERE id=?",java.sql.Timestamp.class,early).toInstant();
        assertThat(hold.expiresAt()).isEqualTo(cutoff);
    }

    @Test
    void simultaneousSameOwnerRetriesReturnSameIdentityWithoutRenewal() throws Exception {
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            var a=executor.submit(() -> {start.await(); return service.acquire(showtime,firstUser,List.of(couple)).holds();});
            var b=executor.submit(() -> {start.await(); return service.acquire(showtime,firstUser,List.of(couple)).holds();});
            start.countDown();
            assertThat(a.get(5,TimeUnit.SECONDS)).isEqualTo(b.get(5,TimeUnit.SECONDS));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isEqualTo(1);
        }
    }

    @Test
    void runtimeCannotBypassRoutinesAndHoldHistoryCannotBeRewritten() throws Exception {
        service.acquire(showtime,firstUser,List.of(standard));
        try(Connection connection=dataSource.getConnection(); var statement=connection.createStatement()) {
            statement.execute("SET ROLE smart_cinema_hold_runtime");
            for(String sql:List.of("UPDATE seat_holds SET expires_at=statement_timestamp()+interval '1 hour'",
                    "DELETE FROM seat_holds","TRUNCATE seat_holds","ALTER TABLE seat_holds DISABLE TRIGGER ALL",
                    "UPDATE showtime_seats SET is_sellable=true","SELECT initialize_showtime_seats("+showtime+",ARRAY[]::bigint[])",
                    "SELECT lock_hold_context("+showtime+","+firstUser+")")) {
                assertThatThrownBy(() -> statement.execute(sql)).as(sql).isInstanceOf(SQLException.class);
            }
            // The restricted runtime role can invoke only the intended write surface.
            statement.execute("SELECT release_seat_hold("+showtime+","+firstUser+","+holdId(firstUser,standard)+")");
            statement.execute("RESET ROLE");
        }
        assertThatThrownBy(() -> jdbc.update("UPDATE seat_holds SET status='ACTIVE' WHERE showtime_id=?",showtime))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE showtimes SET start_time=start_time+interval '1 minute' WHERE id=?",showtime))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
    }

    private void waitUntil(Instant expiresAt) throws Exception {
        long remaining=java.time.Duration.between(Instant.now(),expiresAt).toMillis();
        if(remaining>0) { Thread.sleep(remaining+30); }
        assertThat(jdbc.queryForObject("SELECT clock_timestamp()>=?",Boolean.class,java.sql.Timestamp.from(expiresAt))).isTrue();
    }

    private void waitForBlockedRequest(Connection gate) throws Exception {
        int pid;
        try(var statement=gate.createStatement();var result=statement.executeQuery("SELECT pg_backend_pid()")) {
            result.next(); pid=result.getInt(1);
        }
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);
        while(System.nanoTime()<deadline) {
            if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid)))",Boolean.class,pid))) { return; }
            Thread.sleep(20);
        }
        fail("The acquisition request never waited on the held Showtime gate");
    }
}
