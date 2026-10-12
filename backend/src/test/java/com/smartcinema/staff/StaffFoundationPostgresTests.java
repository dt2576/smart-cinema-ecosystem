package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import jakarta.mail.Multipart;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.booking.*;
import com.smartcinema.payment.PaymentService;
import com.smartcinema.seat.SeatService;

/** Actual isolated PostgreSQL/HTTP/loopback SMTP. No live financial/provider evidence. */
@SpringBootTest(properties={"seat-hold.cleanup-enabled=false","staff.invitations.delivery-enabled=false","logging.level.org.springframework.web=INFO"})
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@EnabledIfEnvironmentVariable(named="STAFF_DB_TESTS",matches="true")
class StaffFoundationPostgresTests {
    private static final String SCHEMA="staff_suite_"+UUID.randomUUID().toString().replace("-","");
    private static final LocalSmtpCapture SMTP=new LocalSmtpCapture();
    private static final String TEST_KEY=Base64.getEncoder().encodeToString(new byte[32]);
    private static final String PASSWORD="Fixture-private-password";
    @DynamicPropertySource static void properties(DynamicPropertyRegistry p) {
        p.add("spring.flyway.default-schema",()->SCHEMA);p.add("spring.flyway.schemas",()->SCHEMA+",public");p.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        p.add("spring.datasource.url",()->System.getenv("DB_URL")+(System.getenv("DB_URL").contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public");
        p.add("staff.invitations.encryption-keys",()->"test:"+TEST_KEY);p.add("staff.invitations.active-key-id",()->"test");
        p.add("staff.invitations.activation-base-url",()->"https://frontend.example.test/staff/activate");
        p.add("staff.invitations.from-address",()->"sender@example.test");p.add("staff.invitations.allow-local-smtp",()->"true");
        p.add("spring.mail.host",()->"127.0.0.1");p.add("spring.mail.port",SMTP::port);p.add("spring.mail.username",()->"");p.add("spring.mail.password",()->"");
        p.add("spring.mail.properties.mail.smtp.auth",()->"false");p.add("spring.mail.properties.mail.smtp.starttls.enable",()->"false");p.add("spring.mail.properties.mail.smtp.starttls.required",()->"false");
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired MockMvc mvc;
    @Autowired StaffOnboardingService onboarding;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean StaffRepository repository;
    @Autowired StaffInvitationCrypto crypto;
    @Autowired StaffDeliveryWorker worker;
    @Autowired JavaMailSenderImpl mail;
    @Autowired PasswordEncoder passwords;
    @Autowired BookingService bookings;
    @Autowired BookingReadService bookingReads;
    @Autowired PaymentService payments;
    @Autowired SeatService seats;
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
        mail.setHost("127.0.0.1");mail.setPort(SMTP.port());
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
    private int redeem(String token,String password,String peer) throws Exception {
        return mvc.perform(post("/api/v1/staff/password-setups").with(r->{r.setRemoteAddr(peer);return r;}).contentType("application/json")
            .content("{\"token\":\""+token+"\",\"password\":\""+password+"\"}")).andReturn().getResponse().getStatus();
    }
    private int redeem(String token,String password) throws Exception {return redeem(token,password,"192.0.2."+(admin%200+1));}
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
    private int checkin(long staff,long booking,List<Long> tickets) {
        return jdbc.queryForObject("SELECT count(*) FROM check_in_tickets(?,?,?,CAST(? AS bigint[]))",Integer.class,staff,booking,cinema,array(tickets));
    }
    private void owner(String role,String sql,Object...args) throws Exception {
        try(var connection=dataSource.getConnection();var statement=connection.createStatement()) {
            statement.execute("SET ROLE "+role);
            try(var ps=connection.prepareStatement(sql)){for(int i=0;i<args.length;i++)ps.setObject(i+1,args[i]);ps.execute();}
            finally {statement.execute("RESET ROLE");}
        }
    }
    private int audit(long ticket) {return jdbc.queryForObject("SELECT count(*) FROM audit_records WHERE resource_type='TICKET' AND action='TICKET_CHECKED_IN' AND resource_id=?",Integer.class,ticket);}

    @Test void adminProvisioningPrivatePasswordAndExplicitActivationLifecycle() throws Exception {
        long staff=staff();var initial=repository.account(staff);assertThat(initial.status()).isEqualTo("BLOCKED");assertThat(initial.passwordSetupCompleted()).isFalse();
        assertThatThrownBy(()->onboarding.status(admin,staff,"ACTIVE")).isInstanceOf(RuntimeException.class);
        assertThat(redeem(token(staff),PASSWORD)).isEqualTo(204);assertThat(repository.account(staff).status()).isEqualTo("BLOCKED");
        assertThat(passwords.matches(PASSWORD,jdbc.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,staff))).isTrue();
        String email=repository.account(staff).email();String login="{\"email\":\""+email+"\",\"password\":\""+PASSWORD+"\"}";
        assertThat(mvc.perform(post("/api/v1/auth/tokens").contentType("application/json").content(login)).andReturn().getResponse().getStatus()).isEqualTo(401);
        onboarding.status(admin,staff,"ACTIVE");assertThat(mvc.perform(post("/api/v1/auth/tokens").contentType("application/json").content(login)).andReturn().getResponse().getStatus()).isEqualTo(200);
    }
    @Test void administrationIsAdminOnlyAndCurrentDatabaseStatusMatters() throws Exception {
        String body="{\"fullName\":\"Fixture\",\"email\":\""+UUID.randomUUID()+"@example.test\",\"phone\":\"0912345678\"}";
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) assertThat(mvc.perform(post("/api/v1/admin/staff").with(actor(user(role),role)).contentType("application/json").content(body)).andReturn().getResponse().getStatus()).isEqualTo(403);
        assertThat(mvc.perform(post("/api/v1/admin/staff").contentType("application/json").content(body)).andReturn().getResponse().getStatus()).isEqualTo(401);
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",admin);
        assertThat(mvc.perform(post("/api/v1/admin/staff").with(actor(admin,"ADMIN")).contentType("application/json").content(body)).andReturn().getResponse().getStatus()).isEqualTo(403);
    }
    @Test void duplicateEmailNeverPromotesOrOverwrites() {
        long staff=staff();String email=repository.account(staff).email();long before=jdbc.queryForObject("SELECT count(*) FROM users",Long.class);
        assertThatThrownBy(()->onboarding.create(admin,"Other",email,"0912345678")).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users",Long.class)).isEqualTo(before);assertThat(repository.account(staff).status()).isEqualTo("BLOCKED");
    }
    @Test void httpStrictBodiesQueriesIdsAndNoStoreWithoutSecretFields() throws Exception {
        String body="{\"fullName\":\"Fixture\",\"email\":\""+UUID.randomUUID()+"@example.test\",\"phone\":\"0912345678\"}";
        var result=mvc.perform(post("/api/v1/admin/staff").with(actor(admin,"ADMIN")).contentType("application/json").content(body)).andReturn().getResponse();
        assertThat(result.getStatus()).isEqualTo(201);assertThat(result.getHeader("Cache-Control")).isEqualTo("no-store");assertThat(result.getContentAsString().contains("token")).isFalse();assertThat(result.getContentAsString().contains("passwordHash")).isFalse();
        for(String json:List.of(body.substring(0,body.length()-1)+",\"password\":\"forbidden\"}","{\"fullName\":\"a\",\"fullName\":\"b\"}","[]","x".repeat(65537))) assertThat(mvc.perform(post("/api/v1/admin/staff").with(actor(admin,"ADMIN")).contentType("application/json").content(json)).andReturn().getResponse().getStatus()).isEqualTo(400);
        assertThat(mvc.perform(get("/api/v1/admin/staff").with(actor(admin,"ADMIN")).param("page","0","1")).andReturn().getResponse().getStatus()).isEqualTo(400);
        assertThat(mvc.perform(get("/api/v1/admin/staff/01").with(actor(admin,"ADMIN"))).andReturn().getResponse().getStatus()).isEqualTo(400);
    }
    @Test void tokenDigestAndEncryptedOutboxNeverContainPlaintext() {
        long staff=staff();String raw=token(staff);String stored=jdbc.queryForObject("SELECT row_to_json(i)::text FROM staff_invitations i WHERE user_id=?",String.class,staff);
        String outbox=jdbc.queryForObject("SELECT row_to_json(d)::text FROM staff_invitation_deliveries d JOIN staff_invitations i ON i.id=d.invitation_id WHERE i.user_id=?",String.class,staff);
        assertThat(stored.contains(raw)).isFalse();assertThat(outbox.contains(raw)).isFalse();assertThat(stored.contains(StaffInvitationCrypto.digest(raw))).isTrue();
        assertThat(jdbc.queryForObject("SELECT expires_at-issued_at=interval '24 hours' FROM staff_invitations WHERE user_id=?",Boolean.class,staff)).isTrue();
    }
    @Test void singleUseSupersessionAndCompletedReissueRejection() throws Exception {
        long staff=staff();String old=token(staff);onboarding.reissue(admin,staff);String fresh=token(staff);
        assertThat(old.equals(fresh)).isFalse();assertThat(redeem(old,PASSWORD)).isEqualTo(400);assertThat(redeem(fresh,PASSWORD)).isEqualTo(204);assertThat(redeem(fresh,PASSWORD)).isEqualTo(400);
        assertThatThrownBy(()->onboarding.reissue(admin,staff)).isInstanceOf(RuntimeException.class);
    }
    @Test void invalidTokenAndWrongPurposeDoNotRevealAccount() throws Exception {
        String a=mvc.perform(post("/api/v1/staff/password-setups").with(r->{r.setRemoteAddr("192.0.2.230");return r;}).contentType("application/json").content("{\"token\":\"invalid\",\"password\":\""+PASSWORD+"\"}")).andReturn().getResponse().getContentAsString();
        String t=crypto.token().value();String b=mvc.perform(post("/api/v1/staff/password-setups").with(r->{r.setRemoteAddr("192.0.2.231");return r;}).contentType("application/json").content("{\"token\":\""+t+"\",\"password\":\""+PASSWORD+"\"}")).andReturn().getResponse().getContentAsString();
        assertThat(a.equals(b)).isTrue();assertThat(a.contains(t)).isFalse();
    }
    @Test void expiryPredicateBothBoundariesAndExpiredActualInvitation() throws Exception {
        assertThat(jdbc.queryForObject("SELECT staff_invitation_at('2026-10-12T00:00:00Z'::timestamptz,'2026-10-13T00:00:00Z'::timestamptz,'2026-10-12T00:00:00Z'::timestamptz)",Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("SELECT staff_invitation_at('2026-10-12'::timestamptz,'2026-10-13'::timestamptz,'2026-10-13'::timestamptz)",Boolean.class)).isFalse();
        long staff=staff();onboarding.status(admin,staff,"BLOCKED");var t=crypto.token();
        // Explicit historical-expiry fixture under test bootstrap owner, no guard disabled.
        owner("smart_cinema_staff_owner","INSERT INTO staff_invitations(user_id,purpose,token_digest,issued_at,expires_at) VALUES(?,'STAFF_PASSWORD_SETUP',?,statement_timestamp()-interval '25 hours',statement_timestamp()-interval '1 hour')",staff,t.digest());
        assertThat(redeem(t.value(),PASSWORD)).isEqualTo(400);
    }
    @Test void concurrentDoubleRedemptionPermitsOneOnly() throws Exception {
        long staff=staff();String token=token(staff);var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await();return redeem(token,PASSWORD,"192.0.2.232");});var b=pool.submit(()->{start.await();return redeem(token,PASSWORD,"192.0.2.233");});start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,400);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_records WHERE resource_id=? AND action='STAFF_PASSWORD_SET'",Integer.class,staff)).isEqualTo(1);
    }
    @Test void byteLengthAndMalformedUtf8RejectedWithoutTokenConsumption() throws Exception {
        long staff=staff();String raw=token(staff);assertThat(redeem(raw,"é".repeat(37))).isEqualTo(400);assertThat(repository.account(staff).passwordSetupCompleted()).isFalse();
        assertThatThrownBy(()->onboarding.password(raw,"password-"+'\uD800')).isInstanceOf(StaffFailure.class);
        assertThat(mvc.perform(post("/api/v1/staff/password-setups").contentType("application/json").content(new byte[]{(byte)0xC3,(byte)0x28})).andReturn().getResponse().getStatus()).isEqualTo(400);
        assertThat(redeem(raw,PASSWORD)).isEqualTo(204);
    }
    @Test void adminHttpStatusInvitationAndAssignmentResourcesAreRealAndTyped() throws Exception {
        long staff=staff();String base="/api/v1/admin/staff/"+staff;var auth=actor(admin,"ADMIN");
        for(String path:List.of("/api/v1/admin/staff?page=0&size=20",base,base+"/cinema-assignments"))assertThat(mvc.perform(get(path).with(auth)).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(post(base+"/invitations").with(auth).contentType("application/json").content("{}")).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(put(base+"/status").with(auth).contentType("application/json").content("{\"status\":\"ACTIVE\"}")).andReturn().getResponse().getStatus()).isEqualTo(409);
        var assignment=mvc.perform(post(base+"/cinema-assignments").with(auth).contentType("application/json").content("{\"cinemaId\":\""+cinema+"\",\"effectiveAt\":\"2026-01-01T00:00:00Z\"}")).andReturn().getResponse();assertThat(assignment.getStatus()).isEqualTo(201);
        @SuppressWarnings("unchecked") var dto=(Map<String,Object>)tools.jackson.databind.json.JsonMapper.shared().readValue(assignment.getContentAsString(),Map.class);assertThat(dto.get("cinemaId") instanceof String).isTrue();String id=(String)dto.get("id");
        assertThat(mvc.perform(put(base+"/cinema-assignments/"+id+"/status").with(auth).contentType("application/json").content("{\"status\":\"INACTIVE\"}")).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(redeem(token(staff),PASSWORD)).isEqualTo(204);assertThat(mvc.perform(put(base+"/status").with(auth).contentType("application/json").content("{\"status\":\"ACTIVE\"}")).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(repository.account(staff).status()).isEqualTo("ACTIVE");
    }
    @Test void staffApiKeepsIdentifiersAboveJavascriptSafeIntegerAsStrings() throws Exception {
        jdbc.execute("SELECT setval('users_id_seq',greatest((SELECT last_value FROM users_id_seq),9007199254740993))");long staff=staff();
        var response=mvc.perform(get("/api/v1/admin/staff/"+staff).with(actor(admin,"ADMIN"))).andReturn().getResponse();assertThat(response.getStatus()).isEqualTo(200);
        @SuppressWarnings("unchecked") var body=(Map<String,Object>)tools.jackson.databind.json.JsonMapper.shared().readValue(response.getContentAsString(),Map.class);assertThat(body.get("id") instanceof String).isTrue();assertThat(body.get("id").equals(Long.toString(staff))).isTrue();
    }
    @Test void blockingOutstandingAccountInvalidatesInvitation() throws Exception {
        long staff=staff();String old=token(staff);onboarding.status(admin,staff,"BLOCKED");assertThat(redeem(old,PASSWORD)).isEqualTo(400);
        assertThat(jdbc.queryForObject("SELECT ciphertext IS NULL FROM staff_invitation_deliveries d JOIN staff_invitations i ON i.id=d.invitation_id WHERE i.user_id=?",Boolean.class,staff)).isTrue();
    }
    @Test void publicAndAdminRateLimitsAreDurable() throws Exception {
        for(int i=0;i<10;i++)assertThat(redeem("invalid",PASSWORD,"192.0.2.250")).isEqualTo(400);assertThat(redeem("invalid",PASSWORD,"192.0.2.250")).isEqualTo(429);
        long staff=staff();for(int i=0;i<3;i++)onboarding.reissue(admin,staff);assertThatThrownBy(()->onboarding.reissue(admin,staff)).isInstanceOf(StaffFailure.class).extracting("status").isEqualTo(429);
    }
    @Test void smtpCaptureVietnameseMultipartEscapingAndTokenLink() throws Exception {
        long staff=staff();String raw=token(staff);int before=SMTP.count();assertThat(worker.deliverOne()).isTrue();assertThat(SMTP.count()).isEqualTo(before+1);
        var mime=SMTP.last();assertThat(mime.getSubject()).isEqualTo("Smart Cinema — Lời mời kích hoạt tài khoản nhân viên");
        Multipart parts=(Multipart)mime.getContent();String content=allText(parts);
        assertThat(content.contains("https://frontend.example.test/staff/activate#token="+raw)).isTrue();assertThat(content.contains("24 giờ")).isTrue();assertThat(content.contains("&lt;img&gt;")).isTrue();assertThat(content.contains("<img>")).isTrue(); // plain-text alternative safely preserves name
        assertThat(repository.account(staff).deliveryStatus()).isEqualTo("SENT");assertThat(repository.account(staff).deliveryAttempts()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT ciphertext IS NULL FROM staff_invitation_deliveries d JOIN staff_invitations i ON i.id=d.invitation_id WHERE i.user_id=?",Boolean.class,staff)).isTrue();
    }
    @Test void realMailpitLoopbackCaptureUsesActualSmtpTransport() throws Exception {
        long staff=staff();String raw=token(staff);mail.setPort(1027);
        assertThat(worker.deliverOne()).isTrue();
        var client=java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        var response=client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:8027/api/v1/messages")).timeout(Duration.ofSeconds(3)).GET().build(),java.net.http.HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        @SuppressWarnings("unchecked") var list=(Map<String,Object>)tools.jackson.databind.json.JsonMapper.shared().readValue(response.body(),Map.class);
        @SuppressWarnings("unchecked") var messages=(List<Map<String,Object>>)list.get("messages");assertThat(messages.isEmpty()).isFalse();
        String id=(String)messages.getFirst().get("ID");assertThat(id.matches("[A-Za-z0-9-]+")).isTrue();
        var content=client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:8027/api/v1/message/"+id)).timeout(Duration.ofSeconds(3)).GET().build(),java.net.http.HttpResponse.BodyHandlers.ofString());
        @SuppressWarnings("unchecked") var captured=(Map<String,Object>)tools.jackson.databind.json.JsonMapper.shared().readValue(content.body(),Map.class);
        assertThat(captured.get("Subject")).isEqualTo("Smart Cinema — Lời mời kích hoạt tài khoản nhân viên");
        assertThat(((String)captured.get("Text")).contains("#token="+raw)).isTrue();assertThat(((String)captured.get("HTML")).contains("&lt;img&gt;")).isTrue();
        assertThat(repository.account(staff).deliveryStatus()).isEqualTo("SENT");mail.setPort(SMTP.port());
    }
    @Test void sensitiveMvcDebugLogsNeverContainTokenOrPassword() throws Exception {
        long staff=staff();String raw=token(staff);
        var root=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        var logger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger("org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor");
        var previous=logger.getLevel();var capture=new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();capture.start();root.addAppender(capture);logger.setLevel(ch.qos.logback.classic.Level.DEBUG);
        try {assertThat(redeem(raw,PASSWORD)).isEqualTo(204);assertThat(capture.list.stream().noneMatch(e->e.getFormattedMessage().contains(raw)||e.getFormattedMessage().contains(PASSWORD))).isTrue();}
        finally {logger.setLevel(previous);root.detachAppender(capture);capture.stop();}
    }
    @Test void expiredQueuedDeliveryIsErasedWithoutSmtpOrNewToken() throws Exception {
        long staff=staff();onboarding.status(admin,staff,"BLOCKED");var raw=crypto.token();var encrypted=crypto.encrypt(staff,raw);
        owner("smart_cinema_staff_owner","INSERT INTO staff_invitations(user_id,purpose,token_digest,issued_at,expires_at) VALUES(?,'STAFF_PASSWORD_SETUP',?,statement_timestamp()-interval '25 hours',statement_timestamp()-interval '1 hour')",staff,raw.digest());
        long invitation=jdbc.queryForObject("SELECT id FROM staff_invitations WHERE token_digest=?",Long.class,raw.digest());
        owner("smart_cinema_staff_owner","INSERT INTO staff_invitation_deliveries(invitation_id,key_id,nonce,ciphertext,next_attempt_at) VALUES(?,?,?,?,clock_timestamp()+interval '1 hour')",invitation,encrypted.keyId(),encrypted.nonce(),encrypted.ciphertext());
        int before=SMTP.count();assertThat(worker.deliverOne()).isFalse();assertThat(SMTP.count()).isEqualTo(before);
        assertThat(repository.account(staff).deliveryStatus()).isEqualTo("EXPIRED");assertThat(jdbc.queryForObject("SELECT ciphertext IS NULL FROM staff_invitation_deliveries WHERE invitation_id=?",Boolean.class,invitation)).isTrue();
    }
    private String allText(Multipart part) throws Exception {StringBuilder text=new StringBuilder();for(int i=0;i<part.getCount();i++){Object value=part.getBodyPart(i).getContent();if(value instanceof Multipart nested)text.append(allText(nested));else if(value instanceof String s)text.append(s);}return text.toString();}
    @Test void smtpUnavailableBoundedRetryKeepsOriginalDigestAndExpiry() throws Exception {
        long staff=staff();String raw=token(staff);Instant expiry=repository.account(staff).invitationExpiresAt();mail.setPort(1);
        for(int attempt=1;attempt<=5;attempt++) {
            assertThat(worker.deliverOne()).isFalse();assertThat(repository.account(staff).deliveryAttempts()).isEqualTo(attempt);
            assertThat(repository.account(staff).invitationExpiresAt()).isEqualTo(expiry);
            if(attempt<5) {assertThat(token(staff).equals(raw)).isTrue();owner("smart_cinema_staff_owner","UPDATE staff_invitation_deliveries SET next_attempt_at=clock_timestamp() WHERE invitation_id=(SELECT id FROM staff_invitations WHERE user_id=? AND revoked_at IS NULL)",staff);}
        }
        assertThat(repository.account(staff).deliveryStatus()).isEqualTo("FAILED");mail.setPort(SMTP.port());
    }
    @Test void leaseCrashRecoveryResendsSameValidInvitation() throws Exception {
        long staff=staff();String raw=token(staff);var claim=repository.claim(5,Duration.ofMinutes(5)).orElseThrow();
        owner("smart_cinema_staff_owner","UPDATE staff_invitation_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE id=?",claim.id());
        assertThat(worker.deliverOne()).isTrue();assertThat(repository.account(staff).deliveryAttempts()).isEqualTo(2);assertThat(allText((Multipart)SMTP.last().getContent()).contains("#token="+raw)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM staff_invitations WHERE user_id=? AND revoked_at IS NULL",Integer.class,staff)).isEqualTo(1);
    }
    @Test void smtpAcceptedThenCrashBeforeFinishDuplicatesSameTokenOnly() throws Exception {
        long staff=staff();String raw=token(staff);Instant expires=repository.account(staff).invitationExpiresAt();int before=SMTP.count();
        org.mockito.Mockito.doThrow(new StaffFailure(503)).doCallRealMethod().when(repository).finish(org.mockito.ArgumentMatchers.anyLong(),org.mockito.ArgumentMatchers.any(UUID.class),org.mockito.ArgumentMatchers.anyBoolean(),org.mockito.ArgumentMatchers.anyInt(),org.mockito.ArgumentMatchers.any(Duration.class));
        assertThatThrownBy(worker::deliverOne).isInstanceOf(StaffFailure.class);assertThat(SMTP.count()).isEqualTo(before+1);assertThat(repository.account(staff).deliveryStatus()).isEqualTo("LEASED");
        owner("smart_cinema_staff_owner","UPDATE staff_invitation_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE invitation_id=(SELECT id FROM staff_invitations WHERE user_id=? AND revoked_at IS NULL)",staff);
        assertThat(worker.deliverOne()).isTrue();assertThat(SMTP.count()).isEqualTo(before+2);assertThat(allText((Multipart)SMTP.last().getContent()).contains("#token="+raw)).isTrue();
        assertThat(repository.account(staff).invitationExpiresAt()).isEqualTo(expires);assertThat(jdbc.queryForObject("SELECT count(*) FROM staff_invitations WHERE user_id=? AND revoked_at IS NULL",Integer.class,staff)).isEqualTo(1);
    }
    @Test void staleLeaseCannotOverwriteSupersedingDelivery() {
        long staff=staff();var old=repository.claim(5,Duration.ofMinutes(5)).orElseThrow();onboarding.reissue(admin,staff);
        repository.finish(old.id(),old.lease(),true,5,Duration.ofSeconds(30));assertThat(repository.account(staff).deliveryStatus()).isEqualTo("QUEUED");assertThat(repository.deliverable(old.id(),old.lease())).isFalse();
    }
    @Test void multipleAssignmentsEffectiveInactiveAndScopedAuthorization() {
        long staff=readyStaff();long other=jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES('Other','Address','ACTIVE') RETURNING id",Long.class);
        onboarding.assign(admin,staff,other,Instant.now().plusSeconds(3600));assertThat(repository.assignments(staff)).hasSize(2);
        var a=repository.assignments(staff).getFirst();onboarding.assignmentStatus(admin,staff,Long.parseLong(a.id()),"INACTIVE");long booking=paid(couple);
        assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
        onboarding.assignmentStatus(admin,staff,Long.parseLong(a.id()),"ACTIVE");assertThat(checkin(staff,booking,tickets(booking))).isEqualTo(1);assertThat(repository.assignments(staff)).hasSize(2);
    }
    @Test void noAssignmentNotEffectiveWrongCinemaAndWrongRolesRejected() {
        long staff=staff();onboarding.password(token(staff),PASSWORD);onboarding.status(admin,staff,"ACTIVE");long booking=paid(standard);
        assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
        var a=onboarding.assign(admin,staff,cinema,Instant.now().plusSeconds(3600));assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
        onboarding.assignmentStatus(admin,staff,Long.parseLong(a.id()),"INACTIVE");onboarding.assign(admin,staff,cinema,Instant.now().minusSeconds(10));
        assertThatThrownBy(()->jdbc.queryForObject("SELECT count(*) FROM check_in_tickets(?,?,?,CAST(? AS bigint[]))",Integer.class,staff,booking,cinema+1000,array(tickets(booking)))).isInstanceOf(RuntimeException.class);
        for(long user:List.of(admin,customer,user("MANAGER")))assertThatThrownBy(()->checkin(user,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
    }
    @Test void inclusiveAdmissionBoundariesAndActualOperationalVocabulary() {
        String sql="SELECT staff_admission_at('2026-10-12T12:00:00Z'::timestamptz,?,'ACTIVE','ACTIVE',CAST(? AS timestamptz))";
        for(String status:List.of("OPEN_FOR_BOOKING","STARTED"))for(String at:List.of("2026-10-12T11:30:00Z","2026-10-12T12:15:00Z"))assertThat(jdbc.queryForObject(sql,Boolean.class,status,at)).isTrue();
        for(String at:List.of("2026-10-12T11:29:59.999999Z","2026-10-12T12:15:00.000001Z"))assertThat(jdbc.queryForObject(sql,Boolean.class,"OPEN_FOR_BOOKING",at)).isFalse();
        for(String status:List.of("DRAFT","SCHEDULED","ENDED","CANCELLED"))assertThat(jdbc.queryForObject(sql,Boolean.class,status,"2026-10-12T12:00:00Z")).isFalse();
    }
    @Test void realWriterRejectsAdmissionBeforeOpeningWindow() {
        jdbc.queryForObject("SELECT configure_showtime(?,?,?,?,clock_timestamp()+interval '40 minutes',10000,'OPEN_FOR_BOOKING')",Long.class,admin,showtime,hall,movie);
        long staff=readyStaff();long booking=paid(standard);assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    @Test void paidAdmissionDoesNotUseOriginalPaymentExpiryOrMoviePublication() throws Exception {
        long staff=readyStaff();
        var holds=jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '2 seconds')",Long.class,showtime,customer,array(List.of(couple)));
        var b=bookings.create(customer,new BookingRequest(showtime,holds));long booking=Long.parseLong(b.id());long payment=Long.parseLong(payments.initiate(booking,customer).id());
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,payment,customer);
        jdbc.queryForObject("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,id::text,'IPN',?,'SUCCESS','00','00') FROM payment_transactions WHERE id=?",String.class,UUID.randomUUID().toString().replace("-","").repeat(2),payment);
        jdbc.update("UPDATE movies SET status='UNPUBLISHED' WHERE id=?",movie);Thread.sleep(2100);
        assertThat(jdbc.queryForObject("SELECT expires_at<=clock_timestamp() FROM bookings WHERE id=?",Boolean.class,booking)).isTrue();assertThat(checkin(staff,booking,tickets(booking))).isEqualTo(1);
    }
    @Test void expiredAndCancelledIssuedTicketFixturesCannotCheckin() throws Exception {
        long staff=readyStaff();
        for(String state:List.of("EXPIRED","CANCELLED")) {
            jdbc.execute("CREATE FUNCTION ticket_state_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.status:='"+state+"'; RETURN NEW; END $$");
            jdbc.execute("CREATE TRIGGER ticket_state_fixture BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION ticket_state_fixture()");
            long booking;
            try {booking=paid(state.equals("EXPIRED")?standard:vip);}finally{jdbc.execute("DROP TRIGGER ticket_state_fixture ON tickets");jdbc.execute("DROP FUNCTION ticket_state_fixture()");}
            assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);assertThat(audit(tickets(booking).getFirst())).isZero();
        }
    }
    @Test void protectedProvisioningCannotCommitWithoutInvitationIntent() {
        long before=jdbc.queryForObject("SELECT count(*) FROM staff_onboarding",Long.class);
        assertThatThrownBy(()->jdbc.queryForObject("SELECT staff_create_account(?,?,?,?)",Long.class,admin,UUID.randomUUID()+"@example.test","Fixture","+84912345678")).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM staff_onboarding",Long.class)).isEqualTo(before);
    }
    @Test void operationalCinemaHallInactivityRejectsWithoutPaidMutation() {
        long staff=readyStaff();long booking=paid(standard);var before=bookingReads.tickets(booking,customer);
        jdbc.queryForObject("SELECT configure_cinema(?,?,'Fixture cinema','Address',NULL,NULL,'TEMPORARILY_CLOSED')",Long.class,admin,cinema);
        assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
        jdbc.queryForObject("SELECT configure_cinema(?,?,'Fixture cinema','Address',NULL,NULL,'ACTIVE')",Long.class,admin,cinema);
        jdbc.queryForObject("SELECT configure_hall(?,?,?,'Hall',4,'Configured','MAINTENANCE')",Long.class,admin,cinema,hall);
        assertThatThrownBy(()->checkin(staff,booking,tickets(booking))).isInstanceOf(RuntimeException.class);
        assertThat(bookingReads.tickets(booking,customer).bookingQr().equals(before.bookingQr())).isTrue();assertThat(bookingReads.tickets(booking,customer).bookingStatus()).isEqualTo("PAID");
    }
    @Test void standardVipCoupleIndependentUsagePreservesIssuedCustomerProjection() {
        long staff=readyStaff();long booking=paid(standard,vip,couple);var before=bookingReads.tickets(booking,customer);List<Long> ids=tickets(booking);
        assertThat(checkin(staff,booking,List.of(ids.getLast()))).isEqualTo(1);var after=bookingReads.tickets(booking,customer);
        assertThat(after.tickets().stream().map(CustomerTicket::guestCount)).containsExactly(1,1,2);assertThat(after.tickets().stream().map(CustomerTicket::status)).containsExactly("VALID","VALID","CHECKED_IN");
        assertThat(after.bookingQr().equals(before.bookingQr())).isTrue();assertThat(after.bookingStatus()).isEqualTo("PAID");assertThat(audit(ids.getLast())).isEqualTo(1);
        assertThat(checkin(staff,booking,ids.subList(0,2))).isEqualTo(2);for(long id:ids)assertThat(audit(id)).isEqualTo(1);
    }
    @Test void alreadyUsedSelectionRollsBackWholeSelectedBatch() {
        long staff=readyStaff();long booking=paid(standard,vip,couple);var ids=tickets(booking);checkin(staff,booking,List.of(ids.getFirst()));
        assertThatThrownBy(()->checkin(staff,booking,ids)).isInstanceOf(RuntimeException.class);assertThat(audit(ids.get(1))).isZero();assertThat(audit(ids.get(2))).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets WHERE id=ANY(CAST(? AS bigint[])) AND status='CHECKED_IN'",Integer.class,array(ids))).isEqualTo(1);
    }
    @Test void missingForeignDuplicatesAndUnpaidSelectionsFailClosed() {
        long staff=readyStaff();long booking=paid(standard);var id=tickets(booking).getFirst();
        for(List<Long> ids:List.of(List.of(id,id),List.of(id,Long.MAX_VALUE),List.<Long>of()))assertThatThrownBy(()->checkin(staff,booking,ids)).isInstanceOf(RuntimeException.class);
        var holds=seats.acquire(showtime,customer,List.of(vip)).holds();var unpaid=bookings.create(customer,new BookingRequest(showtime,holds.stream().map(h->Long.parseLong(h.id())).toList()));
        assertThatThrownBy(()->checkin(staff,Long.parseLong(unpaid.id()),List.of(id))).isInstanceOf(RuntimeException.class);assertThat(audit(id)).isZero();
    }
    @Test void concurrentSameTicketAndOverlappingBatchesHaveOneSuccessfulEffect() throws Exception {
        long staff=readyStaff();long booking=paid(standard,vip,couple);var ids=tickets(booking);var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{gate.await();try{return checkin(staff,booking,ids.subList(0,2));}catch(RuntimeException e){return 0;}});
            var b=pool.submit(()->{gate.await();try{return checkin(staff,booking,ids.subList(1,3));}catch(RuntimeException e){return 0;}});gate.countDown();
            assertThat(a.get(15,TimeUnit.SECONDS)+b.get(15,TimeUnit.SECONDS)).isEqualTo(2);
        }
        assertThat(audit(ids.get(1))).isEqualTo(1);assertThat(audit(ids.getFirst())+audit(ids.getLast())).isEqualTo(1);
    }
    @Test void twoDifferentStaffCompeteForOneTicketExactlyOnce() throws Exception {
        long first=readyStaff(),second=readyStaff(),booking=paid(couple);var ids=tickets(booking);var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{gate.await();try{return checkin(first,booking,ids);}catch(RuntimeException failure){return 0;}});
            var b=pool.submit(()->{gate.await();try{return checkin(second,booking,ids);}catch(RuntimeException failure){return 0;}});gate.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(1,0);
        }
        assertThat(audit(ids.getFirst())).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT checked_in_by_user_id FROM tickets WHERE id=?",Long.class,ids.getFirst())).isIn(first,second);
    }
    @Test void revocationAndBlockingDuringConcurrentCheckinSerialize() throws Exception {
        long staff=readyStaff();long booking=paid(standard);long assignment=Long.parseLong(repository.assignments(staff).getFirst().id());
        for(boolean block:List.of(false,true)) {
            if(block)onboarding.assignmentStatus(admin,staff,assignment,"ACTIVE");
            try(var connection=dataSource.getConnection();var pool=Executors.newSingleThreadExecutor()) {
                connection.setAutoCommit(false);try(var lock=connection.prepareStatement("SELECT id FROM users WHERE id=? FOR UPDATE")){lock.setLong(1,staff);lock.executeQuery();}
                var waiting=pool.submit(()->{try{return checkin(staff,booking,tickets(booking));}catch(RuntimeException failure){return 0;}});
                long waitDeadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);boolean blocked=false;
                while(System.nanoTime()<waitDeadline) {
                    blocked=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%FROM check_in_tickets%')",Boolean.class));
                    if(blocked)break;Thread.sleep(10);
                }
                assertThat(blocked).as("Check-in actually waits on the locked Staff account").isTrue();
                try(var mutation=connection.prepareStatement(block?"SELECT staff_set_status(?,?,'BLOCKED')":"SELECT staff_assign_cinema(?,?,NULL,NULL,?,'INACTIVE')")) {
                    mutation.setLong(1,admin);mutation.setLong(2,staff);if(!block)mutation.setLong(3,assignment);mutation.execute();
                }
                connection.commit();assertThat(waiting.get(15,TimeUnit.SECONDS)).isZero();
            }
        }
        assertThat(audit(tickets(booking).getFirst())).isZero();
    }
    @Test void injectedAuditFailureRollsBackAllTransitionsAndSaleRemains() {
        long staff=readyStaff();long booking=paid(standard,couple);var ids=tickets(booking);
        jdbc.execute("CREATE FUNCTION fail_checkin_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='TICKET_CHECKED_IN' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER fail_checkin_fixture BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION fail_checkin_fixture()");
        try{assertThatThrownBy(()->checkin(staff,booking,ids)).isInstanceOf(RuntimeException.class);}finally{jdbc.execute("DROP TRIGGER fail_checkin_fixture ON audit_records");jdbc.execute("DROP FUNCTION fail_checkin_fixture()");}
        for(long id:ids)assertThat(audit(id)).isZero();assertThat(bookingReads.tickets(booking,customer).tickets().stream().allMatch(t->t.status().equals("VALID"))).isTrue();
    }
    @Test void runtimeAclNoOwnerHelpersFinancialWritesOrDirectMutations() throws Exception {
        long staff=readyStaff();long booking=paid(couple);long ticket=tickets(booking).getFirst();
        try(var connection=dataSource.getConnection();var sql=connection.createStatement()) {
            sql.execute("SET SESSION AUTHORIZATION smart_cinema_hold_runtime");
            for(String command:List.of("UPDATE tickets SET status='CHECKED_IN'","DELETE FROM tickets","UPDATE cinema_assignments SET status='ACTIVE'","INSERT INTO audit_records(action,resource_type,resource_id,metadata) VALUES('TICKET_CHECKED_IN','TICKET',1,'{}')","SELECT lock_staff_admission_resources(1)","SELECT staff_lock_admin(1,2)","SET ROLE smart_cinema_checkin_owner","SET ROLE smart_cinema_staff_owner"))assertThatThrownBy(()->sql.execute(command)).isInstanceOf(SQLException.class);
            sql.execute("RESET SESSION AUTHORIZATION");
            assertThat(jdbc.queryForObject("SELECT has_function_privilege('smart_cinema_checkin_owner',?,'EXECUTE')",Boolean.class,SCHEMA+".record_vnpay_result(text,text,numeric,text,text,text,text,text,text)")).isFalse();
        }
        assertThat(checkin(staff,booking,List.of(ticket))).isEqualTo(1);
        owner("smart_cinema_staff_owner","UPDATE users SET status='BLOCKED' WHERE id=?",staff);assertThat(audit(ticket)).isEqualTo(1); // historical audit doesn't disappear on later block
    }
    @Test void auditOnlyFakeSuccessAndRepeatedTransitionDenied() throws Exception {
        long staff=readyStaff();long booking=paid(standard);long id=tickets(booking).getFirst();
        assertThatThrownBy(()->owner("smart_cinema_checkin_owner","INSERT INTO audit_records(actor_user_id,action,resource_type,resource_id,metadata) VALUES(?,'TICKET_CHECKED_IN','TICKET',?,'{}')",staff,id)).isInstanceOf(SQLException.class);
        assertThat(audit(id)).isZero();checkin(staff,booking,List.of(id));
        assertThatThrownBy(()->owner("smart_cinema_checkin_owner","UPDATE tickets SET checked_in_at=clock_timestamp() WHERE id=?",id)).isInstanceOf(SQLException.class);
        assertThatThrownBy(()->owner("smart_cinema_checkin_owner","UPDATE tickets SET ticket_code='altered' WHERE id=?",id)).isInstanceOf(SQLException.class);assertThat(audit(id)).isEqualTo(1);
    }
    @Test void cleanInstallAndV12UpgradePreserveHistoricalMigrationChecksums() throws Exception {
        String upgrade="staff_upgrade_"+UUID.randomUUID().toString().replace("-","");
        String source;try(var connection=dataSource.getConnection()){source=connection.getMetaData().getURL();}
        var old=org.flywaydb.core.Flyway.configure().dataSource(source,System.getenv("DB_USERNAME"),System.getenv("DB_PASSWORD")).defaultSchema(upgrade).schemas(upgrade,"public").target("12").load();old.migrate();
        try(var connection=dataSource.getConnection()) {
        var before=new JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(connection,true));
        var checksums=before.queryForList("SELECT version,checksum FROM "+upgrade+".flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank");
        var next=org.flywaydb.core.Flyway.configure().dataSource(source,System.getenv("DB_USERNAME"),System.getenv("DB_PASSWORD")).defaultSchema(upgrade).schemas(upgrade,"public").load();next.migrate();next.validate();
        assertThat(before.queryForList("SELECT version,checksum FROM "+upgrade+".flyway_schema_history WHERE success AND version<>'13' ORDER BY installed_rank")).isEqualTo(checksums);
        assertThat(jdbc.queryForObject("SELECT max(version::integer) FROM flyway_schema_history WHERE success",Integer.class)).isEqualTo(13);
        }
        jdbc.execute("DROP SCHEMA "+upgrade+" CASCADE");
    }
}
