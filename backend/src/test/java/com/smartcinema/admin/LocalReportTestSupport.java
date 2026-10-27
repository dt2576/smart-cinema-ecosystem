package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Read-only runtime only. No operator credentials, DDL, fixtures persisted, seeds or migration calls. */
final class LocalReportTestSupport {
    static final String URL="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    static final Path EVIDENCE=Path.of("target/admin-reporting-dashboard-2026-10-27");
    static Properties config;
    static Map<String,String> original;
    static synchronized void preflight()throws Exception {
        if(config!=null)return;
        var p=read(Path.of(".env.local-test"));
        assertThat(p.getProperty("spring.datasource.url")).isEqualTo(URL);
        assertThat(p.getProperty("spring.flyway.url")).isEqualTo(URL);
        assertThat(p.getProperty("spring.datasource.username")).isEqualTo("smartcinema_phase4e_app");
        assertThat(p.getProperty("spring.config.import")).isEmpty();
        for(String key:List.of("vnpay.enabled","staff.invitations.delivery-enabled","seat-hold.cleanup-enabled"))assertThat(p.getProperty(key)).isEqualTo("false");
        config=p;
        try(var db=open()) {
            assertThat(value(db,"SELECT current_database()||':'||host(inet_server_addr())||':'||inet_server_port()")).isEqualTo("smartcinema_phase4e_test:127.0.0.1:5432");
            assertThat(value(db,"SELECT (NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls)::text FROM pg_roles WHERE rolname=current_user")).isEqualTo("true");
            assertThat(value(db,"SELECT pg_has_role(current_user,'smart_cinema_hold_owner','SET')::text")).isEqualTo("false");
            assertThat(value(db,"SHOW transaction_read_only")).isEqualTo("on");
            long source;
            try(var files=Files.list(Path.of("src/main/resources/db/migration"))) {
                source=files.filter(f->f.getFileName().toString().matches("V[1-9][0-9]*__.+\\.sql")).count();
            }
            assertThat(value(db,"SELECT max(version::integer)::text||':'||count(*)::text||':'||count(*) FILTER(WHERE NOT success)::text FROM flyway_schema_history")).isEqualTo(source+":"+source+":0");
            original=snapshot(db);
        }
        Files.createDirectories(EVIDENCE);
        Files.writeString(EVIDENCE.resolve("database-before.json"),tools.jackson.databind.json.JsonMapper.builder().build()
            .writerWithDefaultPrettyPrinter().writeValueAsString(original),StandardCharsets.UTF_8);
    }
    static Properties read(Path path)throws Exception {
        var p=new Properties();try(var reader=Files.newBufferedReader(path,StandardCharsets.UTF_8)){p.load(reader);}return p;
    }
    static Connection open()throws SQLException {
        var db=DriverManager.getConnection(URL,config.getProperty("spring.datasource.username"),config.getProperty("spring.datasource.password"));
        db.setReadOnly(true);db.setAutoCommit(false);
        try(var statement=db.createStatement()){statement.execute("SET LOCAL statement_timeout='5s'");statement.execute("SET LOCAL lock_timeout='2s'");}
        return db;
    }
    static JdbcTemplate jdbc(Connection db) { return new JdbcTemplate(new SingleConnectionDataSource(db,true)); }
    static String value(Connection db,String sql)throws SQLException {
        try(var statement=db.createStatement();var r=statement.executeQuery(sql)){r.next();return r.getString(1);}
    }
    static Map<String,String> snapshot(Connection db)throws SQLException {
        var result=new TreeMap<String,String>();
        for(String table:List.of("users","cinemas","halls","movies","seats","showtimes","showtime_seats","seat_holds","bookings",
                "booking_seats","booking_concessions","payment_transactions","tickets","promotions","concession_items","flyway_schema_history")) {
            String order=table.equals("flyway_schema_history")?"installed_rank":"id";
            result.put(table,value(db,"SELECT count(*)||':'||md5(coalesce(string_agg(md5(r::text),'' ORDER BY r."+order+"),'')) FROM "+table+" r"));
        }
        result.put("guards",value(db,"SELECT md5(coalesce(string_agg(pg_get_functiondef(p.oid),'' ORDER BY p.oid),'')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','app') AND p.prokind='f'"));
        return result;
    }
    static void preserved()throws Exception {
        try(var db=open()){assertThat(snapshot(db)).as("Existing business rows, Flyway history and guard definitions unchanged").isEqualTo(original);}
        Files.writeString(EVIDENCE.resolve("database-preservation.txt"),"PASS: runtime READ ONLY; business rows, Flyway history and guard definitions unchanged.\n",StandardCharsets.UTF_8);
    }
}
