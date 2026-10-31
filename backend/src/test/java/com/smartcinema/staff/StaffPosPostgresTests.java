package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.booking.*;
import com.smartcinema.seat.SeatService;

/** Actual PostgreSQL with isolated fixtures. Strict loopback target; NEVER PRIMARY/Neon. */
@SpringBootTest(properties={"spring.config.import=","spring.flyway.enabled=false","seat-hold.cleanup-enabled=false",
    "staff.invitations.delivery-enabled=false","vnpay.enabled=false","auth.jwt.secret=isolated-fixture-secret-at-least-thirty-two-characters"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="STAFF_POS_DB_TESTS",matches="true")
class StaffPosPostgresTests {
    static final String SCHEMA="staff_pos_"+UUID.randomUUID().toString().replace("-","");
    static final String ROOT="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test";
    static final String URL=ROOT+"?currentSchema="+SCHEMA+"&sslmode=disable";
    static Properties operator;
    static Map<String,String> original;
    static synchronized void prepare() throws Exception {
        if(operator!=null)return;
        var candidate=new Properties();try(var reader=Files.newBufferedReader(Path.of(".env.local-test-migration"))) {candidate.load(reader);}
        if(!candidate.getProperty("url","").startsWith(ROOT+"?") || !"postgres".equals(candidate.getProperty("user"))) throw new IllegalStateException("Fixed local test operator required");
        try(var db=DriverManager.getConnection(ROOT,candidate.getProperty("user"),candidate.getProperty("password"))) {
            db.setReadOnly(true);db.setAutoCommit(false);
            try(var s=db.createStatement();var r=s.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port()")) {
                r.next();assertThat(r.getString(1)).isEqualTo("smartcinema_phase4e_test");assertThat(r.getString(2)).isEqualTo("127.0.0.1");assertThat(r.getInt(3)).isEqualTo(5432);
            }
            original=snapshot(db);
            for(String role:List.of("smart_cinema_hold_owner","smart_cinema_hold_runtime","smart_cinema_configuration_owner","smart_cinema_staff_owner","smart_cinema_checkin_owner","smart_cinema_payment_system"))
                try(var s=db.prepareStatement("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=?)")){s.setString(1,role);try(var r=s.executeQuery()){r.next();assertThat(r.getBoolean(1)).isTrue();}}
            try(var s=db.createStatement();var r=s.executeQuery("SELECT count(*) FROM pg_auth_members m JOIN pg_roles role ON role.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE member.rolname='postgres' AND role.rolname IN ('smart_cinema_configuration_owner','smart_cinema_staff_owner','smart_cinema_checkin_owner')")) {
                r.next();assertThat(r.getInt(1)).as("Historical migration temporary memberships must not replace original memberships").isZero();
            }
        }
        operator=candidate;
        Flyway.configure().dataSource(ROOT,operator.getProperty("user"),operator.getProperty("password"))
            .schemas(SCHEMA).defaultSchema(SCHEMA).cleanDisabled(true)
            .locations("filesystem:src/main/resources/db/migration","filesystem:src/test/resources/pos-migration").load().migrate();
        Files.createDirectories(Path.of("target/staff-pos-2026-10-30"));
        Files.writeString(Path.of("target/staff-pos-2026-10-30/isolated-schema.txt"),"LOOPBACK ONLY; schema="+SCHEMA+"; proposed V19, not PRIMARY\n");
    }
    static Map<String,String> snapshot(Connection db)throws SQLException {
        var values=new TreeMap<String,String>();
        try(var s=db.createStatement();var rows=s.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")) {
            var tables=new ArrayList<String>();while(rows.next())tables.add(rows.getString(1));
            for(String table:tables)try(var q=db.createStatement();var r=q.executeQuery("SELECT count(*)||':'||md5(coalesce(string_agg(md5(r::text),'' ORDER BY md5(r::text)),'')) FROM public.\""+table+"\" r")){r.next();values.put(table,r.getString(1));}
        }
        for(String query:List.of("SELECT md5(string_agg(r::text,',' ORDER BY oid)) FROM pg_roles r","SELECT md5(coalesce(string_agg(r::text,',' ORDER BY roleid,member),'')) FROM pg_auth_members r"))
            try(var s=db.createStatement();var r=s.executeQuery(query)){r.next();values.put(query,r.getString(1));}
        return values;
    }
    @DynamicPropertySource static void config(DynamicPropertyRegistry properties)throws Exception {
        prepare();properties.add("spring.datasource.url",()->URL);properties.add("spring.datasource.username",()->operator.getProperty("user"));
        properties.add("spring.datasource.password",()->operator.getProperty("password"));properties.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
    }
    @AfterAll static void preserved()throws Exception {
        if(operator==null || original==null)return;
        try(var db=DriverManager.getConnection(ROOT,operator.getProperty("user"),operator.getProperty("password"))) {
            db.setReadOnly(true);db.setAutoCommit(false);assertThat(snapshot(db)).as("Existing public data and global role privileges unchanged").isEqualTo(original);
        }
        Files.writeString(Path.of("target/staff-pos-2026-10-30/local-preservation.txt"),"PASS: existing public rows/history/global role flags and memberships unchanged; isolated fixture schema retained.\n");
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired StaffPosService pos;
    @Autowired BookingService customerBookings;
    @Autowired SeatService customerSeats;
    @Autowired MockMvc mvc;
    @Autowired com.smartcinema.payment.VnpayRepository vnpayRepository;
    @Autowired com.smartcinema.payment.PaymentService customerPayments;
    @Autowired com.smartcinema.admin.AdminReportService adminReports;
    @Autowired com.smartcinema.manager.ManagerReportService managerReports;
    long admin,staff,other,customer,cinema,foreignCinema,hall,showtime,standard,couple,assignment;
    static final String API="/api/v1/staff/pos";
    @BeforeEach void fixture() {
        admin=user("ADMIN");staff=staff();other=staff();customer=user("CUSTOMER");
        cinema=jdbc.queryForObject("SELECT configure_cinema(?,NULL,'QA POS','Address',NULL,NULL,'ACTIVE')",Long.class,admin);
        foreignCinema=jdbc.queryForObject("SELECT configure_cinema(?,NULL,'Foreign POS','Address',NULL,NULL,'ACTIVE')",Long.class,admin);
        assignment=jdbc.queryForObject("SELECT staff_assign_cinema(?,?,?,clock_timestamp()-interval '1 second',NULL,'ACTIVE')",Long.class,admin,staff,cinema);
        jdbc.queryForObject("SELECT staff_assign_cinema(?,?,?,clock_timestamp()-interval '1 second',NULL,'ACTIVE')",Long.class,admin,other,cinema);
        long movie=jdbc.queryForObject("INSERT INTO movies(title,duration,status) VALUES('QA POS movie',60,'PUBLISHED') RETURNING id",Long.class);
        hall=jdbc.queryForObject("SELECT configure_hall(?,?,NULL,'QA POS hall',3,'Configured','ACTIVE')",Long.class,admin,cinema);
        jdbc.queryForObject("SELECT configure_hall_layout(?,?,CAST(? AS jsonb))",Object.class,admin,hall,"[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"},{\"row\":\"A\",\"number\":\"2-3\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}]");
        showtime=jdbc.queryForObject("SELECT configure_showtime(?,NULL,?,?,clock_timestamp()+interval '2 hours',10000,'OPEN_FOR_BOOKING')",Long.class,admin,movie,hall);
        var units=jdbc.queryForList("SELECT id FROM seats WHERE hall_id=? ORDER BY id",Long.class,hall);standard=units.get(0);couple=units.get(1);
    }
    long user(String role){return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES(?,'isolated-fixture-hash','QA POS','+84900001030',?,'ACTIVE') RETURNING id",Long.class,UUID.randomUUID()+"@example.test",role);}
    long staff() {
        return new org.springframework.transaction.support.TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(jdbc.getDataSource())).execute(tx->{
            long actor=jdbc.queryForObject("SELECT staff_create_account(?,?,?,?)",Long.class,admin,UUID.randomUUID()+"@example.test","QA POS STAFF","+84900001030");
            String digest=UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
            jdbc.queryForObject("SELECT staff_issue_invitation(?,?,?,'isolated',?,?)",Long.class,admin,actor,digest,new byte[12],new byte[59]);
            jdbc.queryForObject("SELECT staff_set_password(?,?)",Object.class,digest,new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(UUID.randomUUID().toString()));
            jdbc.queryForObject("SELECT staff_set_status(?,?,'ACTIVE')",Object.class,admin,actor);return actor;
        });
    }
    BookingResponse book(long... seats){var holds=pos.acquire(staff,cinema,showtime,Arrays.stream(seats).boxed().toList()).holds();return pos.create(staff,cinema,showtime,holds.stream().map(h->Long.parseLong(h.id())).toList());}
    StaffPosResponse.Receipt initiated(long booking){return pos.initiate(staff,cinema,booking);}
    long payment(StaffPosResponse.Receipt receipt){return Long.parseLong(receipt.payments().getLast().id());}
    RequestPostProcessor role(String role,long id){return jwt().jwt(j->j.subject(Long.toString(id))).authorities(new SimpleGrantedAuthority("ROLE_"+role));}
    long count(String table,long booking){return jdbc.queryForObject("SELECT count(*) FROM "+table+" WHERE "+(table.equals("tickets")?"booking_seat_id IN (SELECT id FROM booking_seats WHERE booking_id=?)":"booking_id=?"),Long.class,booking);}
    @Test void cashSaleUsesOneTicketPerSeatUnitAndAuditedExactAmount() {
        var b=book(standard,couple);long id=Long.parseLong(b.id());
        assertThat(jdbc.queryForObject("SELECT customer_id IS NULL AND selling_staff_id=? FROM bookings WHERE id=?",Boolean.class,staff,id)).isTrue();
        var attempt=initiated(id);long p=payment(attempt);var receipt=pos.cash(staff,cinema,id,p,new BigDecimal(b.finalAmount()));
        assertThat(receipt.booking().status()).isEqualTo("PAID");assertThat(receipt.booking().finalAmount()).isEqualTo("20000.0000");
        assertThat(receipt.bookingQr()).isNotBlank();assertThat(receipt.tickets()).hasSize(2);
        assertThat(receipt.tickets().stream().mapToInt(StaffBookingResponse.Ticket::guestCount).sum()).isEqualTo(3);
        assertThat(receipt.payments().getFirst().method()).isEqualTo("CASH");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_records WHERE action='CASH_RECEIVED' AND actor_user_id=? AND resource_id=? AND metadata->>'amount'='20000.0000'",Integer.class,staff,p)).isEqualTo(1);
    }
    @Test void bookingAndInitiationNeverIssueEntitlements() {
        long id=Long.parseLong(book(couple).id());var before=pos.receipt(staff,cinema,id);assertThat(before.tickets()).isEmpty();assertThat(before.bookingQr()).isNull();
        var attempt=initiated(id);assertThat(attempt.booking().status()).isEqualTo("PENDING");assertThat(attempt.tickets()).isEmpty();assertThat(attempt.bookingQr()).isNull();
        assertThat(count("tickets",id)).isZero();assertThat(count("payment_transactions",id)).isEqualTo(1);
    }
    @Test void duplicateBookingInitiationAndCashConfirmationAreIdempotent() {
        var holds=pos.acquire(staff,cinema,showtime,List.of(couple)).holds().stream().map(h->Long.parseLong(h.id())).toList();
        var first=pos.create(staff,cinema,showtime,holds);assertThat(pos.create(staff,cinema,showtime,holds).id()).isEqualTo(first.id());
        long id=Long.parseLong(first.id());long p=payment(initiated(id));assertThat(payment(initiated(id))).isEqualTo(p);
        var paid=pos.cash(staff,cinema,id,p,new BigDecimal(first.finalAmount()));var again=pos.cash(staff,cinema,id,p,new BigDecimal(first.finalAmount()));
        assertThat(again.bookingQr()).isEqualTo(paid.bookingQr());assertThat(again.tickets()).hasSize(1);assertThat(count("payment_transactions",id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_records WHERE resource_type='PAYMENT' AND resource_id=? AND action='CASH_RECEIVED'",Integer.class,p)).isEqualTo(1);
    }
    @Test void forgedAmountAndForeignPaymentCannotConfirm() {
        long id=Long.parseLong(book(standard).id());long p=payment(initiated(id));
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("1"))).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p+999,new BigDecimal("10000"))).isInstanceOf(RuntimeException.class);
        assertThat(count("tickets",id)).isZero();assertThat(pos.receipt(staff,cinema,id).booking().status()).isEqualTo("PENDING");
    }
    @Test void wrongRoleBlockedUnassignedAndFutureAssignmentCannotReadOrWrite() {
        for(long actor:List.of(admin,customer))assertThatThrownBy(()->pos.movies(actor,cinema)).isInstanceOf(StaffFailure.class);
        assertThatThrownBy(()->pos.movies(staff,foreignCinema)).isInstanceOf(StaffFailure.class);
        jdbc.queryForObject("SELECT staff_set_status(?,?,'BLOCKED')",Object.class,admin,staff);assertThatThrownBy(()->pos.acquire(staff,cinema,showtime,List.of(standard))).isInstanceOf(StaffFailure.class);
        long future=staff();jdbc.queryForObject("SELECT staff_assign_cinema(?,?,?,clock_timestamp()+interval '1 day',NULL,'ACTIVE')",Long.class,admin,future,cinema);
        assertThatThrownBy(()->pos.movies(future,cinema)).isInstanceOf(StaffFailure.class);
    }
    @Test void revokedAssignmentAndOtherStaffCannotTakeOverSale() {
        long id=Long.parseLong(book(standard).id());long p=payment(initiated(id));
        assertThatThrownBy(()->pos.receipt(other,cinema,id)).isInstanceOf(StaffFailure.class);
        jdbc.queryForObject("SELECT staff_assign_cinema(?,?,NULL,NULL,?,'INACTIVE')",Long.class,admin,staff,assignment);
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("10000"))).isInstanceOf(StaffFailure.class);assertThat(count("tickets",id)).isZero();
    }
    @Test void releaseCancelAndUnavailableSeatPreserveLifecycle() {
        var h=pos.acquire(staff,cinema,showtime,List.of(standard)).holds().getFirst();pos.release(staff,cinema,showtime,Long.parseLong(h.id()));
        assertThatThrownBy(()->pos.create(staff,cinema,showtime,List.of(Long.parseLong(h.id())))).isInstanceOf(RuntimeException.class);
        long id=Long.parseLong(book(standard).id());pos.cancel(staff,cinema,id);assertThat(pos.receipt(staff,cinema,id).booking().status()).isEqualTo("CANCELLED");assertThat(count("tickets",id)).isZero();
    }
    @Test void concurrentSeatBuyersHaveExactlyOneWinner()throws Exception {
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()) {
            var start=new CountDownLatch(1);var futures=new ArrayList<Future<Boolean>>();
            for(long actor:List.of(staff,other))futures.add(pool.submit(()->{start.await();try{pos.acquire(actor,cinema,showtime,List.of(standard));return true;}catch(RuntimeException failure){return false;}}));
            start.countDown();int won=0;for(var f:futures)if(f.get(10,TimeUnit.SECONDS))won++;assertThat(won).isEqualTo(1);
        }
    }
    @Test void parallelCashRetriesIssueExactlyOnce()throws Exception {
        long id=Long.parseLong(book(couple).id());long p=payment(initiated(id));
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()) {
            var start=new CountDownLatch(1);var results=new ArrayList<Future<String>>();for(int n=0;n<2;n++)results.add(pool.submit(()->{start.await();return pos.cash(staff,cinema,id,p,new BigDecimal("10000")).bookingQr();}));
            start.countDown();assertThat(results.get(0).get(10,TimeUnit.SECONDS)).isEqualTo(results.get(1).get(10,TimeUnit.SECONDS));
        }
        assertThat(count("tickets",id)).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_evidence WHERE payment_id=?",Integer.class,p)).isEqualTo(1);
    }
    @Test void customerPathStillUsesCustomerOwnershipAndCannotBuySameUnit() {
        var h=customerSeats.acquire(showtime,customer,List.of(standard)).holds().getFirst();var b=customerBookings.create(customer,new BookingRequest(showtime,List.of(Long.parseLong(h.id()))));
        assertThat(customerBookings.detail(Long.parseLong(b.id()),customer).finalAmount()).isEqualTo("10000.0000");
        assertThatThrownBy(()->pos.acquire(staff,cinema,showtime,List.of(standard))).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->pos.receipt(staff,cinema,Long.parseLong(b.id()))).isInstanceOf(StaffFailure.class);
    }
    @Test void actualHttpSecurityAndStrictMutationValidation()throws Exception {
        mvc.perform(get(API+"/movies?cinemaId="+cinema)).andExpect(status().isUnauthorized());
        for(String role:List.of("ADMIN","MANAGER","CUSTOMER"))mvc.perform(get(API+"/movies?cinemaId="+cinema).with(role(role,staff))).andExpect(status().isForbidden());
        mvc.perform(get(API+"/movies?cinemaId="+cinema).with(role("STAFF",staff))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        for(String body:List.of("{\"cinemaId\":\"1\",\"expectedAmount\":10000}","{\"cinemaId\":\"1\",\"expectedAmount\":\"10000\",\"status\":\"SUCCESS\"}","{\"cinemaId\":\"1\",\"expectedAmount\":\"-1\"}"))
            mvc.perform(post(API+"/bookings/1/payment-transactions/1/cash-confirmations").with(role("STAFF",staff)).contentType("application/json").content(body)).andExpect(status().isBadRequest());
    }
    com.smartcinema.payment.VnpayService sandboxFixture() {
        var env=new org.springframework.mock.env.MockEnvironment().withProperty("vnpay.enabled","true")
            .withProperty("vnpay.merchant-code","TEST0001").withProperty("vnpay.hash-secret","isolated-provider-fixture-secret")
            .withProperty("vnpay.return-url","https://example.test/return").withProperty("vnpay.frontend-result-url","https://example.test/result")
            .withProperty("vnpay.minimum-window-seconds","1").withProperty("vnpay.minimum-amount","1").withProperty("vnpay.maximum-amount","100000000")
            .withProperty("vnpay.order-type","other").withProperty("vnpay.cancelled-pairs","IPN:24:02")
            .withProperty("vnpay.system-db-url",URL).withProperty("vnpay.system-db-username",operator.getProperty("user"))
            .withProperty("vnpay.system-db-password",operator.getProperty("password"));
        for(String key:List.of("signature","amount-window","ipn","success","terminal"))env.withProperty("vnpay."+key+"-confirmed","true");
        var settings=new com.smartcinema.payment.VnpaySettings(env);
        return new com.smartcinema.payment.VnpayService(settings,vnpayRepository,new com.smartcinema.payment.VnpaySystemRepository(settings));
    }
    org.springframework.util.LinkedMultiValueMap<String,String> providerFixture(long payment,String code,String status) {
        var result=new org.springframework.util.LinkedMultiValueMap<String,String>();
        jdbc.query("SELECT merchant_reference,submitted_amount FROM payment_transactions WHERE id=?",(org.springframework.jdbc.core.RowCallbackHandler) r->{
            result.add("vnp_TmnCode","TEST0001");result.add("vnp_TxnRef",r.getString(1));result.add("vnp_Amount",r.getString(2));
        },payment);
        result.add("vnp_ResponseCode",code);result.add("vnp_TransactionStatus",status);result.add("vnp_TransactionNo",Long.toString(9000+payment));
        var fields=new TreeMap<String,String>();result.forEach((k,v)->fields.put(k,v.getFirst()));
        result.add("vnp_SecureHash",com.smartcinema.payment.VnpayProtocol.sign(com.smartcinema.payment.VnpayProtocol.canonical(fields),"isolated-provider-fixture-secret"));return result;
    }
    void submitFixture(com.smartcinema.payment.VnpayService service,long booking,long payment,long actor,boolean counter) {
        new org.springframework.transaction.support.TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(jdbc.getDataSource())).execute(tx->{
            var response=counter?service.submitCounter(booking,payment,actor,"127.0.0.1"):service.submit(booking,payment,actor,"127.0.0.1");
            assertThat(response.toString()).doesNotContain(operator.getProperty("password"));return null;
        });
    }
    @Test void isolatedSignedVnpayCounterSuccessAndDuplicateReuseSharedIssuance() {
        long id=Long.parseLong(book(couple).id());long p=payment(initiated(id));var provider=sandboxFixture();submitFixture(provider,id,p,staff,true);
        var signed=providerFixture(p,"00","00");assertThat(provider.ipn(signed)).isEqualTo("00");assertThat(provider.ipn(signed)).isEqualTo("02");
        var receipt=pos.receipt(staff,cinema,id);assertThat(receipt.booking().status()).isEqualTo("PAID");assertThat(receipt.tickets()).hasSize(1);assertThat(receipt.tickets().getFirst().guestCount()).isEqualTo(2);
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("10000"))).isInstanceOf(RuntimeException.class);
    }
    @Test void forgedProviderReturnAndUnresolvedVnpayCannotAuthorizeCashOrTickets() {
        long id=Long.parseLong(book(standard).id());long p=payment(initiated(id));var provider=sandboxFixture();submitFixture(provider,id,p,staff,true);
        var forged=providerFixture(p,"00","00");forged.set("vnp_Amount","1");assertThat(provider.ipn(forged)).isEqualTo("97");
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("10000"))).isInstanceOf(RuntimeException.class);
        assertThat(pos.receipt(staff,cinema,id).booking().status()).isEqualTo("PENDING");assertThat(count("tickets",id)).isZero();
    }
    @Test void verifiedNegativeAllowsExplicitReplacementAndPreservesFirstFreeze() {
        long id=Long.parseLong(book(standard).id());var first=initiated(id);long p=payment(first);var provider=sandboxFixture();submitFixture(provider,id,p,staff,true);
        assertThat(provider.ipn(providerFixture(p,"24","02"))).isEqualTo("00");assertThat(count("tickets",id)).isZero();
        var second=initiated(id);long replacement=payment(second);assertThat(replacement).isNotEqualTo(p);
        assertThat(second.booking().paymentStartedAt()).isEqualTo(first.booking().paymentStartedAt());
        assertThat(second.booking().expiresAt()).isEqualTo(first.booking().expiresAt());
        assertThatThrownBy(()->pos.promotion(staff,cinema,id,"ANY","APPLY")).isInstanceOf(RuntimeException.class);
        assertThat(pos.cash(staff,cinema,id,replacement,new BigDecimal("10000")).booking().status()).isEqualTo("PAID");
    }
    @Test void auditFailureRollsBackCashEvidenceFinancialStateAndIssuance() {
        long id=Long.parseLong(book(couple).id());long p=payment(initiated(id));
        jdbc.execute("CREATE FUNCTION qa_reject_cash() RETURNS trigger LANGUAGE plpgsql AS $b$ BEGIN IF NEW.action='CASH_RECEIVED' AND NEW.resource_id="+p+" THEN RAISE EXCEPTION 'isolated audit failure'; END IF; RETURN NEW; END $b$");
        jdbc.execute("CREATE TRIGGER qa_cash_failure BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION qa_reject_cash()");
        try {assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("10000"))).isInstanceOf(RuntimeException.class);}
        finally {jdbc.execute("DROP TRIGGER qa_cash_failure ON audit_records");jdbc.execute("DROP FUNCTION qa_reject_cash()");}
        var receipt=pos.receipt(staff,cinema,id);assertThat(receipt.booking().status()).isEqualTo("PENDING");assertThat(receipt.payments().getFirst().status()).isEqualTo("INITIATED");assertThat(receipt.bookingQr()).isNull();assertThat(count("tickets",id)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_evidence WHERE payment_id=?",Integer.class,p)).isZero();
    }
    @Test void expiredHoldCannotCreateBooking()throws Exception {
        long hold=jdbc.queryForObject("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '50 milliseconds')",Long.class,showtime,staff,standard);
        Thread.sleep(100);assertThatThrownBy(()->pos.create(staff,cinema,showtime,List.of(hold))).isInstanceOf(RuntimeException.class);
    }
    @Test void lateCashCannotExtendOriginalBookingDeadline()throws Exception {
        long hold=jdbc.queryForObject("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '1 second')",Long.class,showtime,staff,standard);
        var b=pos.create(staff,cinema,showtime,List.of(hold));long id=Long.parseLong(b.id());long p=payment(initiated(id));Thread.sleep(1100);
        assertThatThrownBy(()->pos.cash(staff,cinema,id,p,new BigDecimal("10000"))).isInstanceOf(RuntimeException.class);
        var receipt=pos.receipt(staff,cinema,id);assertThat(receipt.booking().status()).isEqualTo("EXPIRED");assertThat(receipt.booking().expiresAt()).isEqualTo(b.expiresAt());assertThat(count("tickets",id)).isZero();
    }
    @Test void protectedRuntimeCannotMutateFinancialTablesOrInvokeInternalFinalizer()throws Exception {
        try(var db=DriverManager.getConnection(URL,operator.getProperty("user"),operator.getProperty("password"))) {
            db.setAutoCommit(false);try(var s=db.createStatement()){s.execute("SET LOCAL ROLE smart_cinema_hold_runtime");}
            for(String privilege:List.of("INSERT","UPDATE","DELETE"))
                try(var s=db.prepareStatement("SELECT has_table_privilege(current_user,'payment_transactions',?),has_table_privilege(current_user,'tickets',?)")){s.setString(1,privilege);s.setString(2,privilege);try(var r=s.executeQuery()){r.next();assertThat(r.getBoolean(1)).isFalse();assertThat(r.getBoolean(2)).isFalse();}}
            try(var s=db.createStatement();var r=s.executeQuery("SELECT has_function_privilege(current_user,'finalize_sale(bigint,bigint,bigint,bigint)','EXECUTE')")){r.next();assertThat(r.getBoolean(1)).isFalse();}
            db.rollback();
        }
    }
    @Test void realHttpCashCommandUsesExactStringsAndSafeRecoverableReceipt()throws Exception {
        long id=Long.parseLong(book(couple).id());long p=payment(initiated(id));String uri=API+"/bookings/"+id+"/payment-transactions/"+p+"/cash-confirmations";
        String json="{\"cinemaId\":\""+cinema+"\",\"expectedAmount\":\"10000.0000\"}";
        mvc.perform(post(uri).with(role("STAFF",staff)).contentType("application/json").content(json))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.booking.status").value("PAID"))
            .andExpect(jsonPath("$.booking.finalAmount").value("10000.0000")).andExpect(jsonPath("$.payments[0].method").value("CASH"))
            .andExpect(jsonPath("$.tickets[0].guestCount").value(2));
        mvc.perform(get(API+"/bookings/"+id+"?cinemaId="+cinema).with(role("STAFF",staff))).andExpect(status().isOk()).andExpect(jsonPath("$.tickets.length()").value(1));
    }
    @Test void cashTotalsAreSeparateFromUnchangedVnpayMetricsAndManagerScoped() {
        long id=Long.parseLong(book(couple).id());long p=payment(initiated(id));pos.cash(staff,cinema,id,p,new BigDecimal("10000"));
        long manager=user("MANAGER");jdbc.queryForObject("SELECT admin_assign_manager(?,?,?,clock_timestamp()-interval '1 second',NULL,'ACTIVE')",Long.class,admin,manager,cinema);
        var today=jdbc.queryForObject("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date",java.time.LocalDate.class);
        var q=new com.smartcinema.admin.AdminReportQuery(today,today.plusDays(1),cinema,null,null,null,0,20);
        var a=adminReports.summary(admin,q);var m=managerReports.summary(manager,q);
        assertThat(a.metrics().confirmedRevenue()).isEqualTo("0.0000");assertThat(a.period().paymentEnvironment()).isEqualTo("SANDBOX");
        assertThat(a.cashTotals().confirmedRevenue()).isEqualTo("10000.0000");assertThat(a.cashTotals().confirmedBookings()).isEqualTo("1");
        assertThat(a.cashTotals().ticketsSold()).isEqualTo("1");assertThat(a.cashTotals().guestsSold()).isEqualTo("2");assertThat(m.cashTotals()).isEqualTo(a.cashTotals());
        var other=new com.smartcinema.admin.AdminReportQuery(today,today.plusDays(1),foreignCinema,null,null,null,0,20);
        assertThat(adminReports.summary(admin,other).cashTotals().confirmedRevenue()).isEqualTo("0.0000");assertThatThrownBy(()->managerReports.summary(manager,other)).isInstanceOf(com.smartcinema.manager.ManagerFailure.class);
    }
    @Test void decimalPricesAndPromotionUseSharedPricingAndFreezeRules() {
        long movie=jdbc.queryForObject("SELECT movie_id FROM showtimes WHERE id=?",Long.class,showtime);
        jdbc.queryForObject("SELECT configure_showtime(?,?,?,?,(SELECT start_time FROM showtimes WHERE id=?),12345.6789,'OPEN_FOR_BOOKING')",Long.class,admin,showtime,movie,hall,showtime);
        String code="QA-"+UUID.randomUUID().toString().toUpperCase();
        jdbc.queryForObject("SELECT admin_configure_promotion(?,NULL,'CREATE',?,'FIXED_AMOUNT',0.1234,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',0,1,'ACTIVE',NULL)",Long.class,admin,code);
        long id=Long.parseLong(book(standard).id());var quoted=pos.promotion(staff,cinema,id,code,"APPLY");
        assertThat(quoted.seatAmount()).isEqualTo("12345.6789");assertThat(quoted.discount()).isEqualTo("0.1234");assertThat(quoted.finalAmount()).isEqualTo("12345.5555");
        var frozen=initiated(id);assertThatThrownBy(()->pos.promotion(staff,cinema,id,null,"REMOVE")).isInstanceOf(RuntimeException.class);
        var receipt=pos.cash(staff,cinema,id,payment(frozen),new BigDecimal("12345.5555"));assertThat(receipt.booking().finalAmount()).isEqualTo("12345.5555");
    }
    @Test void foreignShowtimeCannotLeakSeatMapOrAcquireHolds() {
        assertThatThrownBy(()->pos.map(staff,cinema,Long.MAX_VALUE)).isInstanceOf(StaffFailure.class);
        assertThatThrownBy(()->pos.map(staff,foreignCinema,showtime)).isInstanceOf(StaffFailure.class);
        assertThatThrownBy(()->pos.acquire(staff,foreignCinema,showtime,List.of(couple))).isInstanceOf(StaffFailure.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM seat_holds WHERE showtime_id=?",Integer.class,showtime)).isZero();
    }
    @Test void unchangedCustomerVnpayFlowStillIssuesCustomerOwnedTicket() {
        var hold=customerSeats.acquire(showtime,customer,List.of(standard)).holds().getFirst();var b=customerBookings.create(customer,new BookingRequest(showtime,List.of(Long.parseLong(hold.id()))));
        long id=Long.parseLong(b.id());long p=Long.parseLong(customerPayments.initiate(id,customer).id());var provider=sandboxFixture();submitFixture(provider,id,p,customer,false);
        assertThat(provider.ipn(providerFixture(p,"00","00"))).isEqualTo("00");assertThat(customerBookings.detail(id,customer).status()).isEqualTo("PAID");assertThat(count("tickets",id)).isEqualTo(1);
        assertThatThrownBy(()->pos.receipt(staff,cinema,id)).isInstanceOf(StaffFailure.class);
    }
}
