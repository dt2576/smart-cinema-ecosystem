package com.smartcinema.manager;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.json.JsonMapper;

/** Explicitly approved fixed-local fixtures only. No seed, reset, guard bypass or financial fabrication. */
public final class LocalManagerTestSupport {
    public static final String URL="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    public static final Path EVIDENCE=Path.of("target/manager-cinema-operations-2026-10-27");
    private static Properties base,operator;
    public static final String PASSWORD="QA-"+UUID.randomUUID();
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private LocalManagerTestSupport(){ }
    public static void main(String[] args)throws Exception {
        configure();
        if(args.length!=1)throw new IllegalArgumentException("before, grant or after required");
        switch(args[0]){
            case "before" -> before();
            case "grant" -> grant();
            case "after" -> preserved();
            default -> throw new IllegalArgumentException("Unsupported action");
        }
    }
    public static synchronized void configure()throws Exception {
        if(base!=null)return;
        require("true".equals(System.getenv("ADMIN_MANAGER_OPERATOR_APPROVED")),"Explicit Manager operator/fixture approval required");
        var candidate=properties(Path.of(".env.local-test"));
        require(URL.equals(candidate.getProperty("spring.datasource.url"))&&URL.equals(candidate.getProperty("spring.flyway.url")),"Exact loopback URLs required");
        require("smartcinema_phase4e_app".equals(candidate.getProperty("spring.datasource.username")),"Restricted runtime required");
        require("".equals(candidate.getProperty("spring.config.import")),"External config import denied");
        for(String key:List.of("vnpay.enabled","staff.invitations.delivery-enabled","seat-hold.cleanup-enabled"))require("false".equals(candidate.getProperty(key)),"External/cleanup gates must remain disabled");
        Path file=Path.of(".env.local-test-migration");var acl=Files.getFileAttributeView(file,AclFileAttributeView.class);
        require(acl!=null,"Private operator ACL required");var owner=acl.getOwner();
        require(acl.getAcl().stream().noneMatch(a->a.type()==AclEntryType.ALLOW&&!owner.equals(a.principal())),"Operator input must remain owner-only");
        var approved=properties(file);require(URL.equals(approved.getProperty("url"))&&"postgres".equals(approved.getProperty("user")),"Approved fixed-local operator required");
        base=candidate;operator=approved;Files.createDirectories(EVIDENCE);
        try(var db=runtimeRead()){
            require("smartcinema_phase4e_test:127.0.0.1:5432".equals(scalar(db,"SELECT current_database()||':'||host(inet_server_addr())||':'||inet_server_port()")),"Actual local server required");
            require("true".equals(scalar(db,"SELECT (NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls)::text FROM pg_roles WHERE rolname=current_user")),"Runtime must remain restricted");
            require("false".equals(scalar(db,"SELECT pg_has_role(current_user,'smart_cinema_staff_owner','SET')::text")),"No protected owner membership");
        }
    }
    public static Properties properties(Path path)throws Exception {var p=new Properties();try(var reader=Files.newBufferedReader(path,StandardCharsets.UTF_8)){p.load(reader);}return p;}
    private static Connection connect(String user,String password,boolean readOnly)throws SQLException {
        var db=DriverManager.getConnection(URL,user,password);db.setReadOnly(readOnly);
        if(readOnly)db.setAutoCommit(false);
        try(var command=db.createStatement()){command.execute("SET statement_timeout='5s'");command.execute("SET lock_timeout='2s'");}
        return db;
    }
    public static Connection runtime()throws SQLException {return connect(base.getProperty("spring.datasource.username"),base.getProperty("spring.datasource.password"),false);}
    public static Connection runtimeRead()throws SQLException {return connect(base.getProperty("spring.datasource.username"),base.getProperty("spring.datasource.password"),true);}
    public static Connection operator()throws SQLException {return connect(operator.getProperty("user"),operator.getProperty("password"),false);}
    public static Connection operatorRead()throws SQLException {return connect(operator.getProperty("user"),operator.getProperty("password"),true);}
    public static String scalar(Connection db,String sql,Object... args)throws SQLException {
        try(var command=db.prepareStatement(sql)){for(int i=0;i<args.length;i++)command.setObject(i+1,args[i]);try(var row=command.executeQuery()){if(!row.next())throw new IllegalStateException("Expected SQL result");return row.getString(1);}}
    }
    public static void execute(Connection db,String sql)throws SQLException {try(var command=db.createStatement()){command.execute(sql);}}
    private static Map<String,String> snapshot(Connection db)throws SQLException {
        var result=new TreeMap<String,String>();
        for(String table:List.of("users","cinemas","halls","movies","seats","showtimes","showtime_seats","seat_holds","bookings","booking_seats","booking_concessions",
                "payment_transactions","payment_evidence","payment_reconciliations","tickets","audit_records","cinema_assignments","staff_onboarding","staff_invitations","staff_invitation_deliveries","concession_items","promotions","flyway_schema_history")){
            String id=table.equals("flyway_schema_history")?"installed_rank":table.equals("staff_onboarding")?"user_id":"id";
            try(var command=db.createStatement();var rows=command.executeQuery("SELECT "+id+"::text,md5(r::text) FROM "+table+" r ORDER BY "+id)){
                while(rows.next())result.put("row:"+table+":"+rows.getString(1),rows.getString(2));
            }
        }
        try(var command=db.createStatement();var rows=command.executeQuery("SELECT n.nspname||'.'||p.proname||':'||p.oid,md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','app') AND p.prokind='f'")){
            while(rows.next())result.put("function:"+rows.getString(1),rows.getString(2));
        }
        result.put("roles",scalar(db,"SELECT md5(string_agg(rolname||':'||rolsuper||':'||rolcreatedb||':'||rolcreaterole||':'||rolcanlogin||':'||rolbypassrls,',' ORDER BY rolname)) FROM pg_roles"));
        result.put("memberships",scalar(db,"SELECT md5(coalesce(string_agg(r::text,',' ORDER BY roleid,member),'')) FROM pg_auth_members r"));
        for(String table:List.of("payment_transactions","payment_evidence","payment_reconciliations","tickets","concession_items","promotions"))result.put("count:"+table,scalar(db,"SELECT count(*) FROM "+table));
        return result;
    }
    private static void before()throws Exception {
        try(var db=operatorRead()){
            require("16:0".equals(scalar(db,"SELECT max(version::int)||':'||count(*) FILTER(WHERE NOT success) FROM flyway_schema_history")),"Expected pre-migration V16");
            for(String name:List.of("configure_hall","configure_hall_layout","configure_seat","configure_showtime")){
                String body=scalar(db,"SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=?",name);
                require(body.contains("PERFORM public.lock_admin_configuration(p_actor);"),"Expected protected writer authorization anchor");
            }
            Files.writeString(EVIDENCE.resolve("database-before.json"),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(snapshot(db)),StandardCharsets.UTF_8);
        }
        System.out.println("MANAGER_READ_ONLY_PREFLIGHT=PASS; V16; original rows/guards/roles snapshotted; no database changes");
    }
    private static void grant()throws Exception {
        try(var db=operator()){
            require("17:0".equals(scalar(db,"SELECT max(version::int)||':'||count(*) FILTER(WHERE NOT success) FROM flyway_schema_history")),"Approved V17 must be installed first");
            require("smart_cinema_staff_owner".equals(scalar(db,"SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text)'::regprocedure")),"Protected function owner required");
            execute(db,"GRANT EXECUTE ON FUNCTION public.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text) TO smartcinema_phase4e_app");
        }
        System.out.println("APPROVED_MANAGER_WRAPPER_EXECUTE=PASS; no runtime DML or role membership granted");
    }
    public static void preflight()throws Exception {
        configure();try(var db=runtimeRead()){
            require("17:0".equals(scalar(db,"SELECT max(version::int)||':'||count(*) FILTER(WHERE NOT success) FROM flyway_schema_history")),"V17 required before fixtures");
            require("true".equals(scalar(db,"SELECT has_function_privilege(current_user,'public.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text)','EXECUTE')::text")),"Approved narrow wrapper grant required");
        }
    }
    public static void preserved()throws Exception {
        @SuppressWarnings("unchecked") var before=(Map<String,String>)JSON.readValue(Files.readString(EVIDENCE.resolve("database-before.json")),Map.class);
        Map<String,String> now;try(var db=operatorRead()){now=snapshot(db);}
        var expectedChanged=Set.of("configure_hall","configure_hall_layout","configure_seat","configure_showtime","staff_guard_audit");
        for(var entry:before.entrySet()){
            if(entry.getKey().startsWith("function:")&&expectedChanged.stream().anyMatch(name->entry.getKey().startsWith("function:public."+name+":")))continue;
            require(Objects.equals(entry.getValue(),now.get(entry.getKey())),"Original data, history, role or protected function changed: "+entry.getKey());
        }
        Files.writeString(EVIDENCE.resolve("preservation.txt"),"PASS: original rows, V1-V16 history, financial counts/guards and roles preserved; only five approved function definitions changed.\n",StandardCharsets.UTF_8);
        System.out.println("MANAGER_PRESERVATION=PASS; original rows/history/financial guards/roles unchanged");
    }
    public record Account(long id,String email) { @Override public String toString(){return "SyntheticAccount[redacted]";} }
    public static Account account(String role)throws Exception {
        String email="qa-manager-"+UUID.randomUUID()+"@example.test";
        try(var db=operator()){
            long id=Long.parseLong(scalar(db,"INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,?,'QA Manager operations','+84910000000',?,'ACTIVE') RETURNING id",email,new BCryptPasswordEncoder().encode(PASSWORD),role));
            return new Account(id,email);
        }
    }
    public static long cinema(long admin)throws SQLException {try(var db=runtime()){return Long.parseLong(scalar(db,"SELECT configure_cinema(?,NULL,?,'QA local',NULL,NULL,'ACTIVE')",admin,"QA Manager "+UUID.randomUUID()));}}
    public static long hall(long actor,long cinema,int capacity)throws SQLException {try(var db=runtime()){return Long.parseLong(scalar(db,"SELECT configure_hall(?,?,NULL,'QA Hall',?,'2D','ACTIVE')",actor,cinema,capacity));}}
    public static long assign(long admin,long manager,long cinema,Instant effective)throws SQLException {try(var db=runtime()){return Long.parseLong(scalar(db,"SELECT admin_assign_manager(?,?,?,?::timestamptz,NULL,'ACTIVE')",admin,manager,cinema,effective.toString()));}}
    public static void assignmentStatus(long admin,long manager,long assignment,String status)throws SQLException {try(var db=runtime()){scalar(db,"SELECT admin_assign_manager(?,?,NULL,NULL,?,?)",admin,manager,assignment,status);}}
    public static long auditCount(long actor)throws SQLException {try(var db=operatorRead()){return Long.parseLong(scalar(db,"SELECT count(*) FROM audit_records WHERE actor_user_id=?",actor));}}
    public static void require(boolean condition,String message){if(!condition)throw new IllegalStateException(message);}
}
