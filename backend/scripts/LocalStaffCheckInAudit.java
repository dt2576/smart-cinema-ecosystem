import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Phase 4F read-only metadata evidence. No financial fixtures or business commands. */
public final class LocalStaffCheckInAudit {
    private static final String URL = "jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    public static void main(String[] args) {
        try {
            if (args.length != 0) throw new IllegalStateException();
            Properties config = new Properties();
            try (Reader input = Files.newBufferedReader(Path.of(".env.local-test"), StandardCharsets.UTF_8)) { config.load(input); }
            if (!URL.equals(config.getProperty("spring.datasource.url")) || !URL.equals(config.getProperty("spring.flyway.url"))
                || !"smartcinema_phase4e_app".equals(config.getProperty("spring.datasource.username"))
                || !"".equals(config.getProperty("spring.config.import"))
                || !"local-test".equals(config.getProperty("spring.profiles.active"))
                || !"false".equals(config.getProperty("vnpay.enabled"))
                || !"false".equals(config.getProperty("staff.invitations.delivery-enabled"))
                || !"false".equals(config.getProperty("seat-hold.cleanup-enabled"))
                || !"127.0.0.1".equals(config.getProperty("spring.mail.host"))) throw new IllegalStateException();
            for (String key : config.stringPropertyNames()) {
                if (key.startsWith("vnpay.") && key.endsWith("confirmed") && !"false".equals(config.getProperty(key))) throw new IllegalStateException();
            }
            for (String key : List.of("vnpay.system-db-url", "vnpay.system-db-username", "vnpay.system-db-password")) {
                if (!"".equals(config.getProperty(key))) throw new IllegalStateException();
            }
            Properties credentials = new Properties();
            credentials.setProperty("user", config.getProperty("spring.datasource.username"));
            credentials.setProperty("password", config.getProperty("spring.datasource.password"));
            credentials.setProperty("readOnly", "true"); credentials.setProperty("readOnlyMode", "always");
            credentials.setProperty("ApplicationName", "phase4f_readonly_metadata");
            try (Connection db = DriverManager.getConnection(URL, credentials)) {
                db.setReadOnly(true); db.setAutoCommit(false); db.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
                try (Statement statement = db.createStatement(); ResultSet r = statement.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),current_user,current_setting('transaction_read_only')")) {
                    r.next();
                    if (!"smartcinema_phase4e_test".equals(r.getString(1)) || !"127.0.0.1".equals(r.getString(2)) || r.getInt(3) != 5432
                        || !"smartcinema_phase4e_app".equals(r.getString(4)) || !"on".equals(r.getString(5))) throw new IllegalStateException();
                }
                System.out.println("ISOLATION=127.0.0.1:5432/smartcinema_phase4e_test;readonly=on;providers=disabled;delivery=disabled");
                for (String table : List.of("users", "cinemas", "cinema_assignments", "staff_onboarding", "staff_invitations", "staff_invitation_deliveries", "movies", "halls", "seats", "showtimes", "showtime_seats", "seat_holds", "bookings", "booking_seats", "payment_transactions", "tickets", "refresh_tokens", "staff_rate_limits")) {
                    emit(db, "COUNT_" + table, "SELECT count(*)::text FROM " + table);
                }
                emit(db, "ACTORS", "SELECT string_agg(id::text||':'||role||':'||status,',' ORDER BY id) FROM users");
                emit(db, "ONBOARDING", "SELECT string_agg(user_id::text||':setup='||(password_set_at IS NOT NULL)::text,',' ORDER BY user_id) FROM staff_onboarding");
                emit(db, "CINEMAS", "SELECT string_agg(id::text||':'||status,',' ORDER BY id) FROM cinemas");
                emit(db, "ASSIGNMENTS", "SELECT string_agg(id::text||':user='||user_id::text||':cinema='||cinema_id::text||':'||assignment_type||':'||status||':effective='||effective_at::text||':future='||(effective_at>clock_timestamp())::text,',' ORDER BY id) FROM cinema_assignments");
                emit(db, "ISSUED", "SELECT 'paid='||count(*) FILTER(WHERE status='PAID')||';qr='||count(*) FILTER(WHERE booking_qr_token IS NOT NULL) FROM bookings");
                emit(db, "AUDIT_SELECT_PRIVILEGE", "SELECT has_table_privilege(current_user,'audit_records','SELECT')::text");
                // Fingerprints remain in SQL. No PII, passwords, token material or QR values leave JDBC.
                fingerprint(db, "users", "SELECT id,role,status,full_name,email,phone,updated_at FROM users");
                fingerprint(db, "assignments", "SELECT * FROM cinema_assignments");
                fingerprint(db, "onboarding", "SELECT user_id,password_set_at FROM staff_onboarding");
                for (String table : List.of("cinemas", "movies", "halls", "seats", "showtimes", "showtime_seats", "seat_holds", "bookings", "booking_seats", "payment_transactions", "tickets")) fingerprint(db, table, "SELECT * FROM " + table);
                db.rollback();
            }
        } catch (Exception failure) {
            System.err.println("BLOCKED: local read-only evidence unavailable; details withheld; no repair or retry performed.");
            System.exit(1);
        }
    }
    private static void emit(Connection db, String label, String sql) throws SQLException {
        try (Statement statement = db.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next(); System.out.println(label + "=" + Objects.toString(result.getString(1), "EMPTY"));
        }
    }
    private static void fingerprint(Connection db, String label, String query) throws SQLException {
        emit(db, "HASH_" + label, "SELECT md5(coalesce(string_agg(value,'' ORDER BY value),'')) FROM (SELECT md5(to_jsonb(row)::text) AS value FROM (" + query + ") row) hashes");
    }
}
