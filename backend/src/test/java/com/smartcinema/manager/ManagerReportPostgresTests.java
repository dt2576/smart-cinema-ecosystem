package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.sql.Connection;
import java.util.List;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import com.smartcinema.admin.AdminReportQuery;
import com.smartcinema.admin.AdminReportRepository;
import com.smartcinema.manager.ManagerReportResponse.Activity;
import com.smartcinema.manager.ManagerReportResponse.StatusCount;

/** Synthetic financial/operational inputs exist only inside SELECT CTEs, never in Neon tables.
 * This is PostgreSQL query verification, not real signed callback, issuance or authenticated MANAGER evidence. */
@EnabledIfEnvironmentVariable(named="MANAGER_REPORT_READ_TESTS",matches="true")
class ManagerReportPostgresTests {
    Connection db;
    String fixture=FIXTURE;
    static final String FIXTURE="""
      users(id,role,status) AS (VALUES (7::bigint,'MANAGER','ACTIVE'),(8,'MANAGER','ACTIVE'),(9,'MANAGER','BLOCKED'),(10,'MANAGER','ACTIVE'),(11,'MANAGER','ACTIVE'),(12,'STAFF','ACTIVE')),
      cinema_assignments(user_id,cinema_id,assignment_type,status,effective_at) AS (VALUES
        (7::bigint,1::bigint,'MANAGER','ACTIVE','2020-01-01Z'::timestamptz),(8,2,'MANAGER','ACTIVE','2020-01-01Z'),
        (9,1,'MANAGER','ACTIVE','2020-01-01Z'),(10,1,'MANAGER','INACTIVE','2020-01-01Z'),(11,1,'MANAGER','ACTIVE','2100-01-01Z'),(12,1,'MANAGER','ACTIVE','2020-01-01Z')),
      cinemas(id,name) AS (VALUES (1::bigint,'Cinema A'),(2,'Cinema B')),
      halls(id,cinema_id,name) AS (VALUES (1::bigint,1::bigint,'Hall A'),(2,2,'Hall B')),
      movies(id,title) AS (VALUES (1::bigint,'Movie A'),(2,'Movie B'),(3,'Activity only')),
      showtimes(id,movie_id,hall_id,start_time,status) AS (VALUES
        (11::bigint,1::bigint,1::bigint,'2026-10-27T10:00Z'::timestamptz,'ENDED'),(12,2,2,'2026-10-28T10:00Z','SCHEDULED'),(13,3,1,'2030-01-01Z','SCHEDULED')),
      showtime_seats(id,showtime_id,is_sellable) AS (VALUES (1::bigint,11::bigint,true),(2,11,true),(3,11,false),(4,12,true),(5,12,true),(6,12,true)),
      bookings(id,showtime_id,status,created_at,paid_at,seat_amount,concession_amount,subtotal,discount,final_amount) AS (VALUES
        (1::bigint,11::bigint,'PAID','2026-10-25T01:00Z'::timestamptz,'2026-10-26T17:00Z'::timestamptz,80000.0000::numeric,20000.1234::numeric,100000.1234::numeric,10.1234::numeric,99990.0000::numeric),
        (2,12,'PAID','2026-10-27T03:00Z','2026-10-28T16:59:59.999999Z',200000,0,200000,0,200000),
        (3,11,'PENDING','2026-10-28T17:00Z',NULL,100,0,100,0,100),
        (4,13,'PENDING','2026-10-01Z',NULL,100,0,100,0,100),
        (5,11,'PENDING','2026-10-27T01:00Z',NULL,100,0,100,0,100),
        (6,11,'EXPIRED','2026-10-27T02:00Z',NULL,100,0,100,0,100),
        (7,11,'CANCELLED','2026-10-28T01:00Z',NULL,100,0,100,0,100)),
      booking_seats(id,booking_id,seat_type_snapshot,sold_at) AS (VALUES
        (1::bigint,1::bigint,'COUPLE','2026-10-26T17:00Z'::timestamptz),(2,2,'STANDARD','2026-10-28T16:59:59.999999Z'),(3,2,'VIP','2026-10-28T16:59:59.999999Z')),
      tickets(id,booking_seat_id,status,issued_at,checked_in_at) AS (VALUES
        (1::bigint,1::bigint,'VALID','2026-10-26T17:00Z'::timestamptz,NULL::timestamptz),
        (2,2,'CHECKED_IN','2026-10-28T16:59:59.999999Z','2026-10-28T16:59:59.999999Z'),(3,3,'EXPIRED','2026-10-28T16:59:59.999999Z',NULL)),
      payment_transactions(id,booking_id,status,amount,provider,currency,environment,initiated_at,completed_at,reconciliation_required) AS (VALUES
        (1::bigint,1::bigint,'SUCCESS',99990.0000::numeric,'VNPAY','VND','SANDBOX','2026-10-26T17:00Z'::timestamptz,'2026-10-26T17:00Z'::timestamptz,false),
        (2,2,'SUCCESS',200000,'VNPAY','VND','SANDBOX','2026-10-28T16:59:59Z','2026-10-28T16:59:59Z',false),
        (3,2,'FAILED',200000,'VNPAY','VND','SANDBOX','2026-10-28T01:00Z','2026-10-28T01:00Z',false),
        (4,3,'PENDING',100,'VNPAY','VND','SANDBOX','2026-10-28T17:00Z',NULL,false),
        (5,4,'INITIATED',100,'VNPAY','VND','SANDBOX','2026-10-27T10:00Z',NULL,false),
        (6,4,'FAILED',100,'VNPAY','VND','SANDBOX','2026-10-27T11:00Z','2026-10-27T11:01Z',false),
        (7,4,'PENDING',100,'VNPAY','VND','SANDBOX','2026-10-27T12:00Z',NULL,true)),
      payment_evidence(payment_id,source,result) AS (VALUES (1::bigint,'IPN','SUCCESS'),(2,'QUERY','SUCCESS'),(2,'IPN','SUCCESS')),
      concession_items(id,name,category,selling_price,status) AS (VALUES
        (31::bigint,'Renamed catalog popcorn','POPCORN',999999::numeric,'INACTIVE'),(32,'Free drink','DRINK',0,'ACTIVE'),(33,'Foreign combo','COMBO',0,'ACTIVE')),
      booking_concessions(id,booking_id,concession_item_id,item_name_snapshot,category_snapshot,quantity,unit_price_snapshot,total_price) AS (VALUES
        (1::bigint,1::bigint,31::bigint,'Frozen popcorn','POPCORN',2,10000.0617::numeric,20000.1234::numeric),
        (2,1,32,'Free drink','DRINK',1,0,0),(3,2,33,'Foreign combo','COMBO',10,0,0))
      """;

