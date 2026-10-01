package com.smartcinema.demo;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.seat.SeatService;
import com.smartcinema.booking.BookingRequest;
import com.smartcinema.booking.BookingService;

@SpringBootTest(properties = "seat-hold.cleanup-enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("demo-seed")
@EnabledIfEnvironmentVariable(named = "DEMO_DB_TESTS", matches = "true")
@Transactional
class DemoSeedPostgresTests {
    private static final String SCHEMA = "demo_suite_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource
    static void schema(org.springframework.test.context.DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.flyway.schemas", () -> SCHEMA + ",public");
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.url", () -> {
            String url = System.getenv("DB_URL");
            return url + (url.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA + ",public";
        });
    }
    @Autowired DemoSeedService seed;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired SeatService seats;
    @Autowired BookingService bookings;

    @Test
    void repeatsWithoutDuplicatesAndRealPublicApisExposeCompleteDiscovery() throws Exception {
        var first = seed.seed();
        var snapshot = counts();
        assertThat(seed.seed()).isEqualTo(first);
        assertThat(counts()).isEqualTo(snapshot);
        assertThat(first.movies()).isEqualTo(10);
        assertThat(first.cinemas()).isEqualTo(3);
        assertThat(first.halls()).isEqualTo(6);
        assertThat(first.seatUnits()).isEqualTo(270);
        assertThat(first.showtimes()).isEqualTo(72);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM genres", Integer.class)).isEqualTo(7);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM movie_genres", Integer.class)).isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtime_seats", Integer.class)).isEqualTo(3240);
        mvc.perform(get("/api/v1/movies").param("q", "[DEMO]"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(10));
        mvc.perform(get("/api/v1/genres")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(7));
        long movie = jdbc.queryForObject("SELECT id FROM movies ORDER BY id LIMIT 1", Long.class);
        long genre = jdbc.queryForObject("SELECT genre_id FROM movie_genres WHERE movie_id=? LIMIT 1", Long.class, movie);
        mvc.perform(get("/api/v1/movies").param("q", "[DEMO]").param("genreId", Long.toString(genre)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThan(0)));
        mvc.perform(get("/api/v1/movies/" + movie)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PUBLISHED"));
        mvc.perform(get("/api/v1/cinemas").param("movieId", Long.toString(movie)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3));
        var screening = screening();
        mvc.perform(get("/api/v1/showtimes").param("movieId", screening.get("movie_id").toString())
                .param("cinemaId", screening.get("cinema_id").toString()).param("date", screening.get("date").toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(org.hamcrest.Matchers.greaterThan(0)));
        mvc.perform(get("/api/v1/showtimes/" + screening.get("id") + "/seats"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.units.length()").value(45));
        mvc.perform(get("/api/v1/concession-items")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
        assertNoEntitlements();
    }

    @Test
    void wholeCoupleHoldBookingConcessionAndPromotionUseRealOwnedFlow() throws Exception {
        var result = seed.seed();
        assertNoEntitlements();
        long customer = jdbc.queryForObject("""
                INSERT INTO users(email,password_hash,full_name,phone,role,status)
                VALUES (?,'test-only-hash','Demo test','0123','CUSTOMER','ACTIVE') RETURNING id
                """, Long.class, UUID.randomUUID() + "@example.test");
        var screening = screening(); long showtime = ((Number) screening.get("id")).longValue();
        var units = jdbc.queryForList("""
                SELECT id FROM seats WHERE hall_id=? AND (row='A' AND number='1' OR seat_type='COUPLE' AND number='1-2') ORDER BY id
                """, Long.class, screening.get("hall_id"));
        var held = seats.acquire(showtime, customer, units);
        var booking = bookings.create(customer, new BookingRequest(showtime, held.holds().stream().map(h -> Long.valueOf(h.id())).toList()));
        assertThat(booking.seatUnitCount()).isEqualTo(2);
        assertThat(booking.guestCount()).isEqualTo(3);
        long item = jdbc.queryForObject("SELECT id FROM concession_items WHERE name='[DEMO] Popcorn Small'", Long.class);
        var principal = jwt().jwt(t -> t.subject(Long.toString(customer))).authorities(() -> "ROLE_CUSTOMER");
        mvc.perform(post("/api/v1/bookings/" + booking.id() + "/concessions").with(principal)
                .contentType("application/json").content("{\"itemId\":\"" + item + "\",\"quantity\":1}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/bookings/" + booking.id() + "/promotion").with(principal)
                .contentType("application/json").content("{\"code\":\"" + result.promotionCodes().getFirst() + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.discount").value("21500.0000"))
                .andExpect(jsonPath("$.finalAmount").value("193500.0000"));
        seed.seed();
        var unchanged = bookings.detail(Long.parseLong(booking.id()), customer);
        assertThat(unchanged.expiresAt()).isEqualTo(booking.expiresAt());
        assertThat(unchanged.status()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE sold_at IS NOT NULL", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE status='CONSUMED'", Integer.class)).isZero();
        mvc.perform(put("/api/v1/bookings/" + booking.id() + "/promotion").with(principal)
                .contentType("application/json").content("{\"code\":\"" + result.promotionCodes().get(1) + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.discount").value("50000.0000"));
    }

    @Test
    void nextDayAppendsHorizonWithoutReschedulingExistingData() {
        seed.seed();
        var previous = jdbc.queryForList("SELECT id,movie_id,hall_id,start_time,end_time,booking_cut_off FROM showtimes ORDER BY id");
        LocalDate today = jdbc.queryForObject("SELECT clock_timestamp()", (row, number) -> row.getTimestamp(1).toInstant())
                .atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        seed.seedForDate(today.plusDays(1));
        assertThat(jdbc.queryForList("SELECT id,movie_id,hall_id,start_time,end_time,booking_cut_off FROM showtimes ORDER BY id"))
                .containsAll(previous).hasSize(96);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM promotions", Integer.class)).isEqualTo(4);
        assertNoEntitlements();
    }

    @Test
    void collisionFailsWithoutOverwritingLegitimateRecord() {
        long id = jdbc.queryForObject("INSERT INTO movies(title,description,duration,status) VALUES ('[DEMO] Eclipse Protocol','Existing legitimate content',120,'DRAFT') RETURNING id", Long.class);
        assertThatThrownBy(() -> seed.seed()).isInstanceOf(IllegalStateException.class).hasMessageContaining("Demo seed stopped");
        assertThat(jdbc.queryForObject("SELECT description FROM movies WHERE id=?", String.class, id)).isEqualTo("Existing legitimate content");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentSeedCommandsSerializeWithoutLogicalDuplicates() throws Exception {
        var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var tasks = java.util.stream.IntStream.range(0, 2).mapToObj(i -> pool.submit(() -> {
                ready.countDown(); start.await(); return seed.seed();
            })).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue(); start.countDown();
            assertThat(tasks.get(0).get(30, TimeUnit.SECONDS)).isEqualTo(tasks.get(1).get(30, TimeUnit.SECONDS));
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM movies WHERE title LIKE '[DEMO] %'", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM showtimes", Integer.class)).isEqualTo(72);
        assertNoEntitlements();
    }

    private java.util.Map<String, Object> screening() {
        return jdbc.queryForMap("""
                SELECT s.id,s.movie_id,s.hall_id,h.cinema_id,(s.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS date
                FROM showtimes s JOIN halls h ON h.id=s.hall_id ORDER BY s.start_time,s.id LIMIT 1
                """);
    }
    private List<Integer> counts() {
        return List.of("genres", "movies", "movie_genres", "cinemas", "halls", "seats", "showtimes", "showtime_seats", "concession_items", "promotions")
                .stream().map(table -> jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class)).toList();
    }
    private void assertNoEntitlements() {
        for (String table : List.of("bookings", "seat_holds", "payment_transactions", "payment_evidence", "payment_reconciliations", "tickets", "audit_records")) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class)).as(table).isZero();
        }
    }
}
