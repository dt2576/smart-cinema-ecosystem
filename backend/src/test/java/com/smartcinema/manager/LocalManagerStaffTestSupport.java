package com.smartcinema.manager;

import static com.smartcinema.manager.LocalManagerTestSupport.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.time.Instant;
import org.springframework.mock.env.MockEnvironment;
import com.smartcinema.staff.*;
import tools.jackson.databind.json.JsonMapper;

/** Fixed-local, separately approved V18 fixtures only. No SMTP/financial state or guard bypass. */
public final class LocalManagerStaffTestSupport {
    public static final Path EVIDENCE=Path.of("target/manager-staff-2026-10-28");
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private LocalManagerStaffTestSupport() { }
    public static void configureApproved()throws Exception {
        require("true".equals(System.getenv("MANAGER_STAFF_OPERATOR_APPROVED")),"Explicit V18 operator and QA approval required");
        configure();Files.createDirectories(EVIDENCE);
    }
    public static void preflight()throws Exception {
        configureApproved();try(var db=runtimeRead()) {
            require("18:0".equals(scalar(db,"SELECT max(version::int)||':'||count(*) FILTER(WHERE NOT success) FROM flyway_schema_history")),"Approved V18 must be installed");
            require("true".equals(scalar(db,"SELECT has_function_privilege(current_user,'public.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text)','EXECUTE')::text")),"Narrow approved Manager wrapper EXECUTE required");
            require("false".equals(scalar(db,"SELECT has_function_privilege(current_user,'public.staff_apply_assignment(bigint,bigint,bigint,timestamptz,bigint,text)','EXECUTE')::text")),"Internal assignment core must not be runtime-callable");
        }
    }
    private static Map<String,String> snapshot()throws Exception {
        var values=new TreeMap<String,String>();try(var db=operatorRead()) {
            for(String table:List.of("users","cinemas","halls","movies","seats","showtimes","showtime_seats","seat_holds","bookings","booking_seats","booking_concessions","payment_transactions","payment_evidence","payment_reconciliations","tickets","audit_records","cinema_assignments","staff_onboarding","staff_invitations","staff_invitation_deliveries","concession_items","promotions","flyway_schema_history")) {
                String key=table.equals("flyway_schema_history")?"installed_rank":table.equals("staff_onboarding")?"user_id":"id";
                try(var s=db.createStatement();var rows=s.executeQuery("SELECT "+key+"::text,md5(r::text) FROM "+table+" r")){while(rows.next())values.put("row:"+table+":"+rows.getString(1),rows.getString(2));}
            }
            try(var s=db.createStatement();var rows=s.executeQuery("SELECT p.proname||':'||p.oid,md5(pg_get_functiondef(p.oid)),pg_get_userbyid(p.proowner)||':'||coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'")) {
                while(rows.next()){values.put("function:"+rows.getString(1),rows.getString(2));values.put("acl:"+rows.getString(1),rows.getString(3));}
            }
            values.put("roles",scalar(db,"SELECT md5(string_agg(r::text,',' ORDER BY oid)) FROM pg_roles r"));
            values.put("memberships",scalar(db,"SELECT md5(coalesce(string_agg(r::text,',' ORDER BY roleid,member),'')) FROM pg_auth_members r"));
            for(String table:List.of("payment_transactions","payment_evidence","payment_reconciliations","tickets","concession_items","promotions"))values.put("count:"+table,scalar(db,"SELECT count(*) FROM "+table));
        }return values;
    }
    public static void before()throws Exception {
        configureApproved();try(var db=runtimeRead()){require("17".equals(scalar(db,"SELECT max(version::int) FROM flyway_schema_history")),"V17 read-only baseline required");}
        var values=snapshot();try(var db=operatorRead()){values.put("original-staff-body",scalar(db,"SELECT prosrc FROM pg_proc WHERE oid='public.staff_assign_cinema(bigint,bigint,bigint,timestamptz,bigint,text)'::regprocedure"));}
        Files.writeString(EVIDENCE.resolve("database-before.json"),JSON.writeValueAsString(values),StandardCharsets.UTF_8);
        System.out.println("MANAGER_STAFF_BASELINE=PASS; read-only V17 original rows/functions/ACL/roles captured");
    }
    public static void preserved()throws Exception {
        @SuppressWarnings("unchecked") var before=(Map<String,String>)JSON.readValue(Files.readString(EVIDENCE.resolve("database-before.json")),Map.class);
        var after=snapshot();for(var e:before.entrySet()) {
            if(e.getKey().equals("original-staff-body")||e.getKey().startsWith("function:staff_assign_cinema:"))continue;
            require(e.getValue().equals(after.get(e.getKey())),"Original row/history/role/function/ACL changed: "+e.getKey());
        }
        try(var db=operatorRead()) {
            String core=scalar(db,"SELECT prosrc FROM pg_proc WHERE oid='public.staff_apply_assignment(bigint,bigint,bigint,timestamptz,bigint,text)'::regprocedure");
            require(core.equals(before.get("original-staff-body").replace("PERFORM public.staff_lock_admin(p_actor,p_user);","-- Internal domain core: callable only by the protected Staff owner.")),"Existing assignment domain body must remain exact");
            String admin=scalar(db,"SELECT prosrc FROM pg_proc WHERE oid='public.staff_assign_cinema(bigint,bigint,bigint,timestamptz,bigint,text)'::regprocedure");
            require(admin.contains("PERFORM public.staff_lock_admin(p_actor,p_user);")&&admin.contains("RETURN public.staff_apply_assignment("),"ADMIN wrapper must retain authorization");
        }
        Files.writeString(EVIDENCE.resolve("preservation.txt"),"PASS: all original rows/V1-V17/roles/ACL/financial guards preserved; shared Staff domain body exact; only approved ADMIN wrapper body delegated.\n");
        System.out.println("MANAGER_STAFF_PRESERVATION=PASS");
    }
    public static long staff(long admin)throws Exception {
        var env=new MockEnvironment().withProperty("staff.invitations.active-key-id","qa-only").withProperty("staff.invitations.encryption-keys","qa-only:"+Base64.getEncoder().encodeToString(new byte[32])).withProperty("staff.invitations.activation-base-url","https://qa.example.test/staff/activate");
        var crypto=new StaffInvitationCrypto(new StaffInvitationSettings(env));var token=crypto.token();
        try(var db=runtime()) {
            db.setAutoCommit(false);long user=Long.parseLong(scalar(db,"SELECT staff_create_account(?,?,?,?)",admin,"qa-manager-staff-"+UUID.randomUUID()+"@example.test","QA Manager Staff","+84910000000"));var encrypted=crypto.encrypt(user,token);
            scalar(db,"SELECT staff_issue_invitation(?,?,?,?,?,?)",admin,user,token.digest(),encrypted.keyId(),encrypted.nonce(),encrypted.ciphertext());
            // Deferred intent is satisfied; revoke before commit so test-only ciphertext cannot be sent.
            scalar(db,"SELECT staff_set_status(?,?,'BLOCKED')",admin,user);db.commit();return user;
        }
    }
    public static long write(Connection db,long actor,long source,long staff,Long destination,Instant effective,Long assignment,String status)throws SQLException {
        return Long.parseLong(scalar(db,"SELECT manager_assign_staff(?,?,?,?,?::timestamptz,?,?)",actor,source,staff,destination,effective==null?null:effective.toString(),assignment,status));
    }
    public static void grant()throws Exception {
        configureApproved();try(var db=operator()) {
            require("18".equals(scalar(db,"SELECT max(version::int) FROM flyway_schema_history")),"V18 installation required first");
            require("smart_cinema_staff_owner".equals(scalar(db,"SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text)'::regprocedure")),"Protected owner required");
            execute(db,"GRANT EXECUTE ON FUNCTION public.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text) TO smartcinema_phase4e_app");
        }preflight();System.out.println("APPROVED_V18_WRAPPER_EXECUTE=PASS; no role membership/runtime DML added");
    }
    public static void main(String[] args)throws Exception { configureApproved();switch(args[0]){case "before"->before();case "grant"->grant();case "after"->preserved();default->throw new IllegalArgumentException("Unsupported action");} }
}
