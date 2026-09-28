package com.smartcinema.booking;

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
@EnabledIfEnvironmentVariable(named = "BOOKING_DB_TESTS", matches = "true")
class BookingPostgresTests {
    private static final String SCHEMA = "booking_suite_" + UUID.randomUUID().toString().replace("-", "");
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
    @Autowired private SeatService seats;
    private long user, other, movie, cinema, hall, showtime, standard, couple;

    @BeforeEach
    void seed() {
        for (String table : List.of("seats", "seat_holds", "bookings", "booking_seats")) {
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

    @Test
    void snapshotsWholeUnitsAtBasePriceAndPreservesOriginalDeadlines() throws Exception {
        var ids = hold(user, standard, couple);
        var result = create(ids);
        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.seatUnitCount()).isEqualTo(2); assertThat(result.guestCount()).isEqualTo(3);
        assertThat(result.seatAmount()).isEqualTo("246.9134"); assertThat(result.finalAmount()).isEqualTo("246.9134");
        assertThat(result.seats()).allSatisfy(line -> assertThat(line.unitPrice()).isEqualTo("123.4567"));
        assertThat(result.seats().get(1).guestCount()).isEqualTo(2);
        assertThat(Long.parseLong(result.id())).isGreaterThan(9_007_199_254_740_992L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE booking_id=? AND status='ACTIVE'", Integer.class, Long.parseLong(result.id()))).isEqualTo(2);
        assertThat(seats.mine(showtime, user).holds()).isEmpty();
        assertThat(seats.map(showtime).units()).allSatisfy(unit -> assertThat(unit.availability()).isEqualTo("HELD"));
        jdbc.update("UPDATE showtimes SET base_price=999 WHERE id=?", showtime);
        assertThat(create(ids).id()).isEqualTo(result.id());
        assertThat(create(ids).seatAmount()).isEqualTo("246.9134");
        assertThat(create(ids).expiresAt()).isEqualTo(result.expiresAt());
        mvc.perform(get("/api/v1/bookings/" + result.id()).with(customer(user)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(result.id())).andExpect(jsonPath("$.seats[1].seatId").value(Long.toString(couple)))
                .andExpect(jsonPath("$.bookingQrToken").doesNotExist()).andExpect(jsonPath("$.tickets").doesNotExist());
    }

    @Test
    void concurrentSameSetCreationReturnsOneBookingAndNoDuplicateLines() throws Exception {
        var ids = hold(user, standard, couple);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return create(ids); });
            var second = executor.submit(() -> { start.await(); return create(ids); });
            start.countDown();
            assertThat(first.get(8, TimeUnit.SECONDS).id()).isEqualTo(second.get(8, TimeUnit.SECONDS).id());
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE showtime_id=?", Integer.class, showtime)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE showtime_id=?", Integer.class, showtime)).isEqualTo(2);
    }

    @Test
    void bookingAndOtherCustomerAcquisitionCannotBothOwnTheUnits() throws Exception {
        var ids = hold(user, couple);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var booking = executor.submit(() -> { start.await(); return createHttp(user, ids); });
            var acquisition = executor.submit(() -> {
                start.await();
                return mvc.perform(post("/api/v1/showtimes/" + showtime + "/seat-holds").with(customer(other))
                        .contentType("application/json").content("{\"seatIds\":[\"" + couple + "\"]}"))
                        .andReturn().getResponse().getStatus();
            });
            start.countDown();
            assertThat(booking.get(8, TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(acquisition.get(8, TimeUnit.SECONDS)).isEqualTo(409);
        }
    }

    @Test
    void overlappingBookingSetsHaveOneWinnerWithNoPartialAttachment() throws Exception {
        var ids = hold(user, standard, couple);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return createHttp(user, ids); });
            var second = executor.submit(() -> { start.await(); return createHttp(user, List.of(ids.getFirst())); });
            start.countDown();
            assertThat(List.of(first.get(8, TimeUnit.SECONDS), second.get(8, TimeUnit.SECONDS))).containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE showtime_id=?", Integer.class, showtime)).isEqualTo(1);
    }

    @Test
    void earliestExpiryReleasesWholeAggregateBeforeAnotherHoldGrant() throws Exception {
        var early = shortHold(standard, "2 seconds");
        var late = hold(user, couple);
        var result = create(List.of(early.getFirst(), late.getFirst()));
        assertThat(result.expiresAt()).isEqualTo(jdbc.queryForObject("SELECT expires_at FROM seat_holds WHERE id=?", java.sql.Timestamp.class, early.getFirst()).toInstant());
        Thread.sleep(Math.max(1, java.time.Duration.between(Instant.now(), result.expiresAt()).toMillis() + 80));
        assertThat(bookings.detail(Long.parseLong(result.id()), user).status()).isEqualTo("EXPIRED");
        assertThat(seats.map(showtime).units()).allSatisfy(unit -> assertThat(unit.availability()).isEqualTo("AVAILABLE"));
        var replacement = hold(other, couple);
        assertThat(replacement).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?", String.class, Long.parseLong(result.id()))).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE booking_id=? AND status='EXPIRED'", Integer.class, Long.parseLong(result.id()))).isEqualTo(2);
        bookings.cancel(Long.parseLong(result.id()), user);
        assertThat(seats.mine(showtime, other).holds()).hasSize(1);
    }

    @Test
    void cancellationIsWholeOwnedAggregateAndIndependentReleaseIsRejected() throws Exception {
        var ids = hold(user, standard, couple); var result = create(ids); long id = Long.parseLong(result.id());
        mvc.perform(delete("/api/v1/bookings/" + id).with(customer(other))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/showtimes/" + showtime + "/seat-holds/" + ids.getFirst()).with(customer(user))).andExpect(status().isConflict());
        jdbc.update("UPDATE cinemas SET status='TEMPORARILY_CLOSED' WHERE id=?", cinema);
        bookings.cancel(id, user); bookings.cancel(id, user);
        assertThat(bookings.detail(id, user).status()).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE booking_id=? AND status='RELEASED'", Integer.class, id)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=?", Integer.class, id)).isEqualTo(2);
    }

    @Test
    void expiredReleasedForeignMissingAndMixedHoldsCannotCreateBooking() throws Exception {
        var owned = hold(user, standard); var foreign = hold(other, couple);
        assertThat(createHttp(user, List.of(owned.getFirst(), foreign.getFirst()))).isEqualTo(409);
        assertThat(createHttp(user, List.of(owned.getFirst(), Long.MAX_VALUE))).isEqualTo(409);
        seats.release(showtime, user, owned.getFirst());
        assertThat(createHttp(user, owned)).isEqualTo(409);
        var expired = shortHold(standard, "100 milliseconds"); Thread.sleep(150);
        assertThat(createHttp(user, expired)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE showtime_id=?", Integer.class, showtime)).isZero();
    }

    @Test
    void authorizationStrictInputsAndOwnershipAreEnforced() throws Exception {
        var ids = hold(user, couple);
        mvc.perform(post("/api/v1/bookings").contentType("application/json").content(request(ids))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/bookings").with(jwt().authorities(() -> "ROLE_ADMIN")).contentType("application/json").content(request(ids))).andExpect(status().isForbidden());
        assertThat(createHttp(user, List.of(ids.getFirst(), ids.getFirst()))).isEqualTo(400);
        mvc.perform(post("/api/v1/bookings").with(customer(user)).contentType("application/json").content("{\"showtimeId\":1,\"holdIds\":[\"1\"]}"))
                .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(post("/api/v1/bookings").with(customer(user)).contentType("application/json").content(request(ids).replace("}", ",\"amount\":0}")))
                .andExpect(status().isBadRequest());
        var result = create(ids);
        mvc.perform(get("/api/v1/bookings/" + result.id()).with(customer(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/bookings/" + result.id() + "?customerId=" + user).with(customer(user))).andExpect(status().isBadRequest());
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?", user);
        mvc.perform(get("/api/v1/bookings/" + result.id()).with(customer(user))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/bookings/" + result.id()).with(customer(user))).andExpect(status().isForbidden());
    }

    @Test
    void contextIsRevalidatedAtBookingCreation() throws Exception {
        var ids = hold(user, couple);
        for (String table : List.of("movies", "cinemas", "halls", "showtimes")) {
            long id = switch (table) { case "movies" -> movie; case "cinemas" -> cinema; case "halls" -> hall; default -> showtime; };
            String original = table.equals("movies") ? "PUBLISHED" : table.equals("showtimes") ? "OPEN_FOR_BOOKING" : "ACTIVE";
            String blocked = table.equals("movies") ? "UNPUBLISHED" : table.equals("showtimes") ? "CANCELLED" : "INACTIVE";
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", blocked, id);
            assertThat(createHttp(user, ids)).isEqualTo(404);
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", original, id);
        }
    }

    @Test
    void stageGuardsRejectSaleConsumptionFreezeAndHistoryChanges() throws Exception {
        var result = create(hold(user, couple)); long id = Long.parseLong(result.id());
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_runtime");
            assertThatThrownBy(() -> sql.execute("UPDATE bookings SET status='CANCELLED' WHERE id=" + id)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("TRUNCATE booking_seats CASCADE")).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("SELECT lock_booking_resources(" + showtime + ")")).isInstanceOf(SQLException.class);
            sql.execute("RESET ROLE"); sql.execute("SET ROLE smart_cinema_hold_owner");
            for (String change : List.of("status='PAID'", "payment_started_at=clock_timestamp()", "booking_qr_token='fake'", "promotion_id=1", "seat_amount=0", "expires_at=expires_at+interval '1 minute'")) {
                assertThatThrownBy(() -> sql.execute("UPDATE bookings SET " + change + " WHERE id=" + id)).isInstanceOf(SQLException.class);
            }
            assertThatThrownBy(() -> sql.execute("UPDATE booking_seats SET sold_at=clock_timestamp() WHERE booking_id=" + id)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("UPDATE seat_holds SET status='CONSUMED' WHERE booking_id=" + id)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("UPDATE seat_holds SET booking_id=NULL WHERE booking_id=" + id)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("DELETE FROM booking_seats WHERE booking_id=" + id)).isInstanceOf(SQLException.class);
            sql.execute("RESET ROLE");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE sold_at IS NOT NULL", Integer.class)).isZero();
    }

    @Test
    void deferredAssertionsRejectEmptyBookingAndPartialRelease() throws Exception {
        var result = create(hold(user, standard, couple)); long id = Long.parseLong(result.id());
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            connection.setAutoCommit(false); sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            sql.execute("UPDATE bookings SET status='CANCELLED' WHERE id=" + id);
            assertThatThrownBy(connection::commit).isInstanceOf(SQLException.class); connection.rollback();
            sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            sql.execute("INSERT INTO bookings(booking_code,customer_id,showtime_id,seat_amount,concession_amount,subtotal,discount,final_amount,expires_at) VALUES ('e-" + UUID.randomUUID() + "'," + user + "," + showtime + ",0,0,0,0,0,clock_timestamp()+interval '1 minute')");
            assertThatThrownBy(connection::commit).isInstanceOf(SQLException.class); connection.rollback();
        }
        assertThat(bookings.detail(id, user).status()).isEqualTo("PENDING");
    }

    @Test
    void cleanupExpiresWholeBookingAndRetainsHistory() throws Exception {
        var ids = shortHold(couple, "1 second"); var result = create(ids);
        Thread.sleep(Math.max(1, java.time.Duration.between(Instant.now(), result.expiresAt()).toMillis() + 70));
        assertThat(seats.expire(showtime)).isEqualTo(1); assertThat(seats.expire(showtime)).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?", String.class, Long.parseLong(result.id()))).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE booking_id=?", Integer.class, Long.parseLong(result.id()))).isEqualTo(1);
    }

    @Test
    void expiryCrossedWhileWaitingForGateRejectsCreation() throws Exception {
        var ids = shortHold(couple, "1500 milliseconds");
        try (Connection gate = dataSource.getConnection(); var sql = gate.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            gate.setAutoCommit(false);
            sql.execute("SELECT id FROM showtimes WHERE id=" + showtime + " FOR UPDATE");
            int pid;
            try (var result = sql.executeQuery("SELECT pg_backend_pid()")) { result.next(); pid = result.getInt(1); }
            var response = executor.submit(() -> createHttp(user, ids));
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1);
            boolean blocked = false;
            while (System.nanoTime() < deadline) {
                blocked = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid)))", Boolean.class, pid);
                if (blocked) { break; }
                Thread.sleep(10);
            }
            assertThat(blocked).isTrue();
            var expiry = jdbc.queryForObject("SELECT expires_at FROM seat_holds WHERE id=?", java.sql.Timestamp.class, ids.getFirst()).toInstant();
            Thread.sleep(Math.max(1, java.time.Duration.between(Instant.now(), expiry).toMillis() + 50));
            gate.commit();
            assertThat(response.get(6, TimeUnit.SECONDS)).isEqualTo(409);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE showtime_id=?", Integer.class, showtime)).isZero();
    }

    @Test
    void mixedShowtimeHoldIdsFailAtomically() throws Exception {
        var ids = hold(user, standard);
        long second = jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,statement_timestamp()+interval '3 hours',statement_timestamp()+interval '4 hours',
                    statement_timestamp()+interval '4 hours',100,'OPEN_FOR_BOOKING',statement_timestamp()+interval '3 hours') RETURNING id
                """, Long.class, movie, hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))", Object.class, second, array(List.of(standard, couple)));
        long foreign = Long.parseLong(seats.acquire(second, user, List.of(couple)).holds().getFirst().id());
        assertThat(createHttp(user, List.of(ids.getFirst(), foreign))).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE id IN (?,?) AND booking_id IS NULL", Integer.class, ids.getFirst(), foreign)).isEqualTo(2);
    }

    @Test
    void zeroPriceCannotBypassFixedSeatCompositionAndOverflowIsSafeConflict() throws Exception {
        jdbc.update("UPDATE showtimes SET base_price=0 WHERE id=?", showtime);
        var result = create(hold(user, couple));
        hold(user, standard);
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner");
            assertThatThrownBy(() -> sql.execute("INSERT INTO booking_seats(booking_id,showtime_id,seat_id,seat_type_snapshot,unit_price_snapshot,final_price) VALUES ("
                    + result.id() + "," + showtime + "," + standard + ",'STANDARD',0,0)"))
                    .isInstanceOfSatisfying(SQLException.class, error -> assertThat(error.getSQLState()).isEqualTo("23514"));
            sql.execute("RESET ROLE");
        }
        bookings.cancel(Long.parseLong(result.id()), user);
        var ids = hold(user, standard, couple);
        jdbc.update("UPDATE showtimes SET base_price=999999999999999 WHERE id=?", showtime);
        assertThat(createHttp(user, ids)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bookings WHERE showtime_id=?", Integer.class, showtime)).isEqualTo(1);
        assertThat(seats.mine(showtime, user).holds()).hasSize(2);
    }
}
