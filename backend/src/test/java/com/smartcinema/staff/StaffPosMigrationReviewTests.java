package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import com.smartcinema.admin.*;
import com.smartcinema.manager.ManagerReportRepository;

/** Review only. Populated V18 -> exact V19, fixed local database; no PRIMARY writes. */
@EnabledIfEnvironmentVariable(named="STAFF_POS_MIGRATION_REVIEW_TESTS",matches="true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StaffPosMigrationReviewTests {
    static final Path DIR=Path.of("target/staff-pos-v19-deployment-2026-10-30");
    static final Path PROPOSAL=Path.of("src/main/resources/db/migration/V19__enable_staff_counter_sales.sql");
    static final String ROOT="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test";
    final String schema="staff_pos_review_"+UUID.randomUUID().toString().replace("-","");
    Properties operator;
    String url,sql;
    JdbcTemplate jdbc;
    StaffPosPostgresTests fixture;
    Map<String,String> originalPublic,legacyRows,legacyDefinitions,legacySequences;
    AdminReportResponse.Metrics adminBefore,managerBefore;
    long pending,initiated,bound,negative,paid,cancelled,expired,checkedIn,reconciled;
    long manager;
    int oldFilenode;
    AdminReportQuery reportQuery;
    final List<String> evidence=new ArrayList<>();
    Connection connect()throws Exception {return DriverManager.getConnection(url,operator.getProperty("user"),operator.getProperty("password"));}
    String value(String query,Object... args){return jdbc.queryForObject(query,String.class,args);}
    long number(String query,Object... args){return jdbc.queryForObject(query,Long.class,args);}
    void command(String query,Object... args){jdbc.queryForObject(query,Object.class,args);}
    Flyway flyway(int target,String extra) {
        var config=Flyway.configure().dataSource(ROOT,operator.getProperty("user"),operator.getProperty("password"))
            .defaultSchema(schema).schemas(schema).cleanDisabled(true).connectRetries(0).target(Integer.toString(target));
        return config.locations(extra==null?new String[]{"filesystem:src/main/resources/db/migration"}
            :new String[]{"filesystem:src/main/resources/db/migration",extra}).load();
    }
    Map<String,String> rows() {
        var result=new TreeMap<String,String>();
        for(String table:jdbc.queryForList("SELECT tablename FROM pg_tables WHERE schemaname=? AND tablename<>'flyway_schema_history' ORDER BY tablename",String.class,schema)) {
            String projection=table.equals("bookings")?"to_jsonb(r)-'owner_id'-'selling_staff_id'":"to_jsonb(r)";
            result.put(table,value("SELECT count(*)||':'||md5(coalesce(string_agg(md5(("+projection+")::text),'' ORDER BY md5(("+projection+")::text)),'')) FROM \""+table+"\" r"));
        }
        return result;
    }
    Map<String,String> definitions() {
        var result=new TreeMap<String,String>();
        jdbc.query("SELECT p.proname,pg_get_functiondef(p.oid),pg_get_userbyid(p.proowner),coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=? AND p.prokind='f' ORDER BY p.proname",(org.springframework.jdbc.core.RowCallbackHandler) r->result.put(r.getString(1),r.getString(2)+"|"+r.getString(3)+"|"+r.getString(4)),schema);
        return result;
    }
    Map<String,String> sequences() {
        var result=new TreeMap<String,String>();
        jdbc.query("SELECT sequencename,last_value FROM pg_sequences WHERE schemaname=? ORDER BY sequencename",(org.springframework.jdbc.core.RowCallbackHandler) r->result.put(r.getString(1),r.getString(2)),schema);
        return result;
    }
    long booking() {
        fixture.fixture();
        return number("SELECT create_booking(?,?,ARRAY[(SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '10 minutes'))]::bigint[])",
            fixture.showtime,fixture.customer,fixture.showtime,fixture.customer,fixture.couple);
    }
    long attempt(long booking){return number("SELECT initiate_payment(?,(SELECT customer_id FROM bookings WHERE id=?))",booking,booking);}
    void bind(long payment) {command("SELECT bind_vnpay_submission(?,(SELECT b.customer_id FROM bookings b JOIN payment_transactions p ON p.booking_id=b.id WHERE p.id=?),'TEST0001','https://example.test/return','127.0.0.1','other')",payment,payment);}
    String observe(long payment,String result) {
        return value("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,?,'IPN',?,?, '00','00') FROM payment_transactions WHERE id=?",
            "9"+payment,UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-",""),result,payment);
    }
    long paidBooking(){long id=booking();long p=attempt(id);bind(p);assertThat(observe(p,"SUCCESS")).isEqualTo("00");return id;}
    long checkedInBooking() {
        fixture.fixture();long movie=number("SELECT movie_id FROM showtimes WHERE id=?",fixture.showtime);
        command("SELECT configure_showtime(?,?,?,?,clock_timestamp()+interval '20 minutes',10000,'OPEN_FOR_BOOKING')",fixture.admin,fixture.showtime,movie,fixture.hall);
        long id=number("SELECT create_booking(?,?,ARRAY[(SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '10 minutes'))]::bigint[])",fixture.showtime,fixture.customer,fixture.showtime,fixture.customer,fixture.couple);
        long p=attempt(id);bind(p);assertThat(observe(p,"SUCCESS")).isEqualTo("00");
        long ticket=number("SELECT t.id FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",id);
        assertThat(number("SELECT count(*) FROM check_in_tickets(?,?,?,ARRAY[?]::bigint[])",fixture.staff,id,fixture.cinema,ticket)).isEqualTo(1);return id;
    }
    @BeforeAll void preparePopulatedV18()throws Exception {
        operator=new Properties();try(var r=Files.newBufferedReader(Path.of(".env.local-test-migration"))){operator.load(r);}
        assertThat(operator.getProperty("url")).startsWith(ROOT+"?");assertThat(operator.getProperty("user")).isEqualTo("postgres");
        try(var db=DriverManager.getConnection(ROOT,operator.getProperty("user"),operator.getProperty("password"))) {
            db.setReadOnly(true);db.setAutoCommit(false);assertThat(StaffPosPostgresTests.snapshot(db)).isNotEmpty();
            try(var s=db.createStatement();var r=s.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port()")){r.next();assertThat(r.getString(1)).isEqualTo("smartcinema_phase4e_test");assertThat(r.getString(2)).isEqualTo("127.0.0.1");assertThat(r.getInt(3)).isEqualTo(5432);}
            originalPublic=StaffPosPostgresTests.snapshot(db);
            for(String role:List.of("smart_cinema_hold_owner","smart_cinema_hold_runtime","smart_cinema_configuration_owner","smart_cinema_staff_owner","smart_cinema_checkin_owner","smart_cinema_payment_system"))
                try(var s=db.prepareStatement("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=?)")){s.setString(1,role);try(var r=s.executeQuery()){r.next();assertThat(r.getBoolean(1)).as("Existing local foundation role required").isTrue();}}
            try(var s=db.createStatement();var r=s.executeQuery("SELECT count(*) FROM pg_auth_members m JOIN pg_roles role ON role.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE member.rolname='postgres' AND role.rolname IN ('smart_cinema_configuration_owner','smart_cinema_staff_owner','smart_cinema_checkin_owner')")) {
                r.next();assertThat(r.getInt(1)).as("Historical setup must not overwrite original operator memberships").isZero();
            }
        }
        Files.createDirectories(DIR);sql=Files.readString(PROPOSAL);
        flyway(18,null).migrate();url=ROOT+"?currentSchema="+schema+"&sslmode=disable";
        jdbc=new JdbcTemplate(new DriverManagerDataSource(url,operator.getProperty("user"),operator.getProperty("password")));
        fixture=new StaffPosPostgresTests();fixture.jdbc=jdbc;
        pending=booking();initiated=booking();
        long item=number("SELECT admin_configure_concession_item(?,NULL,'CREATE','QA V18 Drink',NULL,'DRINK',5000,'ACTIVE')",fixture.admin);
        command("SELECT edit_booking_concession(?,?,NULL,?,1,'ADD')",initiated,fixture.customer,item);
        String code="QA-V18-"+UUID.randomUUID().toString().substring(0,8).toUpperCase();
        command("SELECT admin_configure_promotion(?,NULL,'CREATE',?,'FIXED_AMOUNT',1000,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',0,NULL,'ACTIVE',NULL)",fixture.admin,code);
        command("SELECT edit_booking_promotion(?,?,?,'APPLY')",initiated,fixture.customer,code);
        attempt(initiated);bound=booking();bind(attempt(bound));
        negative=booking();long failed=attempt(negative);bind(failed);assertThat(observe(failed,"FAILED")).isEqualTo("00");
        paid=paidBooking();cancelled=booking();command("SELECT cancel_booking(?,(SELECT customer_id FROM bookings WHERE id=?))",cancelled,cancelled);
        expired=booking(); // Exercise original expire transition using real TTL, no clock/status override.
        command("SELECT cancel_booking(?,(SELECT customer_id FROM bookings WHERE id=?))",expired,expired);
        fixture.fixture();
        long shortHold=number("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '500 milliseconds')",fixture.showtime,fixture.customer,fixture.couple);
        expired=number("SELECT create_booking(?,?,ARRAY[?]::bigint[])",fixture.showtime,fixture.customer,shortHold);
        Thread.sleep(600);command("SELECT expire_seat_holds(?)",fixture.showtime);
        checkedIn=checkedInBooking();
        reconciled=booking();long late=attempt(reconciled);bind(late);command("SELECT cancel_booking(?,(SELECT customer_id FROM bookings WHERE id=?))",reconciled,reconciled);observe(late,"SUCCESS");
        manager=fixture.user("MANAGER");command("SELECT admin_assign_manager(?,?,?,clock_timestamp()-interval '1 second',NULL,'ACTIVE')",fixture.admin,manager,fixture.cinema);
        LocalDate today=jdbc.queryForObject("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date",LocalDate.class);
        reportQuery=new AdminReportQuery(today,today.plusDays(1),null,null,null,null,0,20);
        adminBefore=new AdminReportRepository(jdbc).summary(reportQuery);
        managerBefore=new ManagerReportRepository(jdbc).summary(manager,reportQuery).metrics();
        oldFilenode=jdbc.queryForObject("SELECT relfilenode FROM pg_class WHERE oid='bookings'::regclass",Integer.class);
        legacyRows=rows();legacyDefinitions=definitions();legacySequences=sequences();
        evidence.add("Representative V18: PENDING/unbound/bound/FAILED/PAID/CANCELLED/EXPIRED/reconciliation; concession/promotion snapshots; CHECKED_IN Ticket; original domain rows captured before V19.");
        evidence.add("Pre-existing V18 bookings="+number("SELECT count(*) FROM bookings")+", attempts="+number("SELECT count(*) FROM payment_transactions")+", tickets="+number("SELECT count(*) FROM tickets")+", checkedIn="+number("SELECT count(*) FROM tickets WHERE status='CHECKED_IN'")+", frozen="+number("SELECT count(*) FROM bookings WHERE payment_started_at IS NOT NULL")+".");
    }
    @Test @Order(1) void primaryThirteenAffectedFunctionsMatchPristineV18Exactly()throws Exception {
        var primary=new Properties();try(var r=Files.newBufferedReader(DIR.resolve("primary-v18-functions.properties"))){primary.load(r);}
        assertThat(primary).hasSize(13);
        for(String name:primary.stringPropertyNames()) {
            String actual=value("SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=? AND p.proname=?",schema,name).replace(schema+".","app.");
            assertThat(actual).as("PRIMARY V18 definition "+name).isEqualTo(primary.getProperty(name));
        }
        @SuppressWarnings("unchecked") var metadata=(Map<String,Object>)tools.jackson.databind.json.JsonMapper.builder().build().readValue(Files.readString(DIR.resolve("primary-metadata.json")),Map.class);
        @SuppressWarnings("unchecked") var constraints=(List<Map<String,Object>>)metadata.get("constraints");
        for(var row:constraints) {
            String actual=value("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=? AND c.conname=? AND c.conrelid=CAST(? AS regclass)",schema,row.get("conname"),row.get("table_name"));
            assertThat(actual.replace(schema+".","app.")).isEqualTo(row.get("definition").toString().replace("public.","app."));
        }
        @SuppressWarnings("unchecked") var indexes=(List<Map<String,Object>>)metadata.get("indexes");
        for(var row:indexes)assertThat(value("SELECT indexdef FROM pg_indexes WHERE schemaname=? AND indexname=?",schema,row.get("indexname")).replace(schema+".","app.")).isEqualTo(row.get("indexdef").toString().replace("public.","app."));
        @SuppressWarnings("unchecked") var columns=(List<Map<String,Object>>)metadata.get("columns");
        for(var row:columns)assertThat(value("SELECT format_type(a.atttypid,a.atttypmod) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=? AND c.relname=? AND a.attname=?",schema,row.get("table_name"),row.get("column_name"))).isEqualTo(row.get("exact_type"));
        @SuppressWarnings("unchecked") var triggers=(List<Map<String,Object>>)metadata.get("triggers");
        for(var row:triggers)if(!row.get("tgname").toString().startsWith("RI_ConstraintTrigger_")) {
            assertThat(value("SELECT t.tgenabled::text FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=? AND c.relname=? AND t.tgname=?",schema,row.get("relname"),row.get("tgname"))).isEqualTo(row.get("tgenabled"));
        }
        evidence.add("13/13 PRIMARY function definitions plus "+constraints.size()+" constraints, "+indexes.size()+" indexes, "+columns.size()+" exact column types and protected trigger enable states match isolated V18.");
    }
    @Test @Order(2) void holdOwnerAloneLacksRequiredUsersReferencesAndFailureIsAtomic()throws Exception {
        try(var db=connect()) {
            db.setAutoCommit(false);try(var s=db.createStatement()){
                // PRIMARY already grants this owner CREATE. Match that condition
                // only in this disposable schema/transaction, then roll it back.
                s.execute("GRANT CREATE ON SCHEMA "+schema+" TO smart_cinema_hold_owner");
                s.execute("SET LOCAL ROLE smart_cinema_hold_owner");
                SQLException failure=catchThrowableOfType(()->s.execute(sql),SQLException.class);assertThat((Throwable)failure).isNotNull();assertThat(failure.getSQLState()).isEqualTo("42501");assertThat(failure.getMessage()).contains("users");}
            db.rollback();
        }
        assertThat(rows()).isEqualTo(legacyRows);assertThat(definitions()).isEqualTo(legacyDefinitions);
        evidence.add("Hold-owner-only installation fails SQLSTATE 42501 (users REFERENCES); transaction rollback preserves V18.");
    }
    @Test @Order(3) void lockTimeoutCannotPartiallyApplyProposal()throws Exception {
        try(var blocker=connect();var migrator=connect()) {
            blocker.setAutoCommit(false);migrator.setAutoCommit(false);
            try(var s=blocker.createStatement()){s.execute("LOCK TABLE bookings IN ACCESS SHARE MODE");}
            try(var s=migrator.createStatement()){s.execute("SET LOCAL lock_timeout='100ms'");SQLException error=catchThrowableOfType(()->s.execute(sql),SQLException.class);assertThat((Throwable)error).isNotNull();assertThat(error.getSQLState()).isEqualTo("55P03");}
            migrator.rollback();blocker.rollback();
        }
        assertThat(rows()).isEqualTo(legacyRows);assertThat(definitions()).isEqualTo(legacyDefinitions);
        evidence.add("Contended ACCESS EXCLUSIVE upgrade fails 55P03 under bounded lock timeout; original V18 preserved.");
    }
    @Test @Order(4) void finalStatementFailureRollsBackAllDdlGrantsAndFlywayHistory()throws Exception {
        Path folder=DIR.resolve("injected-failure");Files.createDirectories(folder);
        // One isolated migration location avoids shadowing the canonical V19
        // after promotion. Prove execution reaches the injected final statement.
        try(var files=Files.list(PROPOSAL.getParent())) {
            for(Path file:files.toList())if(!file.equals(PROPOSAL))
                Files.copy(file,folder.resolve(file.getFileName()),StandardCopyOption.REPLACE_EXISTING);
        }
        Files.writeString(folder.resolve(PROPOSAL.getFileName()),sql+"\nDO $review_failure$ BEGIN RAISE EXCEPTION 'isolated migration review failure'; END $review_failure$;\n");
        assertThatThrownBy(()->Flyway.configure().dataSource(ROOT,operator.getProperty("user"),operator.getProperty("password"))
            .defaultSchema(schema).schemas(schema).cleanDisabled(true).connectRetries(0).target("19")
            .locations("filesystem:"+folder).load().migrate()).isInstanceOf(RuntimeException.class)
            .hasStackTraceContaining("isolated migration review failure");
        assertThat(rows()).isEqualTo(legacyRows);assertThat(definitions()).isEqualTo(legacyDefinitions);
        assertThat(number("SELECT max(version::int) FROM flyway_schema_history")).isEqualTo(18);
        assertThat(number("SELECT count(*) FROM flyway_schema_history WHERE NOT success")).isZero();
        assertThat(number("SELECT count(*) FROM information_schema.columns WHERE table_schema=? AND table_name='bookings' AND column_name='owner_id'",schema)).isZero();
        assertThat(value("SELECT has_column_privilege('smart_cinema_hold_runtime','audit_records','metadata','SELECT')::text")).isEqualTo("false");
        evidence.add("Injected AFTER-final-GRANT failure: transactional Flyway rolled back all V19 DDL/functions/ACLs; history remains successful V18, failed=0.");
    }
    @Test @Order(5) void exactProposalPreservesEveryLegacyBusinessValueButRewritesHeap() {
        assertThat(flyway(19,"filesystem:src/test/resources/pos-migration").migrate().migrationsExecuted).isEqualTo(1);
        assertThat(rows()).isEqualTo(legacyRows);
        assertThat(sequences()).isEqualTo(legacySequences);
        assertThat(number("SELECT count(*) FROM bookings WHERE owner_id IS DISTINCT FROM customer_id OR selling_staff_id IS NOT NULL")).isZero();
        int after=jdbc.queryForObject("SELECT relfilenode FROM pg_class WHERE oid='bookings'::regclass",Integer.class);
        assertThat(after).isNotEqualTo(oldFilenode);
        assertThat(new AdminReportRepository(jdbc).summary(reportQuery)).isEqualTo(adminBefore);
        assertThat(new ManagerReportRepository(jdbc).summary(manager,reportQuery).metrics()).isEqualTo(managerBefore);
        assertThat(value("SELECT status FROM bookings WHERE id=?",paid)).isEqualTo("PAID");assertThat(value("SELECT status FROM bookings WHERE id=?",expired)).isEqualTo("EXPIRED");
        evidence.add("Exact V19 applies once; all pre-existing domain fields/rows unchanged, reports equal, owner_id=customer_id. Bookings relfilenode changed "+oldFilenode+" -> "+after+": PHYSICAL TABLE REWRITE CONFIRMED.");
    }
    @Test @Order(6) void flywayRerunSkipsAndRawSqlRerunFailsWithoutPartialChange()throws Exception {
        var beforeRows=rows();var beforeDefinitions=definitions();long rank=number("SELECT max(installed_rank) FROM flyway_schema_history");
        assertThat(flyway(19,"filesystem:src/test/resources/pos-migration").migrate().migrationsExecuted).isZero();
        try(var db=connect()){db.setAutoCommit(false);try(var s=db.createStatement()){
            SQLException error=catchThrowableOfType(()->s.execute(sql),SQLException.class);assertThat((Throwable)error).isNotNull();assertThat(error.getSQLState()).isEqualTo("42701");}db.rollback();}
        assertThat(rows()).isEqualTo(beforeRows);assertThat(definitions()).isEqualTo(beforeDefinitions);assertThat(number("SELECT max(installed_rank) FROM flyway_schema_history")).isEqualTo(rank);
        evidence.add("Flyway repeat executes 0; raw repeat fails 42701 duplicate column inside transaction; no partial update/history drift. Autocommit raw execution is prohibited.");
    }
    @Test @Order(7) void existingV18PendingVnpayAttemptsFinalizeAndPaidQrRemainsStable() {
        String originalQr=value("SELECT booking_qr_token FROM bookings WHERE id=?",paid);
        long p=number("SELECT id FROM payment_transactions WHERE booking_id=?",bound);assertThat(observe(p,"SUCCESS")).isEqualTo("00");
        assertThat(value("SELECT status FROM bookings WHERE id=?",bound)).isEqualTo("PAID");
        assertThat(value("SELECT booking_qr_token FROM bookings WHERE id=?",paid)).isEqualTo(originalQr);
        long i=number("SELECT id FROM payment_transactions WHERE booking_id=?",initiated);bind(i);assertThat(observe(i,"SUCCESS")).isEqualTo("00");
        long fresh=attempt(pending);bind(fresh);assertThat(observe(fresh,"SUCCESS")).isEqualTo("00");
        long replacement=attempt(negative);bind(replacement);assertThat(observe(replacement,"SUCCESS")).isEqualTo("00");
        assertThat(value("SELECT status FROM bookings WHERE id=?",reconciled)).isEqualTo("CANCELLED");
        assertThat(number("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id IN (?,?,?,?)",bound,initiated,pending,negative)).isEqualTo(4);
        evidence.add("Pre-V19 bound/unbound/unfrozen/FAILED Customer sales complete through original VNPAY command after upgrade; pre-existing paid QR and reconciliation remain unchanged.");
    }
    @Test @Order(8) void runtimeCashUsesProtectedLifecycleWithoutFinancialTableDml()throws Exception {
        fixture.fixture();
        try(var db=connect()) {
            db.setAutoCommit(false);try(var s=db.createStatement()){s.execute("SET LOCAL ROLE smart_cinema_hold_runtime");}
            var rt=new JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(db,true));
            long hold=rt.queryForObject("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '5 minutes')",Long.class,fixture.showtime,fixture.staff,fixture.couple);
            long b=rt.queryForObject("SELECT create_booking(?,?,ARRAY[?]::bigint[])",Long.class,fixture.showtime,fixture.staff,hold);
            long p=rt.queryForObject("SELECT initiate_payment(?,?)",Long.class,b,fixture.staff);
            rt.queryForObject("SELECT staff_confirm_cash(?,?,?,10000)",Long.class,b,p,fixture.staff);db.commit();
            assertThat(value("SELECT status FROM bookings WHERE id=?",b)).isEqualTo("PAID");
            assertThat(number("SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=?",b)).isEqualTo(1);
        }
        evidence.add("Existing restricted runtime role executes legitimate scoped CASH wrapper and shared one-Ticket/COUPLE issuance without direct table DML.");
    }
    @Test @Order(9) void privilegesAndPromotionCopiesHaveExplicitSafeBoundaries()throws Exception {
        for(String table:List.of("bookings","payment_transactions","payment_evidence","tickets","audit_records"))
            for(String permission:List.of("INSERT","UPDATE","DELETE"))assertThat(value("SELECT has_table_privilege('smart_cinema_hold_runtime',?,?)::text",table,permission)).isEqualTo("false");
        assertThat(value("SELECT has_function_privilege('smart_cinema_hold_runtime','finalize_sale(bigint,bigint,bigint,bigint)','EXECUTE')::text")).isEqualTo("false");
        assertThat(value("SELECT has_column_privilege('smart_cinema_hold_runtime','audit_records','metadata','SELECT')::text")).isEqualTo("false");
        assertThat(value("SELECT has_function_privilege('smart_cinema_hold_runtime','cash_payment_confirmed(bigint)','EXECUTE')::text")).isEqualTo("true");
        Path copy=DIR.resolve("promotion-copy");Files.createDirectories(copy);Files.copy(PROPOSAL,copy.resolve(PROPOSAL.getFileName()),StandardCopyOption.REPLACE_EXISTING);
        assertThat(Files.readAllBytes(copy.resolve(PROPOSAL.getFileName()))).isEqualTo(Files.readAllBytes(PROPOSAL));
        var duplicated=Flyway.configure().dataSource(ROOT,operator.getProperty("user"),operator.getProperty("password"))
            .defaultSchema(schema).schemas(schema).locations("filesystem:src/main/resources/db/migration","filesystem:src/test/resources/pos-migration","filesystem:"+copy).load();
        assertThat(Arrays.stream(duplicated.info().all()).filter(m->m.getVersion()!=null&&m.getVersion().toString().equals("19")).count()).isEqualTo(1);
        Files.writeString(copy.resolve(PROPOSAL.getFileName()),sql+"\nSELECT 1; -- deliberately divergent isolated copy\n");
        assertThatThrownBy(()->Flyway.configure().dataSource(ROOT,operator.getProperty("user"),operator.getProperty("password"))
            .defaultSchema(schema).schemas(schema).locations("filesystem:src/main/resources/db/migration","filesystem:src/test/resources/pos-migration","filesystem:"+copy).load().validate()).isInstanceOf(RuntimeException.class);
        evidence.add("Runtime financial DML/internal finalizer/audit metadata SELECT denied; protected CASH boolean proof callable. Byte-identical V19 locations deduplicated; divergent V19 copy fails validation. Promotion must leave one canonical artifact.");
    }
    @AfterAll void preserveExistingLocalDatabase()throws Exception {
        if(operator!=null&&originalPublic!=null)try(var db=DriverManager.getConnection(ROOT,operator.getProperty("user"),operator.getProperty("password"))){db.setReadOnly(true);db.setAutoCommit(false);assertThat(StaffPosPostgresTests.snapshot(db)).isEqualTo(originalPublic);}
        Files.createDirectories(DIR);Files.writeString(DIR.resolve("review-evidence.txt"),"ISOLATED LOOPBACK SCHEMA="+schema+"\n"+String.join("\n",evidence)+"\nExisting local public data/history/global roles/memberships unchanged.\n");
    }
}
