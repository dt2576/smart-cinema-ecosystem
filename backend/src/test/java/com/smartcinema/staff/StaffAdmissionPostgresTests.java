package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.booking.*;
import com.smartcinema.payment.PaymentService;
import com.smartcinema.seat.SeatService;

/** Actual isolated PostgreSQL/HTTP; synthetic protected-settlement fixtures only. */
@SpringBootTest(properties={"seat-hold.cleanup-enabled=false","staff.invitations.delivery-enabled=false","logging.level.org.springframework.web=INFO"})
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@EnabledIfEnvironmentVariable(named="STAFF_DB_TESTS",matches="true")
class StaffAdmissionPostgresTests {
    private static final String SCHEMA="staff_http_"+UUID.randomUUID().toString().replace("-","");
    private static final String TEST_KEY=Base64.getEncoder().encodeToString(new byte[32]);
    private static final String PASSWORD="Fixture-private-password";
    @DynamicPropertySource static void properties(DynamicPropertyRegistry p) {
        p.add("spring.flyway.default-schema",()->SCHEMA);p.add("spring.flyway.schemas",()->SCHEMA+",public");p.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        p.add("spring.datasource.url",()->System.getenv("DB_URL")+(System.getenv("DB_URL").contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public");
        p.add("staff.invitations.encryption-keys",()->"test:"+TEST_KEY);p.add("staff.invitations.active-key-id",()->"test");
        p.add("staff.invitations.activation-base-url",()->"https://frontend.example.test/staff/activate");
        p.add("staff.invitations.from-address",()->"sender@example.test");p.add("staff.invitations.allow-local-smtp",()->"true");
        p.add("spring.mail.host",()->"127.0.0.1");p.add("spring.mail.port",()->1025);p.add("spring.mail.username",()->"");p.add("spring.mail.password",()->"");
        p.add("spring.mail.properties.mail.smtp.auth",()->"false");p.add("spring.mail.properties.mail.smtp.starttls.enable",()->"false");p.add("spring.mail.properties.mail.smtp.starttls.required",()->"false");
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired MockMvc mvc;
    @Autowired StaffOnboardingService onboarding;
    @Autowired StaffRepository repository;
    @Autowired StaffInvitationCrypto crypto;
    @Autowired BookingService bookings;
    @Autowired BookingReadService bookingReads;
    @Autowired PaymentService payments;
    @Autowired SeatService seats;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean StaffAdmissionRepository operational;
    private long admin,customer,movie,cinema,hall,showtime,standard,vip,couple;
    @BeforeEach void seed() {
        admin=user("ADMIN");customer=user("CUSTOMER");
        // Retire earlier tests' outstanding queue through the real protected command.
        for(Long id:jdbc.queryForList("SELECT user_id FROM staff_onboarding",Long.class)) jdbc.queryForObject("SELECT staff_set_status(?,?,'BLOCKED')",Object.class,admin,id);
        movie=jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES('Fixture movie',60,'PUBLISHED') RETURNING id",Long.class);
        cinema=jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES('Fixture cinema','Address','ACTIVE') RETURNING id",Long.class);
        hall=jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES(?,'Hall',4,'Configured','ACTIVE') RETURNING id",Long.class,cinema);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))",Object.class,hall,"""
          [{"row":"A","number":"1","type":"STANDARD","physicalStatus":"ACTIVE"},
           {"row":"A","number":"2","type":"VIP","physicalStatus":"ACTIVE"},
           {"row":"H","number":"9-10","type":"COUPLE","physicalStatus":"ACTIVE"}]
          """);
        var units=jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id",Long.class,hall);standard=units.get(0);vip=units.get(1);couple=units.get(2);
        showtime=jdbc.queryForObject("""
          INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
          VALUES(?,?,statement_timestamp()+interval '20 minutes',statement_timestamp()+interval '80 minutes',statement_timestamp()+interval '80 minutes',10000,'OPEN_FOR_BOOKING',statement_timestamp()+interval '20 minutes') RETURNING id
          """,Long.class,movie,hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,showtime,array(units));
    }
    private long user(String role) {return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES(?,'fixture-hash','Fixture','+84912345678',?,'ACTIVE') RETURNING id",Long.class,UUID.randomUUID()+"@example.test",role);}
    private String array(List<Long> ids) {return "{"+String.join(",",ids.stream().map(String::valueOf).toList())+"}";}
    private long staff() {return Long.parseLong(onboarding.create(admin,"Nhân viên <img>",UUID.randomUUID()+"@example.test","0912345678").id());}
    private String token(long staff) {
        return jdbc.query("SELECT i.token_digest,d.key_id,d.nonce,d.ciphertext FROM staff_invitations i JOIN staff_invitation_deliveries d ON d.invitation_id=i.id WHERE i.user_id=? AND i.revoked_at IS NULL AND i.consumed_at IS NULL ORDER BY i.id DESC LIMIT 1",
            (r,n)->crypto.decrypt(staff,r.getString(1),r.getString(2),r.getBytes(3),r.getBytes(4)),staff).getFirst();
    }
    private long readyStaff() {long staff=staff();onboarding.password(token(staff),PASSWORD);onboarding.status(admin,staff,"ACTIVE");onboarding.assign(admin,staff,cinema,Instant.now().minusSeconds(10));return staff;}
    private RequestPostProcessor actor(long user,String role) {return jwt().jwt(t->t.subject(Long.toString(user))).authorities(()->"ROLE_"+role);}
    private long paid(long... unitIds) {
        var holds=seats.acquire(showtime,customer,Arrays.stream(unitIds).boxed().toList()).holds();
        var b=bookings.create(customer,new BookingRequest(showtime,holds.stream().map(h->Long.parseLong(h.id())).toList()));
        long payment=Long.parseLong(payments.initiate(Long.parseLong(b.id()),customer).id());
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,payment,customer);
        // Protected settlement in isolated schema only; fixture evidence, not real VNPAY.
        jdbc.queryForObject("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,id::text,'IPN',?,'SUCCESS','00','00') FROM payment_transactions WHERE id=?",String.class,UUID.randomUUID().toString().replace("-","").repeat(2),payment);
        return Long.parseLong(b.id());
    }
    private List<Long> tickets(long booking) {return jdbc.queryForList("SELECT t.id FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=? ORDER BY t.id",Long.class,booking);}
    private void owner(String role,String sql,Object...args) throws Exception {
        try(var connection=dataSource.getConnection();var statement=connection.createStatement()) {
            statement.execute("SET ROLE "+role);
            try(var ps=connection.prepareStatement(sql)){for(int i=0;i<args.length;i++)ps.setObject(i+1,args[i]);ps.execute();}
            finally {statement.execute("RESET ROLE");}
        }
    }
    private int audit(long ticket) {return jdbc.queryForObject("SELECT count(*) FROM audit_records WHERE resource_type='TICKET' AND action='TICKET_CHECKED_IN' AND resource_id=?",Integer.class,ticket);}


    private String json(Object value) {return tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(value);}
    private String qr(long booking) {return bookingReads.tickets(booking,customer).bookingQr();}
    private String path(long booking) {return "/api/v1/staff/bookings/"+booking;}
    private org.springframework.mock.web.MockHttpServletResponse resolve(long staff,long context,String qr) throws Exception {
        return mvc.perform(post("/api/v1/staff/booking-qr-resolutions").with(actor(staff,"STAFF")).contentType("application/json")
            .content(json(Map.of("cinemaId",Long.toString(context),"bookingQr",qr)))).andReturn().getResponse();
    }
    private org.springframework.mock.web.MockHttpServletResponse recover(long staff,long booking,long context) throws Exception {
        return mvc.perform(get(path(booking)).param("cinemaId",Long.toString(context)).with(actor(staff,"STAFF"))).andReturn().getResponse();
    }
    private org.springframework.mock.web.MockHttpServletResponse command(long staff,long booking,long context,List<Long> ids) throws Exception {
        return mvc.perform(post(path(booking)+"/check-ins").with(actor(staff,"STAFF")).contentType("application/json")
            .content(json(Map.of("cinemaId",Long.toString(context),"ticketIds",ids.stream().map(String::valueOf).toList())))).andReturn().getResponse();
    }
    private tools.jackson.databind.JsonNode node(org.springframework.mock.web.MockHttpServletResponse response) throws Exception {
        return tools.jackson.databind.json.JsonMapper.builder().build().readTree(response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
    private void safe(org.springframework.mock.web.MockHttpServletResponse response,int status) throws Exception {
        assertThat(response.getStatus()).isEqualTo(status);assertThat(response.getHeader("Cache-Control")).contains("no-store");
        assertThat(response.getContentAsString()).doesNotContain("password_hash","customerId","bookingQr","booking_qr_token","paymentId","SQLSTATE");
    }
    @Test void allFourRoutesRequireAuthenticationAndStaffRole() throws Exception {
        var requests=List.of(get("/api/v1/staff/cinema-assignments"),get("/api/v1/staff/bookings/1").param("cinemaId","1"),
            post("/api/v1/staff/booking-qr-resolutions").contentType("application/json").content("{\"cinemaId\":\"1\",\"bookingQr\":\"fixture\"}"),
            post("/api/v1/staff/bookings/1/check-ins").contentType("application/json").content("{\"cinemaId\":\"1\",\"ticketIds\":[\"1\"]}"));
        for(var request:requests) {
            safe(mvc.perform(request).andReturn().getResponse(),401);
            for(String role:List.of("CUSTOMER","ADMIN","MANAGER"))safe(mvc.perform(request.with(actor(user(role),role))).andReturn().getResponse(),403);
        }
    }
    @Test void currentDatabaseRoleStatusAndInvalidSubjectOverrideJwt() throws Exception {
        long booking=paid(standard);
        for(String role:List.of("CUSTOMER","ADMIN","MANAGER")) {
            long wrong=user(role);safe(resolve(wrong,cinema,qr(booking)),403);safe(command(wrong,booking,cinema,tickets(booking)),403);
            safe(mvc.perform(get("/api/v1/staff/cinema-assignments").with(actor(wrong,"STAFF"))).andReturn().getResponse(),403);
        }
        long staff=readyStaff();onboarding.status(admin,staff,"BLOCKED");safe(recover(staff,booking,cinema),403);
        safe(mvc.perform(get("/api/v1/staff/cinema-assignments").with(jwt().jwt(j->j.subject("invalid")).authorities(()->"ROLE_STAFF"))).andReturn().getResponse(),403);
    }
    @Test void effectiveAssignmentsAreMinimalOrderedAndFreshAfterRevocation() throws Exception {
        long staff=readyStaff();long second=jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES('Second','Address','ACTIVE') RETURNING id",Long.class);
        onboarding.assign(admin,staff,second,Instant.now().plusSeconds(600));
        var response=mvc.perform(get("/api/v1/staff/cinema-assignments").with(actor(staff,"STAFF"))).andReturn().getResponse();safe(response,200);
        assertThat(node(response).get("assignments").size()).isEqualTo(1);assertThat(node(response).get("assignments").get(0).get("cinemaId").asText()).isEqualTo(Long.toString(cinema));
        assertThat(response.getContentAsString()).doesNotContain("userId","email","phone","assignmentType");
        onboarding.assignmentStatus(admin,staff,Long.parseLong(repository.assignments(staff).getFirst().id()),"INACTIVE");
        var empty=mvc.perform(get("/api/v1/staff/cinema-assignments").with(actor(staff,"STAFF"))).andReturn().getResponse();safe(empty,200);assertThat(node(empty).get("assignments").size()).isZero();
    }
    @Test void noAssignmentFutureRevokedAndManagerMembershipDenyScope() throws Exception {
        long staff=user("STAFF"),booking=paid(standard);safe(resolve(staff,cinema,qr(booking)),403);safe(recover(staff,booking,cinema),403);safe(command(staff,booking,cinema,tickets(booking)),403);
        owner("smart_cinema_staff_owner","INSERT INTO cinema_assignments(user_id,cinema_id,assignment_type,status,effective_at) VALUES(?,?,'MANAGER','ACTIVE',clock_timestamp())",staff,cinema);
        safe(resolve(staff,cinema,qr(booking)),403);
        owner("smart_cinema_staff_owner","INSERT INTO cinema_assignments(user_id,cinema_id,assignment_type,status,effective_at) VALUES(?,?,'STAFF','ACTIVE',clock_timestamp()+interval '1 day')",staff,cinema);
        safe(recover(staff,booking,cinema),403);
        long ready=readyStaff();onboarding.assignmentStatus(admin,ready,Long.parseLong(repository.assignments(ready).getFirst().id()),"INACTIVE");safe(command(ready,booking,cinema,tickets(booking)),403);
    }
    @Test void unknownForeignQrAndForeignRecoveryShareGeneric404() throws Exception {
        long staff=readyStaff(),booking=paid(standard);long other=jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES('Other','Address','ACTIVE') RETURNING id",Long.class);
        onboarding.assign(admin,staff,other,Instant.now().minusSeconds(10));
        var unknown=resolve(staff,other,"unknown-private-fixture");var foreign=resolve(staff,other,qr(booking));safe(unknown,404);safe(foreign,404);
        assertThat(unknown.getContentAsString()).isEqualTo(foreign.getContentAsString());safe(recover(staff,booking,other),404);safe(command(staff,booking,other,tickets(booking)),404);
        safe(recover(staff,Long.MAX_VALUE,cinema),404);assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    @Test void opaqueUnicodeQrResolutionIsExactAndDoesNotMutate() throws Exception {
        long staff=readyStaff();String opaque="  Vé e\u0301 É 😀 /?+%  ";
        // Test-only pre-settlement fixture trigger: guards/paid assertions stay enabled.
        // Confidential fixture DDL bypasses parameter/statement-value diagnostics too.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection->{
            try(var statement=connection.createStatement()){statement.execute("CREATE FUNCTION qr_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='PAID' AND OLD.status='PENDING' THEN NEW.booking_qr_token:='"+opaque+"'; END IF; RETURN NEW; END $$");}return null;
        });
        jdbc.execute("CREATE TRIGGER aaa_qr_fixture BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION qr_fixture()");
        long booking;try{booking=paid(standard,vip,couple);}finally{jdbc.execute("DROP TRIGGER aaa_qr_fixture ON bookings");jdbc.execute("DROP FUNCTION qr_fixture()");}
        assertThat(qr(booking).equals(opaque)).isTrue();var before=bookingReads.tickets(booking,customer);var response=resolve(staff,cinema,opaque);safe(response,200);
        assertThat(response.getContentAsString().contains(opaque)).isFalse();assertThat(node(response).get("tickets").size()).isEqualTo(3);
        for(String altered:List.of(opaque.strip(),java.text.Normalizer.normalize(opaque,java.text.Normalizer.Form.NFC),opaque.toLowerCase(Locale.ROOT)))safe(resolve(staff,cinema,altered),404);
        var after=bookingReads.tickets(booking,customer);assertThat(after.tickets()).isEqualTo(before.tickets());assertThat(after.bookingQr().equals(before.bookingQr())).isTrue();assertThat(after.bookingStatus()).isEqualTo(before.bookingStatus());for(long id:tickets(booking))assertThat(audit(id)).isZero();
    }
    @Test void paidProjectionAndIndependentCoupleCheckInPreserveCustomerQr() throws Exception {
        long staff=readyStaff(),booking=paid(standard,vip,couple);var ids=tickets(booking);String before=qr(booking);
        var initial=resolve(staff,cinema,before);safe(initial,200);var units=node(initial).get("tickets");
        assertThat(units.get(0).get("seatType").asText()).isEqualTo("STANDARD");assertThat(units.get(1).get("seatType").asText()).isEqualTo("VIP");assertThat(units.get(2).get("guestCount").asInt()).isEqualTo(2);
        var checked=command(staff,booking,cinema,List.of(ids.getLast()));safe(checked,200);
        assertThat(node(checked).get("checkedInTicketIds").get(0).asText()).isEqualTo(Long.toString(ids.getLast()));
        var after=recover(staff,booking,cinema);safe(after,200);var statuses=node(after).get("tickets");assertThat(statuses.get(0).get("status").asText()).isEqualTo("VALID");
        assertThat(statuses.get(2).get("status").asText()).isEqualTo("CHECKED_IN");assertThat(statuses.get(2).get("canCheckIn").asBoolean()).isFalse();
        assertThat(node(after).get("bookingStatus").asText()).isEqualTo("PAID");assertThat(qr(booking).equals(before)).isTrue();assertThat(audit(ids.getLast())).isEqualTo(1);
        safe(command(staff,booking,cinema,ids.subList(0,2)),200);for(long id:ids)assertThat(audit(id)).isEqualTo(1);
    }
    @Test void lostCommittedResponseRecoversWithGetWithoutReplay() throws Exception {
        long staff=readyStaff(),booking=paid(couple);var ids=tickets(booking);
        command(staff,booking,cinema,ids); // Deliberately discard response; transport-loss fixture.
        var recovered=recover(staff,booking,cinema);safe(recovered,200);assertThat(node(recovered).get("tickets").get(0).get("status").asText()).isEqualTo("CHECKED_IN");
        safe(command(staff,booking,cinema,ids),409);assertThat(audit(ids.getFirst())).isEqualTo(1);safe(resolve(staff,cinema,qr(booking)),200);
    }
    @Test void mixedAlreadyUsedBatchRollsBackEveryUnusedSelectedUnit() throws Exception {
        long staff=readyStaff(),booking=paid(standard,vip,couple);var ids=tickets(booking);safe(command(staff,booking,cinema,List.of(ids.getFirst())),200);
        safe(command(staff,booking,cinema,ids),409);assertThat(audit(ids.get(1))).isZero();assertThat(audit(ids.get(2))).isZero();
        assertThat(bookingReads.tickets(booking,customer).tickets().stream().map(CustomerTicket::status)).containsExactly("CHECKED_IN","VALID","VALID");
    }
    @Test void foreignAndMissingSelectedTicketRejectWholeBatchWith404() throws Exception {
        long staff=readyStaff(),first=paid(standard),second=paid(vip);var id=tickets(first).getFirst();
        safe(command(staff,first,cinema,List.of(id,tickets(second).getFirst())),404);safe(command(staff,first,cinema,List.of(id,Long.MAX_VALUE)),404);assertThat(audit(id)).isZero();
    }
    @Test void unpaidBookingRecoveryHasNoTicketEntitlements() throws Exception {
        long staff=readyStaff();var hold=seats.acquire(showtime,customer,List.of(standard));var b=bookings.create(customer,new BookingRequest(showtime,hold.holds().stream().map(h->Long.parseLong(h.id())).toList()));
        var response=recover(staff,Long.parseLong(b.id()),cinema);safe(response,200);assertThat(node(response).get("tickets").size()).isZero();
        assertThat(node(response).get("admissionReason").asText()).isEqualTo("NOT_PAID");safe(command(staff,Long.parseLong(b.id()),cinema,List.of(1L)),409);
    }
    @Test void inactiveCinemaAndHallDenyReadEligibilityAndCommand() throws Exception {
        long staff=readyStaff(),booking=paid(standard);var ids=tickets(booking);
        jdbc.queryForObject("SELECT configure_cinema(?,?,'Fixture cinema','Address',NULL,NULL,'TEMPORARILY_CLOSED')",Long.class,admin,cinema);
        assertThat(node(recover(staff,booking,cinema)).get("admissionReason").asText()).isEqualTo("CONTEXT_UNAVAILABLE");safe(command(staff,booking,cinema,ids),409);
        jdbc.queryForObject("SELECT configure_cinema(?,?,'Fixture cinema','Address',NULL,NULL,'ACTIVE')",Long.class,admin,cinema);
        jdbc.queryForObject("SELECT configure_hall(?,?,?,'Hall',4,'Configured','MAINTENANCE')",Long.class,admin,cinema,hall);safe(command(staff,booking,cinema,ids),409);assertThat(audit(ids.getFirst())).isZero();
    }
    @Test void expiredAndCancelledTicketsRemainNonSelectable() throws Exception {
        long staff=readyStaff();
        for(String state:List.of("EXPIRED","CANCELLED")) {
            jdbc.execute("CREATE FUNCTION state_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.status:='"+state+"'; RETURN NEW; END $$");
            jdbc.execute("CREATE TRIGGER state_fixture BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION state_fixture()");
            long booking;try{booking=paid(state.equals("EXPIRED")?standard:vip);}finally{jdbc.execute("DROP TRIGGER state_fixture ON tickets");jdbc.execute("DROP FUNCTION state_fixture()");}
            var response=recover(staff,booking,cinema);safe(response,200);assertThat(node(response).get("tickets").get(0).get("canCheckIn").asBoolean()).isFalse();safe(command(staff,booking,cinema,tickets(booking)),409);
        }
    }
    @Test void strictBodiesQueriesIdsAndMalformedUtf8HaveSafe400() throws Exception {
        long staff=readyStaff(),booking=paid(standard);String url=path(booking)+"/check-ins";
        for(String body:List.of("{}","[]","{\"cinemaId\":\"1\",\"cinemaId\":\"2\",\"ticketIds\":[\"1\"]}",
            "{\"cinemaId\":\"1\",\"ticketIds\":[1]}","{\"cinemaId\":\"1\",\"ticketIds\":[\"1\",\"1\"]}","{\"cinemaId\":\"1\",\"ticketIds\":[]}",
            "{\"cinemaId\":\"01\",\"ticketIds\":[\"1\"]}","{\"cinemaId\":\"1\",\"ticketIds\":[\"1\"],\"checkedInAt\":\"override\"}","{} {}"))
            safe(mvc.perform(post(url).with(actor(staff,"STAFF")).contentType("application/json").content(body)).andReturn().getResponse(),400);
        for(String id:List.of("01","0","9223372036854775808","bad"))safe(mvc.perform(get("/api/v1/staff/bookings/"+id).param("cinemaId",Long.toString(cinema)).with(actor(staff,"STAFF"))).andReturn().getResponse(),400);
        safe(mvc.perform(get(path(booking)).with(actor(staff,"STAFF"))).andReturn().getResponse(),400);
        safe(mvc.perform(get(path(booking)).param("cinemaId","1","1").with(actor(staff,"STAFF"))).andReturn().getResponse(),400);
        safe(mvc.perform(get(path(booking)).param("cinemaId",Long.toString(cinema)).param("bookingQr","secret-fixture").with(actor(staff,"STAFF"))).andReturn().getResponse(),400);
        safe(mvc.perform(get("/api/v1/staff/cinema-assignments").with(actor(staff,"STAFF")).content("{}")).andReturn().getResponse(),400);
        safe(mvc.perform(post("/api/v1/staff/booking-qr-resolutions").with(actor(staff,"STAFF")).contentType("application/json").content(new byte[]{(byte)0xc3,0x28})).andReturn().getResponse(),400);
        safe(mvc.perform(post(url).with(actor(staff,"STAFF")).contentType("text/plain").content("{}")).andReturn().getResponse(),400);
    }
    @Test void invalidOpaqueQrAndQueryInjectionAreRejectedWithoutReflection() throws Exception {
        long staff=readyStaff();for(String value:List.of(" ","x".repeat(129),"x\n"))safe(resolve(staff,cinema,value),400);
        safe(mvc.perform(post("/api/v1/staff/booking-qr-resolutions").with(actor(staff,"STAFF")).contentType("application/json")
            .content("{\"cinemaId\":\""+cinema+"\",\"bookingQr\":\"x\\uD800\"}")).andReturn().getResponse(),400);
        safe(mvc.perform(post("/api/v1/staff/booking-qr-resolutions").param("bookingQr","secret-fixture").with(actor(staff,"STAFF")).contentType("application/json").content("{}")).andReturn().getResponse(),400);
    }
    @Test void exactOneMiBBoundAllowsLargeValidBodyAndRejectsOneMoreByte() throws Exception {
        long staff=readyStaff(),booking=paid(couple);String body=json(Map.of("cinemaId",Long.toString(cinema),"ticketIds",tickets(booking).stream().map(String::valueOf).toList()));
        String exact=body+" ".repeat(1048576-body.length());
        safe(mvc.perform(post(path(booking)+"/check-ins").with(actor(staff,"STAFF")).contentType("application/json").content(exact)).andReturn().getResponse(),200);
        safe(mvc.perform(post(path(booking)+"/check-ins").with(actor(staff,"STAFF")).contentType("application/json").content(exact+" ")).andReturn().getResponse(),400);
        safe(mvc.perform(post("/api/v1/staff/booking-qr-resolutions").with(actor(staff,"STAFF")).contentType("application/json").content(" ".repeat(65537))).andReturn().getResponse(),400);
    }
    @Test void readBucketsAreSharedAcrossAssignmentsResolveAndRecovery() throws Exception {
        long staff=readyStaff(),booking=paid(standard);
        for(int i=0;i<60;i++) {
            var response=i%3==0?mvc.perform(get("/api/v1/staff/cinema-assignments").with(actor(staff,"STAFF"))).andReturn().getResponse():i%3==1?resolve(staff,cinema,qr(booking)):recover(staff,booking,cinema);safe(response,200);
        }
        var limited=recover(staff,booking,cinema);safe(limited,429);assertThat(limited.getHeader("Retry-After")).isEqualTo("60");
        safe(command(staff,booking,cinema,tickets(booking)),200); // Separate command bucket.
    }
    @Test void commandBucketPersistsAcrossBusinessRollbacks() throws Exception {
        long staff=readyStaff(),booking=paid(standard);var ids=tickets(booking);safe(command(staff,booking,cinema,ids),200);
        for(int i=1;i<30;i++)safe(command(staff,booking,cinema,ids),409);
        var limited=command(staff,booking,cinema,ids);safe(limited,429);assertThat(limited.getHeader("Retry-After")).isEqualTo("60");safe(recover(staff,booking,cinema),200);assertThat(audit(ids.getFirst())).isEqualTo(1);
    }
    @Test void concurrentStaffSameTicketProduceOne200AndOne409() throws Exception {
        long first=readyStaff(),second=readyStaff(),booking=paid(couple);var ids=tickets(booking);var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await();return command(first,booking,cinema,ids).getStatus();});var b=pool.submit(()->{start.await();return command(second,booking,cinema,ids).getStatus();});start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(audit(ids.getFirst())).isEqualTo(1);
    }
    @Test void overlappingConcurrentBatchesHaveAtomicLosingSelection() throws Exception {
        long staff=readyStaff(),booking=paid(standard,vip,couple);var ids=tickets(booking);var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await();return command(staff,booking,cinema,ids.subList(0,2)).getStatus();});var b=pool.submit(()->{start.await();return command(staff,booking,cinema,ids.subList(1,3)).getStatus();});start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(audit(ids.get(1))).isEqualTo(1);assertThat(audit(ids.getFirst())+audit(ids.getLast())).isEqualTo(1);
    }
    @Test void accountBlockAndScopeRevocationSerializeAgainstHttpCommand() throws Exception {
        long staff=readyStaff(),booking=paid(standard);long assignment=Long.parseLong(repository.assignments(staff).getFirst().id());
        for(boolean block:List.of(false,true)) {
            if(block)onboarding.assignmentStatus(admin,staff,assignment,"ACTIVE");
            try(var connection=dataSource.getConnection();var pool=Executors.newSingleThreadExecutor()) {
                connection.setAutoCommit(false);try(var lock=connection.prepareStatement("SELECT id FROM users WHERE id=? FOR UPDATE")){lock.setLong(1,staff);lock.executeQuery();}
                var waiting=pool.submit(()->command(staff,booking,cinema,tickets(booking)).getStatus());awaitWriterLock();
                try(var change=connection.prepareStatement(block?"SELECT staff_set_status(?,?,'BLOCKED')":"SELECT staff_assign_cinema(?,?,NULL,NULL,?,'INACTIVE')")) {
                    change.setLong(1,admin);change.setLong(2,staff);if(!block)change.setLong(3,assignment);change.execute();
                }
                connection.commit();assertThat(waiting.get(15,TimeUnit.SECONDS)).isEqualTo(403);
            }
        }
        assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    private void awaitWriterLock() throws Exception {
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);boolean waiting=false;
        while(System.nanoTime()<until) {waiting=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM check_in_tickets%')",Boolean.class));if(waiting)break;Thread.sleep(10);}
        assertThat(waiting).as("Actual protected writer lock wait").isTrue();
    }
    @Test void injectedAuditFailureRollsBackBatchAndMapsSafe503() throws Exception {
        long staff=readyStaff(),booking=paid(standard,couple);var ids=tickets(booking);
        jdbc.execute("CREATE FUNCTION audit_failure_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='TICKET_CHECKED_IN' THEN RAISE EXCEPTION 'private SQL fixture'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER audit_failure_fixture BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION audit_failure_fixture()");
        try{safe(command(staff,booking,cinema,ids),503);}finally{jdbc.execute("DROP TRIGGER audit_failure_fixture ON audit_records");jdbc.execute("DROP FUNCTION audit_failure_fixture()");}
        for(long id:ids)assertThat(audit(id)).isZero();assertThat(bookingReads.tickets(booking,customer).tickets().stream().map(CustomerTicket::status)).containsOnly("VALID");
    }
    @Test void commandLockTimeoutIsBoundedAndRecoverableWithSafe503() throws Exception {
        long staff=readyStaff(),booking=paid(standard);var ids=tickets(booking);
        try(var connection=dataSource.getConnection()) {
            connection.setAutoCommit(false);try(var lock=connection.prepareStatement("SELECT id FROM users WHERE id=? FOR UPDATE")){lock.setLong(1,staff);lock.executeQuery();}
            safe(command(staff,booking,cinema,ids),503);connection.rollback();
        }
        safe(recover(staff,booking,cinema),200);assertThat(audit(ids.getFirst())).isZero();
    }
    @Test void incompletePaidAggregateReturns503BeforeCommand() throws Exception {
        long staff=readyStaff(),booking=paid(standard);var units=operational.issued(booking);
        org.mockito.Mockito.doReturn(List.of()).when(operational).issued(booking);
        try{safe(resolve(staff,cinema,qr(booking)),503);safe(recover(staff,booking,cinema),503);safe(command(staff,booking,cinema,tickets(booking)),503);}
        finally{org.mockito.Mockito.doReturn(units).when(operational).issued(booking);}
        assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    @Test void unavailableReadReturns503WithoutFalseMutationClaim() throws Exception {
        long staff=readyStaff(),booking=paid(standard);org.mockito.Mockito.doThrow(new org.springframework.dao.DataAccessResourceFailureException("private fixture")).when(operational).resolve(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.eq(cinema));
        try{safe(resolve(staff,cinema,qr(booking)),503);}finally{org.mockito.Mockito.reset(operational);}
        safe(recover(staff,booking,cinema),200);assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    @Test void attributableAuditIsExactAndImmutableAfterHttpSuccess() throws Exception {
        long staff=readyStaff(),booking=paid(couple);long ticket=tickets(booking).getFirst();safe(command(staff,booking,cinema,List.of(ticket)),200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_records a JOIN tickets t ON t.id=a.resource_id WHERE a.action='TICKET_CHECKED_IN' AND a.resource_type='TICKET' AND t.id=? AND a.actor_user_id=? AND a.occurred_at=t.checked_in_at AND a.metadata=jsonb_build_object('booking_id',?::text,'cinema_id',?::text,'showtime_id',?::text)",Integer.class,ticket,staff,Long.toString(booking),Long.toString(cinema),Long.toString(showtime))).isEqualTo(1);
        assertThatThrownBy(()->jdbc.update("DELETE FROM audit_records WHERE resource_type='TICKET' AND resource_id=?",ticket)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->jdbc.update("UPDATE tickets SET status='VALID',checked_in_at=NULL,checked_in_by_user_id=NULL WHERE id=?",ticket)).isInstanceOf(RuntimeException.class);
        onboarding.status(admin,staff,"BLOCKED");assertThat(audit(ticket)).isEqualTo(1);
    }
    @Test void futureOutsideAdmissionWindowRemainsPaidWithoutCheckIn() throws Exception {
        long staff=readyStaff();jdbc.queryForObject("SELECT configure_showtime(?,?,?,?,clock_timestamp()+interval '40 minutes',10000,'OPEN_FOR_BOOKING')",Long.class,admin,showtime,movie,hall);
        long booking=paid(standard);var response=recover(staff,booking,cinema);safe(response,200);
        assertThat(node(response).get("admissionReason").asText()).isEqualTo("OUTSIDE_ADMISSION_WINDOW");safe(command(staff,booking,cinema,tickets(booking)),409);
        assertThat(bookingReads.tickets(booking,customer).bookingStatus()).isEqualTo("PAID");
    }
    @Test void readPredicateMatchesV13AtExactBoundariesAndAllShowtimeStates() {
        Instant start=Instant.parse("2026-10-13T12:00:00Z");
        for(String state:List.of("DRAFT","SCHEDULED","OPEN_FOR_BOOKING","STARTED","ENDED","CANCELLED")) {
            for(Instant now:List.of(start.minusSeconds(1800).minusNanos(1000),start.minusSeconds(1800),start,start.plusSeconds(900),start.plusSeconds(900).plusNanos(1000))) {
                boolean allowed=jdbc.queryForObject("SELECT staff_admission_at(CAST(? AS timestamptz),?,'ACTIVE','ACTIVE',CAST(? AS timestamptz))",Boolean.class,start.toString(),state,now.toString());
                assertThat(StaffAdmissionService.reason(true,start,state,"ACTIVE","ACTIVE",now)==null).isEqualTo(allowed);
            }
        }
    }
    @Test void originalBookingExpiryMovieVisibilityAndCustomerBlockDoNotVetoPaidAdmission() throws Exception {
        long staff=readyStaff();var holds=jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '2 seconds')",Long.class,showtime,customer,array(List.of(couple)));
        long booking=Long.parseLong(bookings.create(customer,new BookingRequest(showtime,holds)).id());long payment=Long.parseLong(payments.initiate(booking,customer).id());
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,payment,customer);
        jdbc.queryForObject("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,id::text,'IPN',?,'SUCCESS','00','00') FROM payment_transactions WHERE id=?",String.class,UUID.randomUUID().toString().replace("-","").repeat(2),payment);
        jdbc.update("UPDATE movies SET status='UNPUBLISHED' WHERE id=?",movie);jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",customer);Thread.sleep(2100);
        assertThat(jdbc.queryForObject("SELECT expires_at<=clock_timestamp() FROM bookings WHERE id=?",Boolean.class,booking)).isTrue();
        safe(recover(staff,booking,cinema),200);safe(command(staff,booking,cinema,tickets(booking)),200);
    }
    @Test void concessionProjectionUsesPurchasedSnapshotsWithoutPricesOrPickup() throws Exception {
        long staff=readyStaff();var holds=seats.acquire(showtime,customer,List.of(standard));long booking=Long.parseLong(bookings.create(customer,new BookingRequest(showtime,holds.holds().stream().map(h->Long.parseLong(h.id())).toList())).id());
        long item=jdbc.queryForObject("SELECT configure_concession_item(NULL,'Bắp gốc',NULL,'POPCORN',1000,NULL,'ACTIVE')",Long.class);
        jdbc.queryForObject("SELECT edit_booking_concession(?,?,NULL,?,2,'ADD')",Object.class,booking,customer,item);
        long payment=Long.parseLong(payments.initiate(booking,customer).id());jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,payment,customer);
        jdbc.queryForObject("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,id::text,'IPN',?,'SUCCESS','00','00') FROM payment_transactions WHERE id=?",String.class,UUID.randomUUID().toString().replace("-","").repeat(2),payment);
        jdbc.queryForObject("SELECT configure_concession_item(?,'Renamed',NULL,'POPCORN',2000,NULL,'INACTIVE')",Long.class,item);
        var response=recover(staff,booking,cinema);safe(response,200);var line=node(response).get("concessions").get(0);
        assertThat(line.get("name").asText()).isEqualTo("Bắp gốc");assertThat(line.get("quantity").asInt()).isEqualTo(2);assertThat(line.size()).isEqualTo(3);
        assertThat(response.getContentAsString()).doesNotContain("sellingPrice","price","pickup","finalAmount");
    }
    @Test void concurrentCheckInReadSeesOneReadOnlyRepeatableSnapshot() throws Exception {
        long staff=readyStaff(),booking=paid(standard,couple);var ids=tickets(booking);var observed=new CountDownLatch(1);var release=new CountDownLatch(1);var first=new java.util.concurrent.atomic.AtomicBoolean(true);
        org.mockito.Mockito.doAnswer(invocation->{
            if(first.compareAndSet(true,false)) {
                assertThat(jdbc.queryForObject("SHOW transaction_read_only",String.class)).isEqualTo("on");assertThat(jdbc.queryForObject("SHOW transaction_isolation",String.class)).isEqualTo("repeatable read");
                observed.countDown();assertThat(release.await(10,TimeUnit.SECONDS)).isTrue();
            }
            return invocation.callRealMethod();
        }).when(operational).issued(booking);
        try(var pool=Executors.newSingleThreadExecutor()) {
            var read=pool.submit(()->resolve(staff,cinema,qr(booking)));
            try{assertThat(observed.await(10,TimeUnit.SECONDS)).isTrue();safe(command(staff,booking,cinema,ids),200);}finally{release.countDown();}
            var snapshot=read.get(10,TimeUnit.SECONDS);safe(snapshot,200);for(var ticket:node(snapshot).get("tickets"))assertThat(ticket.get("status").asText()).isEqualTo("VALID");
        } finally{org.mockito.Mockito.doCallRealMethod().when(operational).issued(booking);}
        for(var ticket:node(recover(staff,booking,cinema)).get("tickets"))assertThat(ticket.get("status").asText()).isEqualTo("CHECKED_IN");
    }
    @Test void deferredCommitAssertionFailureCannotProduce200() throws Exception {
        long staff=readyStaff(),booking=paid(standard,couple);var ids=tickets(booking);
        jdbc.execute("CREATE FUNCTION commit_failure_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='TICKET_CHECKED_IN' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='private deferred fixture'; END IF; RETURN NULL; END $$");
        jdbc.execute("CREATE CONSTRAINT TRIGGER commit_failure_fixture AFTER INSERT ON audit_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION commit_failure_fixture()");
        try{safe(command(staff,booking,cinema,ids),503);}finally{jdbc.execute("DROP TRIGGER commit_failure_fixture ON audit_records");jdbc.execute("DROP FUNCTION commit_failure_fixture()");}
        for(long id:ids)assertThat(audit(id)).isZero();for(var ticket:node(recover(staff,booking,cinema)).get("tickets"))assertThat(ticket.get("status").asText()).isEqualTo("VALID");
    }
    @Test void v13UpgradePreservesAllPriorChecksumsWriterAndRestrictedAcl() throws Exception {
        String upgrade="staff_http_upgrade_"+UUID.randomUUID().toString().replace("-","");String source;try(var connection=dataSource.getConnection()){source=connection.getMetaData().getURL();}
        var old=org.flywaydb.core.Flyway.configure().dataSource(source,System.getenv("DB_USERNAME"),System.getenv("DB_PASSWORD")).defaultSchema(upgrade).schemas(upgrade,"public").target("13").load();old.migrate();
        var before=jdbc.queryForList("SELECT version,checksum FROM "+upgrade+".flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
        String writer=jdbc.queryForObject("SELECT pg_get_functiondef(?::regprocedure)",String.class,upgrade+".check_in_tickets(bigint,bigint,bigint,bigint[])");
        var next=org.flywaydb.core.Flyway.configure().dataSource(source,System.getenv("DB_USERNAME"),System.getenv("DB_PASSWORD")).defaultSchema(upgrade).schemas(upgrade,"public").load();next.migrate();next.validate();
        assertThat(jdbc.queryForList("SELECT version,checksum FROM "+upgrade+".flyway_schema_history WHERE version::integer<=13 ORDER BY installed_rank")).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT pg_get_functiondef(?::regprocedure)",String.class,upgrade+".check_in_tickets(bigint,bigint,bigint,bigint[])")).isEqualTo(writer);
        assertThat(jdbc.queryForObject("SELECT has_table_privilege('smart_cinema_hold_runtime',?,'UPDATE')",Boolean.class,upgrade+".tickets")).isFalse();
        assertThat(jdbc.queryForObject("SELECT has_function_privilege('smart_cinema_hold_runtime',?,'EXECUTE')",Boolean.class,upgrade+".staff_rate_limit(text,text)")).isTrue();
        assertThat(jdbc.queryForObject("SELECT has_function_privilege('public',?,'EXECUTE')",Boolean.class,upgrade+".staff_rate_limit(text,text)")).isFalse();
        jdbc.execute("DROP SCHEMA "+upgrade+" CASCADE");
    }
    @Test void traceDiagnosticsDoNotContainPrivateQrToken() throws Exception {
        long staff=readyStaff(),booking=paid(standard);String token=qr(booking);
        var appender=new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();appender.start();
        var jdbcLogger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger("org.springframework.jdbc.core.StatementCreatorUtils");
        var mvcLogger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger("org.springframework.web");var jdbcLevel=jdbcLogger.getLevel();var mvcLevel=mvcLogger.getLevel();
        jdbcLogger.setLevel(ch.qos.logback.classic.Level.TRACE);mvcLogger.setLevel(ch.qos.logback.classic.Level.TRACE);jdbcLogger.addAppender(appender);mvcLogger.addAppender(appender);
        try{safe(resolve(staff,cinema,token),200);assertThat(appender.list.stream().noneMatch(e->e.getFormattedMessage().contains(token))).isTrue();}
        finally{jdbcLogger.detachAppender(appender);mvcLogger.detachAppender(appender);jdbcLogger.setLevel(jdbcLevel);mvcLogger.setLevel(mvcLevel);appender.stop();}
    }
    @Test void actualRepositoriesWorkWithRestrictedRuntimePrivileges() throws Exception {
        long staff=readyStaff(),booking=paid(couple);var ids=tickets(booking);String token=qr(booking);
        try(var connection=dataSource.getConnection();var statement=connection.createStatement()) {
            statement.execute("SET SESSION AUTHORIZATION smart_cinema_hold_runtime");connection.setAutoCommit(false);
            try {
                var limited=new StaffAdmissionRepository(new JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(connection,true)));
                Instant now=limited.now();limited.staff(staff);limited.scope(staff,cinema,now);assertThat(limited.assignments(staff,now)).hasSize(1);
                assertThat(limited.resolve(token,cinema)).isEqualTo(booking);assertThat(limited.booking(booking,cinema,now).status()).isEqualTo("PAID");
                assertThat(limited.issued(booking)).hasSize(1);assertThat(limited.concessions(booking)).isEmpty();assertThat(limited.checkIn(staff,booking,cinema,ids)).containsExactly(Long.toString(ids.getFirst()));connection.commit();
            } finally {connection.rollback();connection.setAutoCommit(true);statement.execute("RESET SESSION AUTHORIZATION");}
        }
        assertThat(audit(ids.getFirst())).isEqualTo(1);safe(recover(staff,booking,cinema),200);
    }
    @Test void bigintResponseAndCommandIdentityRemainExactStrings() throws Exception {
        jdbc.queryForObject("SELECT setval(pg_get_serial_sequence('bookings','id'),9007199254740993,false)",Long.class);
        jdbc.queryForObject("SELECT setval(pg_get_serial_sequence('tickets','id'),9007199254740993,false)",Long.class);
        long staff=readyStaff(),booking=paid(couple);var ids=tickets(booking);assertThat(booking).isGreaterThan(9007199254740991L);
        var read=recover(staff,booking,cinema);safe(read,200);assertThat(node(read).get("bookingId").isString()).isTrue();assertThat(node(read).get("bookingId").asText()).isEqualTo(Long.toString(booking));
        assertThat(node(read).get("tickets").get(0).get("id").isString()).isTrue();var response=command(staff,booking,cinema,ids);safe(response,200);
        assertThat(node(response).get("checkedInTicketIds").get(0).asText()).isEqualTo(Long.toString(ids.getFirst()));
    }
}
