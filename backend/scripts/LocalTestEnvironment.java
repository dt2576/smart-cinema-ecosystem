import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.sql.*;
import java.util.*;

/** Local-only environment tooling. Never reads backend/.env or invokes a business command. */
public final class LocalTestEnvironment {
    private static final String DATABASE = "smartcinema_phase4e_test";
    private static final String APP = "smartcinema_phase4e_app";
    private static final String MIGRATOR = "smartcinema_phase4e_migrator";
    private static final String URL = "jdbc:postgresql://127.0.0.1:5432/" + DATABASE + "?sslmode=disable&connectTimeout=5&socketTimeout=15";
    private static final Path CONFIG = Path.of(".env.local-test");
    private static final Path EVIDENCE = Path.of("target/local-test-environment-2026-10-15");

    public static void main(String[] args) {
        try {
            if (args.length != 1) throw new IllegalStateException("Choose prepare, initial, verify, audit or restrict");
            switch (args[0]) {
                case "prepare" -> prepare();
                case "initial" -> verify(true);
                case "verify" -> verify(false);
                case "audit" -> audit();
                case "restrict" -> restrict();
                default -> throw new IllegalStateException("Unknown local-only action");
            }
        } catch (SQLException failure) {
            System.err.println("BLOCKED: local database operation failed; SQLSTATE=" + failure.getSQLState() + ". No repair/reset/retry performed.");
            System.exit(1);
        } catch (Exception failure) {
            // Only our fixed validation messages are emitted; no exception payload or credentials.
            System.err.println("BLOCKED: " + (failure instanceof IllegalStateException ? failure.getMessage() : "local configuration/verification failed"));
            System.exit(1);
        }
    }

