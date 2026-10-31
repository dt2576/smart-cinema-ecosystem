import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.net.URI;
import java.sql.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.logging.Logger;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;

/** PRIMARY Neon status/startup gate. Privileged migration uses a separate, approved connection. */
public final class PrimaryDatabase {
    private static final Path STATE = Path.of("target/primary-dev");
    private static final List<String> SECRETS = new ArrayList<>();
    private static Properties runtime;
    private static String database;
    private record Status(String installed, int source, int pending, int failed) { }
    static final String V19_SHA256="E528550DD23B4658D4C457E21032EFA3C16F0AE788659A5788E163202CCA0E1E";
    record MigrationPlan(List<Integer> versions,Set<String> owners,Set<String> createOwners,boolean userReferences,int target) { }

    public static void main(String[] args) {
        try {
            if (args.length == 0 || !Set.of("status", "check", "migrate").contains(args[0])) throw new IllegalStateException("Expected status/check/migrate");
            if (args[0].equals("migrate") && (args.length != 2 || !args[1].equals("--approved"))) throw new IllegalStateException("Explicit operator approval required: pnpm db:migrate --approved");
            if (!args[0].equals("migrate") && args.length != 1) throw new IllegalStateException("Unexpected arguments");
            runtime = configuration(); Files.createDirectories(STATE);
            Status status = status();
            if (args[0].equals("status")) return;
            if (status.pending == 0) { System.out.println("MIGRATION=SKIPPED; schema is current; migration credentials not loaded"); return; }
            if (args[0].equals("check")) throw new IllegalStateException("Pending PRIMARY migrations require a separately approved migration connection. Services were not started. Run pnpm db:status; review docs/development/neon-migration-workflow.md");
            migrate(status);
        } catch (Exception failure) {
            System.err.println("PRIMARY STARTUP STOPPED: " + safe(failure.getMessage()));
            for (Throwable cause = failure.getCause(); cause != null; cause = cause.getCause()) System.err.println("CAUSE: " + safe(cause.getMessage()));
            System.err.println("No clean, repair, baseline, role grant or automatic migration retry performed.");
            System.exit(1);
        }
    }
    private static Properties configuration() throws Exception {
        for (String key : System.getenv().keySet()) if (key.matches("(?i)SPRING[._].*|JAVA_TOOL_OPTIONS|JDK_JAVA_OPTIONS|JAVA_OPTS|MAVEN_OPTS|MAVEN_ARGS"))
            throw new IllegalStateException("Conflicting startup override " + key + "; use a clean terminal (value withheld)");
        Properties values = new Properties();
        // Match application.properties imports with Maven's backend/ working directory.
        for (Path file : List.of(Path.of("backend/.env"), Path.of(".env"))) if (Files.exists(file)) try (var reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) { values.load(reader); }
        for (String key : List.of("DB_URL", "DB_USERNAME", "DB_PASSWORD")) if (System.getenv(key) != null) values.setProperty(key, System.getenv(key));
        remember(values);
        for (String key : values.stringPropertyNames()) if (key.startsWith("spring.") || key.startsWith("SPRING_")) throw new IllegalStateException("Direct Spring override in primary .env is unsupported by this guard: " + key);
        String url = values.getProperty("DB_URL", "");
        URI uri;
        try { uri = new URI(url.startsWith("jdbc:") ? url.substring(5) : "invalid:"); }
        catch (Exception ignored) { throw new IllegalStateException("Invalid PRIMARY JDBC URL; value withheld"); }
        if (!url.startsWith("jdbc:postgresql://") || uri.getHost() == null || !uri.getHost().endsWith(".neon.tech")
                || uri.getUserInfo() != null || uri.getPath() == null || !uri.getPath().matches("/[A-Za-z0-9_]+")
                || uri.getQuery() == null || !Arrays.stream(uri.getQuery().split("&")).anyMatch(value -> Set.of("sslmode=require", "sslmode=verify-full").contains(value))
                || uri.getQuery().matches("(?i).*(?:^|&)(?:user|password|options|currentSchema)=.*"))
            throw new IllegalStateException("Configured PRIMARY Neon JDBC URL with required TLS and no identity override required; no local fallback");
        database = uri.getPath().substring(1);
        if (values.getProperty("DB_USERNAME", "").isBlank() || values.getProperty("DB_PASSWORD", "").isBlank()) throw new IllegalStateException("Existing PRIMARY DB_USERNAME/DB_PASSWORD required; no default credentials");
        return values;
    }
    private static void remember(Properties values) {
        for (String key : values.stringPropertyNames()) if (key.matches("(?i).*(password|secret|encryption.keys).*")) {
            String value = values.getProperty(key); if (!value.isBlank()) SECRETS.add(value);
        }
        SECRETS.sort(Comparator.comparingInt(String::length).reversed());
    }
    private static String safe(String value) {
        String result = value == null ? "Operation unavailable" : value;
        for (String secret : SECRETS) result = result.replace(secret, "<redacted>");
        return result.replaceAll("(?i)(password\\s*[=:]\\s*)[^\\s;,]+", "$1<redacted>");
    }
    private static Connection connect(String user, String password, boolean readOnly) throws SQLException {
        Properties login = new Properties(); login.setProperty("user", user); login.setProperty("password", password);
        login.setProperty("readOnly", Boolean.toString(readOnly)); login.setProperty("readOnlyMode", "always");
        login.setProperty("connectTimeout", "10"); login.setProperty("socketTimeout", readOnly?"30":"150"); login.setProperty("ApplicationName", "smartcinema_primary_dev");
        Connection db = DriverManager.getConnection(runtime.getProperty("DB_URL"), login);
        try {
            db.setReadOnly(readOnly);
            try (var statement = db.createStatement(); var row = statement.executeQuery("SELECT current_database(),session_user,current_schema(),current_setting('transaction_read_only')")) {
                if (!row.next() || !database.equals(row.getString(1)) || !user.equals(row.getString(2)) || !"public".equals(row.getString(3)) || readOnly && !"on".equals(row.getString(4))) throw new SQLException("PRIMARY connection identity/read-only mismatch", "08004");
            }
            return db;
        } catch (Exception failure) { db.close(); throw failure; }
    }
    private static DataSource source(String user, String password, boolean readOnly) {
        return new DataSource() {
            public Connection getConnection() throws SQLException { return connect(user, password, readOnly); }
            public Connection getConnection(String u, String p) throws SQLException { throw new SQLException("Connection override denied"); }
            public PrintWriter getLogWriter() { return null; }
            public void setLogWriter(PrintWriter writer) { }
            public void setLoginTimeout(int seconds) { }
            public int getLoginTimeout() { return 10; }
            public Logger getParentLogger() { return Logger.getGlobal(); }
            public <T> T unwrap(Class<T> type) throws SQLException { throw new SQLException("Unwrap denied"); }
            public boolean isWrapperFor(Class<?> type) { return false; }
        };
    }
    private static Flyway flyway(String user, String password, boolean readOnly) {
        return Flyway.configure().dataSource(source(user, password, readOnly)).defaultSchema("public").schemas("public").createSchemas(false)
                .locations("filesystem:src/main/resources/db/migration").validateMigrationNaming(true).validateOnMigrate(true)
                .cleanDisabled(true).baselineOnMigrate(false).outOfOrder(false).connectRetries(0).skipDefaultCallbacks(true)
                .ignoreMigrationPatterns("*:pending").load();
    }
    private static int latest() throws Exception {
        Set<Integer> versions = new TreeSet<>();
        try (var files = Files.list(Path.of("src/main/resources/db/migration"))) {
            for (Path file : files.toList()) {
                var match = java.util.regex.Pattern.compile("V([1-9][0-9]*)__.+\\.sql").matcher(file.getFileName().toString());
                if (!match.matches() || !versions.add(Integer.parseInt(match.group(1)))) throw new IllegalStateException("Invalid or duplicate source migration name");
            }
        }
        int max = versions.stream().mapToInt(Integer::intValue).max().orElseThrow();
        if (versions.size() != max) throw new IllegalStateException("Noncontiguous source migrations"); return max;
    }
    private static String describe(MigrationInfo info) { return info.getVersion() + " " + info.getState() + " " + info.getScript(); }
    private static Status status() throws Exception {
        int latest = latest();
        Flyway f = flyway(runtime.getProperty("DB_USERNAME"), runtime.getProperty("DB_PASSWORD"), true);
        var result = f.validateWithResult();
        if (!result.validationSuccessful) {
            for (var invalid : result.invalidMigrations) System.err.println("VALIDATION ERROR: " + invalid.version + " " + safe(invalid.errorDetails.errorMessage));
            throw new IllegalStateException("Applied migration validation/checksum failure; startup denied");
        }
        var info = f.info(); var all = info.all();
        int failed = (int) Arrays.stream(all).filter(m -> m.getState().isFailed()).count();
        var unexpected = Arrays.stream(all).filter(m -> !Set.of("SUCCESS", "PENDING").contains(m.getState().name())).toList();
        if (!unexpected.isEmpty()) { for (var item : unexpected) System.err.println(describe(item)); throw new IllegalStateException("Unexpected/failed/missing/future Flyway state; no repair attempted"); }
        String installed = info.current() == null ? "NONE" : info.current().getVersion().toString();
        int pending = info.pending().length;
        System.out.println("PRIMARY=Neon/" + database + "; RUNTIME=" + runtime.getProperty("DB_USERNAME") + "; READ_ONLY=on");
        System.out.println("INSTALLED=V" + installed + "; SOURCE=V" + latest + "; PENDING=" + pending + "; FAILED=" + failed + "; APPLIED_CHECKSUMS=VALID");
        for (var item : info.pending()) System.out.println("PENDING: " + describe(item));
        Files.writeString(STATE.resolve("status.json"), "{\"installed\":\"" + installed + "\",\"source\":" + latest + ",\"pending\":" + pending + ",\"failed\":" + failed + ",\"appliedChecksumsValid\":true}\n", StandardCharsets.UTF_8);
        if (pending == 0 && !installed.equals(Integer.toString(latest))) throw new IllegalStateException("Installed/source version mismatch");
        return new Status(installed, latest, pending, failed);
    }
    private static Properties migrationCredentials() throws Exception {
        Path file = Path.of(".env.neon-migration");
        if (!Files.isRegularFile(file) || Files.isSymbolicLink(file)) throw new IllegalStateException("Separate operator-provisioned backend/.env.neon-migration required");
        var acl = Files.getFileAttributeView(file, AclFileAttributeView.class);
        if (acl != null) {
            var owner = acl.getOwner();
            if (acl.getAcl().stream().anyMatch(entry -> entry.type() == AclEntryType.ALLOW && !entry.principal().equals(owner))) throw new IllegalStateException("Migration credentials must have owner-only ACL");
        } else {
            var permissions = Files.getPosixFilePermissions(file);
            if (permissions.stream().anyMatch(value -> !value.name().startsWith("OWNER_"))) throw new IllegalStateException("Migration credentials must be owner-only");
        }
        Properties p = new Properties(); try (var reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) { p.load(reader); } remember(p);
        if (!runtime.getProperty("DB_URL").equals(p.getProperty("url")) || !"smartcinema_neon_migrator".equals(p.getProperty("user"))
                || p.getProperty("user").equals(runtime.getProperty("DB_USERNAME")) || p.getProperty("password", "").isBlank()) throw new IllegalStateException("Separate migration login on the exact PRIMARY target required");
        return p;
    }
    static MigrationPlan migrationPlan(int installed,List<Integer> pending) {
        if(installed<13 || pending.isEmpty())throw new IllegalStateException("No reviewed migration range");
        var versions=pending.stream().sorted().toList();int expected=installed+1;
        var owners=new TreeSet<String>();var create=new TreeSet<String>();boolean references=false;
        for(int version:versions) {
            if(version!=expected++ || version<14 || version>19)throw new IllegalStateException("Unsupported or noncontiguous migration range");
            switch(version) {
                case 14 -> owners.add("smart_cinema_staff_owner");
                case 15,16 -> {owners.add("smart_cinema_hold_owner");create.add("smart_cinema_hold_owner");}
                case 17 -> {owners.addAll(Set.of("smart_cinema_staff_owner","smart_cinema_configuration_owner"));create.add("smart_cinema_staff_owner");}
                case 18 -> {owners.add("smart_cinema_staff_owner");create.add("smart_cinema_staff_owner");}
                case 19 -> {owners.addAll(Set.of("smart_cinema_hold_owner","smart_cinema_staff_owner"));create.add("smart_cinema_hold_owner");references=true;}
                default -> throw new IllegalStateException("Unreviewed migration");
            }
        }
        if(references && (installed!=18 || !versions.equals(List.of(19))))throw new IllegalStateException("V19 requires its separately reviewed V18 to V19 operation");
        return new MigrationPlan(versions,Set.copyOf(owners),Set.copyOf(create),references,versions.getLast());
    }
    static void verifyMigrationArtifact(MigrationPlan plan,Path directory)throws Exception {
        if(plan.versions().contains(19)) {
            Path file=directory.resolve("V19__enable_staff_counter_sales.sql");
            if(!Files.isRegularFile(file)||Files.isSymbolicLink(file)
                ||!HexFormat.of().withUpperCase().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file))).equals(V19_SHA256))
                throw new IllegalStateException("V19 artifact differs from the reviewed SHA-256; no migration attempted");
        }
    }
    static boolean check(Connection db,String sql,Object... values)throws SQLException {
        try(var s=db.prepareStatement(sql)){for(int i=0;i<values.length;i++)s.setObject(i+1,values[i]);try(var r=s.executeQuery()){return r.next()&&r.getBoolean(1);}}
    }
    static void validateMigrationAuthority(Connection db,MigrationPlan plan,String runtimeRole,String schema)throws SQLException {
        if(!schema.matches("[a-z][a-z0-9_]*"))throw new IllegalStateException("Invalid fixed migration schema");
        if(!check(db,"SELECT current_user=session_user AND current_user<>? AND current_schema()=? AND current_setting('transaction_read_only')='on'",runtimeRole,schema))
            throw new IllegalStateException("Independent read-only migration preflight identity/schema required");
        if(!check(db,"SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls AND rolcanlogin FROM pg_roles WHERE rolname=current_user"))
            throw new IllegalStateException("Migration login must have no superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS authority");
        var actual=new TreeSet<String>();
        try(var s=db.createStatement();var r=s.executeQuery("SELECT role.rolname,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles role ON role.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE member.rolname=current_user")) {
            while(r.next()){actual.add(r.getString(1));if(r.getBoolean(2)||!r.getBoolean(3)||!r.getBoolean(4))throw new IllegalStateException("Migration owner memberships require INHERIT/SET and no ADMIN OPTION");}
        }
        if(!actual.equals(plan.owners()))throw new IllegalStateException("Migration owner memberships must exactly match the reviewed version range");
        for(String owner:plan.owners())if(!check(db,"SELECT pg_has_role(current_user,?,'USAGE') AND pg_has_role(current_user,?,'SET')",owner,owner))
            throw new IllegalStateException("Required migration owner authority missing");
        for(String owner:plan.createOwners())if(!check(db,"SELECT has_schema_privilege(?,?,'CREATE')",owner,schema))
            throw new IllegalStateException("New protected function owner requires schema CREATE");
        if(!check(db,"SELECT has_schema_privilege(current_user,?,'USAGE') AND has_schema_privilege(current_user,?,'CREATE') AND has_table_privilege(current_user,?,'SELECT') AND has_table_privilege(current_user,?,'INSERT')",schema,schema,schema+".flyway_schema_history",schema+".flyway_schema_history"))
            throw new IllegalStateException("Reviewed schema/history privileges required");
        if(plan.userReferences()&&!check(db,"SELECT has_column_privilege(current_user,?,'id','REFERENCES')",schema+".users"))
            throw new IllegalStateException("V19 requires users(id) REFERENCES for its selling Staff foreign key");
        if(check(db,"SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='neon_superuser' AND pg_has_role(current_user,oid,'MEMBER'))"))
            throw new IllegalStateException("Broad Neon administrator inheritance denied");
        if(!check(db,"SELECT NOT pg_has_role(?,current_user,'USAGE') AND NOT pg_has_role(?,current_user,'SET')",runtimeRole,runtimeRole))
            throw new IllegalStateException("Application runtime must not inherit or SET migration identity");
    }
    static Flyway migrationFlyway(DataSource data,String schema,MigrationPlan plan,String... locations) {
        return Flyway.configure().dataSource(data).defaultSchema(schema).schemas(schema).createSchemas(false)
            .locations(locations).validateMigrationNaming(true).validateOnMigrate(true).target(Integer.toString(plan.target()))
            .executeInTransaction(true).cleanDisabled(true).baselineOnMigrate(false).outOfOrder(false)
            .connectRetries(0).skipDefaultCallbacks(true).initSql("SET lock_timeout='5s'; SET statement_timeout='120s'; SET idle_in_transaction_session_timeout='30s'").load();
    }
    private static void migrate(Status initial) throws Exception {
        var pending=Arrays.stream(flyway(runtime.getProperty("DB_USERNAME"),runtime.getProperty("DB_PASSWORD"),true).info().pending())
            .map(m->Integer.parseInt(m.getVersion().toString())).toList();
        MigrationPlan plan=migrationPlan(Integer.parseInt(initial.installed()),pending);
        verifyMigrationArtifact(plan,Path.of("src/main/resources/db/migration"));
        Properties p = migrationCredentials();
        try (var db = connect(p.getProperty("user"), p.getProperty("password"), true)) {
            validateMigrationAuthority(db,plan,runtime.getProperty("DB_USERNAME"),"public");
        }
        Flyway f = migrationFlyway(source(p.getProperty("user"),p.getProperty("password"),false),"public",plan,"filesystem:src/main/resources/db/migration");
        if(!Arrays.stream(f.info().pending()).map(m->Integer.parseInt(m.getVersion().toString())).toList().equals(plan.versions()))
            throw new IllegalStateException("Pending migrations changed during preflight; no automatic retry");
        verifyMigrationArtifact(plan,Path.of("src/main/resources/db/migration"));
        var result = f.migrate(); System.out.println("MIGRATIONS_EXECUTED=" + result.migrationsExecuted);
        Status finalStatus = status(); if (finalStatus.pending != 0 || finalStatus.failed != 0) throw new IllegalStateException("Migration did not reach current source");
    }
}
