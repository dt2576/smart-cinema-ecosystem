import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;

/** Fixed-target Windows local workflow; never reads remote .env or changes roles. */
public final class LocalDatabase {
    static final String URL="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    static final String APP="smartcinema_phase4e_app";
    static final String WRAPPER="public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)";
    static final String PROMOTION_WRAPPER="public.admin_configure_promotion(bigint,bigint,text,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric)";
    static final Path STATE=Path.of("target/local-dev");
    private static final List<String> secrets=new ArrayList<>();
    private static Properties config;

    public static void main(String[] args) {
        try {
            if(args.length<1 || !Set.of("status","migrate","runtime-profile").contains(args[0])) throw new IllegalStateException("Expected status, migrate or runtime-profile");
            config=LocalTestEnvironment.config();
            rememberSecrets(config);
            // Retain all original local isolation checks, with additional provider/transport checks.
            for(String key:config.stringPropertyNames()) if(key.startsWith("vnpay.")&&key.endsWith("confirmed")&&!"false".equals(config.getProperty(key)))
                throw new IllegalStateException("Local provider confirmation must remain disabled");
            for(String key:List.of("vnpay.system-db-username","vnpay.system-db-password","spring.mail.username","spring.mail.password"))
                if(!config.getProperty(key,"").isEmpty()) throw new IllegalStateException("External credentials are not allowed in the local runtime profile");
            Files.createDirectories(STATE);
            if(args[0].equals("runtime-profile")) { runtimeProfile(); return; }
            Status status=status();
            LocalTestEnvironment.verify(false);
            if(args[0].equals("status")) return;
            if(status.pending==0 && !status.grantNeeded) { System.out.println("MIGRATION=SKIPPED; database already current; administrator credentials not loaded"); return; }
            if(args.length!=2 || !"--approved".equals(args[1])) throw new IllegalStateException("Pending privileged operation requires explicit approval; run the startup command and confirm the displayed plan");
            migrate(status);
        } catch(Exception failure) {
            System.err.println("LOCAL STARTUP STOPPED: "+safe(failure.getMessage()));
            for(Throwable cause=failure.getCause();cause!=null;cause=cause.getCause())
                System.err.println("CAUSE: "+safe(cause.getMessage()));
            System.err.println("No reset, repair, role elevation or automatic retry performed. Services must not start.");
            System.exit(1);
        }
    }
    private record Status(int pending,boolean grantNeeded) { }
    static String safe(String message) {
        String value=message==null?"Operation failed without diagnostic message":message;
        for(String secret:secrets) if(!secret.isEmpty()) value=value.replace(secret,"<redacted>");
        return value.replaceAll("(?i)(password\\s*[=:]\\s*)[^\\s;,]+","$1<redacted>");
    }
    private static void rememberSecrets(Properties p) {
        for(String key:p.stringPropertyNames()) if(key.matches("(?i).*(password|secret|encryption-keys).*")) {
            String value=p.getProperty(key);if(!value.isEmpty())secrets.add(value);
        }
        secrets.sort(Comparator.comparingInt(String::length).reversed());
    }
    private static Properties readPrivate(Path path) throws Exception {
        var acl=Files.getFileAttributeView(path,AclFileAttributeView.class);
        if(acl==null)throw new IllegalStateException("Windows credential ACL required");
        var owner=acl.getOwner();
        if(acl.getAcl().stream().anyMatch(entry->entry.type()==AclEntryType.ALLOW&&!entry.principal().equals(owner)))
            throw new IllegalStateException("Migration credential file must have owner-only Windows ACL");
        Properties p=new Properties();try(var in=Files.newBufferedReader(path,StandardCharsets.UTF_8)){p.load(in);}rememberSecrets(p);return p;
    }
    private static Connection connect(String user,String password,boolean readOnly) throws SQLException {
        Properties p=new Properties();p.setProperty("user",user);p.setProperty("password",password);
        p.setProperty("readOnly",Boolean.toString(readOnly));p.setProperty("readOnlyMode","always");p.setProperty("ApplicationName","smartcinema_local_dev");
        Connection db=DriverManager.getConnection(URL,p);
        try { db.setReadOnly(readOnly);verifyTarget(db,user,readOnly);return db; }
        catch(Exception e){db.close();throw e;}
    }
    private static void verifyTarget(Connection db,String user,boolean readOnly) throws SQLException {
        try(var q=db.createStatement();var r=q.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),session_user,current_schema(),current_setting('transaction_read_only')")) {
            r.next();if(!"smartcinema_phase4e_test".equals(r.getString(1))||!"127.0.0.1".equals(r.getString(2))||r.getInt(3)!=5432||!user.equals(r.getString(4))||!"public".equals(r.getString(5))||(readOnly&&!"on".equals(r.getString(6))))
                throw new SQLException("Approved local database/session identity required","08004");
        }
    }
    private static DataSource source(String user,String password,boolean readOnly) {
        return new DataSource() {
            public Connection getConnection() throws SQLException { return connect(user,password,readOnly); }
            public Connection getConnection(String u,String p) throws SQLException { throw new SQLException("Connection override denied"); }
            public PrintWriter getLogWriter(){return null;}
            public void setLogWriter(PrintWriter writer){ }
            public void setLoginTimeout(int seconds){ }
            public int getLoginTimeout(){return 5;}
            public java.util.logging.Logger getParentLogger(){return java.util.logging.Logger.getGlobal();}
            public <T>T unwrap(Class<T> type)throws SQLException{throw new SQLException("Unwrap denied");}
            public boolean isWrapperFor(Class<?> type){return false;}
        };
    }
    private static Flyway flyway(String user,String password,boolean readOnly) {
        return Flyway.configure().dataSource(source(user,password,readOnly))
            .defaultSchema("public").schemas("public").createSchemas(false)
            .locations("filesystem:src/main/resources/db/migration").target(Integer.toString(latest()))
            .cleanDisabled(true).baselineOnMigrate(false).outOfOrder(false).validateOnMigrate(true)
            // Pending source files are expected before migrate; applied/future/missing/failed files are never ignored.
            .ignoreMigrationPatterns("*:pending").validateMigrationNaming(true).skipDefaultCallbacks(true).connectRetries(0).load();
    }
    private static int latest() {try{return LocalTestEnvironment.latestSourceVersion();}catch(IOException e){throw new IllegalStateException("Source migration inventory unavailable",e);}}
    private static Status status() throws Exception {
        System.out.println("DATABASE=127.0.0.1:5432/smartcinema_phase4e_test; SOURCE=V"+latest());
        try(var db=connect(APP,config.getProperty("spring.datasource.password"),true);var q=db.createStatement();var r=q.executeQuery("SELECT version FROM public.flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1")) {
            System.out.println("INSTALLED="+(r.next()?"V"+r.getString(1):"NONE")+"; connection READ ONLY");
        } catch(SQLException e) {System.out.println("INSTALLED=UNAVAILABLE; database status read failed");throw e;}
        Flyway f=flyway(APP,config.getProperty("spring.datasource.password"),true);
        var info=f.info();var all=info.all();var pending=info.pending();
        String installed=info.current()==null?"NONE":"V"+info.current().getVersion();
        List<String> failures=Arrays.stream(all).filter(i->i.getState().isFailed()).map(LocalDatabase::describe).toList();
        System.out.println("DATABASE=127.0.0.1:5432/smartcinema_phase4e_test; CONNECTED; status connection READ ONLY");
        System.out.println("INSTALLED="+installed+"; SOURCE=V"+latest());
        System.out.println("PENDING="+(pending.length==0?"NONE":String.join(", ",Arrays.stream(pending).map(LocalDatabase::describe).toList())));
        System.out.println("FAILED="+(failures.isEmpty()?"NONE":String.join(", ",failures)));
        var validation=f.validateWithResult();
        boolean valid=validation.validationSuccessful && failures.isEmpty();
        boolean grantNeeded=false;boolean wrapperExists=false;
        try(var db=connect(APP,config.getProperty("spring.datasource.password"),true)) {
            try(var q=db.createStatement();var r=q.executeQuery("SELECT has_table_privilege(current_user,'public.concession_items','INSERT') OR has_table_privilege(current_user,'public.concession_items','UPDATE') OR has_table_privilege(current_user,'public.concession_items','DELETE') OR has_table_privilege(current_user,'public.concession_items','TRUNCATE') OR has_function_privilege(current_user,'public.configure_concession_item(bigint,text,text,text,numeric,text,text)','EXECUTE')")){
                r.next();if(r.getBoolean(1))throw new IllegalStateException("Runtime Concession privilege boundary violated");
            }
            try(var q=db.prepareStatement("SELECT to_regprocedure(?) IS NOT NULL")){q.setString(1,WRAPPER);try(var r=q.executeQuery()){r.next();if(r.getBoolean(1)){
                wrapperExists=true;
                try(var check=db.prepareStatement("SELECT NOT has_function_privilege(current_user,?,'EXECUTE')")){check.setString(1,WRAPPER);try(var g=check.executeQuery()){g.next();grantNeeded=g.getBoolean(1);}}
                try(var check=db.prepareStatement("SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='smart_cinema_hold_owner' AND p.proconfig::text LIKE '%search_path=pg_catalog, pg_temp%' AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') FROM pg_proc p WHERE p.oid=to_regprocedure(?)")){
                    check.setString(1,WRAPPER);try(var g=check.executeQuery()){g.next();if(!g.getBoolean(1))throw new IllegalStateException("Protected Concession wrapper ownership/security boundary violated");}
                }
            }}}
        }
        if(!wrapperExists && info.current()!=null && info.current().getVersion().getVersion().matches("[1-9][0-9]*") && Integer.parseInt(info.current().getVersion().getVersion())>=15)
            throw new IllegalStateException("V15 is recorded but its protected wrapper is absent; no automatic repair permitted");
        if(info.current()!=null && Integer.parseInt(info.current().getVersion().getVersion())>=16) {
            try(var db=connect(APP,config.getProperty("spring.datasource.password"),true)) {
                verifyPromotionBoundary(db);
                try(var q=db.prepareStatement("SELECT NOT has_function_privilege(current_user,?,'EXECUTE') OR NOT has_table_privilege(current_user,'public.promotions','SELECT')")) {
                    q.setString(1,PROMOTION_WRAPPER);try(var r=q.executeQuery()){r.next();grantNeeded|=r.getBoolean(1);}
                }
            }
        }
        Files.writeString(STATE.resolve("status.json"),"{\"installed\":\""+installed+"\",\"latest\":\"V"+latest()+"\",\"pending\":"+pending.length+",\"failed\":"+failures.size()+",\"valid\":"+valid+",\"runtimeGrantNeeded\":"+grantNeeded+"}\n",StandardCharsets.UTF_8);
        System.out.println("CHECKSUMS="+(valid?"VALID":"INVALID")+"; RUNTIME_WRAPPER="+(!wrapperExists?"NOT_INSTALLED":grantNeeded?"EXECUTE_GRANT_REQUIRED":"VERIFIED"));
        if(!valid) {
            for(var invalid:validation.invalidMigrations)System.err.println("VALIDATION: "+invalid.version+" "+safe(invalid.errorDetails.errorMessage));
            throw new IllegalStateException("Flyway history/checksum validation failed; no migration/startup allowed");
        }
        return new Status(pending.length,grantNeeded);
    }
    private static String describe(MigrationInfo i){return "V"+i.getVersion()+" "+i.getScript();}
    private static void migrate(Status previous) throws Exception {
        Path path=Path.of(".env.local-test-migration");
        if(!Files.isRegularFile(path))throw new IllegalStateException("Missing private .env.local-test-migration; use the startup credential prompt");
        Properties operator=readPrivate(path);
        if(!URL.equals(operator.getProperty("url"))||!operator.stringPropertyNames().equals(Set.of("url","user","password")))throw new IllegalStateException("Migration credential target/fields must match approved local connection");
        String user=operator.getProperty("user"),password=operator.getProperty("password");
        if(user==null||user.isBlank()||password==null||password.isEmpty()||user.equals(APP)||user.equals("smartcinema_phase4e_migrator"))throw new IllegalStateException("Separate existing local administrator credentials required");
        String before;
        try(var db=connect(user,password,true)) {
            try(var q=db.createStatement();var r=q.executeQuery("SELECT rolsuper FROM pg_roles WHERE rolname=session_user")){r.next();if(!r.getBoolean(1))throw new IllegalStateException("Existing local PostgreSQL administrator authority required; no role elevation attempted");}
            before=dataFingerprint(db);
        }
        // All connection identity checks above are SELECT-only. First privileged operation follows.
        var f=flyway(user,password,false);
        f.validate();
        if(previous.pending>0)System.out.println("MIGRATION=APPLYING; pending="+previous.pending+"; existing local administrator; runtime credentials unchanged");
        int applied=previous.pending==0?0:f.migrate().migrationsExecuted;
        try(var db=connect(user,password,false)) {
            db.setAutoCommit(false);
            try {
                try(var q=db.createStatement();var r=q.executeQuery("SELECT p.prosecdef,pg_get_userbyid(p.proowner),p.proconfig::text,has_function_privilege('smart_cinema_hold_runtime',p.oid,'EXECUTE') FROM pg_proc p WHERE p.oid=to_regprocedure('"+WRAPPER+"')")){
                    if(!r.next()||!r.getBoolean(1)||!"smart_cinema_hold_owner".equals(r.getString(2))||!r.getString(3).contains("search_path=pg_catalog, pg_temp")||!r.getBoolean(4))throw new IllegalStateException("Protected wrapper owner/ACL/search_path verification failed");
                }
                // Narrow approved local grants; no owner membership, direct DML or deployment-writer access.
                try(var q=db.createStatement()){q.execute("GRANT EXECUTE ON FUNCTION "+WRAPPER+" TO "+APP);}
                if(latest()>=16) {
                    verifyPromotionBoundary(db);
                    try(var q=db.createStatement()) {
                        q.execute("GRANT EXECUTE ON FUNCTION "+PROMOTION_WRAPPER+" TO "+APP);
                        q.execute("GRANT SELECT ON public.promotions TO "+APP);
                    }
                }
                db.commit();
            } catch(Exception e){db.rollback();throw e;}
            System.out.println("APPLICATION_DATA_UNCHANGED="+before.equals(dataFingerprint(db)));
        }
        var finalStatus=status();LocalTestEnvironment.verify(false);
        if(finalStatus.pending!=0||finalStatus.grantNeeded)throw new IllegalStateException("Post-migration readiness failed");
        System.out.println("MIGRATION=SUCCESS; applied="+applied+"; final=V"+latest()+"; runtime EXECUTE verified");
    }
    private static void verifyPromotionBoundary(Connection db) throws SQLException {
        try(var q=db.prepareStatement("SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='smart_cinema_hold_owner' AND p.proconfig::text LIKE '%search_path=pg_catalog, pg_temp%' AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') FROM pg_proc p WHERE p.oid=to_regprocedure(?)")) {
            q.setString(1,PROMOTION_WRAPPER);try(var r=q.executeQuery()) {
                if(!r.next()||!r.getBoolean(1))throw new IllegalStateException("V16 Promotion wrapper absent or ownership/security boundary violated");
            }
        }
        try(var q=db.createStatement();var r=q.executeQuery("SELECT has_table_privilege('"+APP+"','public.promotions','INSERT') OR has_table_privilege('"+APP+"','public.promotions','UPDATE') OR has_table_privilege('"+APP+"','public.promotions','DELETE') OR has_table_privilege('"+APP+"','public.promotions','TRUNCATE') OR has_function_privilege('"+APP+"','public.configure_promotion(bigint,text,text,numeric,timestamptz,timestamptz,numeric,integer,text,numeric)','EXECUTE')")) {
            r.next();if(r.getBoolean(1))throw new IllegalStateException("Runtime Promotion direct mutation privilege boundary violated");
        }
    }
    private static String dataFingerprint(Connection db) throws Exception {
        var digest=MessageDigest.getInstance("SHA-256");var names=new ArrayList<String>();
        try(var q=db.createStatement();var r=q.executeQuery("SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname<>'flyway_schema_history' ORDER BY relname")){while(r.next())names.add(r.getString(1));}
        for(String name:names){if(!name.matches("[a-z_]+"))throw new IllegalStateException("Unexpected local table identifier");
            try(var q=db.createStatement();var r=q.executeQuery("SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) FROM public.\""+name+"\" t")){r.next();digest.update((name+":"+r.getLong(1)+":"+r.getString(2)).getBytes(StandardCharsets.UTF_8));}
        }
        return HexFormat.of().formatHex(digest.digest());
    }
    private static void runtimeProfile() throws Exception {
        Properties runtime=new Properties();runtime.putAll(config);
        runtime.setProperty("spring.flyway.user",APP);runtime.setProperty("spring.flyway.password",config.getProperty("spring.datasource.password"));
        runtime.setProperty("spring.flyway.jdbc-properties.readOnly","true");runtime.setProperty("spring.flyway.jdbc-properties.readOnlyMode","always");
        runtime.setProperty("spring.flyway.clean-disabled","true");runtime.setProperty("spring.flyway.baseline-on-migrate","false");runtime.setProperty("spring.flyway.validate-on-migrate","true");
        Path path=STATE.resolve("private/runtime.properties");Files.createDirectories(path.getParent());
        if(!Files.exists(path))Files.createFile(path);
        var acl=Files.getFileAttributeView(path,AclFileAttributeView.class);
        if(acl==null)throw new IllegalStateException("Windows private configuration ACL required");
        acl.setAcl(List.of(AclEntry.newBuilder().setType(AclEntryType.ALLOW).setPrincipal(acl.getOwner()).setPermissions(EnumSet.allOf(AclEntryPermission.class)).build()));
        try(var out=Files.newBufferedWriter(path,StandardCharsets.UTF_8)){runtime.store(out,"PRIVATE local runtime; no administrator credentials; do not commit");}
        System.out.println("RUNTIME_PROFILE=target/local-dev/private/runtime.properties; Flyway validation uses read-only app connection");
    }
}
