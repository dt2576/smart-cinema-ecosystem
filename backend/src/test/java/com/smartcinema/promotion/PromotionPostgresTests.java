package com.smartcinema.promotion;
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
@EnabledIfEnvironmentVariable(named = "PROMOTION_DB_TESTS", matches = "true")
class PromotionPostgresTests {
    private static final String SCHEMA = "promotion_suite_" + UUID.randomUUID().toString().replace("-", "");
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
    @Autowired private SeatService seats;
    private long user, other, movie, cinema, hall, showtime, standard, couple;

    @BeforeEach
    void seed() {
        for (String table : List.of("seats", "seat_holds", "bookings", "booking_seats", "concession_items", "booking_concessions", "promotions")) {
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

    @Test
    void percentageUsesWholeSubtotalAndFloorsVndPreservingCoupleAndExpiry() throws Exception {
        var original = booking(); long id = Long.parseLong(original.id());
        add(id, item("Drink", "DRINK", "10.4321", "ACTIVE"), 2);
        String code = code(); long promotionId = promotion(code, "PERCENTAGE", "10", "140", null, null);
        var result = apply(id, code);
        assertThat(result.subtotal()).isEqualTo("144.3209"); assertThat(result.discount()).isEqualTo("14.0000");
        assertThat(result.finalAmount()).isEqualTo("130.3209");
        assertThat(result.promotion().id()).isEqualTo(Long.toString(promotionId));
        assertThat(result.expiresAt()).isEqualTo(original.expiresAt()); assertThat(result.seats()).isEqualTo(original.seats());
        assertThat(result.seatUnitCount()).isEqualTo(1); assertThat(result.guestCount()).isEqualTo(2);
        mvc.perform(put("/api/v1/bookings/" + id + "/promotion").with(customer(user)).contentType("application/json")
                .content("{\"code\":\" " + code.toLowerCase() + " \"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(original.id())).andExpect(jsonPath("$.promotion.id").value(Long.toString(promotionId)))
                .andExpect(jsonPath("$.promotion.type").value("PERCENTAGE")).andExpect(jsonPath("$.discount").value("14.0000"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE booking_id=? AND status='ACTIVE'", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE id=? AND payment_started_at IS NULL AND paid_at IS NULL AND booking_qr_token IS NULL", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=? AND sold_at IS NOT NULL", Integer.class, id)).isZero();
    }

    @Test
    void capFixedFloorZeroAndReapplyReplaceRemove() {
        long id = Long.parseLong(booking().id()); String capped = code(), fixed = code();
        promotion(capped, "PERCENTAGE", "100", "0", null, "9.7500");
        promotion(fixed, "FIXED_AMOUNT", "999", "0", null, null);
        assertThat(apply(id, capped).discount()).isEqualTo("9.0000");
        assertThat(apply(id, fixed).finalAmount()).isEqualTo("0.0000");
        assertThat(apply(id, fixed).discount()).isEqualTo("123.4567");
        assertThat(remove(id).promotion()).isNull(); assertThat(remove(id).discount()).isEqualTo("0.0000");
        assertThat(apply(id, capped).promotion().code()).isEqualTo(capped);
        String zero = code(); promotion(zero, "PERCENTAGE", "0", "0", null, "0");
        assertThat(apply(id, zero).discount()).isEqualTo("0.0000");
        String fractionalFixed = code(); promotion(fractionalFixed, "FIXED_AMOUNT", "1.2345", "0", null, null);
        assertThat(apply(id, fractionalFixed).discount()).isEqualTo("1.2345");
    }

    @Test
    void unknownInactiveFutureExpiredAndMinimumRejectWithoutChangingAcceptedSnapshot() throws Exception {
        long id = Long.parseLong(booking().id()); String accepted = code(); promotion(accepted, "FIXED_AMOUNT", "5", "0", null, null);
        var before = apply(id, accepted);
        assertThat(applyHttp(id, user, "UNCONFIGURED-CODE")).isEqualTo(409);
        for (String invalid : List.of("status='INACTIVE'", "valid_until=clock_timestamp()", "valid_from=clock_timestamp()+interval '1 hour'", "minimum_order=999")) {
            String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null); master(pid, invalid);
            mvc.perform(put("/api/v1/bookings/" + id + "/promotion").with(customer(user)).contentType("application/json")
                    .content("{\"code\":\"" + code + "\"}"))
                    .andExpect(status().isConflict()).andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                    .andExpect(jsonPath("$.title").value("Promotion unavailable"));
        }
        var after = bookings.detail(id, user);
        assertThat(after.promotion()).isEqualTo(before.promotion()); assertThat(after.discount()).isEqualTo(before.discount());
        String exact = code(); promotion(exact, "PERCENTAGE", "100", "123.4567", null, null);
        assertThat(apply(id, exact).discount()).isEqualTo("123.0000");
    }

    @Test
    void masterChangesDoNotMutateReadSnapshotsAndCompositionRevalidates() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null);
        var original = apply(id, code);
        master(pid, "discount_value=20,max_discount_amount=15");
        assertThat(bookings.detail(id, user).promotion()).isEqualTo(original.promotion());
        long itemId = item("Popcorn", "POPCORN", "100", "ACTIVE");
        var changed = add(id, itemId, 1); assertThat(changed.discount()).isEqualTo("15.0000");
        assertThat(changed.promotion().value()).isEqualTo("20.0000");
        master(pid, "status='INACTIVE'");
        assertThat(addHttp(id, user, itemId, 1)).isEqualTo(409);
        assertThat(bookings.detail(id, user).concessions()).hasSize(1);
        assertThat(remove(id).finalAmount()).isEqualTo("223.4567");
        assertThat(add(id, itemId, 1).finalAmount()).isEqualTo("323.4567");
    }

    @Test
    void minimumFailureOnQuantityDecreaseRollsBackLineAndTotalsUntilRemoval() {
        long id = Long.parseLong(booking().id()); long itemId = item("Combo", "COMBO", "100", "ACTIVE");
        long line = Long.parseLong(add(id, itemId, 2).concessions().getFirst().id());
        String code = code(); promotion(code, "FIXED_AMOUNT", "10", "300", null, null); apply(id, code);
        assertThatThrownBy(() -> update(id, line, 1)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(bookings.detail(id, user).concessions().getFirst().quantity()).isEqualTo(2);
        remove(id); assertThat(update(id, line, 1).finalAmount()).isEqualTo("223.4567");
    }

    @Test
    void pendingApplicationsDoNotReserveOrConsumeUsageAndInternalPolicyRejectsExhaustion() {
        String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", 1, null);
        long a = Long.parseLong(create(hold(user, couple)).id()), b = Long.parseLong(create(hold(user, standard)).id());
        apply(a, code); apply(b, code);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE promotion_id=? AND status='PAID'", Integer.class, pid)).isZero();
        assertThat(jdbc.queryForObject("SELECT promotion_discount(p,123.4567,0) FROM promotions p WHERE id=?", java.math.BigDecimal.class, pid)).isEqualByComparingTo("12");
        assertThatThrownBy(() -> jdbc.queryForObject("SELECT promotion_discount(p,123.4567,1) FROM promotions p WHERE id=?", Object.class, pid))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        bookings.cancel(a, user); remove(b); apply(b, code);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE promotion_id=? AND status='PAID'", Integer.class, pid)).isZero();
    }

    @Test
    void concurrentApplyConcessionAndRemovalNeverLoseTotals() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); promotion(code, "PERCENTAGE", "10", "0", null, null);
        long itemId = item("Concurrent", "DRINK", "100", "ACTIVE"); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return apply(id, code); });
            var b = executor.submit(() -> { start.await(); return add(id, itemId, 2); });
            start.countDown(); a.get(8, TimeUnit.SECONDS); b.get(8, TimeUnit.SECONDS);
        }
        var result = bookings.detail(id, user); assertThat(result.discount()).isEqualTo("32.0000");
        assertThat(result.finalAmount()).isEqualTo("291.4567");
        var removeStart = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { removeStart.await(); return remove(id); });
            var b = executor.submit(() -> { removeStart.await(); return add(id, itemId, 1); });
            removeStart.countDown(); a.get(8, TimeUnit.SECONDS); b.get(8, TimeUnit.SECONDS);
        }
        result = bookings.detail(id, user); assertThat(result.discount()).isEqualTo("0.0000");
        assertThat(result.finalAmount()).isEqualTo("423.4567"); assertThat(result.promotion()).isNull();
    }

    @Test
    void concurrentDifferentPromotionsAndCancellationPreserveSingleSnapshot() throws Exception {
        long id = Long.parseLong(booking().id()); String first = code(), second = code();
        promotion(first, "FIXED_AMOUNT", "10", "0", null, null); promotion(second, "FIXED_AMOUNT", "20", "0", null, null);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return apply(id, first); });
            var b = executor.submit(() -> { start.await(); return apply(id, second); });
            start.countDown(); a.get(8, TimeUnit.SECONDS); b.get(8, TimeUnit.SECONDS);
        }
        var result = bookings.detail(id, user);
        assertThat(result.discount()).isEqualTo(result.promotion().code().equals(first) ? "10.0000" : "20.0000");
        var cancelStart = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { cancelStart.await(); return applyHttp(id, user, first); });
            var b = executor.submit(() -> { cancelStart.await(); bookings.cancel(id, user); return true; });
            cancelStart.countDown(); assertThat(a.get(8, TimeUnit.SECONDS)).isIn(200, 409); assertThat(b.get(8, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(bookings.detail(id, user).status()).isEqualTo("CANCELLED");
        assertThat(applyHttp(id, user, second)).isEqualTo(409);
        mvc.perform(delete("/api/v1/bookings/" + id + "/promotion").with(customer(user))).andExpect(status().isConflict());
    }

    @Test
    void ownershipRoleStrictInputsAndMissingBookingAreSafe() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); promotion(code, "PERCENTAGE", "10", "0", null, null);
        String path = "/api/v1/bookings/" + id + "/promotion";
        for (var method : List.of(put(path), delete(path))) {
            mvc.perform(method.contentType("application/json").content("{\"code\":\"" + code + "\"}")).andExpect(status().isUnauthorized());
        }
        mvc.perform(put(path).with(jwt().authorities(() -> "ROLE_ADMIN")).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        assertThat(applyHttp(id, other, code)).isEqualTo(404); assertThat(applyHttp(Long.MAX_VALUE, user, code)).isEqualTo(404);
        mvc.perform(delete(path).with(customer(other))).andExpect(status().isNotFound());
        for (String body : List.of("{}", "{\"code\":42}", "{\"code\":\"\"}", "{\"code\":\"X\",\"discount\":0}", "[]", "null")) {
            mvc.perform(put(path).with(customer(user)).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(put(path + "?discount=0").with(customer(user)).contentType("application/json").content("{\"code\":\"X\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/bookings/9223372036854775808/promotion").with(customer(user))).andExpect(status().isBadRequest());
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?", user);
        assertThat(applyHttp(id, user, code)).isEqualTo(403);
    }

    @Test
    void expiryDuringPromotionLockWaitRejectsAndRetainsNoPartialSnapshot() throws Exception {
        long id = Long.parseLong(create(shortHold(couple, "1500 milliseconds")).id());
        String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null);
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false); sql.execute("SELECT id FROM promotions WHERE id=" + pid + " FOR UPDATE");
            var response = executor.submit(() -> applyHttp(id, user, code));
            Thread.sleep(1700); c.commit(); assertThat(response.get(8, TimeUnit.SECONDS)).isEqualTo(409);
        }
        var result = bookings.detail(id, user); assertThat(result.promotion()).isNull(); assertThat(result.status()).isEqualTo("EXPIRED");
        mvc.perform(delete("/api/v1/bookings/" + id + "/promotion").with(customer(user))).andExpect(status().isConflict());
    }

    @Test
    void promotionExpiryDuringLockWaitIsCheckedAfterWait() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null);
        master(pid, "valid_until=clock_timestamp()+interval '1 second'");
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false); sql.execute("SELECT id FROM promotions WHERE id=" + pid + " FOR UPDATE");
            var response = executor.submit(() -> applyHttp(id, user, code));
            Thread.sleep(1200); c.commit(); assertThat(response.get(8, TimeUnit.SECONDS)).isEqualTo(409);
        }
        assertThat(bookings.detail(id, user).discount()).isEqualTo("0.0000");
    }

    @Test
    void discoveryEligibilityStillGuardsPromotionWrites() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); promotion(code, "PERCENTAGE", "10", "0", null, null);
        for (String table : List.of("movies", "cinemas", "halls", "showtimes")) {
            long parent = switch (table) { case "movies" -> movie; case "cinemas" -> cinema; case "halls" -> hall; default -> showtime; };
            String original = table.equals("movies") ? "PUBLISHED" : table.equals("showtimes") ? "OPEN_FOR_BOOKING" : "ACTIVE";
            String blocked = table.equals("movies") ? "UNPUBLISHED" : table.equals("showtimes") ? "CANCELLED" : "INACTIVE";
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", blocked, parent);
            assertThat(applyHttp(id, user, code)).isEqualTo(409);
            mvc.perform(delete("/api/v1/bookings/" + id + "/promotion").with(customer(user))).andExpect(status().isConflict());
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", original, parent);
        }
    }

    @Test
    void catalogConstraintsRuntimePermissionsAndStageProhibitionsRemain() throws Exception {
        long id = Long.parseLong(booking().id()); String code = code(); long pid = promotion(code, "PERCENTAGE", "10", "0", null, null);
        apply(id, code);
        for (String invalid : List.of("discount_type='FIXED'", "discount_value=101", "discount_value=-1", "discount_value='NaN'", "max_discount_amount=-1", "usage_limit=0", "minimum_order=-1", "status='EXPIRED'")) {
            assertThatThrownBy(() -> master(pid, invalid)).isInstanceOf(SQLException.class);
        }
        assertThatThrownBy(() -> promotion(code(), "PERCENTAGE", "1.12345", "0", null, null)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        try (Connection c = dataSource.getConnection(); var sql = c.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_runtime");
            sql.execute("SELECT edit_booking_promotion(" + id + "," + user + ",'" + code + "','APPLY')");
            for (String forbidden : List.of("UPDATE bookings SET discount=0 WHERE id=" + id, "UPDATE promotions SET usage_limit=99",
                    "SELECT * FROM promotions", "TRUNCATE promotions", "SELECT promotion_discount(NULL,100,0)")) {
                assertThatThrownBy(() -> sql.execute(forbidden)).isInstanceOf(SQLException.class);
            }
            sql.execute("RESET ROLE"); sql.execute("SET ROLE smart_cinema_hold_owner");
            for (String forbidden : List.of("UPDATE bookings SET payment_started_at=clock_timestamp() WHERE id=" + id,
                    "UPDATE bookings SET status='PAID' WHERE id=" + id,
                    "UPDATE booking_seats SET sold_at=clock_timestamp() WHERE booking_id=" + id,
                    "UPDATE seat_holds SET status='CONSUMED' WHERE booking_id=" + id)) {
                assertThatThrownBy(() -> sql.execute(forbidden)).isInstanceOf(SQLException.class);
            }
            sql.execute("RESET ROLE");
        }
    }
}
