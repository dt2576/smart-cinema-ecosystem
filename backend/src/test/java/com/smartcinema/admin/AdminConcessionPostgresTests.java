package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Real local SQL contracts only; synthetic retained catalog/users/unpaid Bookings, no financial fixtures.
 * Requires V15, narrow runtime EXECUTE and explicitly approved separate local operator fixtures.
 * Does not migrate, reset, grant roles, disable guards or delete pre-existing/history records.
 * Removes only its newly created unreferenced actor for the deleted-actor test. NOT RUN while preflight is blocked.
 */
@EnabledIfEnvironmentVariable(named="ADMIN_CONCESSION_DB_TESTS",matches="true")
class AdminConcessionPostgresTests {
    private static final String SIGNATURE="public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)";
    private long admin,customer;
    @BeforeAll static void preflight() throws Exception {
        LocalConcessionTestSupport.preflight();
    }
    @AfterAll static void preserved() throws Exception { LocalConcessionTestSupport.verifyPreserved(); }
    private static Connection connection(boolean fixture) throws SQLException {
        return fixture?LocalConcessionTestSupport.operator():LocalConcessionTestSupport.runtime();
    }
    @BeforeEach void actors() throws Exception {
        // Operator-owned fixture setup only. Distinct synthetic identities; existing actors never changed.
        admin=user("ADMIN");customer=user("CUSTOMER");
    }
    private long user(String role) throws Exception {
        try(var db=connection(true)) { return Long.parseLong(scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'local-test-non-login-hash','Phase5B synthetic','0910000000',?,'ACTIVE') RETURNING id", "phase5b-"+UUID.randomUUID()+"@example.test",role)); }
    }
    private static String scalar(Connection db,String sql,Object... values) throws SQLException {
        try(var q=db.prepareStatement(sql)) { for(int i=0;i<values.length;i++) q.setObject(i+1,values[i]);try(var r=q.executeQuery()) { return r.next()?r.getString(1):null; } }
    }
    private static void execute(Connection db,String sql) throws SQLException { try(var q=db.createStatement()) { q.execute(sql); } }
    private long command(Connection db,long actor,Long id,String operation,String name,String description,String category,String price,String status) throws SQLException {
        return Long.parseLong(scalar(db,"SELECT admin_configure_concession_item(?,?,?,?,?,?,CAST(? AS numeric),?)",actor,id,operation,name,description,category,price,status));
    }
    private long item(String name,String category,String price,String status) throws Exception {
        try(var db=connection(false)) { return command(db,admin,null,"CREATE",name,null,category,price,status); }
    }
    private String read(long id,String expression) throws Exception {
        try(var db=connection(false)) { return scalar(db,"SELECT "+expression+" FROM concession_items WHERE id=?",id); }
    }
    private String ownerScalar(String sql,Object... values) throws Exception {
        try(var db=connection(true)) { db.setAutoCommit(false);try { execute(db,"SET LOCAL ROLE smart_cinema_hold_owner");String result=scalar(db,sql,values);db.commit();return result;}catch(Exception failure){db.rollback();throw failure;} }
    }
    private long audits(long id) throws Exception { return Long.parseLong(ownerScalar("SELECT count(*) FROM audit_records WHERE resource_type='CONCESSION_ITEM' AND resource_id=?",id)); }
    @Test void createDuplicatesAndExactBounds() throws Exception {
        long first=item("Phase5B equal","COMBO","999999999999999.9999","INACTIVE"),second=item("Phase5B equal","COMBO","0","ACTIVE");
        assertThat(first).isNotEqualTo(second);assertThat(read(first,"selling_price::text")).isEqualTo("999999999999999.9999");assertThat(read(second,"selling_price::text")).isEqualTo("0.0000");
        assertThat(read(first,"image IS NULL")).isEqualTo("t");assertThat(audits(first)).isEqualTo(1);
    }
    @Test void deterministicAllStatusCatalogAndCustomerProjection() throws Exception {
        long active=item("Phase5B order","POPCORN","10.1234","ACTIVE"),inactive=item("Phase5B order","DRINK","20","INACTIVE");
        try(var db=connection(false)) {
            var jdbc=new org.springframework.jdbc.core.JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(db,true));
            var all=new AdminConcessionRepository(jdbc).list();assertThat(all).anyMatch(i->i.id().equals(Long.toString(inactive))&&i.status().equals("INACTIVE"));
            var publicItems=new com.smartcinema.concession.ConcessionRepository(new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc)).catalog();
            assertThat(publicItems).anyMatch(i->i.id().equals(Long.toString(active))&&i.sellingPrice().equals("10.1234"));assertThat(publicItems).noneMatch(i->i.id().equals(Long.toString(inactive)));
            assertThat(all).extracting(AdminConcessionItem::category).isSortedAccordingTo(Comparator.comparingInt(c->List.of("POPCORN","DRINK","COMBO").indexOf(c)));
        }
    }
    @Test void contentStatusImageAndIdentityAreIndependent() throws Exception {
        long id=item("Phase5B original","DRINK","12","ACTIVE");
        ownerScalar("SELECT configure_concession_item(?,name,description,category,selling_price,'/local-existing-image.png',status) FROM concession_items WHERE id=?",id,id);
        String created=read(id,"created_at::text");
        try(var db=connection(false)) {
            command(db,admin,id,"UPDATE","Phase5B renamed","Description","COMBO","13.1234",null);
            command(db,admin,id,"STATUS",null,null,null,null,"INACTIVE");
            command(db,admin,id,"STATUS",null,null,null,null,"ACTIVE");
        }
        assertThat(read(id,"image")).isEqualTo("/local-existing-image.png");assertThat(read(id,"created_at::text")).isEqualTo(created);
        assertThat(read(id,"name||':'||category||':'||selling_price::text||':'||status")).isEqualTo("Phase5B renamed:COMBO:13.1234:ACTIVE");assertThat(audits(id)).isEqualTo(4);
    }
    @Test void noOpLeavesTimestampAndAuditUnchanged() throws Exception {
        long id=item("Phase5B noop","POPCORN","1","ACTIVE");String updated=read(id,"updated_at::text");
        try(var db=connection(false)) { command(db,admin,id,"UPDATE","Phase5B noop",null,"POPCORN","1.0000",null);command(db,admin,id,"STATUS",null,null,null,null,"ACTIVE"); }
        assertThat(read(id,"updated_at::text")).isEqualTo(updated);assertThat(audits(id)).isEqualTo(1);
    }
    @Test void auditHasExactSafeDelta() throws Exception {
        long id=item("Phase5B audit","POPCORN","1","ACTIVE");
        try(var db=connection(false)) { command(db,admin,id,"UPDATE","Phase5B audit","private-description","POPCORN","2.1234",null); }
        String metadata=ownerScalar("SELECT metadata::text FROM audit_records WHERE resource_type='CONCESSION_ITEM' AND resource_id=? AND action='CONCESSION_UPDATED'",id);
        assertThat(metadata).contains("1.0000","2.1234","sellingPrice").doesNotContain("private-description","imageUrl","password");
    }
    @Test void invalidDatabaseInputsAndMissingItemDoNotMutate() throws Exception {
        long id=item("Phase5B invalid","DRINK","1","ACTIVE");
        for(String price:List.of("-1","1000000000000000","1.00001","NaN","Infinity")) try(var db=connection(false)) {
            assertThatThrownBy(()->command(db,admin,id,"UPDATE","Bad",null,"DRINK",price,null)).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("P0001");
        }
        try(var db=connection(false)) { assertThatThrownBy(()->command(db,admin,Long.MAX_VALUE,"STATUS",null,null,null,null,"ACTIVE")).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("P0002"); }
        assertThat(read(id,"name")).isEqualTo("Phase5B invalid");assertThat(audits(id)).isEqualTo(1);
    }
    @Test void databaseRechecksWrongBlockedChangedAndMissingActors() throws Exception {
        long id=item("Phase5B authority","DRINK","1","ACTIVE");
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) {
            long other=user(role);try(var db=connection(false)) { assertDenied(db,other,id); }
        }
        try(var db=connection(true)) { scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",admin); }
        try(var db=connection(false)) { assertDenied(db,admin,id); }
        try(var db=connection(true)) { scalar(db,"UPDATE users SET status='ACTIVE',role='CUSTOMER' WHERE id=? RETURNING id",admin); }
        try(var db=connection(false)) { assertDenied(db,admin,id);assertDenied(db,Long.MAX_VALUE,id); }
        long deleted=user("ADMIN");
        try(var db=connection(true)) { scalar(db,"DELETE FROM users WHERE id=? RETURNING id",deleted); }
        try(var db=connection(false)) { assertDenied(db,deleted,id); }
        assertThat(audits(id)).isEqualTo(1);
    }
    private void assertDenied(Connection db,long actor,long id) {
        assertThatThrownBy(()->command(db,actor,id,"STATUS",null,null,null,null,"INACTIVE")).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("P0004");
    }
    @Test void runtimeCannotWriteDirectlyOrCallDeploymentConfiguration() throws Exception {
        try(var db=connection(false)) {
            // Fail before executing any destructive privilege probe, even if ACLs regressed.
            for(String privilege:List.of("INSERT","UPDATE","DELETE","TRUNCATE"))
                assertThat(scalar(db,"SELECT has_table_privilege(current_user,'concession_items',?)::text",privilege)).isEqualTo("false");
            db.setAutoCommit(false);
            for(String sql:List.of("UPDATE concession_items SET status='INACTIVE' WHERE false","DELETE FROM concession_items WHERE false","SELECT configure_concession_item(NULL,'Bad',NULL,'DRINK',1,NULL,'ACTIVE')")) {
                Savepoint point=db.setSavepoint();
                try { assertThatThrownBy(()->execute(db,sql)).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo("42501"); }
                finally { db.rollback(point); }
            }
            assertThat(scalar(db,"SELECT has_function_privilege(current_user,'"+SIGNATURE+"','EXECUTE')::text")).isEqualTo("true");
            assertThat(scalar(db,"SELECT has_table_privilege(current_user,'audit_records','UPDATE')::text")).isEqualTo("false");
            db.rollback();
        }
    }
    @Test void auditPersistenceFailureRollsBackTheMaster() throws Exception {
        long id=item("Phase5B rollback","POPCORN","1","ACTIVE");String suffix=UUID.randomUUID().toString().replace("-","");String function="phase5b_reject_"+suffix,trigger="phase5b_audit_"+suffix;
        // New narrowly scoped fault trigger only; never disable or replace a protective trigger.
        try(var db=connection(true)) { execute(db,"CREATE FUNCTION public."+function+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='Local audit fault'; END $$"); }
        try {
            try(var db=connection(true)) { db.setAutoCommit(false);execute(db,"SET LOCAL ROLE smart_cinema_hold_owner");execute(db,"CREATE TRIGGER "+trigger+" BEFORE INSERT ON public.audit_records FOR EACH ROW WHEN (NEW.resource_type='CONCESSION_ITEM' AND NEW.resource_id="+id+") EXECUTE FUNCTION public."+function+"()");db.commit(); }
            try(var db=connection(false)) { assertThatThrownBy(()->command(db,admin,id,"UPDATE","Uncommitted",null,"POPCORN","2",null)).isInstanceOf(SQLException.class); }
            assertThat(read(id,"name||':'||selling_price::text")).isEqualTo("Phase5B rollback:1.0000");assertThat(audits(id)).isEqualTo(1);
        } finally {
            try(var db=connection(true)) { db.setAutoCommit(false);execute(db,"SET LOCAL ROLE smart_cinema_hold_owner");execute(db,"DROP TRIGGER IF EXISTS "+trigger+" ON public.audit_records");db.commit();execute(db,"DROP FUNCTION public."+function+"()");db.commit(); }
        }
    }
    private record Booking(long id,long item) { }
    private Booking booking() throws Exception {
        long movie,cinema,hall,showtime;
        try(var db=connection(true)) {
            movie=Long.parseLong(scalar(db,"INSERT INTO movies(title,duration,status) VALUES ('Phase5B synthetic',60,'PUBLISHED') RETURNING id"));
            cinema=Long.parseLong(scalar(db,"INSERT INTO cinemas(name,address,status) VALUES ('Phase5B synthetic','Local test','ACTIVE') RETURNING id"));
            hall=Long.parseLong(scalar(db,"INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,'Phase5B hall',1,'Configured','ACTIVE') RETURNING id",cinema));
            // One statement-stable instant keeps cutoff <= start and occupied_until >= end exact.
            showtime=Long.parseLong(scalar(db,"INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off) VALUES (?,?,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',statement_timestamp()+interval '2 hours',10,'OPEN_FOR_BOOKING',statement_timestamp()+interval '1 hour') RETURNING id",movie,hall));
        }
        ownerScalar("SELECT initialize_hall_seats(?,CAST(? AS jsonb))",hall,"[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"}]");
        long seat=Long.parseLong(ownerScalar("SELECT id FROM seats WHERE hall_id=?",hall)); ownerScalar("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))",showtime,"{"+seat+"}");
        try(var db=connection(false)) {
            long hold=Long.parseLong(scalar(db,"SELECT id FROM acquire_seat_holds(?,?,CAST(? AS bigint[]),interval '10 minutes')",showtime,customer,"{"+seat+"}"));
            long booking=Long.parseLong(scalar(db,"SELECT create_booking(?,?,CAST(? AS bigint[]))",showtime,customer,"{"+hold+"}"));
            return new Booking(booking,item("Phase5B snapshot","POPCORN","1.1234","ACTIVE"));
        }
    }
    private void add(Connection db,Booking booking) throws SQLException { scalar(db,"SELECT edit_booking_concession(?,?,NULL,?,2,'ADD')",booking.id,customer,booking.item); }
    @Test void savedSnapshotsQuantityAndPaymentFreezeRemainAuthoritative() throws Exception {
        Booking booking=booking();try(var db=connection(false)) { add(db,booking);command(db,admin,booking.item,"UPDATE","Master changed",null,"COMBO","9",null);command(db,admin,booking.item,"STATUS",null,null,null,null,"INACTIVE"); }
        assertThat(ownerScalar("SELECT item_name_snapshot||':'||category_snapshot||':'||unit_price_snapshot::text FROM booking_concessions WHERE booking_id=?",booking.id)).isEqualTo("Phase5B snapshot:POPCORN:1.1234");
        try(var db=connection(false)) {
            long line=Long.parseLong(scalar(db,"SELECT id FROM booking_concessions WHERE booking_id=?",booking.id));scalar(db,"SELECT edit_booking_concession(?,?,?,NULL,3,'UPDATE')",booking.id,customer,line);
            String before=scalar(db,"SELECT final_amount::text||':'||expires_at::text FROM bookings WHERE id=?",booking.id);
            scalar(db,"SELECT initiate_payment(?,?)",booking.id,customer);
            assertThatThrownBy(()->scalar(db,"SELECT edit_booking_concession(?,?,?,NULL,4,'UPDATE')",booking.id,customer,line)).isInstanceOf(SQLException.class);
            assertThat(scalar(db,"SELECT final_amount::text||':'||expires_at::text FROM bookings WHERE id=?",booking.id)).isEqualTo(before);
            assertThat(scalar(db,"SELECT status FROM bookings WHERE id=?",booking.id)).isEqualTo("PENDING");
        }
    }
    @Test void concurrentCustomerAddBeforeAdminPriceChangeKeepsOldSnapshot() throws Exception {
        Booking booking=booking();var executor=Executors.newSingleThreadExecutor();AtomicInteger writerPid=new AtomicInteger();var entered=new CountDownLatch(1);
        try(var buyer=connection(false)) {
            buyer.setAutoCommit(false);add(buyer,booking); // Real ADD holds its catalog SHARE until commit.
            var future=executor.submit(()->{try(var writer=connection(false)){writerPid.set(Integer.parseInt(scalar(writer,"SELECT pg_backend_pid()")));entered.countDown();return command(writer,admin,booking.item,"UPDATE","Phase5B new",null,"COMBO","8",null);}});
            assertThat(entered.await(3,TimeUnit.SECONDS)).isTrue();waitForLock(writerPid.get());buyer.commit();assertThat(future.get(5,TimeUnit.SECONDS)).isEqualTo(booking.item);
            assertThat(ownerScalar("SELECT unit_price_snapshot::text FROM booking_concessions WHERE booking_id=?",booking.id)).isEqualTo("1.1234");
        } finally {executor.shutdownNow();}
    }
    @Test void concurrentAdminDeactivationBeforeCustomerAddRejectsWithoutLine() throws Exception {
        Booking booking=booking();var executor=Executors.newSingleThreadExecutor();AtomicInteger buyerPid=new AtomicInteger();var entered=new CountDownLatch(1);
        try(var writer=connection(false)) {
            writer.setAutoCommit(false);command(writer,admin,booking.item,"STATUS",null,null,null,null,"INACTIVE");
            var future=executor.submit(()->{try(var buyer=connection(false)){buyerPid.set(Integer.parseInt(scalar(buyer,"SELECT pg_backend_pid()")));entered.countDown();try{add(buyer,booking);return "accepted";}catch(SQLException failure){return failure.getSQLState();}}});
            assertThat(entered.await(3,TimeUnit.SECONDS)).isTrue();waitForLock(buyerPid.get());writer.commit();assertThat(future.get(5,TimeUnit.SECONDS)).isEqualTo("P0003");
            assertThat(ownerScalar("SELECT count(*) FROM booking_concessions WHERE booking_id=?",booking.id)).isEqualTo("0");
        } finally {executor.shutdownNow();}
    }
    private void waitForLock(int pid) throws Exception {
        for(int i=0;i<100;i++) { try(var db=connection(false)) { if("1".equals(scalar(db,"SELECT count(*) FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock'",pid))) return; }Thread.sleep(20); }
        fail("Expected actual PostgreSQL row-lock wait was not observed");
    }
}
