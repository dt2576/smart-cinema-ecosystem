package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.lang.reflect.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Existing PRIMARY connection, enforced READ ONLY, query-local fixtures only. No alternate database. */
final class ManagerReportReadTestSupport {
    static final Path EVIDENCE=Path.of("target/manager-reporting-2026-10-29");
    static Properties config;
    static Map<String,String> baseline;
    static void preflight() throws Exception {
        config=new Properties();
        try(var reader=Files.newBufferedReader(Path.of(".env"),StandardCharsets.UTF_8)) { config.load(reader); }
        for(String key:List.of("DB_URL","DB_USERNAME","DB_PASSWORD")) {
            String override=System.getenv(key);
            if(override!=null&&!override.equals(config.getProperty(key)))throw new IllegalStateException("PRIMARY override differs from existing configuration");
        }
        var uri=new URI(config.getProperty("DB_URL").substring(5));
        assertThat(uri.getHost()).endsWith(".neon.tech");assertThat(uri.getPath()).isEqualTo("/neondb");
        assertThat(uri.getQuery()).contains("sslmode=require");
        try(var db=open()) {
            assertThat(value(db,"SELECT current_database()")).isEqualTo("neondb");
            assertThat(value(db,"SHOW transaction_read_only")).isEqualTo("on");
            assertThat(value(db,"SELECT max(version::int)||':'||count(*) FILTER(WHERE NOT success) FROM flyway_schema_history")).isEqualTo("18:0");
            baseline=snapshot(db);
        }
        Files.createDirectories(EVIDENCE);
    }
    static Connection open() throws Exception {
        var login=new Properties();login.setProperty("user",config.getProperty("DB_USERNAME"));login.setProperty("password",config.getProperty("DB_PASSWORD"));
        login.setProperty("readOnly","true");login.setProperty("readOnlyMode","always");login.setProperty("connectTimeout","10");login.setProperty("socketTimeout","30");
        var db=DriverManager.getConnection(config.getProperty("DB_URL"),login);db.setReadOnly(true);db.setAutoCommit(false);
        try(var s=db.createStatement()) { s.execute("SET LOCAL statement_timeout='5s'");s.execute("SET LOCAL lock_timeout='2s'"); }
        return db;
    }
    static String value(Connection db,String sql) throws Exception {
        try(var statement=db.createStatement();var rows=statement.executeQuery(sql)) { rows.next();return rows.getString(1); }
    }
    static Map<String,String> snapshot(Connection db) throws Exception {
        var result=new TreeMap<String,String>();
        for(String table:List.of("users","cinema_assignments","cinemas","halls","seats","movies","showtimes","showtime_seats","seat_holds",
                "bookings","booking_seats","booking_concessions","concession_items","promotions","payment_transactions","payment_evidence","tickets","audit_records","flyway_schema_history"))
            result.put(table,value(db,"SELECT count(*)||':'||md5(coalesce(string_agg(md5(r::text),'' ORDER BY md5(r::text)),'')) FROM "+table+" r"));
        result.put("functions",value(db,"SELECT md5(string_agg(pg_get_functiondef(p.oid),'' ORDER BY p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','app') AND p.prokind='f'"));
        return result;
    }
    static void preserved() throws Exception {
        try(var db=open()) { assertThat(snapshot(db)).as("No business rows, Flyway history or protected function changed").isEqualTo(baseline); }
        Files.writeString(EVIDENCE.resolve("readonly-preservation.txt"),"PASS: PRIMARY READ ONLY; query-local WITH/VALUES fixtures; 19 tables/history and protected function fingerprints unchanged.\n");
    }
    static JdbcTemplate fixtures(Connection db,Supplier<String> fixture) {
        var proxy=(Connection)Proxy.newProxyInstance(ManagerReportReadTestSupport.class.getClassLoader(),new Class<?>[]{Connection.class},(object,method,args)->{
            if(method.getName().equals("prepareStatement")&&args[0] instanceof String sql) {
                if(sql.startsWith("WITH "))args[0]="WITH "+fixture.get()+","+sql.substring(5);
                else if(sql.stripLeading().startsWith("SELECT"))args[0]="WITH "+fixture.get()+" "+sql;
                else throw new AssertionError("Fixture queries must be SELECT/WITH only");
            }
            try { return method.invoke(db,args); } catch(InvocationTargetException failure) { throw failure.getCause(); }
        });
        return new JdbcTemplate(new SingleConnectionDataSource(proxy,true));
    }
}