    @BeforeAll static void before() throws Exception { ManagerReportReadTestSupport.preflight(); }
    @AfterAll static void after() throws Exception { ManagerReportReadTestSupport.preserved(); }
    @BeforeEach void open() throws Exception { db=ManagerReportReadTestSupport.open(); }
    @AfterEach void close() throws Exception { db.rollback();db.close(); }
    JdbcTemplate jdbc() { return ManagerReportReadTestSupport.fixtures(db,()->fixture); }
    ManagerReportRepository repo() { return new ManagerReportRepository(jdbc()); }
    AdminReportQuery q(String... pairs) { return AdminReportQuery.parse(ManagerReportRequestTests.values(pairs),pairs.length>0&&List.of(pairs).contains("dimension")); }
    AdminReportQuery products(String... pairs) { return ManagerReportRequest.concessions(ManagerReportRequestTests.values(pairs)); }
    static String state(List<StatusCount> values,String state) { return values.stream().filter(v->v.status().equals(state)).findFirst().orElseThrow().count(); }
    void allCinemas() { fixture=fixture.replace("(8,2,'MANAGER'","(7,2,'MANAGER'"); }

    @Test void ownedFinancialCohortExcludesEveryForeignCinema() {
        var own=repo().summary(7,q());assertThat(own.metrics().confirmedRevenue()).isEqualTo("99990.0000");
        assertThat(own.metrics().bookingsCreated()).isEqualTo("3");assertThat(repo().summary(8,q()).metrics().confirmedRevenue()).isEqualTo("200000.0000");
        assertThat(repo().count(7,q("dimension","CINEMA"))).isEqualTo("1");assertThat(repo().breakdown(7,q("dimension","CINEMA"))).extracting(v->v.id()).containsExactly("1");
        assertThat(repo().concessions(7,products())).extracting(v->v.id()).containsExactly("31","32");
    }
    @Test void multipleAssignedCinemasReuseExactlyTheAdminFinancialMetrics() {
        allCinemas();var manager=repo().summary(7,q());var admin=new AdminReportRepository(jdbc()).summary(q());
        assertThat(manager.metrics()).isEqualTo(admin);assertThat(manager.metrics().confirmedRevenue()).isEqualTo("299990.0000");
        assertThat(manager.metrics().ticketsSold()).isEqualTo("3");assertThat(manager.metrics().guestsSold()).isEqualTo("4");
    }
    @Test void currentBlockedInactiveFutureAndChangedRoleFailBothGateAndScope() {
        for(long actor:List.of(9L,10L,11L,12L,Long.MAX_VALUE)) {
            assertThatThrownBy(()->new ManagerRepository(jdbc()).access(actor)).isInstanceOf(ManagerFailure.class);
            assertThat(repo().summary(actor,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
            assertThat(repo().count(actor,q("dimension","CINEMA"))).isEqualTo("0");assertThat(repo().concessionCount(actor,products())).isEqualTo("0");
        }
    }
    @Test void revokedAndDuplicateAssignmentInputsCannotLeakOrMultiplyAggregates() {
        var before=repo().summary(7,q());fixture=FIXTURE.replace("(8,2,'MANAGER'","(7,1,'MANAGER'");
        assertThat(repo().summary(7,q())).isEqualTo(before);
        fixture=FIXTURE.replace("(7::bigint,1::bigint,'MANAGER','ACTIVE'","(7::bigint,1::bigint,'MANAGER','INACTIVE'");
        assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");assertThat(repo().breakdown(7,q("dimension","MOVIE"))).isEmpty();
    }
    @Test void scopedFiltersAndConflictingFiltersNeverExposeForeignGroups() {
        for(var query:List.of(q("cinemaId","2"),q("showtimeId","12"),q("movieId","2"),q("cinemaId","1","showtimeId","12")))
            assertThat(repo().summary(7,query).metrics().confirmedRevenue()).isEqualTo("0.0000");
        assertThat(repo().breakdown(7,q("dimension","MOVIE","movieId","2"))).isEmpty();
        assertThat(repo().concessions(7,products("cinemaId","2"))).isEmpty();
    }
    @Test void successAloneWrongAmountCurrencyProviderEnvironmentAndEvidenceNeverRecognizeRevenue() {
        for(String input:List.of(FIXTURE.replace("'SUCCESS',99990.0000","'PENDING',99990.0000"),
                FIXTURE.replace("'SUCCESS',99990.0000","'SUCCESS',99991.0000"),FIXTURE.replace("'VND'","'USD'"),
                FIXTURE.replace("'VNPAY'","'OTHER'"),FIXTURE.replace("'SANDBOX'","'PRODUCTION'"),
                FIXTURE.replace("(1::bigint,'IPN','SUCCESS')","(1::bigint,'RETURN','SUCCESS')"),
                FIXTURE.replace("1::bigint,11::bigint,'PAID'","1::bigint,11::bigint,'PENDING'"))) {
            fixture=input;assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
        }
    }
    @Test void duplicateEvidenceAndFailedReplacementNeverMultiplyHeaderOrProductTotals() {
        fixture=FIXTURE.replace("(2,'IPN','SUCCESS')","(2,'IPN','SUCCESS'),(1,'QUERY','SUCCESS'),(1,'IPN','SUCCESS')")
                .replace("(7,4,'PENDING'","(7,1,'FAILED'").replace("'2026-10-27T12:00Z',NULL,true","'2026-10-27T12:00Z','2026-10-27T12:01Z',false");
        var result=repo().summary(7,q());assertThat(result.metrics().confirmedRevenue()).isEqualTo("99990.0000");
        assertThat(repo().concessions(7,products()).getFirst().grossAmount()).isEqualTo("20000.1234");
        assertThat(repo().concessions(7,products()).getFirst().quantity()).isEqualTo("2");
    }
    @Test void conflictingSuccessOrAnyReconciliationExcludesSalesButDoesNotFreePhysicalCapacity() {
        String extraSuccess=FIXTURE.replace("(7,4,'PENDING',100","(7,1,'SUCCESS',99990.0000")
                .replace("'2026-10-27T12:00Z',NULL,true","'2026-10-27T12:00Z','2026-10-27T12:01Z',false");
        for(String input:List.of(extraSuccess,extraSuccess.replace("(2,'IPN','SUCCESS')","(2,'IPN','SUCCESS'),(7,'IPN','SUCCESS')"),
                FIXTURE.replace("'2026-10-26T17:00Z'::timestamptz,false)","'2026-10-26T17:00Z'::timestamptz,true)"))) {
            fixture=input;var m=repo().summary(7,q()).metrics();assertThat(m.confirmedRevenue()).isEqualTo("0.0000");
            assertThat(m.soldSeatUnits()).isEqualTo("1");assertThat(m.occupancyPercent()).isEqualTo("50.0000");assertThat(repo().concessions(7,products())).isEmpty();
        }
    }
    @Test void issuanceAndSoldTimestampsMustBeCoherentBeforeRevenueIsCounted() {
        fixture=FIXTURE.replace("(1::bigint,1::bigint,'VALID'","(1::bigint,999::bigint,'VALID'");
        assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
        fixture=FIXTURE.replace("'COUPLE','2026-10-26T17:00Z'","'COUPLE','2026-10-26T17:00:01Z'");
        assertThat(repo().summary(7,q()).metrics().ticketsSold()).isEqualTo("0");
    }
    @Test void actualTicketStatesRemainHistoricalSalesAndCoupleIsOneTicketTwoGuests() {
        for(String status:List.of("VALID","CHECKED_IN","EXPIRED","CANCELLED")) {
            fixture=FIXTURE.replace("(1::bigint,1::bigint,'VALID'","(1::bigint,1::bigint,'"+status+"'");
            var m=repo().summary(7,q()).metrics();assertThat(m.confirmedRevenue()).isEqualTo("99990.0000");
            assertThat(m.ticketsSold()).isEqualTo("1");assertThat(m.guestsSold()).isEqualTo("2");
        }
    }
    @Test void dailyHalfOpenMicrosecondBoundariesAndZeroFillAreConsistent() {
        var days=repo().daily(7,q());assertThat(days).hasSize(2);assertThat(days.getFirst().date().toString()).isEqualTo("2026-10-27");
        assertThat(days.getFirst().metrics().confirmedRevenue()).isEqualTo("99990.0000");assertThat(days.getLast().metrics().confirmedRevenue()).isEqualTo("0.0000");
        assertThat(days.stream().map(d->new BigDecimal(d.metrics().confirmedRevenue())).reduce(BigDecimal.ZERO,BigDecimal::add)).isEqualByComparingTo("99990.0000");
        fixture=FIXTURE.replace("2026-10-26T17:00Z","2026-10-26T16:59:59.999999Z");
        assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
        fixture=FIXTURE.replace("2026-10-26T17:00Z","2026-10-28T17:00Z");
        assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
    }
    @Test void operationalCountsUseTheirOwnDatesAndNeverInferRevenueFromAttemptCounts() {
        var s=repo().summary(7,q());Activity a=s.activity();
        assertThat(state(a.bookingsByStatus(),"PENDING")).isEqualTo("1");assertThat(state(a.bookingsByStatus(),"EXPIRED")).isEqualTo("1");
        assertThat(state(a.bookingsByStatus(),"CANCELLED")).isEqualTo("1");assertThat(state(a.bookingsByStatus(),"PAID")).isEqualTo("0");
        for(String status:List.of("INITIATED","PENDING","FAILED","SUCCESS"))assertThat(state(a.paymentsByStatus(),status)).isEqualTo("1");
        assertThat(a.reconciliationAttempts()).isEqualTo("1");assertThat(a.checkedInTickets()).isEqualTo("0");
        var only=repo().summary(7,q("showtimeId","13"));assertThat(only.metrics().confirmedRevenue()).isEqualTo("0.0000");
        assertThat(state(only.activity().paymentsByStatus(),"INITIATED")).isEqualTo("1");
    }
    @Test void checkInCountRequiresActualTimestampAndIncludesOnlyOwnedTickets() {
        assertThat(repo().summary(7,q()).activity().checkedInTickets()).isEqualTo("0");assertThat(repo().summary(8,q()).activity().checkedInTickets()).isEqualTo("1");
        fixture=FIXTURE.replace("'2026-10-26T17:00Z'::timestamptz,NULL::timestamptz)","'2026-10-26T17:00Z'::timestamptz,'2026-10-27T12:00Z'::timestamptz)");
        assertThat(repo().summary(7,q()).activity().checkedInTickets()).isEqualTo("1");
        assertThat(repo().breakdown(7,q("dimension","SHOWTIME"))).filteredOn(v->v.id().equals("11")).singleElement().satisfies(v->assertThat(v.activity().checkedInTickets()).isEqualTo("1"));
    }
    @Test void performanceRankingStablePaginationAndActivityOnlyMoviesAreScoped() {
        assertThat(repo().breakdown(7,q("dimension","MOVIE"))).extracting(v->v.id()).containsExactly("1","3");
        allCinemas();assertThat(repo().breakdown(7,q("dimension","MOVIE","size","1"))).extracting(v->v.id()).containsExactly("2");
        fixture=fixture.replace("'IPN','SUCCESS'","'IPN','FAILED'").replace("'QUERY','SUCCESS'","'QUERY','FAILED'");
        assertThat(repo().count(7,q("dimension","MOVIE"))).isEqualTo("3");
        assertThat(repo().breakdown(7,q("dimension","MOVIE","page","1","size","1"))).extracting(v->v.id()).containsExactly("2");
        assertThat(repo().breakdown(7,q("dimension","MOVIE","page","999"))).isEmpty();
    }
    @Test void concessionRankingUsesSnapshotGrossAndQuantityNotCurrentCatalogPriceOrNetAllocation() {
        var products=repo().concessions(7,products());assertThat(products).hasSize(2);
        var first=products.getFirst();assertThat(first.id()).isEqualTo("31");assertThat(first.name()).isEqualTo("Renamed catalog popcorn");
        assertThat(first.quantity()).isEqualTo("2");assertThat(first.grossAmount()).isEqualTo("20000.1234");assertThat(first.confirmedBookings()).isEqualTo("1");
        assertThat(repo().summary(7,q()).metrics().concessionGrossAmount()).isEqualTo(first.grossAmount());
        fixture=FIXTURE.replace("999999::numeric","0::numeric");assertThat(repo().concessions(7,products()).getFirst().grossAmount()).isEqualTo(first.grossAmount());
        assertThat(repo().concessionCount(7,products())).isEqualTo("2");assertThat(repo().concessions(7,products("size","1","page","1"))).extracting(v->v.id()).containsExactly("32");
    }
    @Test void aggregatePrecisionExceedsOneRowAndEmptyCapacityIsNull() {
        allCinemas();fixture=fixture.replace("80000.0000::numeric,20000.1234::numeric,100000.1234::numeric,10.1234::numeric,99990.0000::numeric","999999999999999.0000::numeric,0::numeric,999999999999999.0000::numeric,0::numeric,999999999999999.0000::numeric")
                .replace("200000,0,200000,0,200000)","999999999999999.0000,0,999999999999999.0000,0,999999999999999.0000)")
                .replace("'SUCCESS',99990.0000::numeric","'SUCCESS',999999999999999.0000::numeric").replace("'SUCCESS',200000,","'SUCCESS',999999999999999.0000,");
        assertThat(repo().summary(7,q()).metrics().confirmedRevenue()).isEqualTo("1999999999999998.0000");
        var empty=q("from","2040-01-01","to","2040-01-03");var m=repo().summary(7,empty).metrics();
        assertThat(m.confirmedRevenue()).isEqualTo("0.0000");assertThat(m.occupancyPercent()).isNull();assertThat(repo().daily(7,empty)).hasSize(2);
    }
    @Test void draftAndCancelledShowtimesRemainSeparateFromOperationalCapacityDefinition() {
        fixture=FIXTURE.replace("'ENDED'","'DRAFT'");var s=repo().summary(7,q());
        assertThat(s.metrics().showtimes()).isEqualTo("0");assertThat(s.metrics().occupancyPercent()).isNull();assertThat(state(s.activity().showtimesByStatus(),"DRAFT")).isEqualTo("1");
    }
    @Test void realSchemaReadOnlyUnknownActorAndQueryPlanHaveNoMutation() throws Exception {
        assertThat(ManagerReportReadTestSupport.value(db,"SHOW transaction_read_only")).isEqualTo("on");
        var actual=new JdbcTemplate(new SingleConnectionDataSource(db,true));var scope=new ManagerRepository(actual);
        assertThatThrownBy(()->scope.access(Long.MAX_VALUE)).isInstanceOf(ManagerFailure.class);
        var actualRepo=new ManagerReportRepository(actual);assertThat(actualRepo.summary(Long.MAX_VALUE,q()).metrics().confirmedRevenue()).isEqualTo("0.0000");
        assertThat(actualRepo.daily(Long.MAX_VALUE,q())).hasSize(2);assertThat(actualRepo.count(Long.MAX_VALUE,q("dimension","CINEMA"))).isEqualTo("0");
        assertThat(actualRepo.concessions(Long.MAX_VALUE,products())).isEmpty();
        String plan=String.join("\n",new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(actual).query("EXPLAIN (ANALYZE,BUFFERS,FORMAT TEXT) WITH "+ManagerReportSql.COMMON+ManagerReportSql.SUMMARY,
                ManagerReportRepository.parameters(Long.MAX_VALUE,q()),(r,n)->r.getString(1)));
        java.nio.file.Files.writeString(ManagerReportReadTestSupport.EVIDENCE.resolve("primary-summary-explain.txt"),plan);
    }
}
