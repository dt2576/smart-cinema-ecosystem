package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static com.smartcinema.manager.LocalManagerTestSupport.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Real approved local QA rows, protected wrappers and real PostgreSQL locks; no financial fixtures. */
@EnabledIfEnvironmentVariable(named="MANAGER_DB_TESTS",matches="true")
class ManagerOperationsPostgresTests {
    long admin,manager,cinema,foreignCinema,assignment,hall,foreignHall,seat;
    static final Instant START=Instant.now().plusSeconds(86400*30).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
    @BeforeAll static void ready()throws Exception{preflight();}
    @AfterAll static void unchanged()throws Exception{preserved();}
    @BeforeEach void fixtures()throws Exception{
        admin=account("ADMIN").id();manager=account("MANAGER").id();cinema=cinema(admin);foreignCinema=cinema(admin);
        assignment=assign(admin,manager,cinema,Instant.now().minusSeconds(60));hall=hall(manager,cinema,2);foreignHall=hall(admin,foreignCinema,2);
        try(var db=runtime()){
            scalar(db,"SELECT configure_hall_layout(?,?,?::jsonb)",manager,hall,"[{\"row\":\"A\",\"number\":\"1-2\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}]");
            seat=Long.parseLong(scalar(db,"SELECT id FROM seats WHERE hall_id=?",hall));
        }
    }
    private static ManagerRepository repository(Connection db){return new ManagerRepository(new JdbcTemplate(new SingleConnectionDataSource(db,true)));}
    private static void denied(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,String state){assertThatThrownBy(action).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo(state);}
    private long movie()throws Exception{try(var db=operator()){return Long.parseLong(scalar(db,"INSERT INTO movies(title,duration,status) VALUES (?,120,'PUBLISHED') RETURNING id","QA Manager "+UUID.randomUUID()));}}
    private long showtime(long actor,Long id,long movie,long hall,String status)throws SQLException{try(var db=runtime()){return Long.parseLong(scalar(db,"SELECT configure_showtime(?,?,?,?,?::timestamptz,?::numeric,?)",actor,id,movie,hall,START.toString(),"12345.6789",status));}}
    @Test void scopedQueryOnlyReturnsAssignedCinemaAndResources()throws Exception{
        try(var db=runtimeRead()){
            var repo=repository(db);repo.access(manager);
            assertThat(repo.cinemas(manager)).extracting(c->c.id()).containsExactly(Long.toString(cinema));
            assertThat(repo.halls(manager,cinema)).extracting(h->h.id()).containsExactly(Long.toString(hall));
            assertThat(repo.seats(manager,hall)).singleElement().satisfies(s->{assertThat(s.id()).isEqualTo(Long.toString(seat));assertThat(s.guestCapacity()).isEqualTo(2);});
            assertThatThrownBy(()->repo.cinema(manager,foreignCinema)).isInstanceOf(ManagerFailure.class);
            assertThatThrownBy(()->repo.hall(manager,foreignHall)).isInstanceOf(ManagerFailure.class);
        }
    }
    @Test void foreignProtectedWritesFailBeforeChangingRowsOrAudit()throws Exception{
        long before=auditCount(manager);
        try(var db=runtime()){
            denied(()->scalar(db,"SELECT configure_hall(?,?,?,?,?,?,?)",manager,foreignCinema,foreignHall,"Hijack",2,"2D","ACTIVE"),"P0002");
            denied(()->scalar(db,"SELECT configure_hall(?,?,?,?,?,?,?)",manager,cinema,foreignHall,"Hijack",2,"2D","ACTIVE"),"P0002");
            denied(()->scalar(db,"SELECT configure_hall_layout(?,?,?::jsonb)",manager,foreignHall,"[]"),"P0002");
        }
        assertThat(auditCount(manager)).isEqualTo(before);
    }
    @Test void blockedWrongRoleMissingAndFutureOnlyAssignmentsDenied()throws Exception{
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")){
            long actor=account(role).id();try(var db=runtimeRead()){assertThatThrownBy(()->repository(db).access(actor)).isInstanceOf(ManagerFailure.class);}
        }
        long future=account("MANAGER").id();assign(admin,future,cinema,Instant.now().plusSeconds(3600));
        try(var db=runtimeRead()){assertThatThrownBy(()->repository(db).access(future)).isInstanceOf(ManagerFailure.class);}
        try(var db=operator()){scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",manager);}
        try(var db=runtimeRead()){assertThatThrownBy(()->repository(db).access(manager)).isInstanceOf(ManagerFailure.class);}
        try(var db=runtime()){denied(()->scalar(db,"SELECT configure_hall(?,?,NULL,'Denied',2,'2D','ACTIVE')",manager,cinema),"P0004");}
    }
    @Test void deactivateReactivateAndReassignAffectNextRequestWithoutDeletingHistory()throws Exception{
        String effective;try(var db=runtimeRead()){effective=scalar(db,"SELECT effective_at::text FROM cinema_assignments WHERE id=?",assignment);}
        assignmentStatus(admin,manager,assignment,"INACTIVE");
        try(var db=runtimeRead()){assertThatThrownBy(()->repository(db).access(manager)).isInstanceOf(ManagerFailure.class);}
        assignmentStatus(admin,manager,assignment,"ACTIVE");try(var db=runtimeRead()){repository(db).access(manager);assertThat(scalar(db,"SELECT effective_at::text FROM cinema_assignments WHERE id=?",assignment)).isEqualTo(effective);}
        assignmentStatus(admin,manager,assignment,"INACTIVE");assign(admin,manager,foreignCinema,Instant.now().minusSeconds(60));
        try(var db=runtimeRead()){assertThat(repository(db).cinemas(manager)).extracting(c->c.id()).containsExactly(Long.toString(foreignCinema));assertThat(scalar(db,"SELECT status FROM cinema_assignments WHERE id=?",assignment)).isEqualTo("INACTIVE");}
    }
    @Test void assignmentCannotBeSelfGrantedDuplicatedOrMutatedAcrossParent()throws Exception{
        try(var db=runtime()){
            denied(()->scalar(db,"SELECT admin_assign_manager(?,?,?,?::timestamptz,NULL,'ACTIVE')",manager,manager,foreignCinema,Instant.now().toString()),"P0004");
            denied(()->scalar(db,"SELECT admin_assign_manager(?,?,?,?::timestamptz,NULL,'ACTIVE')",admin,manager,cinema,Instant.now().toString()),"23505");
            denied(()->scalar(db,"SELECT admin_assign_manager(?,?,NULL,?::timestamptz,?,'INACTIVE')",admin,manager,Instant.now().toString(),assignment),"P0001");
            long other=account("MANAGER").id();denied(()->scalar(db,"SELECT admin_assign_manager(?,?,NULL,NULL,?,'INACTIVE')",admin,other,assignment),"P0002");
        }
    }
    @Test void sharedLayoutCapacityAndOverlapRulesRemainAtomic()throws Exception{
        long empty=hall(manager,cinema,2),before=auditCount(manager);
        try(var db=runtime()){
            denied(()->scalar(db,"SELECT configure_hall_layout(?,?,?::jsonb)",manager,empty,"[{\"row\":\"A\",\"number\":\"1\",\"type\":\"STANDARD\",\"physicalStatus\":\"ACTIVE\"}]"),"P0003");
            assertThat(scalar(db,"SELECT count(*) FROM seats WHERE hall_id=?",empty)).isEqualTo("0");
            denied(()->scalar(db,"SELECT configure_hall(?,?,?,?,?,?,?)",manager,cinema,hall,"Hall",3,"2D","ACTIVE"),"P0003");
        }
        assertThat(auditCount(manager)).isEqualTo(before);
    }
    @Test void showtimePriceLifecycleMembershipAndOverlapReuseExistingGuards()throws Exception{
        long movie=movie(),id=showtime(manager,null,movie,hall,"DRAFT");
        try(var db=runtimeRead()){
            var row=repository(db).showtime(manager,id);assertThat(row.basePrice()).isEqualTo("12345.6789");assertThat(row.endsAt()).isEqualTo(START.plusSeconds(7200));
            assertThat(scalar(db,"SELECT count(*) FROM showtime_seats WHERE showtime_id=?",id)).isEqualTo("1");
        }
        try(var db=runtime()){
            denied(()->scalar(db,"SELECT configure_showtime(?,NULL,?,?,?::timestamptz,10,'DRAFT')",manager,movie,hall,START.plusSeconds(60).toString()),"23P01");
            denied(()->scalar(db,"SELECT configure_showtime(?,?,?,?,?::timestamptz,10,'DRAFT')",manager,id,movie,foreignHall,START.toString()),"P0003");
        }
        showtime(manager,id,movie,hall,"OPEN_FOR_BOOKING");showtime(manager,id,movie,hall,"CANCELLED");
        try(var db=runtime()){denied(()->scalar(db,"SELECT configure_showtime(?,?,?,?,?::timestamptz,10,'OPEN_FOR_BOOKING')",manager,id,movie,hall,START.toString()),"P0003");}
    }
    @Test void seatStructureStaysFrozenAfterMembershipWhilePhysicalStatusCanChange()throws Exception{
        showtime(manager,null,movie(),hall,"DRAFT");
        try(var db=runtime()){
            denied(()->scalar(db,"SELECT configure_seat(?,?,'B','3-4','COUPLE','ACTIVE')",manager,seat),"P0003");
            scalar(db,"SELECT configure_seat(?,?,'A','1-2','COUPLE','MAINTENANCE')",manager,seat);
            assertThat(scalar(db,"SELECT physical_status FROM seats WHERE id=?",seat)).isEqualTo("MAINTENANCE");
        }
    }
    @Test void newHoldAndUnpaidBookingHistoryProtectShowtimeWithoutAnyFinancialSuccess()throws Exception{
        long movie=movie(),id=showtime(manager,null,movie,hall,"OPEN_FOR_BOOKING"),customer=account("CUSTOMER").id();
        String hold,booking,before;
        try(var db=runtime()){
            hold=scalar(db,"SELECT id FROM acquire_seat_holds(?,?,?::bigint[],interval '10 minutes')",id,customer,"{"+seat+"}");
            denied(()->scalar(db,"SELECT configure_showtime(?,?,?,?,?::timestamptz,99,'OPEN_FOR_BOOKING')",manager,id,movie,hall,START.toString()),"P0003");
            booking=scalar(db,"SELECT create_booking(?,?,?::bigint[])",id,customer,"{"+hold+"}");
            before=scalar(db,"SELECT md5(b::text) FROM bookings b WHERE id=?",Long.parseLong(booking));
            denied(()->scalar(db,"SELECT configure_showtime(?,?,?,?,?::timestamptz,99,'CANCELLED')",manager,id,movie,hall,START.toString()),"P0003");
            assertThat(scalar(db,"SELECT md5(b::text) FROM bookings b WHERE id=?",Long.parseLong(booking))).isEqualTo(before);
            assertThat(scalar(db,"SELECT status FROM bookings WHERE id=?",Long.parseLong(booking))).isEqualTo("PENDING");
        }
    }
    @Test void protectedAuditAndConfigurationRollBackTogether()throws Exception{
        long count=auditCount(manager);long created;
        try(var db=runtime()){
            db.setAutoCommit(false);created=Long.parseLong(scalar(db,"SELECT configure_hall(?,?,NULL,'Rollback QA',2,'2D','ACTIVE')",manager,cinema));
            denied(()->scalar(db,"SELECT configure_hall_layout(?,?,?::jsonb)",manager,created,"[]"),"P0001");db.rollback();
        }
        assertThat(auditCount(manager)).isEqualTo(count);try(var db=runtimeRead()){assertThat(scalar(db,"SELECT count(*) FROM halls WHERE id=?",created)).isEqualTo("0");}
    }
    @Test void runtimeCannotBypassScopeAuditOrAssignmentGuards()throws Exception{
        try(var db=runtimeRead()){
            for(String signature:List.of("public.lock_cinema_configuration(bigint,bigint)","public.record_manager_configuration(bigint,bigint,text,bigint,text)","public.initialize_hall_seats(bigint,jsonb)"))assertThat(scalar(db,"SELECT has_function_privilege(current_user,?,'EXECUTE')::text",signature)).isEqualTo("false");
            assertThat(scalar(db,"SELECT has_table_privilege(current_user,'cinema_assignments','INSERT,UPDATE,DELETE')::text")).isEqualTo("false");
            assertThat(scalar(db,"SELECT pg_has_role(current_user,'smart_cinema_configuration_owner','SET')::text")).isEqualTo("false");
        }
        try(var db=runtime()){denied(()->scalar(db,"SELECT configure_cinema(?,NULL,'Denied','QA',NULL,NULL,'ACTIVE')",manager),"P0004");}
    }
    @Test void committedWriteFinishesBeforeRevocationAndNextWriteIsDenied()throws Exception{
        var pool=Executors.newSingleThreadExecutor();var started=new CountDownLatch(1);var pid=new java.util.concurrent.atomic.AtomicInteger();
        try(var db=runtime()){
            db.setAutoCommit(false);scalar(db,"SELECT configure_hall(?,?,NULL,'Concurrent QA',2,'2D','ACTIVE')",manager,cinema);
            var revoke=pool.submit(()->{try(var other=runtime()){pid.set(Integer.parseInt(scalar(other,"SELECT pg_backend_pid()")));started.countDown();scalar(other,"SELECT admin_assign_manager(?,?,NULL,NULL,?,'INACTIVE')",admin,manager,assignment);return true;}});
            assertThat(started.await(1,TimeUnit.SECONDS)).isTrue();blocked(db,pid.get());assertThat(revoke.isDone()).isFalse();db.commit();assertThat(revoke.get(3,TimeUnit.SECONDS)).isTrue();
        }finally{pool.shutdownNow();}
        try(var db=runtime()){denied(()->scalar(db,"SELECT configure_hall(?,?,NULL,'Denied QA',2,'2D','ACTIVE')",manager,cinema),"P0002");}
    }
    @Test void revocationWinningLockPreventsWaitingManagerWrite()throws Exception{
        var pool=Executors.newSingleThreadExecutor();var started=new CountDownLatch(1);var pid=new java.util.concurrent.atomic.AtomicInteger();
        try(var db=runtime()){
            db.setAutoCommit(false);scalar(db,"SELECT admin_assign_manager(?,?,NULL,NULL,?,'INACTIVE')",admin,manager,assignment);
            var write=pool.submit(()->{try(var other=runtime()){pid.set(Integer.parseInt(scalar(other,"SELECT pg_backend_pid()")));started.countDown();try{scalar(other,"SELECT configure_hall(?,?,NULL,'Denied waiting QA',2,'2D','ACTIVE')",manager,cinema);return "UNSAFE";}catch(SQLException e){return e.getSQLState();}}});
            assertThat(started.await(1,TimeUnit.SECONDS)).isTrue();blocked(db,pid.get());assertThat(write.isDone()).isFalse();db.commit();assertThat(write.get(3,TimeUnit.SECONDS)).isEqualTo("P0002");
        }finally{pool.shutdownNow();}
    }
    private static void blocked(Connection observer,int pid)throws Exception{
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);
        while(System.nanoTime()<deadline){if("true".equals(scalar(observer,"SELECT (cardinality(pg_blocking_pids(?))>0)::text",pid)))return;Thread.sleep(20);}
        fail("Expected actual PostgreSQL lock wait, not merely an unfinished task");
    }
}
