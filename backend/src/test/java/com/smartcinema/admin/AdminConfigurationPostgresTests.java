package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
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
class AdminConfigurationPostgresTests {
    private static final String SCHEMA="configuration_suite_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema",()->SCHEMA);
        properties.add("spring.flyway.schemas",()->SCHEMA+",public");
        properties.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        properties.add("spring.datasource.url",()->{ String url=System.getenv("DB_URL"); return url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public"; });
    }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json;
    @Autowired AdminConfigurationService service; @Autowired PlatformTransactionManager transactions; @Autowired DataSource dataSource;
    private long admin; private long cinema; private long hall;
    @BeforeEach void fixtures() {
        admin=jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'hash','Admin','0123','ADMIN','ACTIVE') RETURNING id",Long.class,UUID.randomUUID()+"@example.test");
        cinema=Long.parseLong(service.saveCinema(admin,null,cinemaBody("ACTIVE")).id());
        hall=Long.parseLong(service.saveHall(admin,cinema,null,hallBody(4)).id());
    }
    private AdminConfigurationRequest.Cinema cinemaBody(String status) { return new AdminConfigurationRequest.Cinema("Cinema","Address",null,null,status); }
    private AdminConfigurationRequest.Hall hallBody(int capacity) { return new AdminConfigurationRequest.Hall("Hall",capacity,"Configured","ACTIVE"); }
    private List<AdminConfigurationRequest.Seat> layout() { return List.of(new AdminConfigurationRequest.Seat("A","1","STANDARD","ACTIVE"),new AdminConfigurationRequest.Seat("A","2","VIP","ACTIVE"),new AdminConfigurationRequest.Seat("B","1-2","COUPLE","ACTIVE")); }
    private org.springframework.test.web.servlet.request.RequestPostProcessor actor(long id,String role) { return jwt().jwt(builder->builder.subject(Long.toString(id))).authorities(new SimpleGrantedAuthority("ROLE_"+role)); }
    private org.springframework.test.web.servlet.request.RequestPostProcessor admin() { return actor(admin,"ADMIN"); }

    @Test void cinemaLifecyclePublicVisibilityAndNonuniqueNames() throws Exception {
        mvc.perform(get("/api/v1/admin/cinemas").with(admin())).andExpect(status().isOk());
        var created=mvc.perform(post("/api/v1/admin/cinemas").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cinemaBody("ACTIVE")))).andExpect(status().isCreated()).andReturn();
        String id=json.readTree(created.getResponse().getContentAsString()).path("id").asText();
        mvc.perform(get("/api/v1/cinemas/"+id)).andExpect(status().isOk());
        for(String state:List.of("TEMPORARILY_CLOSED","INACTIVE","ACTIVE")) {
            mvc.perform(put("/api/v1/admin/cinemas/"+id).with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cinemaBody(state)))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value(state));
            mvc.perform(get("/api/v1/cinemas/"+id)).andExpect(state.equals("ACTIVE")?status().isOk():status().isNotFound());
        }
    }
    @Test void hallMembershipCapacityAndLifecycle() throws Exception {
        mvc.perform(post("/api/v1/admin/cinemas/"+cinema+"/halls").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(hallBody(2)))).andExpect(status().isCreated()).andExpect(jsonPath("$.cinemaId").value(Long.toString(cinema)));
        service.saveHall(admin,cinema,hall,hallBody(5)); service.saveHall(admin,cinema,hall,hallBody(4));
        service.initialize(admin,hall,layout());
        mvc.perform(put("/api/v1/admin/halls/"+hall).with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(hallBody(5)))).andExpect(status().isConflict());
        for(String state:List.of("MAINTENANCE","INACTIVE","ACTIVE")) assertThat(service.saveHall(admin,cinema,hall,new AdminConfigurationRequest.Hall("Edited",4,"Configured",state)).status()).isEqualTo(state);
        long other=Long.parseLong(service.saveCinema(admin,null,cinemaBody("ACTIVE")).id());
        assertThatThrownBy(()->service.saveHall(admin,other,hall,hallBody(4))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(service.hall(admin,hall).cinemaId()).isEqualTo(Long.toString(cinema));
    }
    @Test void wholeSeatUnitsCapacityStatusAndSafeUnreferencedMetadata() throws Exception {
        mvc.perform(post("/api/v1/admin/halls/"+hall+"/seats").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("units",layout())))).andExpect(status().isCreated()).andExpect(jsonPath("$[2].guestCapacity").value(2));
        var seats=service.seats(admin,hall); assertThat(seats).hasSize(3); assertThat(seats.stream().mapToInt(AdminConfigurationRepository.Seat::guestCapacity).sum()).isEqualTo(4);
        long standard=Long.parseLong(seats.getFirst().id());
        assertThat(service.saveSeat(admin,standard,new AdminConfigurationRequest.Seat("C","9","VIP","MAINTENANCE")).type()).isEqualTo("VIP");
        assertThatThrownBy(()->service.saveSeat(admin,standard,new AdminConfigurationRequest.Seat("C","9","COUPLE","ACTIVE"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        long couple=Long.parseLong(seats.getLast().id());
        assertThat(service.saveSeat(admin,couple,new AdminConfigurationRequest.Seat("B","1-2","COUPLE","INACTIVE")).guestCapacity()).isEqualTo(2);
        assertThat(service.seats(admin,hall)).hasSize(3);
    }
    @Test void invalidLayoutAndDuplicateIdentityRollbackCompletely() {
        assertThatThrownBy(()->service.initialize(admin,hall,List.of(layout().getFirst()))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(service.seats(admin,hall)).isEmpty();
        assertThatThrownBy(()->service.initialize(admin,hall,List.of(layout().getLast(),layout().getLast()))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(service.seats(admin,hall)).isEmpty();
        service.initialize(admin,hall,layout());
        assertThatThrownBy(()->service.initialize(admin,hall,layout())).isInstanceOf(org.springframework.dao.DataAccessException.class);
        var seats=service.seats(admin,hall);
        assertThatThrownBy(()->service.saveSeat(admin,Long.parseLong(seats.getFirst().id()),new AdminConfigurationRequest.Seat("A","2","STANDARD","ACTIVE"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(service.seat(admin,Long.parseLong(seats.getFirst().id())).number()).isEqualTo("1");
    }
    @Test void referencedStructureIsProtectedButPhysicalStatusCanChange() {
        service.initialize(admin,hall,layout());
        long movie=jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES ('Configuration fixture',60,'PUBLISHED') RETURNING id",Long.class);
        long showtime=jdbc.queryForObject("INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) VALUES (?,?,statement_timestamp()+interval '1 day',statement_timestamp()+interval '2 days',statement_timestamp()+interval '2 days',statement_timestamp()+interval '1 day',100,'OPEN_FOR_BOOKING') RETURNING id",Long.class,movie,hall);
        jdbc.queryForList("SELECT initialize_showtime_seats(?,ARRAY(SELECT id FROM seats WHERE hall_id=?))",showtime,hall);
        var seat=service.seats(admin,hall).getLast(); long id=Long.parseLong(seat.id()); assertThat(seat.structureEditable()).isFalse();
        for(var change:List.of(new AdminConfigurationRequest.Seat("X",seat.number(),seat.type(),"ACTIVE"),new AdminConfigurationRequest.Seat(seat.row(),"X",seat.type(),"ACTIVE"),new AdminConfigurationRequest.Seat(seat.row(),seat.number(),"STANDARD","ACTIVE"))) assertThatThrownBy(()->service.saveSeat(admin,id,change)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        service.saveSeat(admin,id,new AdminConfigurationRequest.Seat(seat.row(),seat.number(),seat.type(),"MAINTENANCE"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE showtime_id=?",Integer.class,showtime)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT status FROM showtimes WHERE id=?",String.class,showtime)).isEqualTo("OPEN_FOR_BOOKING");
    }
    @Test void runtimeOnlyHasControlledExecutionAndDirectMutationIsBlocked() {
        service.initialize(admin,hall,layout());
        assertThat(jdbc.queryForObject("SELECT has_table_privilege('smart_cinema_hold_runtime','seats','UPDATE')",Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT has_any_column_privilege('smart_cinema_hold_runtime','seats','UPDATE')",Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT has_function_privilege('smart_cinema_hold_runtime','initialize_hall_seats(bigint,jsonb)','EXECUTE')",Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT pg_has_role('smart_cinema_hold_runtime','smart_cinema_configuration_owner','MEMBER')",Boolean.class)).isFalse();
        for(String command:List.of("UPDATE seats SET physical_status='INACTIVE' WHERE hall_id="+hall,"DELETE FROM seats WHERE hall_id="+hall,"INSERT INTO seats(hall_id,row,number,seat_type,physical_status) VALUES ("+hall+",'X','1','STANDARD','ACTIVE')")) {
            assertThatThrownBy(()->new TransactionTemplate(transactions).execute(status->{ jdbc.execute("SET LOCAL ROLE smart_cinema_hold_runtime"); jdbc.execute(command); return null; })).isInstanceOf(org.springframework.dao.DataAccessException.class);
        }
        new TransactionTemplate(transactions).execute(status->{ jdbc.execute("SET LOCAL ROLE smart_cinema_hold_runtime"); jdbc.queryForObject("SELECT configure_cinema(?,?,?,?,?,?,?)",Long.class,admin,cinema,"Controlled","Address",null,null,"ACTIVE"); return null; });
        assertThat(service.cinema(admin,cinema).name()).isEqualTo("Controlled");
        assertThatThrownBy(()->jdbc.update("UPDATE seats SET physical_status='INACTIVE' WHERE hall_id=?",hall)).isInstanceOf(org.springframework.dao.DataAccessException.class);
    }
    @Test void anonymousOtherRolesAndBlockedAdminCannotWriteAnyHierarchyResource() throws Exception {
        for(String path:List.of("/api/v1/admin/cinemas","/api/v1/admin/cinemas/"+cinema+"/halls","/api/v1/admin/halls/"+hall+"/seats")) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isUnauthorized());
            for(String role:List.of("CUSTOMER","STAFF","MANAGER")) mvc.perform(post(path).with(actor(admin,role)).contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isForbidden());
        }
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",admin);
        mvc.perform(post("/api/v1/admin/cinemas").with(admin()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cinemaBody("ACTIVE")))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/halls/"+hall).with(admin())).andExpect(status().isForbidden());
        assertThatThrownBy(()->jdbc.queryForList("SELECT configure_hall_layout(?,?,?::jsonb)",admin,hall,json.writeValueAsString(layout()))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        jdbc.update("UPDATE users SET status='ACTIVE',role='CUSTOMER' WHERE id=?",admin);
        mvc.perform(get("/api/v1/admin/cinemas").with(admin())).andExpect(status().isForbidden());
    }
    @Test void strictInputsStringIdsMissingResourcesAndNoDeletes() throws Exception {
        jdbc.update("INSERT INTO cinemas(id,name,address,status) VALUES (9007199254740993,'Large identity','Address','INACTIVE') ON CONFLICT(id) DO NOTHING");
        mvc.perform(get("/api/v1/admin/cinemas/9007199254740993").with(admin())).andExpect(jsonPath("$.id").value("9007199254740993"));
        for(String body:List.of("{}","{\"name\":\"Cinema\",\"address\":\"Address\",\"status\":\"UNKNOWN\"}","{\"name\":\"Cinema\",\"address\":\"Address\",\"status\":\"ACTIVE\",\"id\":\"1\"}")) mvc.perform(post("/api/v1/admin/cinemas").with(admin()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/admin/cinemas/"+cinema+"/halls").with(admin()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Hall\",\"capacity\":1.5,\"type\":\"Configured\",\"status\":\"ACTIVE\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/halls/9223372036854775807").with(admin())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/cinemas/invalid").with(admin())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/cinemas").with(admin()).param("q","unsupported")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/admin/cinemas/"+cinema).with(admin())).andExpect(status().isMethodNotAllowed());
    }
    @Test void competingInitializationsCommitExactlyOneWholeLayout() throws Exception {
        CountDownLatch start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            Callable<Boolean> initialize=()->{ start.await(); try { service.initialize(admin,hall,layout()); return true; } catch(org.springframework.dao.DataAccessException error) { return false; } };
            var first=pool.submit(initialize); var second=pool.submit(initialize); start.countDown();
            assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        assertThat(service.seats(admin,hall)).hasSize(3);
    }
    @Test void numericRangeOverlapAndReversedRangeAreRejectedWithoutPartialWrites() {
        var overlap=List.of(new AdminConfigurationRequest.Seat("A","9-10","COUPLE","ACTIVE"),new AdminConfigurationRequest.Seat("A","9","STANDARD","ACTIVE"),new AdminConfigurationRequest.Seat("A","11","STANDARD","ACTIVE"));
        assertThatThrownBy(()->service.initialize(admin,hall,overlap)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(service.seats(admin,hall)).isEmpty();
        assertThatThrownBy(()->service.initialize(admin,hall,List.of(new AdminConfigurationRequest.Seat("A","10-9","COUPLE","ACTIVE")))).isInstanceOf(org.springframework.dao.DataAccessException.class);
        service.initialize(admin,hall,layout());
        var standard=service.seats(admin,hall).getFirst();
        assertThatThrownBy(()->service.saveSeat(admin,Long.parseLong(standard.id()),new AdminConfigurationRequest.Seat("B","2","STANDARD","ACTIVE"))).isInstanceOf(org.springframework.dao.DataAccessException.class);
    }
    @Test void capacityChangeAgainstInitializationCannotProduceMismatchedLayout() throws Exception {
        CountDownLatch start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var initialize=pool.submit(()->{ start.await(); try { service.initialize(admin,hall,layout()); return true; } catch(org.springframework.dao.DataAccessException error) { return false; } });
            var resize=pool.submit(()->{ start.await(); try { service.saveHall(admin,cinema,hall,hallBody(5)); return true; } catch(org.springframework.dao.DataAccessException error) { return false; } });
            start.countDown(); assertThat(List.of(initialize.get(10,TimeUnit.SECONDS),resize.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        var units=service.seats(admin,hall);
        if (!units.isEmpty()) assertThat(units.stream().mapToInt(AdminConfigurationRepository.Seat::guestCapacity).sum()).isEqualTo(service.hall(admin,hall).capacity());
    }
    @Test void statusAndStructuralWritersWaitForHallGate() throws Exception {
        service.initialize(admin,hall,layout()); var seat=service.seats(admin,hall).getFirst();
        CountDownLatch locked=new CountDownLatch(1),release=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(3)) {
            var gate=pool.submit(()->new TransactionTemplate(transactions).execute(status->{ jdbc.queryForObject("SELECT id FROM halls WHERE id=? FOR SHARE",Long.class,hall); locked.countDown(); try { release.await(10,TimeUnit.SECONDS); } catch(InterruptedException error) { throw new IllegalStateException(error); } return true; }));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();
            var edit=pool.submit(()->service.saveSeat(admin,Long.parseLong(seat.id()),new AdminConfigurationRequest.Seat("C","1","VIP","MAINTENANCE")));
            var hallEdit=pool.submit(()->service.saveHall(admin,cinema,hall,new AdminConfigurationRequest.Hall("Updated",4,"Configured","INACTIVE")));
            try { assertThatThrownBy(()->edit.get(150,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class); assertThatThrownBy(()->hallEdit.get(150,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class); } finally { release.countDown(); }
            gate.get(5,TimeUnit.SECONDS); assertThat(edit.get(5,TimeUnit.SECONDS).physicalStatus()).isEqualTo("MAINTENANCE"); assertThat(hallEdit.get(5,TimeUnit.SECONDS).status()).isEqualTo("INACTIVE");
        }
    }
    @Test void populatedV10UpgradePreservesRowsAndEveryHistoricalChecksum() throws Exception {
        String schema="configuration_upgrade_"+UUID.randomUUID().toString().replace("-","");
        try {
            var old=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public").target("10").load(); old.migrate();
            var checksums=Arrays.stream(old.info().applied()).filter(item->item.getVersion()!=null).map(item->item.getChecksum()).toList();
            try(var connection=dataSource.getConnection();var sql=connection.createStatement()) {
                sql.execute("SET search_path TO "+schema+",public"); sql.execute("INSERT INTO cinemas(id,name,address,status) VALUES (71,'Preserved','Address','ACTIVE')");
                sql.execute("INSERT INTO halls(id,cinema_id,name,capacity,type,status) VALUES (71,71,'Preserved',2,'Configured','ACTIVE')");
                sql.execute("SELECT initialize_hall_seats(71,'[{\"row\":\"B\",\"number\":\"1-2\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}]')");
                sql.execute("RESET search_path");
            }
            var upgrade=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public").target("11").load(); assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1); upgrade.validate();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(item->item.getVersion()!=null).limit(10).map(item->item.getChecksum()).toList()).isEqualTo(checksums);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM "+schema+".seats WHERE hall_id=71 AND seat_type='COUPLE'",Integer.class)).isEqualTo(1);
        } finally { jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
    }
}
