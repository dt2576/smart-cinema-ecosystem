package com.smartcinema.concession;
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
@EnabledIfEnvironmentVariable(named = "CONCESSION_DB_TESTS", matches = "true")
class ConcessionPostgresTests {
    private static final String SCHEMA = "concession_suite_" + UUID.randomUUID().toString().replace("-", "");
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
    @Autowired private SeatService seats;
    private long user, other, movie, cinema, hall, showtime, standard, couple;

    @BeforeEach
    void seed() {
        for (String table : List.of("seats", "seat_holds", "bookings", "booking_seats", "concession_items", "booking_concessions")) {
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

    @Test
    void publicCatalogFiltersInactiveAndKeepsStringIdsAndExactPrices() throws Exception {
        long active = item("Popcorn", "POPCORN", "10.1234", "ACTIVE");
        long inactive = item("Unavailable", "DRINK", "20", "INACTIVE");
        long combo = item("Combo", "COMBO", "30", "ACTIVE");
        var catalog = concessions.catalog();
        assertThat(catalog).anySatisfy(i -> { assertThat(i.id()).isEqualTo(Long.toString(active)); assertThat(i.sellingPrice()).isEqualTo("10.1234"); });
        assertThat(catalog).noneSatisfy(i -> assertThat(i.id()).isEqualTo(Long.toString(inactive)));
        assertThat(catalog).anySatisfy(i -> assertThat(i.id()).isEqualTo(Long.toString(combo)));
        assertThat(concessions.catalog()).isEqualTo(catalog);
        mvc.perform(get("/api/v1/concession-items")).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$[0].id").isString()).andExpect(jsonPath("$[0].sellingPrice").isString())
                .andExpect(jsonPath("$[0].status").doesNotExist()).andExpect(jsonPath("$[0].createdAt").doesNotExist());
        mvc.perform(get("/api/v1/concession-items?status=INACTIVE")).andExpect(status().isBadRequest());
    }

    @Test
    void emptyCatalogReturnsEmptyArray() throws Exception {
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner"); sql.execute("UPDATE concession_items SET status='INACTIVE'"); sql.execute("RESET ROLE");
        }
        mvc.perform(get("/api/v1/concession-items")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void addUpdateRemoveRecalculatesAndPreservesSeatAndHoldSnapshots() throws Exception {
        var original = create(hold(user, couple)); long bookingId = Long.parseLong(original.id());
        long itemId = item("Original popcorn", "POPCORN", "10", "ACTIVE");
        var added = add(bookingId, itemId, 2); long lineId = Long.parseLong(added.concessions().getFirst().id());
        assertThat(added.concessionAmount()).isEqualTo("20.0000"); assertThat(added.finalAmount()).isEqualTo("143.4567");
        configure(itemId, "Renamed", "999", "INACTIVE");
        var updated = update(bookingId, lineId, 3);
        assertThat(updated.concessions().getFirst().name()).isEqualTo("Original popcorn");
        assertThat(updated.concessions().getFirst().unitPrice()).isEqualTo("10.0000");
        assertThat(updated.finalAmount()).isEqualTo("153.4567");
        assertThat(updated.seats()).isEqualTo(original.seats()); assertThat(updated.guestCount()).isEqualTo(2);
        assertThat(updated.expiresAt()).isEqualTo(original.expiresAt());
        assertThat(addHttp(bookingId, user, itemId, 1)).isEqualTo(409);
        mvc.perform(get("/api/v1/bookings/" + bookingId).with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.concessions[0].id").value(Long.toString(lineId))).andExpect(jsonPath("$.concessions[0].itemId").value(Long.toString(itemId)));
        var removed = concessions.edit(bookingId, user, lineId, null, null, "REMOVE");
        assertThat(removed.concessions()).isEmpty(); assertThat(removed.finalAmount()).isEqualTo(original.finalAmount());
        assertThat(removed.expiresAt()).isEqualTo(original.expiresAt());
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE booking_id=?", String.class, bookingId)).isEqualTo("ACTIVE");
    }

    @Test
    void repeatedItemCreatesDistinctLinesWithOwnSnapshots() {
        long bookingId = Long.parseLong(create(hold(user, couple)).id());
        long itemId = item("Old", "POPCORN", "1", "ACTIVE"); add(bookingId, itemId, 2);
        configure(itemId, "New", "3", "ACTIVE"); var result = add(bookingId, itemId, 1);
        assertThat(result.concessions()).hasSize(2);
        assertThat(result.concessions().getFirst().name()).isEqualTo("Old");
        assertThat(result.concessions().getLast().name()).isEqualTo("New");
        assertThat(result.concessionAmount()).isEqualTo("5.0000");
    }

    @Test
    void concurrentAddsDoNotLoseTotals() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id());
        long firstItem = item("A", "POPCORN", "10", "ACTIVE"), secondItem = item("B", "DRINK", "20", "ACTIVE");
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return add(bookingId, firstItem, 2); });
            var b = executor.submit(() -> { start.await(); return add(bookingId, secondItem, 3); });
            start.countDown(); a.get(8, TimeUnit.SECONDS); b.get(8, TimeUnit.SECONDS);
        }
        var result = bookings.detail(bookingId, user);
        assertThat(result.concessions()).hasSize(2); assertThat(result.concessionAmount()).isEqualTo("80.0000");
        assertThat(result.finalAmount()).isEqualTo("203.4567");
    }

    @Test
    void concurrentQuantityChangesKeepLineAndHeaderConsistent() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id());
        long itemId = item("Quantity", "DRINK", "7", "ACTIVE");
        long lineId = Long.parseLong(add(bookingId, itemId, 1).concessions().getFirst().id());
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { start.await(); return update(bookingId, lineId, 2); });
            var b = executor.submit(() -> { start.await(); return update(bookingId, lineId, 3); });
            start.countDown(); a.get(8, TimeUnit.SECONDS); b.get(8, TimeUnit.SECONDS);
        }
        var result = bookings.detail(bookingId, user);
        assertThat(result.concessionAmount()).isIn("14.0000", "21.0000");
        assertThat(result.concessionAmount()).isEqualTo(result.concessions().getFirst().totalPrice());
    }

    @Test
    void cancellationRaceLeavesRetainedConsistentHistory() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); long itemId = item("Cancel", "COMBO", "10", "ACTIVE");
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var edit = executor.submit(() -> { start.await(); return addHttp(bookingId, user, itemId, 2); });
            var cancel = executor.submit(() -> { start.await(); bookings.cancel(bookingId, user); return true; });
            start.countDown(); assertThat(edit.get(8, TimeUnit.SECONDS)).isIn(200, 409); assertThat(cancel.get(8, TimeUnit.SECONDS)).isTrue();
        }
        var result = bookings.detail(bookingId, user);
        assertThat(result.status()).isEqualTo("CANCELLED");
        assertThat(result.concessionAmount()).isEqualTo(result.concessions().isEmpty() ? "0.0000" : "20.0000");
        assertThat(addHttp(bookingId, user, itemId, 1)).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT status FROM seat_holds WHERE booking_id=?", String.class, bookingId)).isEqualTo("RELEASED");
    }

    @Test
    void ownershipAndStrictQuantityInputsRejectUnsafeCommands() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); long itemId = item("Secure", "POPCORN", "1", "ACTIVE");
        String path = "/api/v1/bookings/" + bookingId + "/concessions";
        mvc.perform(post(path).contentType("application/json").content("{}" )).andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(jwt().authorities(() -> "ROLE_ADMIN")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        assertThat(addHttp(bookingId, other, itemId, 1)).isEqualTo(404);
        for (String quantity : List.of("0", "-1", "1.5", "1.0", "2147483648", "\"2\"", "null")) {
            mvc.perform(post(path).with(customer(user)).contentType("application/json").content("{\"itemId\":\"" + itemId + "\",\"quantity\":" + quantity + "}"))
                    .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        }
        mvc.perform(post(path).with(customer(user)).contentType("application/json").content("{\"itemId\":" + itemId + ",\"quantity\":1}")).andExpect(status().isBadRequest());
        mvc.perform(post(path).with(customer(user)).contentType("application/json").content("{\"itemId\":\"" + itemId + "\",\"quantity\":1,\"price\":0}")).andExpect(status().isBadRequest());
        jdbc.update("UPDATE users SET status='BLOCKED' WHERE id=?", user);
        assertThat(addHttp(bookingId, user, itemId, 1)).isEqualTo(403);
    }

    @Test
    void foreignLinesAndMissingItemsFailWithoutChangingTotals() throws Exception {
        long itemId = item("Line", "DRINK", "1", "ACTIVE");
        long first = Long.parseLong(create(hold(user, standard)).id());
        long second = Long.parseLong(create(hold(user, couple)).id());
        String lineId = add(first, itemId, 2).concessions().getFirst().id();
        mvc.perform(patch("/api/v1/bookings/" + second + "/concessions/" + lineId).with(customer(user)).contentType("application/json").content("{\"quantity\":3}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/bookings/" + second + "/concessions/" + lineId).with(customer(user))).andExpect(status().isNotFound());
        assertThat(addHttp(second, user, Long.MAX_VALUE, 1)).isEqualTo(409);
        assertThat(bookings.detail(second, user).concessionAmount()).isEqualTo("0.0000");
    }

    @Test
    void everyParentEligibilityIsRevalidated() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); long itemId = item("Eligibility", "COMBO", "1", "ACTIVE");
        for (String table : List.of("movies", "cinemas", "halls", "showtimes")) {
            long id = switch (table) { case "movies" -> movie; case "cinemas" -> cinema; case "halls" -> hall; default -> showtime; };
            String original = table.equals("movies") ? "PUBLISHED" : table.equals("showtimes") ? "OPEN_FOR_BOOKING" : "ACTIVE";
            String blocked = table.equals("movies") ? "UNPUBLISHED" : table.equals("showtimes") ? "CANCELLED" : "INACTIVE";
            if (table.equals("showtimes")) {
                assertThatThrownBy(() -> jdbc.update("UPDATE showtimes SET status=? WHERE id=?", blocked, id)).isInstanceOf(org.springframework.dao.DataAccessException.class);
                assertThat(jdbc.queryForObject("SELECT status FROM showtimes WHERE id=?", String.class, id)).isEqualTo(original);
                continue;
            }
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", blocked, id);
            assertThat(addHttp(bookingId, user, itemId, 1)).isEqualTo(409);
            jdbc.update("UPDATE " + table + " SET status=? WHERE id=?", original, id);
        }
    }

    @Test
    void expiryWhileWaitingRejectsWithoutPartialComposition() throws Exception {
        long bookingId = Long.parseLong(create(shortHold(couple, "1500 milliseconds")).id());
        long itemId = item("Expiry", "POPCORN", "1", "ACTIVE");
        try (Connection gate = dataSource.getConnection(); var sql = gate.createStatement(); var executor = Executors.newSingleThreadExecutor()) {
            gate.setAutoCommit(false); sql.execute("SELECT id FROM showtimes WHERE id=" + showtime + " FOR UPDATE");
            int pid; try (var result = sql.executeQuery("SELECT pg_backend_pid()")) { result.next(); pid = result.getInt(1); }
            var response = executor.submit(() -> addHttp(bookingId, user, itemId, 1));
            boolean blocked = false; long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(1);
            while (System.nanoTime() < deadline) {
                blocked = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?=ANY(pg_blocking_pids(pid)))", Boolean.class, pid);
                if (blocked) { break; } Thread.sleep(10);
            }
            assertThat(blocked).isTrue();
            Instant expires = bookings.detail(bookingId, user).expiresAt();
            Thread.sleep(Math.max(1, java.time.Duration.between(Instant.now(), expires).toMillis() + 50));
            gate.commit(); assertThat(response.get(6, TimeUnit.SECONDS)).isEqualTo(409);
        }
        assertThat(bookings.detail(bookingId, user).concessions()).isEmpty();
        assertThat(bookings.detail(bookingId, user).status()).isEqualTo("EXPIRED");
    }

    @Test
    void amountBoundsAndCatalogPrecisionRejectWithoutSilentRounding() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id());
        assertThatThrownBy(() -> item("Precision", "DRINK", "0.00001", "ACTIVE")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        for (String price : List.of("-1", "NaN", "Infinity", "1000000000000000")) {
            assertThatThrownBy(() -> item("Invalid", "DRINK", price, "ACTIVE")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        }
        assertThatThrownBy(() -> item("Other", "SNACK", "1", "ACTIVE")).isInstanceOf(org.springframework.dao.DataAccessException.class);
        long large = item("Huge", "COMBO", "999999999999999", "ACTIVE");
        assertThat(addHttp(bookingId, user, large, 2)).isEqualTo(409);
        assertThat(bookings.detail(bookingId, user).concessions()).isEmpty();
    }

    @Test
    void restrictedRoleCanEditButCannotBypassGuards() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); long itemId = item("Role", "DRINK", "1", "ACTIVE");
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_runtime");
            sql.execute("SELECT edit_booking_concession(" + bookingId + "," + user + ",NULL," + itemId + ",1,'ADD')");
            for (String command : List.of("DELETE FROM booking_concessions", "TRUNCATE concession_items CASCADE", "UPDATE bookings SET discount=1",
                    "SELECT booking_composition_eligible(" + bookingId + ")", "UPDATE promotions SET status='ACTIVE'",
                    "SELECT configure_concession_item(NULL,'Name',NULL,'DRINK',1,NULL,'ACTIVE')")) {
                assertThatThrownBy(() -> sql.execute(command)).isInstanceOf(SQLException.class);
            }
            sql.execute("RESET ROLE"); sql.execute("SET ROLE smart_cinema_hold_owner");
            assertThatThrownBy(() -> sql.execute("UPDATE booking_concessions SET item_name_snapshot='Changed' WHERE booking_id=" + bookingId)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("UPDATE bookings SET payment_started_at=clock_timestamp() WHERE id=" + bookingId)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("UPDATE booking_seats SET sold_at=clock_timestamp() WHERE booking_id=" + bookingId)).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sql.execute("UPDATE seat_holds SET status='CONSUMED' WHERE booking_id=" + bookingId)).isInstanceOf(SQLException.class);
            sql.execute("RESET ROLE");
        }
    }

    @Test
    void deferredTotalsRejectDirectPartialUpdatesAndSeatAppendAfterHeaderEdit() throws Exception {
        jdbc.update("UPDATE showtimes SET base_price=0 WHERE id=?", showtime);
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); hold(user, standard);
        long itemId = item("Assertion", "POPCORN", "0", "ACTIVE"); add(bookingId, itemId, 1);
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            connection.setAutoCommit(false); sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            sql.execute("UPDATE bookings SET concession_amount=1,subtotal=1,final_amount=1 WHERE id=" + bookingId);
            assertThatThrownBy(connection::commit).isInstanceOf(SQLException.class); connection.rollback();
            sql.execute("SET LOCAL ROLE smart_cinema_hold_owner");
            sql.execute("UPDATE bookings SET concession_amount=0,subtotal=0,final_amount=0 WHERE id=" + bookingId);
            assertThatThrownBy(() -> sql.execute("INSERT INTO booking_seats(booking_id,showtime_id,seat_id,seat_type_snapshot,unit_price_snapshot,final_price) VALUES ("
                    + bookingId + "," + showtime + "," + standard + ",'STANDARD',0,0)" )).isInstanceOf(SQLException.class);
            connection.rollback();
        }
        bookings.cancel(bookingId, user);
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner");
            assertThatThrownBy(() -> sql.execute("DELETE FROM booking_concessions WHERE booking_id=" + bookingId)).isInstanceOf(SQLException.class);
            sql.execute("RESET ROLE");
        }
    }

    @Test
    void promotionSchemaChecksRejectInvalidDataAndGuardRecalculatesDiscount() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id());
        try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
            sql.execute("SET ROLE smart_cinema_hold_owner");
            String code = "POLICY-" + UUID.randomUUID().toString().toUpperCase();
            sql.execute("INSERT INTO promotions(code,discount_type,discount_value,valid_from,valid_until,minimum_order,usage_limit,status) VALUES ('"
                    + code + "','PERCENTAGE',10,statement_timestamp(),statement_timestamp()+interval '1 day',100,2,'ACTIVE')");
            for (String change : List.of("code=' lower '", "discount_type='OTHER'", "discount_value=101", "discount_value=-1", "discount_value='NaN'",
                    "valid_until=valid_from", "minimum_order=-1", "usage_limit=0", "status='EXPIRED'")) {
                assertThatThrownBy(() -> sql.execute("UPDATE promotions SET " + change + " WHERE code='" + code + "'" )).isInstanceOf(SQLException.class);
            }
            assertThatThrownBy(() -> sql.execute("INSERT INTO promotions SELECT id+100,code,discount_type,discount_value,valid_from,valid_until,minimum_order,usage_limit,status FROM promotions WHERE code='" + code + "'"))
                    .isInstanceOf(SQLException.class);
            sql.execute("UPDATE bookings SET promotion_id=(SELECT id FROM promotions WHERE code='" + code + "'),discount=1,final_amount=subtotal-1 WHERE id=" + bookingId);
            sql.execute("RESET ROLE");
        }
        assertThat(bookings.detail(bookingId, user).discount()).isEqualTo("12.0000");
        mvc.perform(post("/api/v1/bookings/" + bookingId + "/promotions").with(customer(user))
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
                .contentType("application/json").content("{\"code\":\"DEMO10\"}" )).andExpect(status().isNotFound());
    }

    @Test
    void httpUpdateAndRemoveReturnAuthoritativeBooking() throws Exception {
        long bookingId = Long.parseLong(create(hold(user, couple)).id()); long itemId = item("HTTP", "DRINK", "10", "ACTIVE");
        assertThat(addHttp(bookingId, user, itemId, 1)).isEqualTo(200);
        String lineId = bookings.detail(bookingId, user).concessions().getFirst().id();
        String path = "/api/v1/bookings/" + bookingId + "/concessions/" + lineId;
        mvc.perform(patch(path).with(customer(user)).contentType("application/json").content("{\"quantity\":4}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.concessionAmount").value("40.0000"))
                .andExpect(jsonPath("$.finalAmount").value("163.4567"));
        mvc.perform(delete(path).with(customer(other))).andExpect(status().isNotFound());
        mvc.perform(delete(path).with(customer(user))).andExpect(status().isOk()).andExpect(jsonPath("$.concessions.length()").value(0));
        mvc.perform(delete(path).with(customer(user))).andExpect(status().isNotFound());
    }
}
