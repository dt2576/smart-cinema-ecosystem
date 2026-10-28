package com.smartcinema.manager;

import static com.smartcinema.manager.LocalManagerTestSupport.*;
import static com.smartcinema.manager.LocalManagerStaffTestSupport.write;
import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Approved fresh local QA rows and protected writers only; never financial success or SMTP. */
@EnabledIfEnvironmentVariable(named="MANAGER_STAFF_DB_TESTS",matches="true")
class ManagerStaffPostgresTests {
    long admin,manager,source,destination,foreign,staff,other,sourceGrant,destinationGrant,staffGrant,foreignStaffGrant;
    static Instant now(){return Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MICROS);}
    @BeforeAll static void ready()throws Exception{LocalManagerStaffTestSupport.preflight();}
    @AfterAll static void preserved()throws Exception{LocalManagerStaffTestSupport.preserved();}
    @BeforeEach void fixtures()throws Exception {
        admin=account("ADMIN").id();manager=account("MANAGER").id();source=cinema(admin);destination=cinema(admin);foreign=cinema(admin);
        sourceGrant=assign(admin,manager,source,now());destinationGrant=assign(admin,manager,destination,now());
        staff=LocalManagerStaffTestSupport.staff(admin);other=LocalManagerStaffTestSupport.staff(admin);
        staffGrant=adminGrant(staff,source);foreignStaffGrant=adminGrant(staff,foreign);adminGrant(other,foreign);
    }
    long adminGrant(long user,long cinema)throws Exception {try(var db=runtime()){return Long.parseLong(scalar(db,"SELECT staff_assign_cinema(?,?,?,?::timestamptz,NULL,'ACTIVE')",admin,user,cinema,now().toString()));}}
    static void denied(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation,String state){assertThatThrownBy(operation).isInstanceOf(SQLException.class).extracting(e->((SQLException)e).getSQLState()).isEqualTo(state);}
    @Test void scopedHistoryAndDetailExcludeOtherCinemaAndPrivateOnboarding()throws Exception {
        try(var db=runtimeRead()) {
            var repo=new ManagerStaffRepository(new JdbcTemplate(new SingleConnectionDataSource(db,true)));
            assertThat(repo.memberships(manager,source)).singleElement().satisfies(m->{assertThat(m.staff().id()).isEqualTo(Long.toString(staff));assertThat(m.staff().status()).isEqualTo("BLOCKED");assertThat(m.assignment().cinemaId()).isEqualTo(Long.toString(source));});
            assertThat(repo.assignments(manager,source,staff)).extracting(a->a.id()).containsExactly(Long.toString(staffGrant));
            assertThatThrownBy(()->repo.profile(manager,source,other)).isInstanceOf(ManagerFailure.class);
            assertThatThrownBy(()->repo.assignment(manager,source,staff,foreignStaffGrant)).isInstanceOf(ManagerFailure.class);
            assertThat(repo.memberships(manager,foreign)).isEmpty();
        }
    }
    @Test void grantToOwnedDestinationPreservesAccountAndExistingCinemaHistoryWithRealActorAudit()throws Exception {
        long audit=auditCount(manager);Instant effective=now().plusSeconds(86400);
        try(var db=runtime()) {
            long id=write(db,manager,source,staff,destination,effective,null,"ACTIVE");
            assertThat(scalar(db,"SELECT status||':'||effective_at::text FROM cinema_assignments WHERE id=?",id)).startsWith("ACTIVE:");
            assertThat(scalar(db,"SELECT status FROM users WHERE id=?",staff)).isEqualTo("BLOCKED");
            assertThat(scalar(db,"SELECT count(*) FROM cinema_assignments WHERE id IN (?,?) AND status='ACTIVE'",staffGrant,foreignStaffGrant)).isEqualTo("2");
        }
        assertThat(auditCount(manager)).isEqualTo(audit+1);
        try(var db=operatorRead()){assertThat(scalar(db,"SELECT action||':'||(metadata->>'cinema_id') FROM audit_records WHERE actor_user_id=? ORDER BY id DESC LIMIT 1",manager)).isEqualTo("ASSIGNMENT_GRANTED:"+destination);}
    }
    @Test void foreignSourceTargetStaffOrNestedAssignmentNeverMutatesOrAudits()throws Exception {
        long audit=auditCount(manager);try(var db=runtime()) {
            denied(()->write(db,manager,foreign,staff,destination,now(),null,"ACTIVE"),"P0002");
            denied(()->write(db,manager,source,staff,foreign,now(),null,"ACTIVE"),"P0002");
            denied(()->write(db,manager,source,other,destination,now(),null,"ACTIVE"),"P0002");
            denied(()->write(db,manager,source,staff,null,null,foreignStaffGrant,"INACTIVE"),"P0002");
            denied(()->write(db,manager,source,manager,destination,now(),null,"ACTIVE"),"P0002");
        }assertThat(auditCount(manager)).isEqualTo(audit);
    }
    @Test void currentRoleAccountAndBothAssignmentsAreRechecked()throws Exception {
        try(var db=runtime()){denied(()->write(db,admin,source,staff,destination,now(),null,"ACTIVE"),"P0004");}
        try(var db=operator()){scalar(db,"UPDATE users SET status='BLOCKED' WHERE id=? RETURNING id",manager);}
        try(var db=runtime()){denied(()->write(db,manager,source,staff,destination,now(),null,"ACTIVE"),"P0004");}
        try(var db=operator()){scalar(db,"UPDATE users SET status='ACTIVE' WHERE id=? RETURNING id",manager);}
        assignmentStatus(admin,manager,sourceGrant,"INACTIVE");
        try(var db=runtime()){denied(()->write(db,manager,source,staff,destination,now(),null,"ACTIVE"),"P0002");}
        assignmentStatus(admin,manager,destinationGrant,"INACTIVE");
        try(var db=runtime()){denied(()->write(db,manager,source,staff,destination,now(),null,"ACTIVE"),"P0004");}
    }
    @Test void futureOnlyManagerAssignmentDoesNotAuthorizeAndFutureStaffGrantStaysFutureOnReactivation()throws Exception {
        assignmentStatus(admin,manager,destinationGrant,"INACTIVE");assign(admin,manager,destination,now().plusSeconds(86400));
        try(var db=runtime()){denied(()->write(db,manager,source,staff,destination,now(),null,"ACTIVE"),"P0002");}
        Instant effective=now().plusSeconds(86400);
        try(var db=runtime()) {
            write(db,manager,source,staff,null,null,staffGrant,"INACTIVE");
            long id=write(db,manager,source,staff,source,effective,null,"ACTIVE");
            write(db,manager,source,staff,null,null,id,"INACTIVE");write(db,manager,source,staff,null,null,id,"ACTIVE");
            assertThat(scalar(db,"SELECT (effective_at=?::timestamptz AND effective_at>clock_timestamp())::text FROM cinema_assignments WHERE id=?",effective.toString(),id)).isEqualTo("true");
        }
    }
    @Test void duplicateAndForgedCommandsKeepOriginalIdentityAndDomainRules()throws Exception {
        try(var db=runtime()) {
            denied(()->write(db,manager,source,staff,source,now(),null,"ACTIVE"),"23505");
            denied(()->write(db,manager,source,staff,destination,now(),staffGrant,"INACTIVE"),"P0001");
            denied(()->write(db,manager,source,staff,destination,null,null,"ACTIVE"),"P0001");
            denied(()->write(db,manager,source,staff,null,null,staffGrant,"BLOCKED"),"P0001");
            assertThat(scalar(db,"SELECT status FROM cinema_assignments WHERE id=?",staffGrant)).isEqualTo("ACTIVE");
        }
    }
    @Test void transactionRollbackRemovesDomainChangeAndAuditTogether()throws Exception {
        long audit=auditCount(manager),id;try(var db=runtime()){db.setAutoCommit(false);id=write(db,manager,source,staff,destination,now(),null,"ACTIVE");assertThat(scalar(db,"SELECT count(*) FROM cinema_assignments WHERE id=?",id)).isEqualTo("1");db.rollback();}
        try(var db=runtimeRead()){assertThat(scalar(db,"SELECT count(*) FROM cinema_assignments WHERE id=?",id)).isEqualTo("0");}assertThat(auditCount(manager)).isEqualTo(audit);
    }
    @Test void runtimeCannotCallInternalCoreWriteTablesAssumeOwnerOrUseAdminLifecycle()throws Exception {
        try(var db=runtime()) {
            denied(()->scalar(db,"SELECT staff_apply_assignment(?,?,?,?::timestamptz,NULL,'ACTIVE')",manager,staff,destination,now().toString()),"42501");
            denied(()->scalar(db,"UPDATE cinema_assignments SET status='INACTIVE' WHERE id=? RETURNING id",staffGrant),"42501");
            denied(()->execute(db,"SET ROLE smart_cinema_staff_owner"),"42501");
            denied(()->scalar(db,"SELECT staff_set_status(?,?,'ACTIVE')",manager,staff),"P0004");
            denied(()->scalar(db,"SELECT staff_assign_cinema(?,?,?,?::timestamptz,NULL,'ACTIVE')",manager,staff,destination,now().toString()),"P0004");
        }
    }
    @Test void existingAdminAssignmentStatusAuditAndBlockedActivationPrerequisiteRemain()throws Exception {
        try(var db=runtime()) {
            denied(()->scalar(db,"SELECT staff_set_status(?,?,'ACTIVE')",admin,staff),"P0003");
            scalar(db,"SELECT staff_assign_cinema(?,?,NULL,NULL,?,'INACTIVE')",admin,staff,staffGrant);
            scalar(db,"SELECT staff_assign_cinema(?,?,NULL,NULL,?,'ACTIVE')",admin,staff,staffGrant);
            assertThat(scalar(db,"SELECT count(*) FROM cinema_assignments WHERE id=? AND status='ACTIVE' AND assignment_type='STAFF'",staffGrant)).isEqualTo("1");
        }
    }
    @Test void adminInvitationReissuePrivatePasswordSetupAndActivationRemainSeparate()throws Exception {
        var env=new org.springframework.mock.env.MockEnvironment().withProperty("staff.invitations.active-key-id","qa-only")
          .withProperty("staff.invitations.encryption-keys","qa-only:"+Base64.getEncoder().encodeToString(new byte[32]))
          .withProperty("staff.invitations.activation-base-url","https://qa.example.test/staff/activate");
        var crypto=new com.smartcinema.staff.StaffInvitationCrypto(new com.smartcinema.staff.StaffInvitationSettings(env));
        var first=crypto.token();var second=crypto.token();String hash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(PASSWORD);
        try(var db=runtime()) {
            db.setAutoCommit(false);long user=Long.parseLong(scalar(db,"SELECT staff_create_account(?,?,?,?)",admin,"qa-manager-lifecycle-"+UUID.randomUUID()+"@example.test","QA Staff lifecycle","+84910000000"));
            var encrypted=crypto.encrypt(user,first);scalar(db,"SELECT staff_issue_invitation(?,?,?,?,?,?)",admin,user,first.digest(),encrypted.keyId(),encrypted.nonce(),encrypted.ciphertext());
            var point=db.setSavepoint();denied(()->scalar(db,"SELECT staff_set_status(?,?,'ACTIVE')",admin,user),"P0003");db.rollback(point);
            encrypted=crypto.encrypt(user,second);scalar(db,"SELECT staff_issue_invitation(?,?,?,?,?,?)",admin,user,second.digest(),encrypted.keyId(),encrypted.nonce(),encrypted.ciphertext());
            point=db.setSavepoint();denied(()->scalar(db,"SELECT staff_set_password(?,?)",first.digest(),hash),"P0001");db.rollback(point);
            scalar(db,"SELECT staff_set_password(?,?)",second.digest(),hash);assertThat(scalar(db,"SELECT status FROM users WHERE id=?",user)).isEqualTo("BLOCKED");
            scalar(db,"SELECT staff_set_status(?,?,'ACTIVE')",admin,user);
            scalar(db,"SELECT staff_assign_cinema(?,?,?,?::timestamptz,NULL,'ACTIVE')",admin,user,source,now().toString());
            write(db,manager,source,user,destination,now(),null,"ACTIVE");assertThat(scalar(db,"SELECT status FROM users WHERE id=?",user)).isEqualTo("ACTIVE");
            assertThat(scalar(db,"SELECT count(*) FROM staff_invitation_deliveries d JOIN staff_invitations i ON i.id=d.invitation_id WHERE i.user_id=? AND (d.ciphertext IS NOT NULL OR d.status IN ('QUEUED','LEASED','SENT'))",user)).isEqualTo("0");
            db.commit();
        }
    }
    private static void blocked(int pid)throws Exception {long until=System.nanoTime()+1_000_000_000L;try(var db=operatorRead()){while(System.nanoTime()<until){if(Integer.parseInt(scalar(db,"SELECT cardinality(pg_blocking_pids(?))",pid))>0)return;Thread.sleep(10);}}throw new AssertionError("Expected real PostgreSQL lock wait");}
    @Test void writeWinningLockFinishesBeforeRevocationAndNextScopedWriteFails()throws Exception {
        try(var executor=Executors.newSingleThreadExecutor();var db=runtime()) {
            db.setAutoCommit(false);write(db,manager,source,staff,destination,now(),null,"ACTIVE");var pid=new AtomicInteger();var started=new CountDownLatch(1);
            var revoke=executor.submit(()->{try(var connection=runtime()){pid.set(Integer.parseInt(scalar(connection,"SELECT pg_backend_pid()")));started.countDown();scalar(connection,"SELECT admin_assign_manager(?,?,NULL,NULL,?,'INACTIVE')",admin,manager,sourceGrant);return true;}});
            assertThat(started.await(1,TimeUnit.SECONDS)).isTrue();blocked(pid.get());db.commit();assertThat(revoke.get(2,TimeUnit.SECONDS)).isTrue();
            denied(()->write(db,manager,source,staff,source,now(),null,"ACTIVE"),"P0002");db.rollback();
        }
    }
    @Test void committedRevocationDeniesManagerWaitingForActorLock()throws Exception {
        try(var executor=Executors.newSingleThreadExecutor();var db=runtime()) {
            db.setAutoCommit(false);scalar(db,"SELECT admin_assign_manager(?,?,NULL,NULL,?,'INACTIVE')",admin,manager,sourceGrant);var pid=new AtomicInteger();var started=new CountDownLatch(1);
            var attempt=executor.submit(()->{try(var connection=runtime()){pid.set(Integer.parseInt(scalar(connection,"SELECT pg_backend_pid()")));started.countDown();try{write(connection,manager,source,staff,destination,now(),null,"ACTIVE");return "unexpected";}catch(SQLException e){return e.getSQLState();}}});
            assertThat(started.await(1,TimeUnit.SECONDS)).isTrue();blocked(pid.get());db.commit();assertThat(attempt.get(2,TimeUnit.SECONDS)).isEqualTo("P0002");
        }
    }
}
