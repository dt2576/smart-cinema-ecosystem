package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.sql.*;
import java.util.*;

/** Opt-in, fixed-database fixtures only. Never grants privileges, migrates, seeds or disables guards. */
final class LocalConcessionTestSupport {
    static final String URL="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    static final Path EVIDENCE=Path.of("target/admin-concession-verification-2026-10-26");
    private static Properties base,operator;
    private static Map<String,Map<String,Long>> originalRows;
    private static String originalGuards;
    private static boolean verified;
    private LocalConcessionTestSupport() { }

    static synchronized void preflight() throws Exception {
        assertThat("true".equals(System.getenv("ADMIN_CONCESSION_OPERATOR_APPROVED")))
            .as("Explicit approval required for operator fixtures/audit; runtime privileges never expanded").isTrue();
        if(verified)return;
        var candidate=read(Path.of(".env.local-test"));
        assertThat(URL.equals(candidate.getProperty("spring.datasource.url"))&&URL.equals(candidate.getProperty("spring.flyway.url"))).as("Exact local URLs").isTrue();
        assertThat(candidate.getProperty("spring.datasource.username")).isEqualTo("smartcinema_phase4e_app");
        assertThat(candidate.getProperty("spring.flyway.user")).isEqualTo("smartcinema_phase4e_migrator");
        assertThat(candidate.getProperty("spring.config.import")).isEmpty();
        for(String key:List.of("vnpay.enabled","staff.invitations.delivery-enabled","seat-hold.cleanup-enabled"))assertThat(candidate.getProperty(key)).isEqualTo("false");
        for(String key:candidate.stringPropertyNames())if(key.startsWith("vnpay.")&&key.endsWith("confirmed"))assertThat(candidate.getProperty(key)).isEqualTo("false");
        assertThat(candidate.getProperty("vnpay.system-db-url")).isEmpty();
        assertThat(candidate.getProperty("spring.mail.host")).isEqualTo("127.0.0.1");
        Path operatorPath=Path.of(".env.local-test-migration");
        var acl=Files.getFileAttributeView(operatorPath,AclFileAttributeView.class);
        assertThat(acl!=null).as("Windows private operator ACL").isTrue();
        var owner=acl.getOwner();
        assertThat(acl.getAcl().stream().noneMatch(a->a.type()==AclEntryType.ALLOW&&!owner.equals(a.principal()))).as("Owner-only operator input").isTrue();
        var privateOperator=read(operatorPath);
        assertThat(URL.equals(privateOperator.getProperty("url"))).as("Operator exact local URL").isTrue();
        assertThat(privateOperator.getProperty("user")).isEqualTo("postgres");
        base=candidate;operator=privateOperator;
        for(boolean migration:List.of(false,true))try(var db=restricted(migration)) {
            db.setReadOnly(true);
            assertThat(scalar(db,"SELECT (NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)::text FROM pg_roles WHERE rolname=current_user")).isEqualTo("true");
            assertThat(scalar(db,"SELECT pg_has_role(current_user,'smart_cinema_hold_owner','SET')::text")).isEqualTo("false");
            assertThat(scalar(db,"SELECT count(*) FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)")).isEqualTo("0");
            assertThat(scalar(db,"SELECT max(version::int)::text||':'||count(*) FILTER(WHERE success)::text||':'||count(*) FILTER(WHERE NOT success)::text FROM flyway_schema_history")).isEqualTo("15:15:0");
        }
        try(var db=operator()) {
            db.setReadOnly(true);
            assertThat(scalar(db,"SELECT rolsuper::text FROM pg_roles WHERE rolname=current_user")).isEqualTo("true");
            originalRows=rows(db);originalGuards=guards(db);
        }
        Files.createDirectories(EVIDENCE);
        try(var db=runtime()) {
            assertThat(scalar(db,"SELECT has_function_privilege(current_user,'public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)','EXECUTE')::text")).isEqualTo("true");
        }
        System.out.println("LOCAL_CONCESSION_PREFLIGHT=PASS; V15; restricted runtime/migrator unchanged; approved operator fixtures only");
        verified=true;
    }
    static Properties read(Path path)throws Exception {
        var p=new Properties();try(Reader in=Files.newBufferedReader(path,StandardCharsets.UTF_8)){p.load(in);}return p;
    }
    private static Connection restricted(boolean migration)throws SQLException {
        return connect(base.getProperty(migration?"spring.flyway.user":"spring.datasource.username"),base.getProperty(migration?"spring.flyway.password":"spring.datasource.password"));
    }
    static Connection runtime()throws SQLException{return restricted(false);}
    static Connection operator()throws SQLException{return connect(operator.getProperty("user"),operator.getProperty("password"));}
    private static Connection connect(String user,String password)throws SQLException {
        var login=new Properties();login.setProperty("user",user);login.setProperty("password",password);login.setProperty("ApplicationName","smartcinema_concession_verification");
        var db=DriverManager.getConnection(URL,login);
        try(var q=db.createStatement();var r=q.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),session_user,current_schema()")) {
            r.next();if(!"smartcinema_phase4e_test".equals(r.getString(1))||!"127.0.0.1".equals(r.getString(2))||r.getInt(3)!=5432||!user.equals(r.getString(4))||!"public".equals(r.getString(5)))throw new SQLException("Local fixture target mismatch");
            return db;
        }catch(Exception e){db.close();throw e;}
    }
    static String scalar(Connection db,String sql,Object... values)throws SQLException {
        try(var q=db.prepareStatement(sql)){for(int i=0;i<values.length;i++)q.setObject(i+1,values[i]);try(var r=q.executeQuery()){return r.next()?r.getString(1):null;}}
    }
    private static Map<String,Map<String,Long>> rows(Connection db)throws SQLException {
        var tables=new ArrayList<String>();
        try(var q=db.createStatement();var r=q.executeQuery("SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname")){while(r.next())tables.add(r.getString(1));}
        Map<String,Map<String,Long>> result=new TreeMap<>();
        for(String table:tables) {
            if(!table.matches("[a-z_]+"))throw new SQLException("Unexpected table identifier");
            var hashes=new TreeMap<String,Long>();
            try(var q=db.createStatement();var r=q.executeQuery("SELECT md5(to_jsonb(t)::text),count(*) FROM public.\""+table+"\" t GROUP BY 1")){while(r.next())hashes.put(r.getString(1),r.getLong(2));}
            result.put(table,hashes);
        }
        return result;
    }
    private static String guards(Connection db)throws SQLException {
        return scalar(db,"SELECT md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid),'' ORDER BY c.relname,t.tgname),'')) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal");
    }
    static void verifyPreserved()throws Exception {
        if(originalRows==null)return;
        try(var db=operator()) {
            db.setReadOnly(true);var current=rows(db);
            for(var table:originalRows.entrySet())for(var row:table.getValue().entrySet())
                assertThat(current.getOrDefault(table.getKey(),Map.of()).getOrDefault(row.getKey(),0L)).as("Preserve original rows: %s",table.getKey()).isGreaterThanOrEqualTo(row.getValue());
            assertThat(current.get("flyway_schema_history")).isEqualTo(originalRows.get("flyway_schema_history"));
            assertThat(guards(db)).as("All pre-existing integrity guards unchanged; fault trigger removed").isEqualTo(originalGuards);
            assertThat(scalar(db,"SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'phase5b_reject_%'")).isEqualTo("0");
        }
        try(var db=runtime()) {
            for(String p:List.of("INSERT","UPDATE","DELETE","TRUNCATE"))assertThat(scalar(db,"SELECT has_table_privilege(current_user,'public.concession_items',?)::text",p)).isEqualTo("false");
            assertThat(scalar(db,"SELECT has_function_privilege(current_user,'public.configure_concession_item(bigint,text,text,text,numeric,text,text)','EXECUTE')::text")).isEqualTo("false");
        }
        System.out.println("PRESERVATION=PASS; original rows, Flyway history, guards and restricted runtime preserved; new fixtures retained");
    }
}
