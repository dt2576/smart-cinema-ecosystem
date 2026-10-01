package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties="seat-hold.cleanup-enabled=false")
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="MOVIE_DB_TESTS",matches="true")
class AdminShowtimePostgresTests {
    private static final String SCHEMA="showtime_admin_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.flyway.default-schema",()->SCHEMA); p.add("spring.flyway.schemas",()->SCHEMA+",public");
        p.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        p.add("spring.datasource.url",()->{String url=System.getenv("DB_URL");return url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public";});
    }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json;
    @Autowired AdminShowtimeService service; @Autowired AdminConfigurationService configuration;
    @Autowired PlatformTransactionManager transactions; @Autowired DataSource dataSource;
    private long admin,movie,cinema,hall; private Instant start;
    @BeforeEach void fixture() {
        admin=user("ADMIN");
        movie=jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES ('Movie',120,'PUBLISHED') RETURNING id",Long.class);
        cinema=Long.parseLong(configuration.saveCinema(admin,null,new AdminConfigurationRequest.Cinema("Cinema","Address",null,null,"ACTIVE")).id());
        hall=makeHall(); start=Instant.now().plusSeconds(86400*30).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
    }
    private long user(String role) { return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'hash','Actor','0123',?,'ACTIVE') RETURNING id",Long.class,UUID.randomUUID()+"@example.test",role); }
    private long makeHall() {
        long id=Long.parseLong(configuration.saveHall(admin,cinema,null,new AdminConfigurationRequest.Hall("Hall",4,"Configured","ACTIVE")).id());
        configuration.initialize(admin,id,List.of(new AdminConfigurationRequest.Seat("A","1","STANDARD","ACTIVE"),new AdminConfigurationRequest.Seat("A","2","VIP","MAINTENANCE"),new AdminConfigurationRequest.Seat("B","1-2","COUPLE","ACTIVE"))); return id;
    }
    private AdminShowtimeRequest.Input input(Instant time,String status) { return new AdminShowtimeRequest.Input(movie,hall,time,new BigDecimal("90000.1234"),status); }
    private long create(String status) { return Long.parseLong(service.save(admin,null,input(start,status)).showtime().id()); }
    private org.springframework.test.web.servlet.request.RequestPostProcessor actor(long id,String role) { return jwt().jwt(b->b.subject(Long.toString(id))).authorities(new SimpleGrantedAuthority("ROLE_"+role)); }
    private Map<String,Object> body(Instant time,String status) { return Map.of("movieId",Long.toString(movie),"hallId",Long.toString(hall),"startsAt",time.toString(),"basePrice","90000.1234","status",status); }

    @Test void createCalculatesScheduleAndAllWholeMembershipsAtomically() throws Exception {
        var result=mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(start,"OPEN_FOR_BOOKING"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.showtime.basePrice").value("90000.1234")).andExpect(jsonPath("$.timeZone").value("Asia/Ho_Chi_Minh")).andReturn();
        long id=Long.parseLong(json.readTree(result.getResponse().getContentAsString()).path("showtime").path("id").asText());
        var detail=service.detail(admin,id).showtime(); assertThat(detail.endsAt()).isEqualTo(start.plusSeconds(7200)); assertThat(detail.occupiedUntil()).isEqualTo(detail.endsAt()); assertThat(detail.bookingCutOff()).isEqualTo(start);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE showtime_id=?",Integer.class,id)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats ss JOIN seats s ON s.id=ss.seat_id WHERE ss.showtime_id=? AND s.seat_type='COUPLE'",Integer.class,id)).isEqualTo(1);
        mvc.perform(get("/api/v1/showtimes/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.hall.id").value(Long.toString(hall)));
        mvc.perform(get("/api/v1/showtimes/"+id+"/seats")).andExpect(status().isOk()).andExpect(jsonPath("$.units.length()").value(3)).andExpect(jsonPath("$.units[1].availability").value("UNAVAILABLE")).andExpect(jsonPath("$.units[2].guestCount").value(2));
        mvc.perform(get("/api/v1/cinemas").param("movieId",Long.toString(movie))).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id=='"+cinema+"')]").isNotEmpty());
        mvc.perform(get("/api/v1/showtimes").param("movieId",Long.toString(movie)).param("cinemaId",Long.toString(cinema)).param("date",start.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate().toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(Long.toString(id)));
    }
    @Test void exactTouchingAndDifferentHallPassButOverlapRollsBack() {
        create("DRAFT"); assertThat(service.save(admin,null,input(start.plusSeconds(7200),"SCHEDULED")).showtime().status()).isEqualTo("SCHEDULED");
        assertThatThrownBy(()->service.save(admin,null,input(start.plusSeconds(7199),"OPEN_FOR_BOOKING"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        long other=makeHall(); service.save(admin,null,new AdminShowtimeRequest.Input(movie,other,start,new BigDecimal("0"),"OPEN_FOR_BOOKING"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtimes WHERE hall_id=?",Integer.class,hall)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats ss JOIN showtimes s ON s.id=ss.showtime_id WHERE s.hall_id=?",Integer.class,hall)).isEqualTo(6);
    }
    @Test void invalidParentsPastTimeAndLayoutsLeaveNoPartialRows() {
        for(String status:List.of("DRAFT","UNPUBLISHED")) {
            jdbc.update("UPDATE movies SET status=? WHERE id=?",status,movie); assertThatThrownBy(()->create("OPEN_FOR_BOOKING")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        }
        jdbc.update("UPDATE movies SET status='PUBLISHED' WHERE id=?",movie);
        assertThatThrownBy(()->service.save(admin,null,new AdminShowtimeRequest.Input(Long.MAX_VALUE,hall,start,BigDecimal.ZERO,"DRAFT"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(()->service.save(admin,null,new AdminShowtimeRequest.Input(movie,Long.MAX_VALUE,start,BigDecimal.ZERO,"DRAFT"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(()->service.save(admin,null,input(Instant.now().minusSeconds(1),"DRAFT"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        jdbc.update("UPDATE halls SET status='MAINTENANCE' WHERE id=?",hall); assertThatThrownBy(()->create("DRAFT")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        jdbc.update("UPDATE halls SET status='ACTIVE' WHERE id=?",hall); jdbc.update("UPDATE cinemas SET status='INACTIVE' WHERE id=?",cinema); assertThatThrownBy(()->create("OPEN_FOR_BOOKING")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        jdbc.update("UPDATE cinemas SET status='ACTIVE' WHERE id=?",cinema);
        long empty=Long.parseLong(configuration.saveHall(admin,cinema,null,new AdminConfigurationRequest.Hall("Empty",4,"Configured","ACTIVE")).id());
        assertThatThrownBy(()->service.save(admin,null,new AdminShowtimeRequest.Input(movie,empty,start,BigDecimal.ZERO,"DRAFT"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtimes WHERE hall_id IN (?,?)",Integer.class,hall,empty)).isZero();
    }
    @Test void strictMoneyAndTimeAndUnknownInputsAndFilters() throws Exception {
        for(Object price:List.of(-1,1.2,"-1","1e3","0.00001","NaN","1000000000000000")) {
            var invalid=new HashMap<>(body(start,"DRAFT")); invalid.put("basePrice",price);
            mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        }
        for(String time:List.of("2030-01-01T10:00","not-a-date","2030-01-01T00:00:00.0000001Z")) {
            var invalid=new HashMap<>(body(start,"DRAFT")); invalid.put("startsAt",time);
            mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        }
        for(String field:List.of("cinemaId","endsAt","occupiedUntil","actorId")) {
            var invalid=new HashMap<>(body(start,"DRAFT")); invalid.put(field,"1");
            mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        }
        for(String state:List.of("STARTED","ENDED","BAD")) mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(start,state)))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).param("date","2030-02-30")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).param("status","DRAFT","SCHEDULED")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).param("extra","1")).andExpect(status().isBadRequest());
        assertThat(service.save(admin,null,new AdminShowtimeRequest.Input(movie,hall,start,BigDecimal.ZERO,"DRAFT")).showtime().basePrice()).isEqualTo("0.0000");
    }
    @Test void safeLifecycleIsForwardOnlyAndCancelledNeverReopens() throws Exception {
        long id=create("DRAFT");
        for(String state:List.of("SCHEDULED","OPEN_FOR_BOOKING","CANCELLED")) assertThat(service.save(admin,id,input(start,state)).showtime().status()).isEqualTo(state);
        assertThatThrownBy(()->service.save(admin,id,input(start,"OPEN_FOR_BOOKING"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        mvc.perform(get("/api/v1/showtimes/"+id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/admin/showtimes/"+id).with(actor(admin,"ADMIN"))).andExpect(status().isMethodNotAllowed());
    }
    @Test void existingMovieDurationChangeDoesNotRewriteStoredSchedule() {
        long id=create("DRAFT"); Instant end=service.detail(admin,id).showtime().endsAt(); jdbc.update("UPDATE movies SET duration=160 WHERE id=?",movie);
        service.save(admin,id,new AdminShowtimeRequest.Input(movie,hall,start,new BigDecimal("123.4567"),"SCHEDULED"));
        assertThat(service.detail(admin,id).showtime().endsAt()).isEqualTo(end);
        var moved=service.save(admin,id,input(start.plusSeconds(18000),"OPEN_FOR_BOOKING")).showtime(); assertThat(moved.endsAt()).isEqualTo(start.plusSeconds(18000+9600));
        assertThatThrownBy(()->service.save(admin,id,new AdminShowtimeRequest.Input(movie,makeHall(),moved.startsAt(),BigDecimal.ONE,"OPEN_FOR_BOOKING"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
    }
    @Test void incompleteLayoutAndOpeningWithoutSelectableUnitsRollback() {
        long incomplete=Long.parseLong(configuration.saveHall(admin,cinema,null,new AdminConfigurationRequest.Hall("Incomplete",4,"Configured","ACTIVE")).id());
        new TransactionTemplate(transactions).execute(status->{jdbc.execute("SET LOCAL ROLE smart_cinema_hold_owner"); jdbc.update("INSERT INTO seats(hall_id,row,number,seat_type,physical_status) VALUES (?,'A','1','STANDARD','ACTIVE')",incomplete); return true;});
        assertThatThrownBy(()->service.save(admin,null,new AdminShowtimeRequest.Input(movie,incomplete,start,BigDecimal.ZERO,"DRAFT"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        for(var seat:configuration.seats(admin,hall)) configuration.saveSeat(admin,Long.parseLong(seat.id()),new AdminConfigurationRequest.Seat(seat.row(),seat.number(),seat.type(),"INACTIVE"));
        assertThatThrownBy(()->create("OPEN_FOR_BOOKING")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtimes WHERE hall_id IN (?,?)",Integer.class,hall,incomplete)).isZero();
        long id=create("DRAFT"); assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE showtime_id=? AND NOT is_sellable",Integer.class,id)).isEqualTo(3);
        assertThatThrownBy(()->service.save(admin,id,input(start,"OPEN_FOR_BOOKING"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
    }
    @Test void historicalNonpublishedScheduleRemainsReadableAndSafeCancellationPreservesContent() throws Exception {
        long id=create("OPEN_FOR_BOOKING"); var before=service.detail(admin,id).showtime();
        jdbc.update("UPDATE movies SET status='UNPUBLISHED' WHERE id=?",movie);
        mvc.perform(get("/api/v1/admin/showtimes/"+id).with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.showtime.id").value(Long.toString(id)));
        mvc.perform(get("/api/v1/showtimes/"+id)).andExpect(status().isNotFound());
        assertThatThrownBy(()->service.save(admin,id,input(start,"OPEN_FOR_BOOKING"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        jdbc.update("UPDATE cinemas SET status='TEMPORARILY_CLOSED' WHERE id=?",cinema);
        var cancelled=service.save(admin,id,input(start,"CANCELLED")).showtime();
        assertThat(cancelled.status()).isEqualTo("CANCELLED"); assertThat(cancelled.endsAt()).isEqualTo(before.endsAt()); assertThat(cancelled.basePrice()).isEqualTo(before.basePrice());
        assertThat(jdbc.queryForObject("SELECT status FROM movies WHERE id=?",String.class,movie)).isEqualTo("UNPUBLISHED");
    }
    private long hold(long showtime) {
        long customer=user("CUSTOMER"); long seat=jdbc.queryForObject("SELECT seat_id FROM showtime_seats WHERE showtime_id=? AND is_sellable ORDER BY seat_id LIMIT 1",Long.class,showtime);
        return jdbc.queryForObject("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '10 minutes')",Long.class,showtime,customer,seat);
    }
    @Test void anyHoldHistoryBlocksPriceTimingMovieAndCancellationEvenAfterRelease() {
        long id=create("OPEN_FOR_BOOKING"); long hold=hold(id);
        long customer=jdbc.queryForObject("SELECT user_id FROM seat_holds WHERE id=?",Long.class,hold);
        jdbc.queryForList("SELECT release_seat_hold(?,?,?)",id,customer,hold);
        assertThat(service.detail(admin,id).showtime().editable()).isFalse();
        for(String state:List.of("DRAFT","OPEN_FOR_BOOKING","CANCELLED")) assertThatThrownBy(()->service.save(admin,id,input(start,state))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        for(String column:List.of("base_price","occupied_until","status")) {
            String value=column.equals("base_price")?"base_price+1":column.equals("status")?"'CANCELLED'":"occupied_until+interval '1 minute'";
            assertThatThrownBy(()->jdbc.update("UPDATE showtimes SET "+column+"="+value+" WHERE id=?",id)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        }
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,hold)).isEqualTo("RELEASED");
    }
    @Test void bookingAndPaymentHistoryStayFrozenWithoutAnySideEffect() {
        long id=create("OPEN_FOR_BOOKING"); long hold=hold(id); long customer=jdbc.queryForObject("SELECT user_id FROM seat_holds WHERE id=?",Long.class,hold);
        long booking=jdbc.queryForObject("SELECT create_booking(?,?,ARRAY[?]::bigint[])",Long.class,id,customer,hold);
        jdbc.queryForObject("SELECT initiate_payment(?,?)",Long.class,booking,customer);
        var before=jdbc.queryForMap("SELECT * FROM bookings WHERE id=?",booking);
        assertThatThrownBy(()->service.save(admin,id,new AdminShowtimeRequest.Input(movie,hall,start,new BigDecimal("1"),"CANCELLED"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(jdbc.queryForMap("SELECT * FROM bookings WHERE id=?",booking)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=? AND sold_at IS NOT NULL",Integer.class,booking)).isZero();
    }
    @Test void anonymousOtherRolesBlockedAndStaleAdminAreDenied() throws Exception {
        mvc.perform(get("/api/v1/admin/showtimes")).andExpect(status().isUnauthorized());
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) mvc.perform(post("/api/v1/admin/showtimes").with(actor(user(role),role)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(start,"DRAFT")))).andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",admin);
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN"))).andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET status='ACTIVE',role='CUSTOMER' WHERE id=?",admin);
        mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(start,"DRAFT")))).andExpect(status().isForbidden());
    }
    @Test void localDateFilteringAndLargeStringIdsAndSafeOverlapProblem() throws Exception {
        start=Instant.parse("2038-01-01T17:00:00Z"); long id=create("OPEN_FOR_BOOKING");
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).param("date","2038-01-02").param("hallId",Long.toString(hall))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(Long.toString(id)));
        mvc.perform(get("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).param("date","2038-01-01").param("hallId",Long.toString(hall))).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(post("/api/v1/admin/showtimes").with(actor(admin,"ADMIN")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body(start,"DRAFT")))).andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("overlaps")));
        jdbc.update("INSERT INTO showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) VALUES (9007199254740993,?,?,?,? ,?,?,0,'DRAFT')",movie,hall,Timestamp.from(start.plusSeconds(14400)),Timestamp.from(start.plusSeconds(21600)),Timestamp.from(start.plusSeconds(21600)),Timestamp.from(start.plusSeconds(14400)));
        mvc.perform(get("/api/v1/admin/showtimes/9007199254740993").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.showtime.id").value("9007199254740993"));
    }
    @Test void runtimeOnlyHasGuardedExecuteAndNoProtectedDmlOrOwnershipLeak() {
        for(String table:List.of("showtimes","showtime_seats")) for(String privilege:List.of("INSERT","UPDATE","DELETE")) assertThat(jdbc.queryForObject("SELECT has_table_privilege('smart_cinema_hold_runtime',?,?)",Boolean.class,SCHEMA+"."+table,privilege)).isFalse();
        assertThat(jdbc.queryForObject("SELECT has_function_privilege('smart_cinema_hold_runtime',?,'EXECUTE')",Boolean.class,SCHEMA+".initialize_showtime_seats(bigint,bigint[])")).isFalse();
        assertThat(jdbc.queryForObject("SELECT pg_has_role('smart_cinema_hold_runtime','smart_cinema_configuration_owner','MEMBER')",Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT pg_has_role('smart_cinema_hold_runtime','smart_cinema_configuration_owner','SET')",Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname=? AND p.proname IN ('configure_showtime','guard_admin_showtime_history') AND a.grantee=0 AND a.privilege_type='EXECUTE'",Integer.class,SCHEMA)).isZero();
        new TransactionTemplate(transactions).execute(status->{jdbc.execute("SET LOCAL ROLE smart_cinema_hold_runtime"); assertThat(jdbc.queryForObject("SELECT configure_showtime(?,NULL,?,?,?,?,?)",Long.class,admin,movie,hall,Timestamp.from(start),BigDecimal.ZERO,"DRAFT")).isPositive(); return true;});
        assertThatThrownBy(()->new TransactionTemplate(transactions).execute(status->{jdbc.execute("SET LOCAL ROLE smart_cinema_hold_runtime"); jdbc.execute("UPDATE showtimes SET base_price=1");return true;})).isInstanceOf(org.springframework.dao.DataAccessException.class);
    }
    @Test void concurrentOverlappingCreatesCommitOnlyOneWholeLayout() throws Exception {
        try(var pool=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1); var a=pool.submit(()->race(gate)); var b=pool.submit(()->race(gate)); gate.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtimes WHERE hall_id=?",Integer.class,hall)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE hall_id=?",Integer.class,hall)).isEqualTo(3);
    }
    private boolean race(CountDownLatch gate) { try { gate.await(); create("OPEN_FOR_BOOKING"); return true; } catch(org.springframework.dao.DataAccessException error) { return false; } catch(InterruptedException error) { throw new IllegalStateException(error); } }
    @Test void configurationHallGateSerializesCreation() throws Exception {
        try(var pool=Executors.newFixedThreadPool(2)) {
            var locked=new CountDownLatch(1); var release=new CountDownLatch(1);
            var gate=pool.submit(()->new TransactionTemplate(transactions).execute(status->{jdbc.queryForObject("SELECT id FROM halls WHERE id=? FOR UPDATE",Long.class,hall);locked.countDown();try {release.await(10,TimeUnit.SECONDS);}catch(InterruptedException e){throw new IllegalStateException(e);}return true;}));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue(); var create=pool.submit(()->create("DRAFT"));
            try {assertThatThrownBy(()->create.get(150,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);}finally {release.countDown();}
            gate.get(5,TimeUnit.SECONDS); assertThat(create.get(5,TimeUnit.SECONDS)).isPositive();
        }
    }
    @Test void populatedV11UpgradePreservesEveryChecksumAndStoredSchedule() throws Exception {
        String schema="showtime_upgrade_"+UUID.randomUUID().toString().replace("-","");
        try {
            var old=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public").target("11").load(); old.migrate();
            var checksums=Arrays.stream(old.info().applied()).filter(x->x.getVersion()!=null).map(x->x.getChecksum()).toList();
            jdbc.execute("INSERT INTO "+schema+".movies(id,title,duration,status) VALUES(71,'Preserved',120,'PUBLISHED')");
            jdbc.execute("INSERT INTO "+schema+".cinemas(id,name,address,status) VALUES(71,'Preserved','Address','ACTIVE')");
            jdbc.execute("INSERT INTO "+schema+".halls(id,cinema_id,name,capacity,type,status) VALUES(71,71,'Hall',2,'Configured','ACTIVE')");
            jdbc.execute("INSERT INTO "+schema+".showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) VALUES(71,71,71,'2040-01-01T03:00Z','2040-01-01T05:00Z','2040-01-01T05:15Z','2040-01-01T02:45Z',90000.1234,'OPEN_FOR_BOOKING')");
            var before=jdbc.queryForMap("SELECT * FROM "+schema+".showtimes WHERE id=71");
            var upgrade=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public").target("12").load(); assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1); upgrade.validate();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(x->x.getVersion()!=null).limit(11).map(x->x.getChecksum()).toList()).isEqualTo(checksums);
            assertThat(jdbc.queryForMap("SELECT * FROM "+schema+".showtimes WHERE id=71")).isEqualTo(before);
        } finally {jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
    }
}
