package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static com.smartcinema.admin.LocalPromotionTestSupport.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Real fixed-local SQL. Operator fixtures require separate approval; never fake financial success. */
@EnabledIfEnvironmentVariable(named="ADMIN_PROMOTION_DB_TESTS",matches="true")
class AdminPromotionPostgresTests {
    static final String SIGNATURE="public.admin_configure_promotion(bigint,bigint,text,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric)";
    long admin,customer;
    @BeforeAll static void setup() throws Exception { preflight(); }
    @AfterAll static void preserved() throws Exception { verifyPreserved(); }
    @BeforeEach void actors() throws Exception { admin=user("ADMIN"); customer=user("CUSTOMER"); }
    static long user(String role) throws Exception {
        try(var db=operator()) { return Long.parseLong(scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'non-login-test-hash','Promotion synthetic','0910000000',?,'ACTIVE') RETURNING id","promo-"+UUID.randomUUID()+"@example.test",role)); }
    }
    static void execute(Connection db,String sql) throws SQLException { try(var q=db.createStatement()){q.execute(sql);} }
    static long command(Connection db,long actor,Long id,String op,String code,String type,String value,String from,String until,String minimum,Integer limit,String status,String cap) throws SQLException {
        return Long.parseLong(scalar(db,"SELECT admin_configure_promotion(?,?,?,?,?,CAST(? AS numeric),CAST(? AS timestamptz),CAST(? AS timestamptz),CAST(? AS numeric),?,?,CAST(? AS numeric))",actor,id,op,code,type,value,from,until,minimum,limit,status,cap));
    }
    static String from() { return Instant.now().minusSeconds(3600).toString(); }
    static String until() { return Instant.now().plusSeconds(3600).toString(); }
    static String unique() { return "QA-PROMO-"+UUID.randomUUID().toString().toUpperCase(Locale.ROOT); }
    static long create(long actor,String code,String type,String value,String status,String cap) throws Exception {
        try(var db=runtime()){return command(db,actor,null,"CREATE",code,type,value,from(),until(),"0",null,status,cap);}
    }
    static void status(Connection db,long actor,long id,String status) throws SQLException {
        command(db,actor,id,"STATUS",null,null,null,null,null,null,null,status,null);
    }
    static String read(long id,String expression) throws Exception {
        try(var db=runtime()){return scalar(db,"SELECT "+expression+" FROM promotions WHERE id=?",id);}
    }
    static String ownerRead(String sql,Object... args) throws Exception {
        try(var db=operator()){db.setReadOnly(true);return scalar(db,sql,args);}
    }
    static long audits(long id) throws Exception { return Long.parseLong(ownerRead("SELECT count(*) FROM audit_records WHERE resource_type='PROMOTION' AND resource_id=?",id)); }
    @Test void exactCreationListAndDetail() throws Exception {
        long id=create(admin,unique(),"FIXED_AMOUNT","999999999999999.9999","INACTIVE",null);
        assertThat(read(id,"discount_value::text")).isEqualTo("999999999999999.9999");
        try(var db=runtime()) {
            var repo=new AdminPromotionRepository(new org.springframework.jdbc.core.JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(db,true)));
            assertThat(repo.list()).anyMatch(p->p.id().equals(""+id)&&p.status().equals("INACTIVE"));
            assertThat(repo.detail(id).discountValue()).isEqualTo("999999999999999.9999");
        }
        assertThat(audits(id)).isEqualTo(1);
    }
    @Test void contentStatusNoopAndAudit() throws Exception {
        long id=create(admin,unique(),"PERCENTAGE","10","ACTIVE","20.1234");String code=read(id,"code");
        try(var db=runtime()) {
            String from=read(id,"valid_from::text"),until=read(id,"valid_until::text");
            command(db,admin,id,"UPDATE",null,"PERCENTAGE","10",from,until,"0",null,null,"20.1234");
            assertThat(audits(id)).isEqualTo(1);
            command(db,admin,id,"UPDATE",null,"FIXED_AMOUNT","2.1234",from,until,"0",1,null,null);
            status(db,admin,id,"INACTIVE");status(db,admin,id,"INACTIVE");status(db,admin,id,"ACTIVE");
        }
        assertThat(read(id,"code")).isEqualTo(code);assertThat(audits(id)).isEqualTo(4);
        assertThat(ownerRead("SELECT metadata::text FROM audit_records WHERE resource_type='PROMOTION' AND resource_id=? AND action='PROMOTION_UPDATED'",id)).contains("2.1234","changedFields","previousTerms");
    }
    @Test void duplicateAndImmutableCodeRejected() throws Exception {
        String code=unique();long id=create(admin,code,"FIXED_AMOUNT","0","ACTIVE",null);
        assertThatThrownBy(()->create(admin,code,"FIXED_AMOUNT","0","ACTIVE",null)).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("23505");
        try(var db=runtime()) { assertThatThrownBy(()->command(db,admin,id,"UPDATE","RENAME","FIXED_AMOUNT","1",from(),until(),"0",null,null,null)).isInstanceOf(SQLException.class); }
        assertThat(read(id,"code")).isEqualTo(code);assertThat(audits(id)).isEqualTo(1);
    }
    @Test void currentRolesBlockedAndMissingActorDenied() throws Exception {
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) { long actor=user(role);assertThatThrownBy(()->create(actor,unique(),"FIXED_AMOUNT","0","ACTIVE",null)).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("P0004"); }
        long blocked=user("ADMIN");try(var db=operator()){scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",blocked);}
        for(long actor:List.of(blocked,Long.MAX_VALUE))assertThatThrownBy(()->create(actor,unique(),"FIXED_AMOUNT","0","ACTIVE",null)).isInstanceOf(SQLException.class);
    }
    @Test void databaseInputRulesAndMissingTarget() throws Exception {
        try(var db=runtime()) {
            for(String v:List.of("NaN","Infinity","-1","100.0001","1.00001")) assertThatThrownBy(()->command(db,admin,null,"CREATE",unique(),"PERCENTAGE",v,from(),until(),"0",null,"ACTIVE",null)).isInstanceOf(SQLException.class);
            assertThatThrownBy(()->command(db,admin,null,"CREATE",unique(),"FIXED_AMOUNT","1",until(),from(),"0",null,"ACTIVE",null)).isInstanceOf(SQLException.class);
            assertThatThrownBy(()->status(db,admin,Long.MAX_VALUE,"ACTIVE")).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("P0002");
        }
    }
    @Test void runtimeHasOnlyNarrowAuthority() throws Exception {
        try(var db=runtime()) {
            for(String p:List.of("INSERT","UPDATE","DELETE","TRUNCATE")) assertThat(scalar(db,"SELECT has_table_privilege(current_user,'promotions',?)::text",p)).isEqualTo("false");
            assertThat(scalar(db,"SELECT has_function_privilege(current_user,?,'EXECUTE')::text",SIGNATURE)).isEqualTo("true");
            assertThat(scalar(db,"SELECT pg_has_role(current_user,'smart_cinema_hold_owner','SET')::text")).isEqualTo("false");
            assertThat(scalar(db,"SELECT p.prosecdef::text||':'||pg_get_userbyid(p.proowner)||':'||(NOT EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))::text FROM pg_proc p WHERE p.oid=to_regprocedure(?)",SIGNATURE)).isEqualTo("true:smart_cinema_hold_owner:true");
        }
    }
    @Test void auditFailureRollsBackMaster() throws Exception {
        long id=create(admin,unique(),"FIXED_AMOUNT","1","ACTIVE",null);String tag=UUID.randomUUID().toString().replace("-","");String f="promotion_reject_"+tag,t="promotion_audit_"+tag;
        try(var db=operator()){execute(db,"CREATE FUNCTION public."+f+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='Test audit failure'; END $$");}
        try {
            try(var db=operator()){execute(db,"CREATE TRIGGER "+t+" BEFORE INSERT ON public.audit_records FOR EACH ROW WHEN (NEW.resource_type='PROMOTION' AND NEW.resource_id="+id+") EXECUTE FUNCTION public."+f+"()");}
            try(var db=runtime()){assertThatThrownBy(()->status(db,admin,id,"INACTIVE")).isInstanceOf(SQLException.class);}
            assertThat(read(id,"status")).isEqualTo("ACTIVE");assertThat(audits(id)).isEqualTo(1);
        } finally {try(var db=operator()){execute(db,"DROP TRIGGER IF EXISTS "+t+" ON public.audit_records");execute(db,"DROP FUNCTION public."+f+"()");}}
    }
    static long booking(long customer) throws Exception {
        long showtime,seat;
        try(var db=operator()) {
            long movie=Long.parseLong(scalar(db,"INSERT INTO movies(title,duration,status) VALUES ('QA Promotion synthetic',60,'PUBLISHED') RETURNING id"));
            long cinema=Long.parseLong(scalar(db,"INSERT INTO cinemas(name,address,status) VALUES ('QA Promotion synthetic','Local test','ACTIVE') RETURNING id"));
            long hall=Long.parseLong(scalar(db,"INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'QA Promotion hall',1,'Configured','ACTIVE') RETURNING id",cinema));
            showtime=Long.parseLong(scalar(db,"INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off) VALUES (?,?,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',statement_timestamp()+interval '2 hours',10,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id",movie,hall));
            scalar(db,"SELECT initialize_hall_seats(?,CAST(? AS jsonb))",hall,"[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"}]");
            seat=Long.parseLong(scalar(db,"SELECT id FROM seats WHERE hall_id=?",hall));scalar(db,"SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",showtime,"{"+seat+"}");
        }
        try(var db=runtime()) {
            String hold=scalar(db,"SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '10 minutes')",showtime,customer,"{"+seat+"}");
            return Long.parseLong(scalar(db,"SELECT create_booking(?,?,CAST(? AS bigint[]))",showtime,customer,"{"+hold+"}"));
        }
    }
    static void apply(Connection db,long booking,long customer,String code) throws SQLException { scalar(db,"SELECT edit_booking_promotion(?,?,?,'APPLY')",booking,customer,code); }
    static String snapshot(long booking) throws Exception {
        return ownerRead("SELECT (to_jsonb(b)-'status')::text FROM bookings b WHERE id=?",booking);
    }
    @Test void customerPolicyRoundingCapAndInvalidity() throws Exception {
        long b=booking(customer);String code=unique();long p=create(admin,code,"PERCENTAGE","25","ACTIVE","1.9999");
        try(var db=runtime()){apply(db,b,customer,code);}
        assertThat(ownerRead("SELECT discount::text||':'||final_amount::text FROM bookings WHERE id=?",b)).isEqualTo("1.0000:9.0000");
        String before=snapshot(b);try(var db=runtime()){status(db,admin,p,"INACTIVE");assertThatThrownBy(()->apply(db,b,customer,code)).isInstanceOf(SQLException.class);}
        assertThat(snapshot(b)).isEqualTo(before);
        for(String window:List.of("FUTURE","EXPIRED","MINIMUM")) {
            String invalid=unique();try(var db=runtime()) {
                command(db,admin,null,"CREATE",invalid,"FIXED_AMOUNT","1",window.equals("FUTURE")?Instant.now().plusSeconds(1200).toString():from(),window.equals("EXPIRED")?Instant.now().minusSeconds(100).toString():Instant.now().plusSeconds(2400).toString(),window.equals("MINIMUM")?"100":"0",null,"ACTIVE",null);
                assertThatThrownBy(()->apply(db,b,customer,invalid)).isInstanceOf(SQLException.class);
            }
        }
        assertThat(snapshot(b)).isEqualTo(before);
    }
    @Test void existingUsagePolicyBoundaryWithoutPaidFixtures() throws Exception {
        long p;
        try(var db=runtime()){p=command(db,admin,null,"CREATE",unique(),"FIXED_AMOUNT","1",from(),until(),"0",1,"ACTIVE",null);}
        // Pure existing policy helper with an explicit count argument, not actual redemption evidence.
        try(var db=operator()) {
            db.setReadOnly(true);
            assertThat(scalar(db,"SELECT promotion_discount(p,10,0)::text FROM promotions p WHERE id=?",p)).isEqualTo("1.0000");
            assertThatThrownBy(()->scalar(db,"SELECT promotion_discount(p,10,1)::text FROM promotions p WHERE id=?",p)).isInstanceOf(SQLException.class);
        }
        assertThat(ownerRead("SELECT count(*) FROM bookings WHERE promotion_id=? AND status='PAID'",p)).isEqualTo("0");
    }
    @Test void frozenSnapshotOriginalExpiryAndPaymentRemainUntouched() throws Exception {
        long b=booking(customer);String code=unique();long p=create(admin,code,"FIXED_AMOUNT","1.1234","ACTIVE",null);
        try(var db=runtime()){apply(db,b,customer,code);scalar(db,"SELECT initiate_payment(?,?)",b,customer);}
        String before=snapshot(b),payment=ownerRead("SELECT to_jsonb(p)::text FROM payment_transactions p WHERE booking_id=?",b);
        try(var db=runtime()) {
            command(db,admin,p,"UPDATE",null,"FIXED_AMOUNT","5",from(),until(),"0",1,null,null);status(db,admin,p,"INACTIVE");
            assertThatThrownBy(()->apply(db,b,customer,code)).isInstanceOf(SQLException.class);
            assertThatThrownBy(()->scalar(db,"SELECT edit_booking_promotion(?,?,NULL,'REMOVE')",b,customer)).isInstanceOf(SQLException.class);
        }
        assertThat(snapshot(b)).isEqualTo(before);assertThat(ownerRead("SELECT to_jsonb(p)::text FROM payment_transactions p WHERE booking_id=?",b)).isEqualTo(payment);
        assertThat(ownerRead("SELECT status FROM bookings WHERE id=?",b)).isEqualTo("PENDING");
        assertThat(ownerRead("SELECT count(*) FROM tickets t JOIN booking_seats s ON s.id=t.booking_seat_id WHERE s.booking_id=?",b)).isEqualTo("0");
    }
    @Test void changedTermsRequireReviewBeforeFirstPayment() throws Exception {
        long b=booking(customer);String code=unique();long p=create(admin,code,"FIXED_AMOUNT","1","ACTIVE",null);
        try(var db=runtime()) {
            apply(db,b,customer,code);String before=snapshot(b);
            command(db,admin,p,"UPDATE",null,"FIXED_AMOUNT","2",from(),until(),"0",null,null,null);
            assertThatThrownBy(()->scalar(db,"SELECT initiate_payment(?,?)",b,customer)).isInstanceOf(SQLException.class);
            assertThat(snapshot(b)).isEqualTo(before);assertThat(ownerRead("SELECT count(*) FROM payment_transactions WHERE booking_id=?",b)).isEqualTo("0");
            apply(db,b,customer,code);
        }
        assertThat(ownerRead("SELECT discount::text FROM bookings WHERE id=?",b)).isEqualTo("2.0000");
    }
    @Test void customerApplyThenAdminChangeSerializesWithoutRepricing() throws Exception { race(false); }
    @Test void adminDeactivationThenCustomerApplySerializesAndRejects() throws Exception { race(true); }
    private void race(boolean writerFirst) throws Exception {
        long b=booking(customer);String code=unique();long p=create(admin,code,"FIXED_AMOUNT","1","ACTIVE",null);
        var executor=Executors.newSingleThreadExecutor();var started=new CountDownLatch(1);var pid=new AtomicInteger();
        try(var first=runtime()) {
            first.setAutoCommit(false);if(writerFirst)status(first,admin,p,"INACTIVE");else apply(first,b,customer,code);
            var next=executor.submit(()->{try(var db=runtime()){execute(db,"SET statement_timeout='5s'");pid.set(Integer.parseInt(scalar(db,"SELECT pg_backend_pid()")));started.countDown();try{if(writerFirst)apply(db,b,customer,code);else status(db,admin,p,"INACTIVE");return "ACCEPTED";}catch(SQLException e){return e.getSQLState();}}});
            assertThat(started.await(3,TimeUnit.SECONDS)).isTrue();boolean waiting=false;
            for(int i=0;i<100;i++){try(var db=runtime()){if("1".equals(scalar(db,"SELECT count(*) FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock'",pid.get()))){waiting=true;break;}}Thread.sleep(20);}
            assertThat(waiting).as("Actual lock wait observed").isTrue();first.commit();assertThat(next.get(6,TimeUnit.SECONDS)).isEqualTo(writerFirst?"P0005":"ACCEPTED");
            assertThat(ownerRead("SELECT discount::text FROM bookings WHERE id=?",b)).isEqualTo(writerFirst?"0.0000":"1.0000");
        } finally {executor.shutdownNow();}
    }
}
