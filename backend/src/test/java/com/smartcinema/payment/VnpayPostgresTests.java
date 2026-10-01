package com.smartcinema.payment;
import com.smartcinema.promotion.PromotionService;
import com.smartcinema.concession.ConcessionService;
import com.smartcinema.booking.*;

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
import com.smartcinema.seat.SeatService;

@SpringBootTest(properties = {"seat-hold.ttl=PT5M", "seat-hold.cleanup-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "PAYMENT_DB_TESTS", matches = "true")
class VnpayPostgresTests {
    private static final String SCHEMA = "vnpay_suite_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource
    static void schema(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.flyway.schemas", () -> SCHEMA + ",public");
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.url", () -> {
            String url = System.getenv("DB_URL");
            return url + (url.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA + ",public";
        });
    }
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private MockMvc mvc;
    @Autowired private BookingService bookings;
    @Autowired private ConcessionService concessions;
    @Autowired private PromotionService promotions;
    @Autowired private PaymentService payments;
    @Autowired private SeatService seats;
    private long user, other, movie, cinema, hall, showtime, standard, couple;

    @BeforeEach
    void seed() {
        for (String table : List.of("seats", "seat_holds", "bookings", "booking_seats", "concession_items", "booking_concessions", "promotions", "payment_transactions")) {
            jdbc.execute("SELECT setval('" + table + "_id_seq',greatest((SELECT last_value FROM " + table + "_id_seq),9007199254740993))");
        }
        user = user(); other = user();
        movie = jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES ('Booking movie',60,'PUBLISHED') RETURNING id", Long.class);
        cinema = jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES ('Branch','Address','ACTIVE') RETURNING id", Long.class);
        hall = jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Hall',3,'Configured','ACTIVE') RETURNING id", Long.class, cinema);
        showtime = jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',
                    statement_timestamp()+interval '2 hours',10000,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id
                """, Long.class, movie, hall);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))", Object.class, hall, """
                [{"row":"A","number":"1","type":"STANDARD","physicalStatus":"ACTIVE"},
                 {"row":"H","number":"9-10","type":"COUPLE","physicalStatus":"ACTIVE"}]
                """);
        var ids = jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id", Long.class, hall);
        standard = ids.get(0); couple = ids.get(1);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))", Object.class, showtime, array(ids));
    }
    private long user() {
        return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'hash','Name','0123','CUSTOMER','ACTIVE') RETURNING id",
                Long.class, UUID.randomUUID() + "@example.test");
    }
    private String array(List<Long> ids) { return "{" + String.join(",", ids.stream().map(String::valueOf).toList()) + "}"; }
    private List<Long> hold(long actor, long... units) {
        return seats.acquire(showtime, actor, java.util.Arrays.stream(units).boxed().toList()).holds().stream().map(h -> Long.parseLong(h.id())).toList();
    }
    private BookingResponse create(List<Long> ids) { return bookings.create(user, new BookingRequest(showtime, ids)); }
    private RequestPostProcessor customer(long id) { return jwt().jwt(t -> t.subject(Long.toString(id))).authorities(() -> "ROLE_CUSTOMER"); }
    private List<Long> shortHold(long unit, String ttl) {
        return jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),CAST(? AS interval))", Long.class, showtime, user, array(List.of(unit)), ttl);
    }

    private long item(String name, String category, String price, String status) {
        return jdbc.queryForObject("SELECT configure_concession_item(NULL,?,NULL,?,CAST(? AS numeric),NULL,?)", Long.class, name, category, price, status);
    }
    private int addHttp(long bookingId, long actor, long itemId, int quantity) throws Exception {
        return mvc.perform(post("/api/v1/bookings/" + bookingId + "/concessions").with(customer(actor)).contentType("application/json")
                .content("{\"itemId\":\"" + itemId + "\",\"quantity\":" + quantity + "}")) .andReturn().getResponse().getStatus();
    }

    private String code() { return "TEST-" + UUID.randomUUID().toString().toUpperCase(); }
    private long promotion(String code, String type, String value, String minimum, Integer limit, String cap) {
        return jdbc.queryForObject("SELECT configure_promotion(NULL,?,?,CAST(? AS numeric),clock_timestamp()-interval '1 day',"
                + "clock_timestamp()+interval '1 day',CAST(? AS numeric),?,'ACTIVE',CAST(? AS numeric))",
                Long.class, code, type, value, minimum, limit, cap);
    }
    private BookingResponse apply(long id, String code) { return promotions.edit(id, user, code, "APPLY"); }
    private int applyHttp(long id, long actor, String code) throws Exception {
        return mvc.perform(put("/api/v1/bookings/" + id + "/promotion").with(customer(actor))
                .contentType("application/json").content("{\"code\":\"" + code + "\"}"))
                .andReturn().getResponse().getStatus();
    }
    private void master(long id, String assignment) throws Exception {
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner");
            try { sql.execute("UPDATE promotions SET " + assignment + " WHERE id=" + id); }
            finally { sql.execute("RESET ROLE"); }
        }
    }

    private int initiateHttp(long id, long actor) throws Exception {
        return mvc.perform(post("/api/v1/bookings/" + id + "/payment-transactions").with(customer(actor))
                .contentType("application/json").content("{}")).andReturn().getResponse().getStatus();
    }
    private void noAttempt(long id) {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=?", Integer.class, id)).isZero();
        assertThat(bookings.detail(id, user).paymentStartedAt()).isNull();
    }


    private long attempt(long... units) {
        var b=create(hold(user,units));
        return Long.parseLong(payments.initiate(Long.parseLong(b.id()),user).id());
    }
    private void bind(long payment) {
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,payment,user);
    }
    private String result(long payment,String outcome,String digest) {
        return jdbc.queryForObject("""
            SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,substring(id::text from 3),'IPN',?,?,'00','00')
            FROM payment_transactions WHERE id=?
            """,String.class,digest,outcome,payment);
    }
    private String digest() { return VnpayProtocol.digest(UUID.randomUUID().toString()); }
    private long booking(long payment) { return jdbc.queryForObject("SELECT booking_id FROM payment_transactions WHERE id=?",Long.class,payment); }
    @Test void completeSalePreservesWholeCoupleAndOneQr() {
        long p=attempt(standard,couple); bind(p);
        assertThat(result(p,"SUCCESS",digest())).isEqualTo("00");
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",Integer.class,booking(p))).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE booking_id=? AND status='CONSUMED'",Integer.class,booking(p))).isEqualTo(2);
        String qr=jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=?",String.class,booking(p));
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo(qr);
        assertThatThrownBy(()->seats.acquire(showtime,other,List.of(standard))).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->concessions.edit(booking(p),user,null,item("Food","POPCORN","2","ACTIVE"),1,"ADD")).isInstanceOf(RuntimeException.class);
    }
    @Test void laterBlockedCustomerDoesNotPreventFinalization() {
        long p=attempt(couple); bind(p);
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?",user);
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PAID");
    }
    @Test void cancelledBookingPreservesFinancialSuccessWithoutTickets() {
        long p=attempt(standard); bind(p); bookings.cancel(booking(p),user);
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("SUCCESS");
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliations WHERE payment_id=?",Integer.class,p)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",Integer.class,booking(p))).isZero();
    }
    @Test void pendingRecoversAndDefinitiveFailureAllowsFrozenRetry() {
        long p=attempt(standard); bind(p); result(p,"PENDING",digest());
        assertThat(payments.initiate(booking(p),user).id()).isEqualTo(Long.toString(p));
        result(p,"FAILED",digest());
        var retry=payments.initiate(booking(p),user);
        assertThat(retry.id()).isNotEqualTo(Long.toString(p));
        assertThat(retry.amount()).isEqualTo("10000.0000");
        assertThat(jdbc.queryForObject("SELECT payment_started_at=(SELECT min(initiated_at) FROM payment_transactions WHERE booking_id=?) FROM bookings WHERE id=?",Boolean.class,booking(p),booking(p))).isTrue();
    }
    @Test void duplicatesAndContradictionsAreDurable() {
        long p=attempt(standard); bind(p); String key=digest();
        assertThat(result(p,"SUCCESS",key)).isEqualTo("00");
        assertThat(result(p,"SUCCESS",key)).isEqualTo("02");
        result(p,"FAILED",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("SUCCESS");
        assertThat(jdbc.queryForObject("SELECT reconciliation_required FROM payment_transactions WHERE id=?",Boolean.class,p)).isTrue();
    }
    @Test void runtimeCannotInvokeProviderWriterOrMutateSale() throws Exception {
        try(var connection=dataSource.getConnection();var sql=connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_runtime");
            assertThatThrownBy(()->sql.execute("SELECT record_vnpay_result('TEST0001','Pabc',100,NULL,'IPN',repeat('a',64),'SUCCESS','00','00')")).isInstanceOf(SQLException.class);
            assertThatThrownBy(()->sql.execute("UPDATE bookings SET status='PAID'")).isInstanceOf(SQLException.class);
            sql.execute("RESET ROLE");
        }
    }
    @Test void concurrentSuccessCommitsOnlyOneAggregate() throws Exception {
        long p=attempt(standard,couple); bind(p);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            var a=pool.submit(()->{gate.await();return result(p,"SUCCESS",digest());});
            var b=pool.submit(()->{gate.await();return result(p,"SUCCESS",digest());});
            gate.countDown(); assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo("00"); assertThat(b.get(10,TimeUnit.SECONDS)).isEqualTo("00");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",Integer.class,booking(p))).isEqualTo(2);
    }
    @Test void amountBoundaryAndBindingAreImmutable() {
        jdbc.update("UPDATE showtimes SET base_price=10.5000 WHERE id=?",showtime);
        long p=attempt(standard);
        assertThatThrownBy(()->bind(p)).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT amount FROM payment_transactions WHERE id=?",java.math.BigDecimal.class,p)).isEqualByComparingTo("10.5000");
        assertThat(jdbc.queryForObject("SELECT provider FROM payment_transactions WHERE id=?",String.class,p)).isNull();
    }
    @Test void recoveredSubmissionRetainsDatesAndReference() {
        long p=attempt(standard); bind(p);
        String original=jdbc.queryForObject("SELECT (merchant_reference,provider_created_at,provider_expires_at,submitted_amount)::text FROM payment_transactions WHERE id=?",String.class,p);
        bind(p);
        assertThat(jdbc.queryForObject("SELECT (merchant_reference,provider_created_at,provider_expires_at,submitted_amount)::text FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo(original);
        assertThatThrownBy(()->jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'OTHER001','https://example.test/return','127.0.0.1')",Long.class,p,user)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')",Long.class,p,other)).isInstanceOf(RuntimeException.class);
    }
    @Test void rollbackOnTicketFailureLeavesNoPartialSale() {
        long p=attempt(couple); bind(p);
        jdbc.execute("CREATE FUNCTION fail_ticket_test() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''injected ticket failure''; END'");
        jdbc.execute("CREATE TRIGGER fail_ticket_test BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION fail_ticket_test()");
        try {
            assertThatThrownBy(()->result(p,"SUCCESS",digest())).isInstanceOf(RuntimeException.class);
            assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PENDING");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=? AND sold_at IS NOT NULL",Integer.class,booking(p))).isZero();
            assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("PENDING");
        } finally { jdbc.execute("DROP TRIGGER fail_ticket_test ON tickets"); jdbc.execute("DROP FUNCTION fail_ticket_test()"); }
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PAID");
    }
    @Test void expiryAndReplacementHoldAreNotReclaimed() throws Exception {
        var b=create(shortHold(standard,"2 seconds"));
        long p=Long.parseLong(payments.initiate(Long.parseLong(b.id()),user).id()); bind(p);
        Thread.sleep(2100);
        var replacement=seats.acquire(showtime,other,List.of(standard));
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE id=?",String.class,Long.parseLong(replacement.holds().getFirst().id()))).isEqualTo("ACTIVE");
    }
    @Test void finalizationAndCancellationRaceNeverCommitsPartialSale() throws Exception {
        long p=attempt(couple); bind(p);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            var a=pool.submit(()->{start.await();return result(p,"SUCCESS",digest());});
            var b=pool.submit(()->{start.await();try {bookings.cancel(booking(p),user);}catch(RuntimeException ignored){} return true;});
            start.countDown(); a.get(10,TimeUnit.SECONDS); b.get(10,TimeUnit.SECONDS);
        }
        String status=jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p));
        int tickets=jdbc.queryForObject("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",Integer.class,booking(p));
        assertThat(status).isIn("PAID","CANCELLED"); assertThat(tickets).isEqualTo(status.equals("PAID")?1:0);
    }
    @Test void specialOutcomeCannotCreateReplacementAttempt() {
        long p=attempt(standard); bind(p); result(p,"RECONCILE",digest());
        assertThat(payments.initiate(booking(p),user).id()).isEqualTo(Long.toString(p));
        assertThatThrownBy(()->bind(p)).isInstanceOf(RuntimeException.class);
    }
    @Test void protectedRoutesAndReturnAreSafeWithoutSandboxConfiguration() throws Exception {
        long p=attempt(standard);
        String url="/api/v1/bookings/"+booking(p)+"/payment-transactions/"+p;
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(get(url).with(customer(other))).andExpect(status().isNotFound());
        mvc.perform(get(url).with(customer(user))).andExpect(status().isOk()).andExpect(jsonPath("$.paymentId").value(Long.toString(p)));
        mvc.perform(post(url+"/vnpay-submission").with(customer(user)).contentType("application/json").content("{}"))
            .andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/v1/payments/vnpay/return").param("vnp_ResponseCode","00")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/payments/vnpay/ipn").param("vnp_ResponseCode","00"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.RspCode").value("99"));
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PENDING");
    }
    @Test void promotionLastUseAcrossShowtimesIsSerializedAndFrozen() throws Exception {
        String promoCode=code(); long promo=promotion(promoCode,"FIXED_AMOUNT","100","0",1,null);
        var first=create(hold(user,standard)); apply(Long.parseLong(first.id()),promoCode);
        long a=Long.parseLong(payments.initiate(Long.parseLong(first.id()),user).id()); bind(a);
        long secondShowtime=jdbc.queryForObject("""
            INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
            VALUES (?,?,statement_timestamp()+interval '3 hours',statement_timestamp()+interval '4 hours',
                statement_timestamp()+interval '4 hours',10000,'OPEN_FOR_BOOKING',statement_timestamp()+interval '3 hours') RETURNING id
            """,Long.class,movie,hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",Object.class,secondShowtime,array(List.of(standard,couple)));
        var secondHolds=seats.acquire(secondShowtime,user,List.of(couple)).holds().stream().map(h->Long.parseLong(h.id())).toList();
        var second=bookings.create(user,new BookingRequest(secondShowtime,secondHolds)); apply(Long.parseLong(second.id()),promoCode);
        long b=Long.parseLong(payments.initiate(Long.parseLong(second.id()),user).id()); bind(b);
        master(promo,"status='INACTIVE',discount_value=999,valid_until=clock_timestamp()-interval '1 second'");
        try(var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            var one=pool.submit(()->{start.await();return result(a,"SUCCESS",digest());});
            var two=pool.submit(()->{start.await();return result(b,"SUCCESS",digest());});
            start.countDown(); assertThat(one.get(10,TimeUnit.SECONDS)).isEqualTo("00"); assertThat(two.get(10,TimeUnit.SECONDS)).isEqualTo("00");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE promotion_id=? AND status='PAID'",Integer.class,promo)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE id IN (?,?) AND status='SUCCESS'",Integer.class,a,b)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliations WHERE payment_id IN (?,?) AND reason='PROMOTION_EXHAUSTED'",Integer.class,a,b)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE id IN (?,?) AND discount=100 AND final_amount=9900",Integer.class,booking(a),booking(b))).isEqualTo(2);
    }
    @Test void signedIpnAndLostIpnQueryUseProtectedSystemRole() {
        long p=attempt(standard); bind(p);
        var env=new org.springframework.mock.env.MockEnvironment()
            .withProperty("vnpay.enabled","true").withProperty("vnpay.merchant-code","TEST0001")
            .withProperty("vnpay.hash-secret","local-only-signature-fixture").withProperty("vnpay.ipn-confirmed","true")
            .withProperty("vnpay.signature-confirmed","true").withProperty("vnpay.success-confirmed","true")
            .withProperty("vnpay.query-confirmed","true").withProperty("vnpay.query-signature-confirmed","true")
            .withProperty("vnpay.system-db-url",System.getenv("DB_URL")+"?currentSchema="+SCHEMA+",public")
            .withProperty("vnpay.system-db-username",System.getenv("DB_USERNAME"))
            .withProperty("vnpay.system-db-password",System.getenv("DB_PASSWORD"));
        var settings=new VnpaySettings(env);
        var handler=new VnpayService(settings,new VnpayRepository(jdbc),new VnpaySystemRepository(settings));
        var fields=new java.util.TreeMap<String,String>();
        fields.put("vnp_TmnCode","TEST0001"); fields.put("vnp_TxnRef",jdbc.queryForObject("SELECT merchant_reference FROM payment_transactions WHERE id=?",String.class,p));
        fields.put("vnp_Amount","1000000");fields.put("vnp_ResponseCode","00");fields.put("vnp_TransactionStatus","00");
        fields.put("vnp_TransactionNo",Long.toString(p).substring(2));
        var input=new org.springframework.util.LinkedMultiValueMap<String,String>(); fields.forEach(input::add);
        input.add("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.canonical(fields),settings.secret()));
        assertThat(handler.ipn(input)).isEqualTo("00");
        assertThat(handler.validReturn(input)).isTrue();
        assertThat(handler.ipn(input)).isEqualTo("02");
        long q=attempt(couple); bind(q);
        fields.put("vnp_TxnRef",jdbc.queryForObject("SELECT merchant_reference FROM payment_transactions WHERE id=?",String.class,q));
        fields.put("vnp_TransactionNo",Long.toString(q).substring(2));fields.put("vnp_Command","querydr");fields.put("vnp_TransactionType","01");
        fields.put("vnp_SecureHash",VnpayProtocol.sign(VnpayProtocol.queryResponse(fields),settings.secret()));
        assertThat(handler.acceptQuery(fields)).isEqualTo("00");
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(q))).isEqualTo("PAID");
    }
    @Test void concurrentBindingAndQueryClaimsDoNotExtendDeadline() throws Exception {
        long p=attempt(standard);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            var one=pool.submit(()->{gate.await();bind(p);return true;});
            var two=pool.submit(()->{gate.await();bind(p);return true;});
            gate.countDown(); one.get(10,TimeUnit.SECONDS);two.get(10,TimeUnit.SECONDS);
        }
        String expiry=jdbc.queryForObject("SELECT provider_expires_at::text FROM payment_transactions WHERE id=?",String.class,p);
        var claimed=jdbc.queryForList("SELECT id FROM claim_vnpay_queries('TEST0001',interval '5 minutes',interval '24 hours')",Long.class);
        assertThat(claimed).contains(p);
        assertThat(jdbc.queryForList("SELECT id FROM claim_vnpay_queries('TEST0001',interval '5 minutes',interval '24 hours')",Long.class)).doesNotContain(p);
        assertThat(jdbc.queryForObject("SELECT provider_expires_at::text FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo(expiry);
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("PENDING");
    }
    @Test void reconciliationHorizonAndOperatorResolutionDoNotFakeFailureOrRefund() {
        long p=attempt(standard);bind(p);
        jdbc.queryForList("SELECT id FROM claim_vnpay_queries('TEST0001',interval '5 minutes',interval '0.000001 seconds')",Long.class);
        long caseId=jdbc.queryForObject("SELECT id FROM payment_reconciliations WHERE payment_id=? AND reason='QUERY_HORIZON'",Long.class,p);
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("PENDING");
        assertThatThrownBy(()->jdbc.queryForObject("SELECT resolve_payment_reconciliation(?,?,'sandbox evidence reviewed')",Object.class,caseId,user)).isInstanceOf(RuntimeException.class);
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?",other);
        jdbc.queryForObject("SELECT resolve_payment_reconciliation(?,?,'sandbox evidence reviewed; no refund assertion')",Object.class,caseId,other);
        assertThat(jdbc.queryForObject("SELECT resolved_at IS NOT NULL FROM payment_reconciliations WHERE id=?",Boolean.class,caseId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("PENDING");
    }
    @Test void currentShowtimeEligibilityIsRevalidatedAndUnpaidQrNeverAppears() {
        long p=attempt(couple);bind(p);
        jdbc.update("UPDATE showtimes SET status='STARTED' WHERE id=?",showtime);
        result(p,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE id=?",String.class,p)).isEqualTo("SUCCESS");
        assertThat(jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=?",String.class,booking(p))).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=? AND sold_at IS NOT NULL",Integer.class,booking(p))).isZero();
    }
    @Test void lateSuccessOnFailedAttemptCannotAuthorizeAnotherChargeOrAutomaticSale() {
        long p=attempt(standard);bind(p);result(p,"FAILED",digest());
        long retry=Long.parseLong(payments.initiate(booking(p),user).id());bind(retry);
        result(p,"SUCCESS",digest());
        assertThatThrownBy(()->bind(retry)).isInstanceOf(RuntimeException.class);
        result(retry,"SUCCESS",digest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=? AND status='SUCCESS'",Integer.class,booking(p))).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking(p))).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=?",String.class,booking(p))).isNull();
    }
}
