import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.sql.*;
import java.util.*;

/** Read-only isolation/privilege preflight and private test configuration. Never imports .env. */
public final class LocalConcessionVerification {
    private static final String URL="jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
    public static void main(String[] args) {
        try {
            if(args.length!=1 || !Set.of("verify","prepare").contains(args[0])) throw new IllegalStateException();
            Properties base=new Properties();
            try(var input=Files.newBufferedReader(Path.of(".env.local-test"),StandardCharsets.UTF_8)) { base.load(input); }
            if(!URL.equals(base.getProperty("spring.datasource.url")) || !URL.equals(base.getProperty("spring.flyway.url"))
                || !"".equals(base.getProperty("spring.config.import")) || !"false".equals(base.getProperty("vnpay.enabled"))
                || !"false".equals(base.getProperty("staff.invitations.delivery-enabled")) || !"false".equals(base.getProperty("seat-hold.cleanup-enabled"))
                || !"".equals(base.getProperty("vnpay.system-db-url")) || !"127.0.0.1".equals(base.getProperty("spring.mail.host"))) throw new IllegalStateException();
            for(String key:base.stringPropertyNames()) if(key.startsWith("vnpay.") && key.endsWith("confirmed") && !"false".equals(base.getProperty(key))) throw new IllegalStateException();
            for(boolean migration:List.of(false,true)) {
                String user=base.getProperty(migration?"spring.flyway.user":"spring.datasource.username");
                if(!(migration?"smartcinema_phase4e_migrator":"smartcinema_phase4e_app").equals(user)) throw new IllegalStateException();
                Properties login=new Properties(); login.setProperty("user",user); login.setProperty("password",base.getProperty(migration?"spring.flyway.password":"spring.datasource.password"));
                login.setProperty("readOnly","true"); login.setProperty("readOnlyMode","always");
                try(var db=DriverManager.getConnection(URL,login)) {
                    db.setReadOnly(true);
                    try(var q=db.createStatement(); var r=q.executeQuery("SELECT current_database(),host(inet_server_addr()),inet_server_port(),current_user,current_setting('transaction_read_only')")) {
                        r.next(); if(!"smartcinema_phase4e_test".equals(r.getString(1)) || !"127.0.0.1".equals(r.getString(2)) || r.getInt(3)!=5432 || !user.equals(r.getString(4)) || !"on".equals(r.getString(5))) throw new IllegalStateException();
                    }
                    try(var q=db.createStatement();var r=q.executeQuery("SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user")) {
                        r.next(); if(r.getBoolean(1)||r.getBoolean(2)||r.getBoolean(3)) throw new IllegalStateException();
                    }
                    try(var q=db.createStatement();var r=q.executeQuery("SELECT version,(SELECT count(*) FROM flyway_schema_history WHERE NOT success) FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1")) {
                        r.next(); if(!Set.of("14","15").contains(r.getString(1)) || r.getInt(2)!=0) throw new IllegalStateException();
                        System.out.println("VERIFIED_LOCAL="+user+";head=V"+r.getString(1)+";readonly=on;NOSUPERUSER/NOCREATEDB/NOCREATEROLE");
                    }
                    if(migration) try(var q=db.createStatement();var r=q.executeQuery("SELECT pg_has_role(current_user,'smart_cinema_hold_owner','SET'),has_database_privilege(current_user,current_database(),'CREATE'),has_schema_privilege(current_user,'public','CREATE')")) {
                        r.next(); System.out.println("MIGRATION_EXISTING_CAPABILITIES=SET_hold_owner:"+r.getBoolean(1)+";CREATE_schema:"+r.getBoolean(2)+";CREATE_public:"+r.getBoolean(3));
                    }
                }
            }
            if("prepare".equals(args[0])) {
                Path target=Path.of("target/admin-concession-local-2026-10-25/private/test.properties"); Files.createDirectories(target.getParent());
                if(Files.exists(target)) throw new IllegalStateException();
                Files.createFile(target);
                var acl=Files.getFileAttributeView(target,AclFileAttributeView.class);
                if(acl==null) throw new IllegalStateException();
                acl.setAcl(List.of(AclEntry.newBuilder().setType(AclEntryType.ALLOW).setPrincipal(acl.getOwner()).setPermissions(EnumSet.allOf(AclEntryPermission.class)).build()));
                Properties test=new Properties(); test.putAll(base);
                test.setProperty("spring.datasource.username",base.getProperty("spring.flyway.user"));
                test.setProperty("spring.datasource.password",base.getProperty("spring.flyway.password"));
                for(String key:List.of("spring.flyway.url","spring.flyway.user","spring.flyway.password")) test.remove(key);
                test.setProperty("spring.profiles.active","local-test");
                try(var output=Files.newBufferedWriter(target,StandardCharsets.UTF_8)) { test.store(output,"PRIVATE isolated test profile; migration login restricted; never commit"); }
                System.out.println("PRIVATE_TEST_PROFILE_CREATED; exact local target only; existing config unchanged");
            }
        } catch(Exception failure) { System.err.println("BLOCKED: dedicated local preflight failed; sensitive details withheld; no escalation/reset/retry."); System.exit(1); }
    }
}
