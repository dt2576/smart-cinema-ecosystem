package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import static com.smartcinema.admin.AdminReportResponse.*;

/** Exact production aggregation in PostgreSQL, with VALUES CTEs shadowing tables for isolated financial cases.
 * These are fixtures, not callback/settlement evidence. READ ONLY forbids persisted financial fixtures. */
@EnabledIfEnvironmentVariable(named="ADMIN_REPORT_DB_TESTS",matches="true")
class AdminReportPostgresTests {
    Connection db;
    NamedParameterJdbcTemplate jdbc;
    static final String FIXTURE="""
      cinemas(id,name) AS (VALUES (1::bigint,'Cinema A'),(2,'Cinema B')),
      movies(id,title) AS (VALUES (1::bigint,'Movie A'),(2,'Movie B')),
      halls(id,cinema_id,name) AS (VALUES (1::bigint,1::bigint,'Hall A'),(2,2,'Hall B')),
      showtimes(id,movie_id,hall_id,start_time,status) AS (VALUES
        (11::bigint,1::bigint,1::bigint,'2026-10-27T10:00Z'::timestamptz,'ENDED'),
        (12,2,2,'2026-10-28T10:00Z'::timestamptz,'SCHEDULED')),
      showtime_seats(id,showtime_id,is_sellable) AS (VALUES
        (1::bigint,11::bigint,true),(2,11,true),(3,11,false),(4,12,true),(5,12,true),(6,12,true)),
      bookings(id,showtime_id,status,created_at,paid_at,seat_amount,concession_amount,subtotal,discount,final_amount) AS (VALUES
        (1::bigint,11::bigint,'PAID','2026-10-25T01:00Z'::timestamptz,'2026-10-26T17:00Z'::timestamptz,80000.0000::numeric,20000.1234::numeric,100000.1234::numeric,10.1234::numeric,99990.0000::numeric),
        (2,12,'PAID','2026-10-27T03:00Z'::timestamptz,'2026-10-28T16:59:59.999999Z'::timestamptz,200000,0,200000,0,200000),
        (3,11,'PENDING','2026-10-28T17:00Z'::timestamptz,NULL::timestamptz,100,0,100,0,100)),
      booking_seats(id,booking_id,seat_type_snapshot,sold_at) AS (VALUES
        (1::bigint,1::bigint,'COUPLE','2026-10-26T17:00Z'::timestamptz),
        (2,2,'STANDARD','2026-10-28T16:59:59.999999Z'::timestamptz),
        (3,2,'VIP','2026-10-28T16:59:59.999999Z'::timestamptz)),
      tickets(id,booking_seat_id,status,issued_at) AS (VALUES
        (1::bigint,1::bigint,'VALID','2026-10-26T17:00Z'::timestamptz),
        (2,2,'CHECKED_IN','2026-10-28T16:59:59.999999Z'::timestamptz),
        (3,3,'EXPIRED','2026-10-28T16:59:59.999999Z'::timestamptz)),
      payment_transactions(id,booking_id,status,amount,provider,currency,environment,completed_at,reconciliation_required) AS (VALUES
        (1::bigint,1::bigint,'SUCCESS',99990.0000::numeric,'VNPAY','VND','SANDBOX','2026-10-26T17:00Z'::timestamptz,false),
        (2,2,'SUCCESS',200000,'VNPAY','VND','SANDBOX','2026-10-28T16:59:59Z'::timestamptz,false),
        (3,2,'FAILED',200000,'VNPAY','VND','SANDBOX','2026-10-28T01:00Z'::timestamptz,false),
        (4,3,'PENDING',100,'VNPAY','VND','SANDBOX',NULL::timestamptz,false)),
      payment_evidence(payment_id,source,result) AS (VALUES (1::bigint,'IPN','SUCCESS'),(2,'QUERY','SUCCESS'),(2,'IPN','SUCCESS')),
      """;
    @BeforeAll static void preflight()throws Exception { LocalReportTestSupport.preflight(); }
    @AfterAll static void preserved()throws Exception { LocalReportTestSupport.preserved(); }
    @BeforeEach void open()throws Exception { db=LocalReportTestSupport.open();jdbc=new NamedParameterJdbcTemplate(LocalReportTestSupport.jdbc(db)); }
    @AfterEach void close()throws Exception { db.close(); }
    static AdminReportQuery query() { return AdminReportQuery.parse(AdminReportQueryTests.query(),false); }
    Metrics summary(String fixtures,AdminReportQuery q) {
        return jdbc.queryForObject("WITH "+fixtures+AdminReportSql.COMMON+AdminReportSql.SUMMARY,AdminReportRepository.parameters(q),(r,n)->AdminReportRepository.metrics(r));
    }
    @Test void verifiedSalesExactSnapshotsAndNoJoinMultiplication() {
        var m=summary(FIXTURE,query());
        assertThat(m.confirmedRevenue()).isEqualTo("299990.0000");assertThat(m.grossAmount()).isEqualTo("300000.1234");
        assertThat(m.discountAmount()).isEqualTo("10.1234");assertThat(m.concessionGrossAmount()).isEqualTo("20000.1234");
        assertThat(m.confirmedBookings()).isEqualTo("2");assertThat(m.ticketsSold()).isEqualTo("3");assertThat(m.guestsSold()).isEqualTo("4");
        assertThat(m.bookingsCreated()).isEqualTo("1");
    }
    @Test void occupancyUsesShowtimeCohortAndWeightedSeatUnits() {
        var m=summary(FIXTURE,query());assertThat(m.capacitySeatUnits()).isEqualTo("5");assertThat(m.soldSeatUnits()).isEqualTo("3");assertThat(m.occupancyPercent()).isEqualTo("60.0000");
        String earlier=FIXTURE.replace("'2026-10-26T17:00Z'","'2026-10-25T17:00Z'");
        var moved=summary(earlier,query());assertThat(moved.confirmedRevenue()).isEqualTo("200000.0000");assertThat(moved.occupancyPercent()).isEqualTo("60.0000");
    }
    @Test void halfOpenBoundariesAndDailyAreConsistent() {
        var days=jdbc.query("WITH "+FIXTURE+AdminReportSql.COMMON+AdminReportSql.DAILY,AdminReportRepository.parameters(query()),(r,n)->new Day(r.getDate("report_day").toLocalDate(),AdminReportRepository.metrics(r)));
        assertThat(days).hasSize(2);assertThat(days.getFirst().metrics().confirmedRevenue()).isEqualTo("99990.0000");assertThat(days.getLast().metrics().confirmedRevenue()).isEqualTo("200000.0000");
        var atEnd=FIXTURE.replace("2026-10-28T16:59:59.999999Z","2026-10-28T17:00Z");
        assertThat(summary(atEnd,query()).confirmedRevenue()).isEqualTo("99990.0000");
        var beforeStart=FIXTURE.replace("2026-10-26T17:00Z","2026-10-26T16:59:59.999999Z");
        assertThat(summary(beforeStart,query()).confirmedRevenue()).isEqualTo("200000.0000");
    }
    @Test void unpaidFailedCancelledAndInitiatedNeverConfirmRevenue() {
        for(String state:List.of("PENDING","FAILED","CANCELLED","INITIATED")) {
            var f=FIXTURE.replace("'SUCCESS',99990.0000","'"+state+"',99990.0000");
            assertThat(summary(f,query()).confirmedRevenue()).isEqualTo("200000.0000");
        }
        assertThat(summary(FIXTURE.replace("1::bigint,11::bigint,'PAID'","1::bigint,11::bigint,'PENDING'"),query()).confirmedRevenue()).isEqualTo("200000.0000");
    }
    @Test void unverifiedWrongCurrencyAmountAndEnvironmentAreExcluded() {
        for(String f:List.of(FIXTURE.replace("(1::bigint,'IPN','SUCCESS')","(1::bigint,'IPN','PENDING')"),
                FIXTURE.replace("'SUCCESS',99990.0000","'SUCCESS',99991.0000")))
            assertThat(summary(f,query()).confirmedRevenue()).isEqualTo("200000.0000");
        for(String f:List.of(FIXTURE.replace("'VND'","'USD'"),FIXTURE.replace("'SANDBOX'","'LIVE'")))
            assertThat(summary(f,query()).confirmedRevenue()).isEqualTo("0.0000");
    }
    @Test void reconciliationAndExtraSuccessExcludedButSeatAllocationRemains() {
        var recon=summary(FIXTURE.replace("timestamptz,false)","timestamptz,true)"),query());
        assertThat(recon.confirmedRevenue()).isEqualTo("0.0000");assertThat(recon.soldSeatUnits()).isEqualTo("3");
        var extra=summary(FIXTURE.replace("(3,2,'FAILED'","(3,2,'SUCCESS'"),query());
        assertThat(extra.confirmedRevenue()).isEqualTo("99990.0000");
    }
    @Test void missingOrIncoherentIssuanceDoesNotConfirm() {
        for(String f:List.of(FIXTURE.replace("(1::bigint,1::bigint,'VALID'","(1::bigint,99::bigint,'VALID'"),
                FIXTURE.replace("1::bigint,1::bigint,'COUPLE','2026-10-26T17:00Z'::timestamptz","1::bigint,1::bigint,'COUPLE',NULL::timestamptz"),
                FIXTURE.replace("1::bigint,1::bigint,'VALID','2026-10-26T17:00Z'","1::bigint,1::bigint,'VALID','2026-10-26T17:01Z'")))
            assertThat(summary(f,query()).confirmedRevenue()).isEqualTo("200000.0000");
        assertThat(summary(FIXTURE.replace("'VALID'","'CANCELLED'"),query()).ticketsSold()).isEqualTo("3");
    }
    @Test void emptyDatasetZeroFilledDaysAndNullOccupancy() {
        var values=AdminReportQueryTests.query();values.set("cinemaId","9223372036854775807");var q=AdminReportQuery.parse(values,false);
        var m=summary(FIXTURE,q);assertThat(m.confirmedRevenue()).isEqualTo("0.0000");assertThat(m.ticketsSold()).isEqualTo("0");assertThat(m.occupancyPercent()).isNull();
        var days=jdbc.query("WITH "+FIXTURE+AdminReportSql.COMMON+AdminReportSql.DAILY,AdminReportRepository.parameters(q),(r,n)->AdminReportRepository.metrics(r));
        assertThat(days).hasSize(2).allSatisfy(d->assertThat(d.bookingsCreated()).isEqualTo("0"));
    }
    @Test void aggregatePrecisionExceedsSingleRowPrecisionWithoutRounding() {
        String f=FIXTURE.replace("80000.0000::numeric,20000.1234::numeric,100000.1234::numeric,10.1234::numeric,99990.0000::numeric",
                "999999999999999.0000::numeric,0::numeric,999999999999999.0000::numeric,0::numeric,999999999999999.0000::numeric")
            .replace("'SUCCESS',99990.0000","'SUCCESS',999999999999999.0000").replace("'SUCCESS',200000,","'SUCCESS',999999999999999.0000,")
            .replace("200000,0,200000,0,200000)","999999999999999.0000,0,999999999999999.0000,0,999999999999999.0000)");
        assertThat(summary(f,query()).confirmedRevenue()).isEqualTo("1999999999999998.0000");
    }
    @Test void filteredRankedPaginatedDimensionsPreserveTotalsAndIdentity() {
        for(var dim:AdminReportQuery.Dimension.values()) {
            var values=AdminReportQueryTests.query();values.set("dimension",dim.name());values.set("size","1");
            var q=AdminReportQuery.parse(values,true);var params=AdminReportRepository.parameters(q);
            assertThat(jdbc.queryForObject("WITH "+FIXTURE+AdminReportSql.COMMON+AdminReportSql.count(dim),params,String.class)).isEqualTo("2");
            var rows=jdbc.queryForList("WITH "+FIXTURE+AdminReportSql.COMMON+AdminReportSql.breakdown(dim),params);
            assertThat(rows).hasSize(1);assertThat(rows.getFirst().get("id").toString()).isEqualTo(dim==AdminReportQuery.Dimension.SHOWTIME?"12":"2");
            values.set("page","1");q=AdminReportQuery.parse(values,true);
            rows=jdbc.queryForList("WITH "+FIXTURE+AdminReportSql.COMMON+AdminReportSql.breakdown(dim),AdminReportRepository.parameters(q));
            assertThat(rows.getFirst().get("id").toString()).isEqualTo(dim==AdminReportQuery.Dimension.SHOWTIME?"11":"1");
        }
        var values=AdminReportQueryTests.query();values.set("cinemaId","1");values.set("movieId","2");assertThat(summary(FIXTURE,AdminReportQuery.parse(values,false)).confirmedRevenue()).isEqualTo("0.0000");
    }
    @Test void draftAndCancelledShowtimesExcludedFromOperationalCapacity() {
        for(String state:List.of("DRAFT","CANCELLED")) {
            var m=summary(FIXTURE.replace("'SCHEDULED'","'"+state+"'"),query());
            assertThat(m.capacitySeatUnits()).isEqualTo("2");assertThat(m.showtimes()).isEqualTo("1");assertThat(m.confirmedRevenue()).isEqualTo("299990.0000");
        }
    }
    @Test void actualRuntimeQueriesCurrentAuthorityAndReadOnlyPlan()throws Exception {
        var template=LocalReportTestSupport.jdbc(db);var repo=new AdminReportRepository(template);repo.timeouts();
        var access=new AdminAccessService(template);assertThat(access.requireAdminReadOnly(1).role()).isEqualTo("ADMIN");
        var users=template.queryForList("SELECT id FROM users WHERE role<>'ADMIN' OR status<>'ACTIVE'");
        assertThat(users).isNotEmpty();for(var user:users)assertThatThrownBy(()->access.requireAdminReadOnly(((Number)user.get("id")).longValue())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(()->access.requireAdminReadOnly(Long.MAX_VALUE)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        var m=repo.summary(query());assertThat(m.confirmedRevenue()).isEqualTo("0.0000");assertThat(repo.daily(query())).hasSize(2);
        var values=AdminReportQueryTests.query();values.set("dimension","CINEMA");var q=AdminReportQuery.parse(values,true);assertThat(repo.count(q)).isNotNull();assertThat(repo.breakdown(q)).isNotNull();
        String plan=String.join("\n",jdbc.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT TEXT) WITH "+AdminReportSql.COMMON+AdminReportSql.SUMMARY,AdminReportRepository.parameters(query()),(r,n)->r.getString(1)));
        Files.writeString(LocalReportTestSupport.EVIDENCE.resolve("summary-explain.txt"),plan,StandardCharsets.UTF_8);
        assertThat(LocalReportTestSupport.value(db,"SHOW transaction_read_only")).isEqualTo("on");
    }
}
