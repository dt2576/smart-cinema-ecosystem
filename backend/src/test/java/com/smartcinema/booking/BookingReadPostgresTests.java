package com.smartcinema.booking;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.sql.Connection;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.payment.PaymentService;
import com.smartcinema.seat.SeatService;

@SpringBootTest(properties = {"seat-hold.ttl=PT5M", "seat-hold.cleanup-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "BOOKING_DB_TESTS", matches = "true")
class BookingReadPostgresTests {
    private static final String SCHEMA = "booking_read_suite_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource static void schema(DynamicPropertyRegistry properties) {
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
    @Autowired private BookingReadService reads;
    @Autowired private PaymentService payments;
    @Autowired private SeatService seats;
    @MockitoSpyBean private BookingReadRepository repository;
    private long user, other, movie, cinema, hall, showtime, standard, vip, couple, spare;

    @BeforeEach void seed() {
        for (String table : List.of("users", "movies", "cinemas", "halls", "showtimes", "seats", "seat_holds", "bookings", "booking_seats", "payment_transactions", "tickets")) {
            jdbc.execute("SELECT setval('" + table + "_id_seq',greatest((SELECT last_value FROM " + table + "_id_seq),9007199254740993))");
        }
        user = user(); other = user();
        movie = jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES ('History movie',60,'PUBLISHED') RETURNING id", Long.class);
        cinema = jdbc.queryForObject("INSERT INTO cinemas(name,address,status) VALUES ('History cinema','Address','ACTIVE') RETURNING id", Long.class);
        hall = jdbc.queryForObject("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'History hall',5,'Configured','ACTIVE') RETURNING id", Long.class, cinema);
        jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))", Object.class, hall, """
                [{"row":"A","number":"1","type":"STANDARD","physicalStatus":"ACTIVE"},
                 {"row":"A","number":"2","type":"VIP","physicalStatus":"ACTIVE"},
                 {"row":"H","number":"9-10","type":"COUPLE","physicalStatus":"ACTIVE"},
                 {"row":"A","number":"3","type":"STANDARD","physicalStatus":"ACTIVE"}]
                """);
        var units = jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id", Long.class, hall);
        standard = units.get(0); vip = units.get(1); couple = units.get(2); spare = units.get(3);
        showtime = showtime("10000", "1 hour");
    }
    private long user() {
        return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'hash','Name','0123','CUSTOMER','ACTIVE') RETURNING id",
                Long.class, UUID.randomUUID() + "@example.test");
    }
    private String array(List<Long> ids) { return "{" + String.join(",", ids.stream().map(String::valueOf).toList()) + "}"; }
    private long showtime(String price, String start) {
        long id = jdbc.queryForObject("""
                INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,statement_timestamp()+CAST(? AS interval),statement_timestamp()+CAST(? AS interval)+interval '1 hour',
                    statement_timestamp()+CAST(? AS interval)+interval '1 hour',CAST(? AS numeric),'OPEN_FOR_BOOKING',
                    statement_timestamp()+CAST(? AS interval)) RETURNING id
                """, Long.class, movie, hall, start, start, start, price, start);
        var ids = jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id", Long.class, hall);
        jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))", Object.class, id, array(ids));
        return id;
    }
    private BookingResponse createFor(long actor, long st, long... units) {
        var holds = seats.acquire(st, actor, java.util.Arrays.stream(units).boxed().toList()).holds();
        return bookings.create(actor, new BookingRequest(st, holds.stream().map(h -> Long.parseLong(h.id())).toList()));
    }
    private BookingResponse create(long... units) { return createFor(user, showtime, units); }
    private RequestPostProcessor customer(long actor) { return jwt().jwt(t -> t.subject(Long.toString(actor))).authorities(() -> "ROLE_CUSTOMER"); }
    private String url(String id) { return "/api/v1/bookings/" + id + "/tickets"; }
    private long initiate(BookingResponse booking) {
        long payment = Long.parseLong(payments.initiate(Long.parseLong(booking.id()), user).id());
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,'TEST0001','https://example.test/return','127.0.0.1')", Long.class, payment, user);
        return payment;
    }
    // Existing protected settlement in isolated PostgreSQL schemas: no live provider outcome is fabricated.
    private String settle(long payment, String outcome) {
        return jdbc.queryForObject("""
                SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,substring(id::text from 3),
                    'IPN',?,?, '00','00') FROM payment_transactions WHERE id=?
                """, String.class, UUID.randomUUID().toString().replace("-", "").repeat(2), outcome, payment);
    }
    private String state() {
        return jdbc.queryForObject("""
                SELECT concat_ws('|',
                    (SELECT jsonb_agg(to_jsonb(b) ORDER BY id)::text FROM bookings b),
                    (SELECT jsonb_agg(to_jsonb(bs) ORDER BY id)::text FROM booking_seats bs),
                    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM tickets t),
                    (SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM payment_transactions p),
                    (SELECT jsonb_agg(to_jsonb(h) ORDER BY id)::text FROM seat_holds h))
                """, String.class);
    }

    @Test void emptyOwnedHistoryHasDefaultsAndNoEntitlementFields() throws Exception {
        mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(0)).andExpect(jsonPath("$.totalPages").value(0))
                .andExpect(jsonPath("$.serverTime").isString()).andExpect(jsonPath("$.bookingQr").doesNotExist());
    }

    @Test void ownedHistoryPaginationIsDeterministicIncludingEqualCreatedTimes() throws Exception {
        // Test-only BEFORE INSERT fixture supplies tied creation times. All normal Booking guards/writers remain enabled.
        jdbc.execute("CREATE FUNCTION fixture_history_time() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.created_at='2020-01-01T00:00:00Z'; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER zz_fixture_history_time BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION fixture_history_time()");
        BookingResponse first, second;
        try { first = create(standard); second = create(vip); }
        finally { jdbc.execute("DROP TRIGGER zz_fixture_history_time ON bookings"); jdbc.execute("DROP FUNCTION fixture_history_time()"); }
        var latest = create(couple); createFor(other, showtime, spare);
        mvc.perform(get("/api/v1/bookings").with(customer(user)).param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3)).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items[0].id").value(latest.id())).andExpect(jsonPath("$.items[1].id").value(first.id()));
        mvc.perform(get("/api/v1/bookings").with(customer(user)).param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].id").value(second.id()));
        mvc.perform(get("/api/v1/bookings").with(customer(user)).param("page", "2147483647").param("size", "100"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test void historyPreservesFractionalMoneyBigintAndSeatUnitGuestCounts() throws Exception {
        long fractional = showtime("123.4567", "3 hours");
        var booking = createFor(user, fractional, standard, couple);
        mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").isString()).andExpect(jsonPath("$.items[0].id").value(booking.id()))
                .andExpect(jsonPath("$.items[0].movieId").value(Long.toString(movie)))
                .andExpect(jsonPath("$.items[0].finalAmount").isString()).andExpect(jsonPath("$.items[0].finalAmount").value(booking.finalAmount()))
                .andExpect(jsonPath("$.items[0].seatUnitCount").value(2)).andExpect(jsonPath("$.items[0].guestCount").value(3))
                .andExpect(jsonPath("$.items[0].paymentId").doesNotExist()).andExpect(jsonPath("$.items[0].bookingQr").doesNotExist());
        assertThat(Long.parseLong(booking.id())).isGreaterThan(9007199254740991L);
        assertThat(booking.finalAmount()).isEqualTo("246.9134");
    }

    @Test void historyAndTicketsProjectExpiryWithoutMutatingBookingOrFreeze() throws Exception {
        var holds = jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '1 second')", Long.class, showtime, user, array(List.of(standard)));
        var booking = bookings.create(user, new BookingRequest(showtime, holds));
        payments.initiate(Long.parseLong(booking.id()), user);
        Thread.sleep(1100);
        String before = state();
        mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("EXPIRED"))
                .andExpect(jsonPath("$.items[0].expiresAt").value(booking.expiresAt().toString()))
                .andExpect(jsonPath("$.items[0].paymentStartedAt").isString());
        mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("EXPIRED"))
                .andExpect(jsonPath("$.bookingQr").value(org.hamcrest.Matchers.nullValue())).andExpect(jsonPath("$.tickets").isEmpty());
        assertThat(state()).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id=?", String.class, Long.parseLong(booking.id()))).isEqualTo("PENDING");
    }

    @Test void hiddenInactiveCatalogDoesNotHideOwnedHistoryOrEntitlements() throws Exception {
        var booking = create(standard); settle(initiate(booking), "SUCCESS");
        // Catalog fixture changes in this isolated test schema only; no publication filters belong on owned reads.
        jdbc.update("UPDATE movies SET status='DRAFT' WHERE id=?", movie);
        jdbc.update("UPDATE cinemas SET status='INACTIVE' WHERE id=?", cinema);
        jdbc.update("UPDATE halls SET status='INACTIVE' WHERE id=?", hall);
        mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].movieTitle").value("History movie"));
        mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("PAID")).andExpect(jsonPath("$.tickets.length()").value(1));
    }

    @Test void invalidQueriesAndIdsFailWithSafeNoStoreErrors() throws Exception {
        for (String[] input : List.of(new String[]{"page", ""}, new String[]{"page", "-1"}, new String[]{"page", "1.2"},
                new String[]{"page", "2147483648"}, new String[]{"size", "0"}, new String[]{"size", "101"},
                new String[]{"size", " 20"}, new String[]{"customerId", Long.toString(other)}, new String[]{"private-qr-fixture", "private-qr-fixture"})) {
            var error = mvc.perform(get("/api/v1/bookings").with(customer(user)).param(input[0], input[1]))
                    .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control", "no-store"))
                    .andReturn().getResponse().getContentAsString();
            assertThat(error).doesNotContain("private-qr-fixture", Long.toString(other));
        }
        mvc.perform(get("/api/v1/bookings").with(customer(user)).param("size", "20", "20")).andExpect(status().isBadRequest());
        var booking = create(standard);
        mvc.perform(get(url(booking.id())).with(customer(user)).param("paymentId", "1")).andExpect(status().isBadRequest());
        for (String id : List.of("0", "-1", "not-an-id", "9223372036854775808", "private-qr-fixture")) {
            String error = mvc.perform(get(url(id)).with(customer(user))).andExpect(status().isBadRequest())
                    .andReturn().getResponse().getContentAsString();
            assertThat(error).doesNotContain("private-qr-fixture");
        }
        mvc.perform(get(url("0" + booking.id())).with(customer(user))).andExpect(status().isOk()).andExpect(jsonPath("$.bookingId").value(booking.id()));
    }

    @Test void anonymousRolesAndInvalidSubjectsAreDeniedOnBothRoutes() throws Exception {
        var booking = create(standard);
        for (String path : List.of("/api/v1/bookings", url(booking.id()))) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
            for (String role : List.of("ADMIN", "MANAGER", "STAFF")) {
                mvc.perform(get(path).with(jwt().jwt(t -> t.subject(Long.toString(user))).authorities(() -> "ROLE_" + role)))
                        .andExpect(status().isForbidden()).andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
            }
            mvc.perform(get(path).with(jwt().jwt(t -> t.subject("bad-subject")).authorities(() -> "ROLE_CUSTOMER")))
                    .andExpect(status().isForbidden());
        }
    }

    @Test void currentDatabaseRoleAndBlockedStatusOverrideStaleJwtClaims() throws Exception {
        var booking = create(standard);
        for (String assignment : List.of("status='BLOCKED'", "status='ACTIVE',role='ADMIN'")) {
            jdbc.update("UPDATE users SET " + assignment + " WHERE id=?", user);
            for (String path : List.of("/api/v1/bookings", url(booking.id()))) {
                mvc.perform(get(path).with(customer(user))).andExpect(status().isForbidden()).andExpect(header().string("Cache-Control", "no-store"));
            }
        }
        mvc.perform(get("/api/v1/bookings").with(customer(Long.MAX_VALUE))).andExpect(status().isForbidden());
    }

    @Test void foreignAndMissingBookingAreIndistinguishable() throws Exception {
        var booking = create(standard);
        String foreign = mvc.perform(get(url(booking.id())).with(customer(other))).andExpect(status().isNotFound())
                .andExpect(header().string("Cache-Control", "no-store")).andReturn().getResponse().getContentAsString();
        String missing = mvc.perform(get(url(Long.toString(Long.MAX_VALUE))).with(customer(other))).andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        assertThat(foreign).isEqualTo(missing).doesNotContain(booking.id());
    }

    @Test void pendingAndCancelledBookingsNeverExposeEntitlements() throws Exception {
        var booking = create(standard);
        for (String expected : List.of("PENDING", "CANCELLED")) {
            mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk()).andExpect(jsonPath("$.bookingStatus").value(expected))
                    .andExpect(jsonPath("$.bookingQr").value(org.hamcrest.Matchers.nullValue())).andExpect(jsonPath("$.tickets").isEmpty());
            if (expected.equals("PENDING")) { bookings.cancel(Long.parseLong(booking.id()), user); }
        }
    }

    @Test void paidMixedUnitsRecoverExactCompleteAggregateWithoutPaymentIdAndDuplicateIssuance() throws Exception {
        var booking = create(standard, vip, couple); long payment = initiate(booking);
        assertThat(settle(payment, "SUCCESS")).isEqualTo("00");
        String token = jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=?", String.class, Long.parseLong(booking.id()));
        String before = state();
        var paid = reads.tickets(Long.parseLong(booking.id()), user);
        assertThat(paid.bookingQr()).isEqualTo(token); assertThat(paid.tickets()).hasSize(3);
        assertThat(paid.tickets()).extracting(CustomerTicket::seatType).containsExactly("STANDARD", "VIP", "COUPLE");
        assertThat(paid.tickets()).extracting(CustomerTicket::guestCount).containsExactly(1, 1, 2);
        assertThat(paid.tickets()).extracting(CustomerTicket::bookingSeatId).containsExactlyElementsOf(booking.seats().stream().map(BookingResponse.SeatLine::id).toList());
        mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.bookingQr").value(token)).andExpect(jsonPath("$.tickets.length()").value(3))
                .andExpect(jsonPath("$.tickets[2].id").isString()).andExpect(jsonPath("$.tickets[2].guestCount").value(2))
                .andExpect(jsonPath("$.paymentId").doesNotExist()).andExpect(jsonPath("$.tickets[0].checkedInByUserId").doesNotExist());
        assertThat(state()).isEqualTo(before);
        settle(payment, "SUCCESS");
        assertThat(reads.tickets(Long.parseLong(booking.id()), user).tickets()).isEqualTo(paid.tickets());
        assertThat(reads.tickets(Long.parseLong(booking.id()), user).bookingQr()).isEqualTo(token);
    }

    @Test void paidEntitlementsSurviveOriginalPreSaleDeadline() throws Exception {
        var holds = jdbc.queryForList("SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '2 seconds')", Long.class, showtime, user, array(List.of(couple)));
        var booking = bookings.create(user, new BookingRequest(showtime, holds));
        settle(initiate(booking), "SUCCESS"); Thread.sleep(2100);
        var response = reads.tickets(Long.parseLong(booking.id()), user);
        assertThat(response.serverTime()).isAfter(booking.expiresAt());
        assertThat(response.bookingStatus()).isEqualTo("PAID"); assertThat(response.tickets()).hasSize(1);
        mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk()).andExpect(jsonPath("$.bookingQr").isString());
    }

    @Test void failedOldAttemptDoesNotControlPaidBookingEntitlementsAndLateSuccessCannotIssue() throws Exception {
        var booking = create(standard); long first = initiate(booking); settle(first, "FAILED");
        long replacement = initiate(booking); assertThat(replacement).isNotEqualTo(first); settle(replacement, "SUCCESS");
        assertThat(reads.tickets(Long.parseLong(booking.id()), user).tickets()).hasSize(1);
        mvc.perform(get("/api/v1/bookings/" + booking.id() + "/payment-transactions/" + first).with(customer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FAILED")).andExpect(jsonPath("$.bookingStatus").value("PAID"));
        var cancelled = create(couple); long late = initiate(cancelled); bookings.cancel(Long.parseLong(cancelled.id()), user); settle(late, "SUCCESS");
        mvc.perform(get(url(cancelled.id())).with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.bookingQr").value(org.hamcrest.Matchers.nullValue())).andExpect(jsonPath("$.tickets").isEmpty());
    }

    @Test void inconsistentReadFixturesReturnSafe503InsteadOfPartialEntitlement() throws Exception {
        var booking = create(standard, couple); settle(initiate(booking), "SUCCESS");
        long id = Long.parseLong(booking.id()); var real = repository.issuedSeats(id); var a = real.getFirst(); var b = real.getLast();
        // Corrupt projection fixtures only; stored Ticket rows and all guard triggers remain intact.
        var variants = List.of(List.<BookingReadRepository.IssuedSeat>of(), List.of(a), List.of(a, a),
                List.of(a, new BookingReadRepository.IssuedSeat(b.bookingSeatId(), b.seatId(), b.seatType(), null, b.ticketCode(), b.status(), b.soldAt(), b.issuedAt())),
                List.of(a, new BookingReadRepository.IssuedSeat(b.bookingSeatId(), b.seatId(), "BAD", b.ticketId(), b.ticketCode(), b.status(), b.soldAt(), b.issuedAt())),
                List.of(a, new BookingReadRepository.IssuedSeat(b.bookingSeatId(), b.seatId(), b.seatType(), b.ticketId(), b.ticketCode(), null, b.soldAt(), b.issuedAt())),
                List.of(a, new BookingReadRepository.IssuedSeat(b.bookingSeatId(), b.seatId(), b.seatType(), b.ticketId(), b.ticketCode(), b.status(), b.soldAt(), Instant.EPOCH)));
        String before = state();
        for (var fixture : variants) {
            doReturn(fixture).when(repository).issuedSeats(id);
            String error = mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isServiceUnavailable())
                    .andExpect(header().string("Cache-Control", "no-store")).andReturn().getResponse().getContentAsString();
            assertThat(error).doesNotContain("bookingQr", "tickets", a.ticketCode(), b.ticketCode());
        }
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("private-database-fixture"))
                .when(repository).history(eq(user), any(), any());
        String error = mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isServiceUnavailable())
                .andReturn().getResponse().getContentAsString();
        assertThat(error).doesNotContain("private-database-fixture"); assertThat(state()).isEqualTo(before);
    }

    @Test void settlementDuringOwnedReadReturnsOneConsistentSnapshot() throws Exception {
        var booking = create(standard, couple); long payment = initiate(booking); long id = Long.parseLong(booking.id());
        var observed = new CountDownLatch(1); var release = new CountDownLatch(1);
        doAnswer(invocation -> {
            var header = invocation.callRealMethod();
            assertThat(jdbc.queryForObject("SHOW transaction_read_only", String.class)).isEqualTo("on");
            assertThat(jdbc.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("repeatable read");
            observed.countDown(); assertThat(release.await(10, TimeUnit.SECONDS)).isTrue(); return header;
        }).when(repository).owned(eq(id), eq(user), any());
        try (var pool = Executors.newSingleThreadExecutor()) {
            var request = pool.submit(() -> mvc.perform(get(url(booking.id())).with(customer(user)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.bookingStatus").value("PENDING"))
                    .andExpect(jsonPath("$.bookingQr").value(org.hamcrest.Matchers.nullValue())).andExpect(jsonPath("$.tickets").isEmpty()));
            try { assertThat(observed.await(10, TimeUnit.SECONDS)).isTrue(); assertThat(settle(payment, "SUCCESS")).isEqualTo("00"); }
            finally { release.countDown(); }
            request.get(10, TimeUnit.SECONDS);
        }
        doCallRealMethod().when(repository).owned(eq(id), eq(user), any());
        mvc.perform(get(url(booking.id())).with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("PAID")).andExpect(jsonPath("$.tickets.length()").value(2));
    }

    @Test void historyCountAndItemsShareSnapshotWhileAnotherBookingIsCreated() throws Exception {
        create(standard); var observed = new CountDownLatch(1); var release = new CountDownLatch(1);
        doAnswer(invocation -> {
            assertThat(jdbc.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("repeatable read");
            assertThat(jdbc.queryForObject("SHOW transaction_read_only", String.class)).isEqualTo("on");
            observed.countDown(); assertThat(release.await(10, TimeUnit.SECONDS)).isTrue(); return invocation.callRealMethod();
        }).when(repository).history(eq(user), any(), any());
        try (var pool = Executors.newSingleThreadExecutor()) {
            var request = pool.submit(() -> mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items.length()").value(1)));
            try { assertThat(observed.await(10, TimeUnit.SECONDS)).isTrue(); create(couple); }
            finally { release.countDown(); }
            request.get(10, TimeUnit.SECONDS);
        }
        doCallRealMethod().when(repository).history(eq(user), any(), any());
        mvc.perform(get("/api/v1/bookings").with(customer(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test void runtimeDatabaseRoleCanReadButCannotMutateIssuedAggregate() throws Exception {
        var booking = create(couple); settle(initiate(booking), "SUCCESS");
        try (Connection connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("SET ROLE smart_cinema_hold_runtime");
            try {
                try (var rows = statement.executeQuery("SELECT booking_qr_token FROM bookings WHERE id=" + booking.id())) { assertThat(rows.next()).isTrue(); }
                try (var rows = statement.executeQuery("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=" + booking.id())) { assertThat(rows.next()).isTrue(); assertThat(rows.getInt(1)).isEqualTo(1); }
                assertThatThrownBy(() -> statement.executeUpdate("UPDATE tickets SET status='CHECKED_IN'"))
                        .isInstanceOf(java.sql.SQLException.class);
            } finally { statement.execute("RESET ROLE"); }
        }
    }
}