    private static Properties read(Path path) throws IOException {
        Properties p = new Properties();
        try (Reader input = Files.newBufferedReader(path, StandardCharsets.UTF_8)) { p.load(input); }
        return p;
    }
    private static void audit() throws Exception {
        verify(false);
        Properties p = read(CONFIG);
        try (Connection db = connect(URL, p.getProperty("spring.datasource.username"), p.getProperty("spring.datasource.password"), true)) {
            // Only non-secret lifecycle metadata. Never select token digest, payload or credentials.
            System.out.println("LOCAL_ACCOUNT_COUNTS=" + scalar(db, "SELECT 'ADMIN_ACTIVE='||count(*) FILTER(WHERE role='ADMIN' AND status='ACTIVE')||';STAFF_BLOCKED='||count(*) FILTER(WHERE role='STAFF' AND status='BLOCKED') FROM users"));
            System.out.println("LOCAL_INVITATION_METADATA=" + scalar(db, "SELECT 'TOTAL='||count(*)||';REVOKED='||count(*) FILTER(WHERE revoked_at IS NOT NULL)||';CONSUMED='||count(*) FILTER(WHERE consumed_at IS NOT NULL)||';EXACT_24H='||count(*) FILTER(WHERE expires_at-issued_at=interval '24 hours') FROM staff_invitations"));
            System.out.println("LOCAL_DELIVERY_METADATA=" + scalar(db, "SELECT 'QUEUED='||count(*) FILTER(WHERE status='QUEUED')||';REVOKED='||count(*) FILTER(WHERE status='REVOKED')||';ATTEMPTS='||coalesce(sum(attempts),0) FROM staff_invitation_deliveries"));
            System.out.println("LOCAL_ASSIGNMENT_METADATA=" + scalar(db, "SELECT 'TOTAL='||count(*)||';ACTIVE_FUTURE='||count(*) FILTER(WHERE status='ACTIVE' AND effective_at>clock_timestamp()) FROM cinema_assignments"));
        }
    }
    private static Connection connect(String url, String user, String password, boolean readOnly) throws SQLException {
        if (!url.equals(URL) && !url.equals("jdbc:postgresql://127.0.0.1:5432/postgres?sslmode=disable&connectTimeout=5&socketTimeout=15"))
            throw new IllegalStateException("Datasource is not the exact approved loopback target");
        Properties p = new Properties(); p.setProperty("user", user); p.setProperty("password", password);
        p.setProperty("ApplicationName", "smartcinema_local_test_environment");
        p.setProperty("readOnly", Boolean.toString(readOnly)); p.setProperty("readOnlyMode", "always");
        Connection db = DriverManager.getConnection(url, p);
        db.setReadOnly(readOnly);
        try (Statement q = db.createStatement(); ResultSet r = q.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),current_user")) {
            r.next(); String expected = url.equals(URL) ? DATABASE : "postgres";
            if (!expected.equals(r.getString(1)) || !"127.0.0.1".equals(r.getString(2)) || r.getInt(3) != 5432 || !user.equals(r.getString(4)))
                throw new IllegalStateException("Local server/database/role identity verification failed");
        }
        return db;
    }
    private static String localDefault(Properties p, String property, String key) {
        String raw = p.getProperty(property, ""), prefix = "${" + key + ":";
        if (!raw.startsWith(prefix) || !raw.endsWith("}")) throw new IllegalStateException("Documented local administrator defaults unavailable");
        return raw.substring(prefix.length(), raw.length() - 1);
    }
    private static Connection administrator(boolean target) throws Exception {
        // Explicit repository localhost defaults only. Never import the remote .env.
        Properties p = read(Path.of("src/main/resources/application.properties"));
        return connect(target ? URL : "jdbc:postgresql://127.0.0.1:5432/postgres?sslmode=disable&connectTimeout=5&socketTimeout=15",
            localDefault(p,"spring.datasource.username","DB_USERNAME"), localDefault(p,"spring.datasource.password","DB_PASSWORD"), false);
    }
    private static String secret() { byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes); return HexFormat.of().formatHex(bytes); }
    private static String key() { byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes); return Base64.getEncoder().encodeToString(bytes); }
    private static String scalar(Connection c, String sql) throws SQLException {
        try (Statement q = c.createStatement(); ResultSet r = q.executeQuery(sql)) { return r.next() ? r.getString(1) : null; }
    }
    private static void sql(Connection c, String sql) throws SQLException { try (Statement q = c.createStatement()) { q.execute(sql); } }

    private static String snapshot(Connection db, String[] originalRoles) throws Exception {
        StringBuilder value = new StringBuilder();
        try (PreparedStatement q = db.prepareStatement("SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolconfig FROM pg_roles WHERE rolname=ANY(?) ORDER BY rolname")) {
            q.setArray(1, db.createArrayOf("text", originalRoles));
            try (ResultSet r = q.executeQuery()) { while (r.next()) for (int i=1;i<=11;i++) value.append(r.getString(i)).append('|'); }
        }
        try (PreparedStatement q = db.prepareStatement("SELECT a.rolname,b.rolname,g.rolname,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles a ON a.oid=m.roleid JOIN pg_roles b ON b.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE a.rolname=ANY(?) AND b.rolname=ANY(?) ORDER BY a.rolname,b.rolname,g.rolname")) {
            q.setArray(1, db.createArrayOf("text", originalRoles)); q.setArray(2, db.createArrayOf("text", originalRoles));
            try (ResultSet r = q.executeQuery()) { while (r.next()) for (int i=1;i<=6;i++) value.append(r.getString(i)).append('|'); }
        }
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8)));
    }
    private static void prepare() throws Exception {
        if (Files.exists(CONFIG) || Files.exists(EVIDENCE.resolve("original-roles.txt"))) throw new IllegalStateException("Local configuration/evidence already exists; inspect it, never overwrite");
        Properties p = read(Path.of("src/main/resources/application.properties"));
        String appPassword = secret(), migrationPassword = secret();
        try (Connection db = administrator(false)) {
            if (!"true".equals(scalar(db,"SELECT rolsuper::text FROM pg_roles WHERE rolname=current_user"))) throw new IllegalStateException("Local administrative privileges are unavailable");
            if (!"0".equals(scalar(db,"SELECT count(*) FROM pg_database WHERE datname='"+DATABASE+"'")) ||
                !"0".equals(scalar(db,"SELECT count(*) FROM pg_roles WHERE rolname IN ('"+APP+"','"+MIGRATOR+"')")))
                throw new IllegalStateException("Dedicated database/roles already exist; no reset or reuse attempted");
            Files.createDirectories(EVIDENCE);
            List<String> roles = new ArrayList<>();
            try (Statement q=db.createStatement(); ResultSet r=q.executeQuery("SELECT rolname FROM pg_roles ORDER BY rolname")) { while(r.next()) roles.add(r.getString(1)); }
            Files.write(EVIDENCE.resolve("original-roles.txt"),roles,StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
            Files.writeString(EVIDENCE.resolve("original-role-state.sha256"),snapshot(db,roles.toArray(String[]::new)),StandardOpenOption.CREATE_NEW);
            sql(db,"CREATE ROLE "+MIGRATOR+" LOGIN SUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '"+migrationPassword+"'");
            sql(db,"CREATE ROLE "+APP+" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS PASSWORD '"+appPassword+"'");
            sql(db,"CREATE DATABASE "+DATABASE+" OWNER "+MIGRATOR+" TEMPLATE template0");
        }
        try (Connection db=administrator(true)) {
            sql(db,"REVOKE CONNECT,TEMPORARY ON DATABASE "+DATABASE+" FROM PUBLIC");
            sql(db,"GRANT CONNECT ON DATABASE "+DATABASE+" TO "+APP);
            sql(db,"REVOKE CREATE ON SCHEMA public FROM PUBLIC");
            sql(db,"GRANT USAGE ON SCHEMA public TO "+APP);
            sql(db,"COMMENT ON DATABASE "+DATABASE+" IS 'Smart Cinema Phase 4E isolated local test; no seed or business accounts'");
        }
        p.setProperty("spring.config.import", ""); p.setProperty("spring.profiles.active", "local-test");
        p.setProperty("spring.datasource.url", URL); p.setProperty("spring.datasource.username",APP); p.setProperty("spring.datasource.password",appPassword);
        p.setProperty("spring.flyway.url", URL); p.setProperty("spring.flyway.user",MIGRATOR); p.setProperty("spring.flyway.password",migrationPassword);
        p.setProperty("spring.flyway.clean-disabled","true"); p.setProperty("spring.flyway.baseline-on-migrate","false");
        p.setProperty("server.address","127.0.0.1"); p.setProperty("server.port","8080");
        p.setProperty("seat-hold.cleanup-enabled","false"); p.setProperty("staff.invitations.delivery-enabled","false");
        p.setProperty("staff.invitations.activation-base-url","https://127.0.0.1:8443/staff/activate");
        p.setProperty("staff.invitations.encryption-keys","phase4e-local:"+key()); p.setProperty("staff.invitations.active-key-id","phase4e-local");
        p.setProperty("staff.invitations.from-address","sender@example.test"); p.setProperty("staff.invitations.allow-local-smtp","true");
        p.setProperty("spring.mail.host","127.0.0.1"); p.setProperty("spring.mail.port","1027");
        p.setProperty("spring.mail.username",""); p.setProperty("spring.mail.password","");
        for(String name:List.of("auth","starttls.enable","starttls.required","ssl.enable")) p.setProperty("spring.mail.properties.mail.smtp."+name,"false");
        p.setProperty("vnpay.enabled","false"); p.setProperty("vnpay.system-db-url",""); p.setProperty("vnpay.system-db-username",""); p.setProperty("vnpay.system-db-password","");
        for(String name:p.stringPropertyNames().stream().filter(n->n.startsWith("vnpay.")&&n.endsWith("confirmed")).toList()) p.setProperty(name,"false");
        p.setProperty("auth.jwt.secret",secret()); p.setProperty("spring.devtools.restart.enabled","false");
        try (Writer output=Files.newBufferedWriter(CONFIG,StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW)) { p.store(output,"PRIVATE local-only test configuration; never commit; no remote import"); }
        System.out.println("PREPARED: "+DATABASE+" at 127.0.0.1:5432; runtime="+APP+"; migrator="+MIGRATOR);
        System.out.println("Migration role is temporarily privileged for unchanged V1-V14; run restrict immediately after successful initial startup.");
    }
    private static Properties config() throws Exception {
        try(var migrations=Files.list(Path.of("src/main/resources/db/migration"))) {
            List<String> files=migrations.map(path->path.getFileName().toString()).filter(name->name.matches("V[0-9]+__.*\\.sql")).toList();
            if(files.size()!=14 || files.stream().anyMatch(name->Integer.parseInt(name.substring(1,name.indexOf("__")))>14))
                throw new IllegalStateException("Local launcher is audited for V1-V14 only; review a changed migration head before startup");
        }
        Properties p=read(CONFIG);
        if (!URL.equals(p.getProperty("spring.datasource.url")) || !URL.equals(p.getProperty("spring.flyway.url")) ||
            !APP.equals(p.getProperty("spring.datasource.username")) || !MIGRATOR.equals(p.getProperty("spring.flyway.user")) ||
            !p.getProperty("spring.config.import","not-empty").isEmpty() || !"local-test".equals(p.getProperty("spring.profiles.active")) ||
            !"false".equals(p.getProperty("seat-hold.cleanup-enabled")) || !"false".equals(p.getProperty("staff.invitations.delivery-enabled")) ||
            !"false".equals(p.getProperty("vnpay.enabled")) || !"127.0.0.1".equals(p.getProperty("spring.mail.host")) ||
            !p.getProperty("vnpay.system-db-url","not-empty").isEmpty() || !"127.0.0.1".equals(p.getProperty("server.address")))
            throw new IllegalStateException("Local configuration fails isolation safeguards");
        return p;
    }
    private static void verify(boolean initial) throws Exception {
        Properties p=config();
        try(Connection migration=connect(URL,MIGRATOR,p.getProperty("spring.flyway.password"),true)) {
            if(initial && !"true".equals(scalar(migration,"SELECT rolsuper::text FROM pg_roles WHERE rolname=current_user")))
                throw new IllegalStateException("Initial migration privilege unavailable; no privilege escalation attempted");
            System.out.println("FLYWAY_DATASOURCE=verified loopback dedicated database");
        }
        try(Connection db=connect(URL,APP,p.getProperty("spring.datasource.password"),true)) {
            if (!"on".equals(scalar(db,"SHOW transaction_read_only"))) throw new IllegalStateException("Read-only preflight not enforced");
            String owner=scalar(db,"SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()");
            if (!MIGRATOR.equals(owner)) throw new IllegalStateException("Dedicated database ownership changed");
            if (!"false|false|false".equals(scalar(db,"SELECT rolsuper::text||'|'||rolcreatedb::text||'|'||rolcreaterole::text FROM pg_roles WHERE rolname=current_user")))
                throw new IllegalStateException("Runtime role is not least privilege");
            boolean history="true".equals(scalar(db,"SELECT (to_regclass('public.flyway_schema_history') IS NOT NULL)::text"));
            if(initial) {
                if(history || !"0".equals(scalar(db,"SELECT count(*) FROM pg_tables WHERE schemaname='public'"))) throw new IllegalStateException("Initial migration requires the newly created empty database");
            } else {
                if(!history || !"14".equals(scalar(db,"SELECT version FROM public.flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1"))) throw new IllegalStateException("Expected V14 Flyway history unavailable");
                if(!"14|0".equals(scalar(db,"SELECT count(*) FILTER(WHERE success)::text||'|'||count(*) FILTER(WHERE NOT success)::text FROM public.flyway_schema_history")))
                    throw new IllegalStateException("Flyway history is not fourteen successful migrations");
                if(!"0".equals(scalar(db,"SELECT count(*) FROM pg_roles WHERE rolname='"+MIGRATOR+"' AND (rolsuper OR rolcreatedb OR rolcreaterole)"))) throw new IllegalStateException("Restrict the migration role before normal restart");
                if(!"0".equals(scalar(db,"SELECT count(*) FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)")))
                    throw new IllegalStateException("Runtime must not inherit cluster role memberships");
                for(String table:List.of("cinema_assignments","staff_onboarding","staff_invitations","staff_invitation_deliveries","staff_rate_limits"))
                    if(!"true".equals(scalar(db,"SELECT (to_regclass('public."+table+"') IS NOT NULL)::text"))) throw new IllegalStateException("Required Staff table missing");
                for(String ownerRole:List.of("smart_cinema_hold_runtime","smart_cinema_hold_owner","smart_cinema_configuration_owner","smart_cinema_staff_owner","smart_cinema_checkin_owner"))
                    if(!"false".equals(scalar(db,"SELECT pg_has_role(current_user,'"+ownerRole+"','MEMBER')::text"))) throw new IllegalStateException("Runtime has protected-owner membership");
                System.out.println("FLYWAY=V14; STAFF_TABLES=5/5; USERS="+scalar(db,"SELECT count(*) FROM users")+"; CINEMAS="+scalar(db,"SELECT count(*) FROM cinemas"));
            }
            System.out.println("VERIFIED: datasource/server=127.0.0.1:5432; database="+DATABASE+"; owner="+owner+"; runtime="+APP+"; readonly=on");
        }
        // Role catalogues are cluster-wide; audit them from the dedicated read-only connection.
        // Normal verification must not open even the local postgres maintenance database.
        if(!initial) try(Connection db=connect(URL,APP,p.getProperty("spring.datasource.password"),true)) {
            String[] roles=Files.readAllLines(EVIDENCE.resolve("original-roles.txt"),StandardCharsets.UTF_8).toArray(String[]::new);
            if(!snapshot(db,roles).equals(Files.readString(EVIDENCE.resolve("original-role-state.sha256")))) throw new IllegalStateException("Existing role attributes/memberships changed");
            System.out.println("EXISTING_ROLE_ATTRIBUTES_AND_MEMBERSHIPS=UNCHANGED");
        }
    }
    private static void restrict() throws Exception {
        config();
        try(Connection db=administrator(true)) {
            if(!"14".equals(scalar(db,"SELECT version FROM public.flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1"))) throw new IllegalStateException("Migration not at V14; no repair attempted");
            sql(db,"ALTER ROLE "+MIGRATOR+" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
            // Copy only this database's approved runtime ACL, never cluster-wide membership.
            sql(db,"REVOKE smart_cinema_hold_runtime FROM "+APP);
            List<String> grants=new ArrayList<>();
            String runtime="(SELECT oid FROM pg_roles WHERE rolname='smart_cinema_hold_runtime')";
            try(Statement q=db.createStatement(); ResultSet r=q.executeQuery("SELECT format('GRANT %s ON %s %I.%I TO %I',a.privilege_type,CASE WHEN c.relkind='S' THEN 'SEQUENCE' ELSE 'TABLE' END,n.nspname,c.relname,'"+APP+"') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname='public' AND a.grantee="+runtime)) { while(r.next()) grants.add(r.getString(1)); }
            try(Statement q=db.createStatement(); ResultSet r=q.executeQuery("SELECT format('GRANT %s (%I) ON TABLE %I.%I TO %I',a.privilege_type,col.attname,n.nspname,c.relname,'"+APP+"') FROM pg_attribute col JOIN pg_class c ON c.oid=col.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(col.attacl) a WHERE n.nspname='public' AND a.grantee="+runtime)) { while(r.next()) grants.add(r.getString(1)); }
            try(Statement q=db.createStatement(); ResultSet r=q.executeQuery("SELECT format('GRANT EXECUTE ON FUNCTION %s TO %I',p.oid::regprocedure,'"+APP+"') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE n.nspname='public' AND a.grantee="+runtime+" AND a.privilege_type='EXECUTE'")) { while(r.next()) grants.add(r.getString(1)); }
            for(String grant:grants) sql(db,grant);
            sql(db,"GRANT SELECT,INSERT,UPDATE ON users TO "+APP);
            sql(db,"GRANT SELECT,INSERT,UPDATE,DELETE ON refresh_tokens TO "+APP);
            sql(db,"GRANT SELECT ON genres,movie_genres,flyway_schema_history TO "+APP);
            sql(db,"GRANT USAGE ON SEQUENCE users_id_seq,refresh_tokens_id_seq TO "+APP);
        }
        verify(false);
    }
}
