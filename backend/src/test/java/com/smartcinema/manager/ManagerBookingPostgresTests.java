package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.lang.reflect.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.util.LinkedMultiValueMap;

/** READ ONLY PostgreSQL engine tests. WITH/VALUES shadows all relations: no persisted
 * fixture, account, financial result or authenticated real-MANAGER proof. */
@EnabledIfEnvironmentVariable(named="MANAGER_BOOKING_READ_TESTS",matches="true")
class ManagerBookingPostgresTests {
    static final Instant NOW=Instant.parse("2026-10-29T00:00:00Z");
    static Properties config;
    static Map<String,String> baseline;
    Connection db;
    String fixtures=FIXTURES;
    static final String FIXTURES="""
      users(id,role,status) AS (VALUES (7::bigint,'MANAGER','ACTIVE'),(8,'MANAGER','ACTIVE'),(9,'MANAGER','BLOCKED'),(10,'MANAGER','ACTIVE'),(11,'MANAGER','ACTIVE'),(12,'STAFF','ACTIVE')),
      cinema_assignments(user_id,cinema_id,assignment_type,status,effective_at) AS (VALUES
        (7::bigint,1::bigint,'MANAGER','ACTIVE','2020-01-01Z'::timestamptz),
        (8,2,'MANAGER','ACTIVE','2020-01-01Z'::timestamptz),(9,1,'MANAGER','ACTIVE','2020-01-01Z'::timestamptz),
        (10,1,'MANAGER','INACTIVE','2020-01-01Z'::timestamptz),(11,1,'MANAGER','ACTIVE','2100-01-01Z'::timestamptz),(12,1,'MANAGER','ACTIVE','2020-01-01Z'::timestamptz)),
      cinemas(id,name,address,contact,operating_information,status) AS (VALUES (1::bigint,'Fixture Cinema A','A',NULL::text,NULL::text,'ACTIVE'),(2,'Fixture Cinema B','B',NULL,NULL,'ACTIVE')),
      halls(id,cinema_id,name) AS (VALUES (1::bigint,1::bigint,'Hall A'),(2,2,'Hall B')),
      movies(id,title) AS (VALUES(1::bigint,'Movie')),
      showtimes(id,hall_id,movie_id,start_time) AS (VALUES(1::bigint,1::bigint,1::bigint,'2027-01-01Z'::timestamptz),(2,2,1,'2027-01-01Z'::timestamptz)),
      bookings(id,booking_code,showtime_id,status,created_at,expires_at,payment_started_at,paid_at,seat_amount,concession_amount,subtotal,discount,final_amount) AS (VALUES
        (9007199254740993::bigint,'QA-ONE',1::bigint,'PENDING','2026-10-28Z'::timestamptz,'2027-01-01Z'::timestamptz,'2026-10-28Z'::timestamptz,NULL::timestamptz,100.1234::numeric(19,4),20.0000::numeric(19,4),120.1234::numeric(19,4),10.0000::numeric(19,4),110.1234::numeric(19,4)),
        (9007199254740994,'QA-TWO',1,'PENDING','2026-10-28Z','2026-10-28T01:00Z',NULL,NULL,10,0,10,0,10),
        (9007199254740995,'QA-FOREIGN',2,'PAID','2026-10-28Z','2027-01-01Z','2026-10-28Z','2026-10-28Z',10,0,10,0,10)),
      seats(id,row,number) AS(VALUES(1::bigint,'A','1-2'),(2,'B','1')),
      booking_seats(id,booking_id,seat_id,seat_type_snapshot,unit_price_snapshot,final_price) AS(VALUES
        (1::bigint,9007199254740993::bigint,1::bigint,'COUPLE',100.1234::numeric(19,4),100.1234::numeric(19,4)),(2,9007199254740995,2,'STANDARD',10,10)),
      booking_concessions(id,booking_id,concession_item_id,item_name_snapshot,category_snapshot,quantity,unit_price_snapshot,total_price) AS(VALUES(1::bigint,9007199254740993::bigint,1::bigint,'Frozen popcorn','POPCORN',2,10.0000::numeric(19,4),20.0000::numeric(19,4))),
      payment_transactions(id,booking_id,status,amount,currency,provider,initiated_at,completed_at,reconciliation_required) AS(VALUES
        (1::bigint,9007199254740993::bigint,'FAILED',110.1234::numeric(19,4),'VND','VNPAY','2026-10-28T00:01Z'::timestamptz,'2026-10-28T00:02Z'::timestamptz,false),
        (2,9007199254740993,'PENDING',110.1234,'VND','VNPAY','2026-10-28T00:03Z',NULL,true),
        (3,9007199254740995,'SUCCESS',10,'VND','VNPAY','2026-10-28T00:01Z','2026-10-28T00:02Z',false)),
      tickets(id,booking_seat_id,status,issued_at,checked_in_at) AS(VALUES(1::bigint,2::bigint,'CHECKED_IN','2026-10-28T00:02Z'::timestamptz,'2026-10-28T00:03Z'::timestamptz))
      """;
    @BeforeAll static void before()throws Exception{
        config=new Properties();try(var reader=Files.newBufferedReader(Path.of(".env"),StandardCharsets.UTF_8)){config.load(reader);}
        for(String key:List.of("DB_URL","DB_USERNAME","DB_PASSWORD"))if(System.getenv(key)!=null)config.setProperty(key,System.getenv(key));
        var uri=new URI(config.getProperty("DB_URL").substring(5));assertThat(uri.getHost()).endsWith(".neon.tech");assertThat(uri.getQuery()).contains("sslmode=require");
        try(var db=open()){assertThat(value(db,"SHOW transaction_read_only")).isEqualTo("on");assertThat(value(db,"SELECT current_database()")).isEqualTo(uri.getPath().substring(1));baseline=snapshot(db);}
    }
    static Connection open()throws Exception{var p=new Properties();p.setProperty("user",config.getProperty("DB_USERNAME"));p.setProperty("password",config.getProperty("DB_PASSWORD"));p.setProperty("readOnly","true");p.setProperty("readOnlyMode","always");p.setProperty("connectTimeout","10");p.setProperty("socketTimeout","30");var db=DriverManager.getConnection(config.getProperty("DB_URL"),p);db.setReadOnly(true);db.setAutoCommit(false);try(var s=db.createStatement()){s.execute("SET LOCAL statement_timeout='5s'");}return db;}
    @BeforeEach void connect()throws Exception{db=open();}
    @AfterEach void close()throws Exception{db.rollback();db.close();}
    static String value(Connection db,String sql)throws Exception{try(var s=db.createStatement();var r=s.executeQuery(sql)){r.next();return r.getString(1);}}
    static Map<String,String> snapshot(Connection db)throws Exception{
        var map=new TreeMap<String,String>();
        for(String table:List.of("users","cinema_assignments","bookings","booking_seats","booking_concessions","payment_transactions","tickets","audit_records","flyway_schema_history"))map.put(table,value(db,"SELECT count(*)||':'||md5(coalesce(string_agg(md5(r::text),'' ORDER BY md5(r::text)),'')) FROM "+table+" r"));
        map.put("functions",value(db,"SELECT md5(string_agg(pg_get_functiondef(p.oid),'' ORDER BY p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'"));return map;
    }
    @AfterAll static void unchanged()throws Exception{try(var db=open()){assertThat(snapshot(db)).isEqualTo(baseline);}Files.createDirectories(Path.of("target/manager-booking-2026-10-29"));Files.writeString(Path.of("target/manager-booking-2026-10-29/readonly-sql-preservation.txt"),"PASS: PostgreSQL READ ONLY; WITH/VALUES fixtures only; real data/history/functions unchanged.\n");}
    JdbcTemplate fixtureJdbc(){
        var proxy=(Connection)Proxy.newProxyInstance(getClass().getClassLoader(),new Class<?>[]{Connection.class},(object,method,args)->{
            if(method.getName().equals("prepareStatement")&&args[0] instanceof String sql){if(!sql.stripLeading().startsWith("SELECT"))throw new AssertionError("Read-only fixture query required");args[0]="WITH "+fixtures+" "+sql;}
            try{return method.invoke(db,args);}catch(InvocationTargetException failure){throw failure.getCause();}
        });return new JdbcTemplate(new SingleConnectionDataSource(proxy,true));
    }
    ManagerBookingRepository repository(){return new ManagerBookingRepository(new NamedParameterJdbcTemplate(fixtureJdbc()));}
    ManagerBookingQuery query(String... pairs){var q=new LinkedMultiValueMap<String,String>();for(int i=0;i<pairs.length;i+=2)q.set(pairs[i],pairs[i+1]);return ManagerBookingQuery.parse(q);}
    @Test void assignedListExcludesOtherCinemaCountsAndTiedPagesAreStable(){var repo=repository();var first=repo.list(7,query("size","1"),NOW);var second=repo.list(7,query("size","1","page","1"),NOW);assertThat(first.totalElements()).isEqualTo(2);assertThat(first.items()).extracting(i->i.id()).containsExactly("9007199254740993");assertThat(second.items()).extracting(i->i.id()).containsExactly("9007199254740994");assertThat(repo.list(7,query("page","999"),NOW).items()).isEmpty();fixtures=FIXTURES.replace("(8,2,'MANAGER'","(7,2,'MANAGER'");assertThat(repository().list(7,query(),NOW).totalElements()).isEqualTo(3);}
    @Test void detailSnapshotsAndAttemptsAreExactWithoutAssumedIssuance(){var d=repository().detail(7,9007199254740993L,NOW);assertThat(d.booking().finalAmount()).isEqualTo("110.1234");assertThat(d.seats().getFirst().guestCount()).isEqualTo(2);assertThat(d.concessions().getFirst().name()).isEqualTo("Frozen popcorn");assertThat(d.payments()).extracting(p->p.id()).containsExactly("2","1");assertThat(d.booking().latestPayment().reconciliationRequired()).isTrue();assertThat(d.tickets()).isEmpty();assertThat(d.booking().issuedTicketCount()).isZero();}
    @Test void foreignDetailAndEveryChildRemainInaccessible(){assertThatThrownBy(()->repository().detail(7,9007199254740995L,NOW)).isInstanceOf(ManagerFailure.class);assertThat(repository().list(7,query("bookingCode","QA-FOREIGN"),NOW).totalElements()).isZero();}
    @Test void blockedRevokedFutureAndChangedRoleDoNotReadAnyRows(){for(long actor:List.of(9L,10L,11L,12L)){var scope=new ManagerRepository(fixtureJdbc());assertThatThrownBy(()->scope.access(actor)).isInstanceOf(ManagerFailure.class);assertThat(repository().list(actor,query(),NOW).items()).isEmpty();}}
    @Test void revocationAffectsNextRequestAndNoDuplicatesFromHistoricalAssignments(){var repo=repository();assertThat(repo.list(7,query(),NOW).totalElements()).isEqualTo(2);fixtures=FIXTURES.replace("(7::bigint,1::bigint,'MANAGER','ACTIVE'","(7::bigint,1::bigint,'MANAGER','INACTIVE'");assertThat(repository().list(7,query(),NOW).totalElements()).isZero();fixtures=FIXTURES.replace("(8,2,'MANAGER'","(7,1,'MANAGER'");assertThat(repository().list(7,query(),NOW).totalElements()).isEqualTo(2);}
    @Test void exactIdentifiersAndAllFiltersStayScopedAndBound(){assertThat(repository().list(7,query("cinemaId","1","showtimeId","1","bookingId","9007199254740993","bookingCode","QA-ONE","status","PENDING","paymentStatus","PENDING","createdFrom","2026-10-28T00:00Z","createdTo","2026-10-29T00:00Z"),NOW).totalElements()).isEqualTo(1);for(var q:List.of(query("cinemaId","2"),query("showtimeId","2"),query("bookingCode","' OR true --"),query("paymentStatus","FAILED"),query("createdFrom","2026-10-28T00:00:00.000001Z")))assertThat(repository().list(7,q,NOW).items()).isEmpty();}
    @Test void expiryIsReadProjectionAndNullPaymentIsNotAState(){var page=repository().list(7,query("status","EXPIRED"),NOW);assertThat(page.items()).hasSize(1);assertThat(page.items().getFirst().storedStatus()).isEqualTo("PENDING");assertThat(page.items().getFirst().latestPayment()).isNull();assertThat(repository().list(7,query("paymentStatus","PENDING"),NOW).items()).hasSize(1);}
    @Test void actualTicketRowsAreReturnedWithoutQrAndSuccessNeverWrites(){var detail=repository().detail(8,9007199254740995L,NOW);assertThat(detail.booking().storedStatus()).isEqualTo("PAID");assertThat(detail.tickets().getFirst().status()).isEqualTo("CHECKED_IN");assertThat(detail.tickets().getFirst().checkedInAt()).isNotNull();assertThat(detail.booking().issuedTicketCount()).isEqualTo(1);fixtures=FIXTURES.replace("(2,9007199254740993,'PENDING'","(2,9007199254740993,'SUCCESS'");var uncertain=repository().detail(7,9007199254740993L,NOW);assertThat(uncertain.booking().latestPayment().status()).isEqualTo("SUCCESS");assertThat(uncertain.booking().storedStatus()).isEqualTo("PENDING");assertThat(uncertain.tickets()).isEmpty();}
}
