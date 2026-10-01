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

@SpringBootTest(properties = {"seat-hold.ttl=PT30S", "seat-hold.cleanup-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "PAYMENT_DB_TESTS", matches = "true")
class PaymentPostgresTests {
    private static final String SCHEMA = "payment_suite_" + UUID.randomUUID().toString().replace("-", "");
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
                    statement_timestamp()+interval '2 hours',123.4567,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id
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
    private String request(List<Long> ids) {
        return "{\"showtimeId\":\"" + showtime + "\",\"holdIds\":[" + String.join(",", ids.stream().map(id -> "\"" + id + "\"").toList()) + "]}";
    }
    private int createHttp(long actor, List<Long> ids) throws Exception {
        return mvc.perform(post("/api/v1/bookings").with(customer(actor)).contentType("application/json").content(request(ids)))
                .andReturn().getResponse().getStatus();
    }
    private List<Long> shortHold(long unit, String ttl) {
        return jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),CAST(? AS interval))", Long.class, showtime, user, array(List.of(unit)), ttl);
    }

    private long item(String name, String category, String price, String status) {
        return jdbc.queryForObject("SELECT configure_concession_item(NULL,?,NULL,?,CAST(? AS numeric),NULL,?)", Long.class, name, category, price, status);
    }
    private void configure(long id, String name, String price, String status) {
        jdbc.queryForObject("SELECT configure_concession_item(?,?,NULL,'POPCORN',CAST(? AS numeric),NULL,?)", Long.class, id, name, price, status);
    }
    private BookingResponse add(long bookingId, long itemId, int quantity) { return concessions.edit(bookingId, user, null, itemId, quantity, "ADD"); }
    private BookingResponse update(long bookingId, long lineId, int quantity) { return concessions.edit(bookingId, user, lineId, null, quantity, "UPDATE"); }
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
    private BookingResponse booking() { return create(hold(user, couple)); }
    private BookingResponse apply(long id, String code) { return promotions.edit(id, user, code, "APPLY"); }
    private BookingResponse remove(long id) { return promotions.edit(id, user, null, "REMOVE"); }
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

    private PaymentResponse initiate(long id) { return payments.initiate(id, user); }
    private int initiateHttp(long id, long actor) throws Exception {
        return mvc.perform(post("/api/v1/bookings/" + id + "/payment-transactions").with(customer(actor))
                .contentType("application/json").content("{}")).andReturn().getResponse().getStatus();
    }
    private void noAttempt(long id) {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=?", Integer.class, id)).isZero();
        assertThat(bookings.detail(id, user).paymentStartedAt()).isNull();
    }

    @Test
    void fractionalAmountAndWholeCoupleFreezeAtomicallyWithoutProviderOrSuccess() throws Exception {
        var original = booking(); long id = Long.parseLong(original.id());
        add(id, item("Popcorn", "POPCORN", "10.1234", "ACTIVE"), 2);
        String code = code(); promotion(code, "PERCENTAGE", "10", "0", null, null); apply(id, code);
        var reviewed = bookings.detail(id, user); var attempt = initiate(id); var frozen = bookings.detail(id, user);
        assertThat(attempt.amount()).isEqualTo("129.7035").isEqualTo(reviewed.finalAmount());
        assertThat(attempt.id()).satisfies(value -> assertThat(Long.parseLong(value)).isGreaterThan(9007199254740992L));
        assertThat(attempt.bookingId()).isEqualTo(original.id()); assertThat(attempt.status()).isEqualTo("INITIATED");
        assertThat(attempt.provider()).isNull(); assertThat(attempt.currency()).isNull();
        assertThat(frozen.paymentStartedAt()).isEqualTo(attempt.initiatedAt()); assertThat(frozen.expiresAt()).isEqualTo(original.expiresAt());
        assertThat(frozen.seats()).isEqualTo(original.seats()); assertThat(frozen.guestCount()).isEqualTo(2);
        assertThat(frozen.promotion()).isEqualTo(reviewed.promotion()); assertThat(frozen.concessions()).isEqualTo(reviewed.concessions());
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE booking_id=?", String.class, id)).isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE id=? AND status='PENDING' AND paid_at IS NULL AND booking_qr_token IS NULL", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=? AND sold_at IS NOT NULL", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE promotion_id=? AND status='PAID'", Integer.class, Long.parseLong(frozen.promotion().id()))).isZero();
        mvc.perform(post("/api/v1/bookings/" + id + "/payment-transactions").with(customer(user)).contentType("application/json").content("{}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(attempt.id())).andExpect(jsonPath("$.amount").value("129.7035"));
    }

    @Test
    void zeroAmountIsPersistedWithoutCreatingPaidBooking() {
        long id = Long.parseLong(booking().id()); String code = code(); promotion(code, "FIXED_AMOUNT", "999", "0", null, null); apply(id, code);
        assertThat(initiate(id).amount()).isEqualTo("0.0000"); assertThat(bookings.detail(id, user).status()).isEqualTo("PENDING");
    }

    @Test
    void duplicateConcurrentInitiationReturnsSameIdentityAndTimestamp() throws Exception {
        long id = Long.parseLong(booking().id()); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return initiate(id); });
            var b = executor.submit(() -> { start.await(); return initiate(id); });
            start.countDown(); var first = a.get(8, TimeUnit.SECONDS);
            assertThat(b.get(8, TimeUnit.SECONDS)).isEqualTo(first); assertThat(initiate(id)).isEqualTo(first);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=?", Integer.class, id)).isEqualTo(1);
    }

    @Test
    void invalidPromotionBlocksAndChangedTermsRequireExplicitReview() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", 1, null); apply(id, code);
        for (String change : List.of("status='INACTIVE'", "minimum_order=999", "valid_until=clock_timestamp()", "valid_from=clock_timestamp()+interval '1 hour'")) {
            master(pid, change); assertThat(initiateHttp(id, user)).isEqualTo(409); noAttempt(id);
            master(pid, "status='ACTIVE',minimum_order=0,valid_from=clock_timestamp()-interval '1 day',valid_until=clock_timestamp()+interval '1 day'");
        }
        master(pid, "discount_value=20");
        mvc.perform(post("/api/v1/bookings/" + id + "/payment-transactions").with(customer(user)).contentType("application/json").content("{}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.title").value("Composition review required"));
        noAttempt(id); assertThat(bookings.detail(id, user).discount()).isEqualTo("12.0000");
        apply(id, code); assertThat(initiate(id).amount()).isEqualTo("99.4567");
    }

    @Test
    void frozenRetriesDoNotRepriceOrRevalidateChangedPromotionMaster() throws Exception {
        long id = Long.parseLong(booking().id()); long itemId = item("Original", "POPCORN", "10", "ACTIVE");
        add(id, itemId, 2); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null); apply(id, code);
        var attempt = initiate(id); var original = bookings.detail(id, user);
        master(pid, "discount_value=99,status='INACTIVE'"); configure(itemId, "New", "999", "INACTIVE");
        assertThat(initiate(id)).isEqualTo(attempt);
        var after = bookings.detail(id, user); assertThat(after.promotion()).isEqualTo(original.promotion());
        assertThat(after.concessions()).isEqualTo(original.concessions()); assertThat(after.finalAmount()).isEqualTo(original.finalAmount());
    }

    @Test
    void allCompositionEditsFailAfterFreezeIncludingDirectOwnerWrites() throws Exception {
        long id = Long.parseLong(booking().id()); long itemId = item("Frozen", "DRINK", "10", "ACTIVE");
        long line = Long.parseLong(add(id, itemId, 1).concessions().getFirst().id());
        String code = code(); promotion(code, "PERCENTAGE", "10", "0", null, null); apply(id, code); initiate(id);
        assertThat(addHttp(id, user, itemId, 1)).isEqualTo(409); assertThat(applyHttp(id, user, code)).isEqualTo(409);
        assertThatThrownBy(() -> update(id, line, 2)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> concessions.edit(id, user, line, null, null, "REMOVE")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> remove(id)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner");
            try {
                for (String command : List.of("UPDATE bookings SET payment_started_at=NULL WHERE id=" + id,
                        "UPDATE bookings SET discount=0,final_amount=subtotal WHERE id=" + id,
                        "DELETE FROM booking_concessions WHERE booking_id=" + id,
                        "UPDATE booking_concessions SET quantity=2,total_price=20 WHERE booking_id=" + id,
                        "UPDATE payment_transactions SET amount=0 WHERE booking_id=" + id,
                        "DELETE FROM payment_transactions WHERE booking_id=" + id)) {
                    assertThatThrownBy(() -> sql.execute(command)).isInstanceOf(SQLException.class);
                }
            } finally { sql.execute("RESET ROLE"); }
        }
    }

    @Test
    void initiationVersusConcessionEditFreezesOnlyACompleteComposition() throws Exception {
        long id = Long.parseLong(booking().id()); long itemId = item("Race", "DRINK", "10", "ACTIVE"); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return initiate(id); });
            var b = executor.submit(() -> { start.await(); return addHttp(id, user, itemId, 2); });
            start.countDown(); var attempt = a.get(8, TimeUnit.SECONDS); int edit = b.get(8, TimeUnit.SECONDS);
            assertThat(edit).isIn(200,409); assertThat(attempt.amount()).isEqualTo(edit == 200 ? "143.4567" : "123.4567");
            assertThat(attempt.amount()).isEqualTo(bookings.detail(id, user).finalAmount());
        }
    }

    @Test
    void initiationVersusPromotionApplyAndRemoveUsesWholeAcceptedSnapshot() throws Exception {
        for (boolean removing : List.of(false, true)) {
            long id = Long.parseLong(create(hold(user, removing ? standard : couple)).id());
            String code = code(); promotion(code, "FIXED_AMOUNT", "10", "0", null, null);
            if (removing) { apply(id, code); }
            var start = new CountDownLatch(1);
            try (var executor = Executors.newFixedThreadPool(2)) {
                var a = executor.submit(() -> { start.await(); return initiate(id); });
                var b = executor.submit(() -> {
                    start.await();
                    if (!removing) { return applyHttp(id, user, code); }
                    return mvc.perform(delete("/api/v1/bookings/" + id + "/promotion").with(customer(user))).andReturn().getResponse().getStatus();
                });
                start.countDown(); var attempt = a.get(8, TimeUnit.SECONDS); int edit = b.get(8, TimeUnit.SECONDS);
                assertThat(edit).isIn(200,409); var frozen = bookings.detail(id, user);
                assertThat(attempt.amount()).isEqualTo(frozen.finalAmount());
                assertThat(frozen.promotion() != null).isEqualTo(removing ? edit == 409 : edit == 200);
            }
        }
    }

    @Test
    void cancelRacePreservesFreezeHistoryWithoutInventingProviderCancellation() throws Exception {
        long id = Long.parseLong(booking().id()); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return initiateHttp(id, user); });
            var b = executor.submit(() -> { start.await(); bookings.cancel(id, user); return true; });
            start.countDown(); int result = a.get(8, TimeUnit.SECONDS); assertThat(b.get(8, TimeUnit.SECONDS)).isTrue();
            assertThat(result).isIn(200,409); var cancelled = bookings.detail(id, user);
            assertThat(cancelled.status()).isEqualTo("CANCELLED");
            assertThat(cancelled.paymentStartedAt() != null).isEqualTo(result == 200);
        }
        assertThat(initiateHttp(id, user)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=? AND status<>'INITIATED'", Integer.class, id)).isZero();
    }

    @Test
    void expiryDuringGateWaitCreatesNeitherAttemptNorFreeze() throws Exception {
        long id = Long.parseLong(create(shortHold(couple, "1200 milliseconds")).id());
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false); sql.execute("SELECT id FROM showtimes WHERE id=" + showtime + " FOR UPDATE");
            var result = executor.submit(() -> initiateHttp(id, user)); Thread.sleep(1400); c.commit();
            assertThat(result.get(8, TimeUnit.SECONDS)).isEqualTo(409);
        }
        noAttempt(id); assertThat(bookings.detail(id, user).status()).isEqualTo("EXPIRED");
    }

    @Test
    void frozenBookingExpiresAndReleasesOnlyOriginHoldsWithoutErasingAttempt() throws Exception {
        long id = Long.parseLong(create(shortHold(couple, "1400 milliseconds")).id()); var attempt = initiate(id);
        Thread.sleep(1500); jdbc.queryForObject("SELECT expire_seat_holds(?)", Object.class, showtime);
        var expired = bookings.detail(id, user); assertThat(expired.status()).isEqualTo("EXPIRED");
        assertThat(expired.paymentStartedAt()).isEqualTo(attempt.initiatedAt()); assertThat(initiateHttp(id, user)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE booking_id=?", String.class, id)).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE booking_id=?", String.class, id)).isEqualTo("INITIATED");
        assertThat(hold(other, couple)).hasSize(1);
    }

    @Test
    void promotionExpiryWhileWaitingPreventsFreeze() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null); apply(id, code);
        master(pid, "valid_until=clock_timestamp()+interval '1 second'");
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false); sql.execute("SELECT id FROM promotions WHERE id=" + pid + " FOR UPDATE");
            var result = executor.submit(() -> initiateHttp(id, user)); Thread.sleep(1200); c.commit();
            assertThat(result.get(8, TimeUnit.SECONDS)).isEqualTo(409);
        }
        noAttempt(id);
    }

    @Test
    void eligibilityAuthorizationStrictInputsAndStringIdRange() throws Exception {
        long id = Long.parseLong(booking().id()); String path = "/api/v1/bookings/" + id + "/payment-transactions";
        mvc.perform(post(path).contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(jwt().authorities(() -> "ROLE_ADMIN")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        assertThat(initiateHttp(id, other)).isEqualTo(404); assertThat(initiateHttp(Long.MAX_VALUE, user)).isEqualTo(404);
        for (String body : List.of("null", "[]", "{\"amount\":\"123.4567\"}", "{\"currency\":\"VND\"}", "{\"provider\":\"TEST\"}", "{\"status\":\"SUCCESS\"}")) {
            mvc.perform(post(path).with(customer(user)).contentType("application/json").content(body)).andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        }
        mvc.perform(post(path + "?amount=0").with(customer(user)).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/bookings/9223372036854775808/payment-transactions").with(customer(user)).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        for (String table : List.of("movies", "cinemas", "halls", "showtimes")) {
            long parent = switch (table) { case "movies" -> movie; case "cinemas" -> cinema; case "halls" -> hall; default -> showtime; };
            String original = table.equals("movies") ? "PUBLISHED" : table.equals("showtimes") ? "OPEN_FOR_BOOKING" : "ACTIVE";
            String blocked = table.equals("movies") ? "UNPUBLISHED" : table.equals("showtimes") ? "CANCELLED" : "INACTIVE";
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", blocked, parent); assertThat(initiateHttp(id, user)).isEqualTo(409);
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", original, parent);
        }
        noAttempt(id); jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?", user); assertThat(initiateHttp(id, user)).isEqualTo(403);
    }

    @Test
    void isolatedAttemptOrMarkerCannotCommitAndRollbackReopensNoFrozenState() throws Exception {
        long id = Long.parseLong(booking().id());
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement()) {
            c.setAutoCommit(false); sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            assertThatThrownBy(() -> sql.execute("UPDATE bookings SET payment_started_at=clock_timestamp() WHERE id=" + id)).isInstanceOf(SQLException.class);
            c.rollback(); sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            sql.execute("INSERT INTO payment_transactions(booking_id,internal_reference,amount,initiated_at) VALUES (" + id + ",'P-isolated',123.4567,clock_timestamp())");
            assertThatThrownBy(c::commit).isInstanceOf(SQLException.class); c.rollback();
            sql.execute("SET LOCAL ROLE smart_cinema_hold_runtime"); sql.execute("SELECT initiate_payment(" + id + "," + user + ")");
            c.rollback();
        }
        noAttempt(id); assertThat(initiate(id).amount()).isEqualTo("123.4567");
    }

    @Test
    void runtimeAndOwnerCannotChangeAttemptOrFinalizeSale() throws Exception {
        long id = Long.parseLong(booking().id());
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_runtime");
            try {
                sql.execute("SELECT initiate_payment(" + id + "," + user + ")");
                for (String forbidden : List.of("TRUNCATE payment_transactions", "DELETE FROM payment_transactions",
                        "SELECT validate_payment_composition(" + id + ")", "UPDATE payment_transactions SET amount=0")) {
                    assertThatThrownBy(() -> sql.execute(forbidden)).isInstanceOf(SQLException.class);
                }
            } finally { sql.execute("RESET ROLE"); }
            sql.execute("SET ROLE smart_cinema_hold_owner");
            try {
                for (String forbidden : List.of("UPDATE payment_transactions SET status='SUCCESS',completed_at=clock_timestamp()",
                        "UPDATE payment_transactions SET status='FAILED',completed_at=clock_timestamp()",
                        "UPDATE payment_transactions SET provider='FAKE',currency='VND'",
                        "UPDATE bookings SET status='PAID',paid_at=clock_timestamp(),booking_qr_token='FAKE' WHERE id=" + id,
                        "UPDATE seat_holds SET status='CONSUMED' WHERE booking_id=" + id,
                        "UPDATE booking_seats SET sold_at=clock_timestamp() WHERE booking_id=" + id)) {
                    assertThatThrownBy(() -> sql.execute(forbidden)).isInstanceOf(SQLException.class);
                }
            } finally { sql.execute("RESET ROLE"); }
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE booking_id=?", Integer.class, id)).isEqualTo(1);
    }
}
