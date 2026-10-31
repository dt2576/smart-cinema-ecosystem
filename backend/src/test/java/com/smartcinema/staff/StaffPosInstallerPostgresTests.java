package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import java.lang.reflect.*;
import java.net.URLClassLoader;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import javax.sql.DataSource;
import javax.tools.ToolProvider;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Real least-privilege LOCAL login, actual installer methods, populated isolated V18. */
@EnabledIfEnvironmentVariable(named="STAFF_POS_INSTALLER_DB_TESTS",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class StaffPosInstallerPostgresTests {
    final StaffPosMigrationReviewTests fixture=new StaffPosMigrationReviewTests();
    final String login="qa_pos_v19_migrator_"+UUID.randomUUID().toString().replace("-","");
    final String password=UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
    final List<String> evidence=new ArrayList<>();
    URLClassLoader loader;
    Class<?> installer,planClass;
    Object plan;
    boolean created;
    Map<String,String> legacy;
    Object invoke(String name,Class<?>[] types,Object... values)throws Exception {
        Method method=installer.getDeclaredMethod(name,types);method.setAccessible(true);
        try{return method.invoke(null,values);}catch(InvocationTargetException error){if(error.getCause() instanceof Exception e)throw e;throw new AssertionError(error.getCause());}
    }
    Object select(int installed,Integer... versions)throws Exception {return invoke("migrationPlan",new Class<?>[]{int.class,List.class},installed,List.of(versions));}
    Object property(Object record,String name)throws Exception {var method=planClass.getDeclaredMethod(name);method.setAccessible(true);return method.invoke(record);}
    Connection operator()throws Exception {return fixture.connect();}
    Connection migration(boolean readOnly)throws Exception {
        var db=DriverManager.getConnection(fixture.url,login,password);db.setReadOnly(readOnly);db.setAutoCommit(false);return db;
    }
    void operatorSql(String sql)throws Exception {try(var db=operator();var s=db.createStatement()){s.execute(sql);}}
    void authorize()throws Exception {
        try(var db=migration(true)){invoke("validateMigrationAuthority",new Class<?>[]{Connection.class,planClass,String.class,String.class},db,plan,"smartcinema_phase4e_app",fixture.schema);}
    }
    @BeforeAll void prepare()throws Exception {
        fixture.preparePopulatedV18();legacy=fixture.rows();
        Path output=StaffPosMigrationReviewTests.DIR.resolve("installer-classes");Files.createDirectories(output);
        String core=Path.of(Flyway.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toString();
        int compiled=ToolProvider.getSystemJavaCompiler().run(null,null,null,"-encoding","UTF-8","-cp",core,"-d",output.toString(),"scripts/PrimaryDatabase.java");
        assertThat(compiled).isZero();loader=new URLClassLoader(new java.net.URL[]{output.toUri().toURL()},getClass().getClassLoader());
        installer=loader.loadClass("PrimaryDatabase");planClass=Arrays.stream(installer.getDeclaredClasses()).filter(c->c.getSimpleName().equals("MigrationPlan")).findFirst().orElseThrow();
        plan=select(18,19);
        try(var db=operator();var s=db.createStatement()) {
            try(var r=s.executeQuery("SELECT current_setting('log_statement')='none' AND current_setting('log_min_duration_statement')='-1' AND current_setting('log_min_duration_sample')='-1' AND coalesce(current_setting('pgaudit.log',true),'none') IN ('','none')")){r.next();assertThat(r.getBoolean(1)).as("Private local login setup requires statement/password logging disabled").isTrue();}
            try {
                // Safe generated ASCII identifiers/password, direct JDBC only, never in argv/logs.
                s.execute("CREATE ROLE "+login+" LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");created=true;
            } catch(SQLException failure){throw new IllegalStateException("Private local role setup failed; SQLSTATE="+failure.getSQLState());}
            s.execute("GRANT CONNECT ON DATABASE smartcinema_phase4e_test TO "+login);
            s.execute("GRANT USAGE,CREATE ON SCHEMA "+fixture.schema+" TO "+login);
            s.execute("GRANT CREATE ON SCHEMA "+fixture.schema+" TO smart_cinema_hold_owner"); // Match actual PRIMARY baseline.
            s.execute("GRANT SELECT,INSERT ON "+fixture.schema+".flyway_schema_history TO "+login);
            s.execute("GRANT REFERENCES(id) ON "+fixture.schema+".users TO "+login);
            s.execute("GRANT smart_cinema_hold_owner,smart_cinema_staff_owner TO "+login+" WITH INHERIT TRUE,SET TRUE,ADMIN FALSE");
        }
    }
    @Test @Order(1) void versionPolicyHasExactOwnersAndRejectsUnreviewedRanges()throws Exception {
        assertThat(property(plan,"owners")).isEqualTo(Set.of("smart_cinema_hold_owner","smart_cinema_staff_owner"));
        assertThat(property(plan,"createOwners")).isEqualTo(Set.of("smart_cinema_hold_owner"));
        assertThat(property(select(13,14),"owners")).isEqualTo(Set.of("smart_cinema_staff_owner"));
        assertThat(property(select(14,15),"owners")).isEqualTo(Set.of("smart_cinema_hold_owner"));
        assertThat(property(select(16,17),"owners")).isEqualTo(Set.of("smart_cinema_staff_owner","smart_cinema_configuration_owner"));
        assertThat(property(select(17,18),"owners")).isEqualTo(Set.of("smart_cinema_staff_owner"));
        for(Integer[] versions:List.of(new Integer[]{20},new Integer[]{19,19},new Integer[]{19,21},new Integer[]{}))
            assertThatThrownBy(()->select(18,versions)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->select(17,18,19)).isInstanceOf(IllegalStateException.class);
        evidence.add("Version plans 14-19: exact owner/new-owner-CREATE sets; V19 excludes Configuration owner and Staff/Configuration CREATE; unknown/gapped/mixed ranges denied.");
    }
    @Test @Order(2) void exactLoginPassesWithoutObsoletePermissions()throws Exception {
        authorize();
        try(var db=migration(true);var s=db.createStatement();var r=s.executeQuery("SELECT current_user=session_user,pg_has_role(current_user,'smart_cinema_configuration_owner','USAGE'),has_schema_privilege('smart_cinema_staff_owner',current_schema(),'CREATE'),has_schema_privilege('smart_cinema_configuration_owner',current_schema(),'CREATE')")) {
            r.next();assertThat(r.getBoolean(1)).isTrue();for(int i=2;i<=4;i++)assertThat(r.getBoolean(i)).isFalse();
        }
        evidence.add("Actual non-admin LOGIN passes production authority preflight without Configuration role or Staff/Configuration schema CREATE.");
    }
    @Test @Order(3) void missingReferencesOrExtraOwnerPrivilegeFailsBeforeMigration()throws Exception {
        operatorSql("REVOKE REFERENCES(id) ON "+fixture.schema+".users FROM "+login);
        try{assertThatThrownBy(this::authorize).isInstanceOf(IllegalStateException.class).hasMessageContaining("REFERENCES");}
        finally{operatorSql("GRANT REFERENCES(id) ON "+fixture.schema+".users TO "+login);}
        operatorSql("GRANT smart_cinema_configuration_owner TO "+login+" WITH INHERIT TRUE,SET TRUE,ADMIN FALSE");
        try{assertThatThrownBy(this::authorize).isInstanceOf(IllegalStateException.class).hasMessageContaining("exactly");}
        finally{operatorSql("REVOKE smart_cinema_configuration_owner FROM "+login);}
        assertThat(fixture.rows()).isEqualTo(legacy);evidence.add("Missing users REFERENCES and unnecessary Configuration-owner membership are rejected before domain DDL.");
    }
    @Test @Order(4) void reviewedArtifactPinRejectsChanges()throws Exception {
        Path directory=StaffPosMigrationReviewTests.DIR.resolve("pinned-artifact");Files.createDirectories(directory);
        Path file=directory.resolve(StaffPosMigrationReviewTests.PROPOSAL.getFileName());Files.copy(StaffPosMigrationReviewTests.PROPOSAL,file,StandardCopyOption.REPLACE_EXISTING);
        invoke("verifyMigrationArtifact",new Class<?>[]{planClass,Path.class},plan,directory);
        Files.writeString(file,Files.readString(file)+"\nSELECT 1;\n");
        assertThatThrownBy(()->invoke("verifyMigrationArtifact",new Class<?>[]{planClass,Path.class},plan,directory)).isInstanceOf(IllegalStateException.class).hasMessageContaining("SHA-256");
        evidence.add("Installer accepts reviewed SHA-256 and rejects divergent artifact before execution.");
    }
    @Test @Order(5) void productionInstallerBuilderMigratesWithLeastPrivilegeAndRerunsZero()throws Exception {
        authorize();
        DataSource ds=new DriverManagerDataSource(fixture.url,login,password);
        var flyway=(Flyway)invoke("migrationFlyway",new Class<?>[]{DataSource.class,String.class,planClass,String[].class},ds,fixture.schema,plan,
            new String[]{"filesystem:src/main/resources/db/migration","filesystem:src/test/resources/pos-migration"});
        try(var db=ds.getConnection();var s=db.createStatement()){s.execute("SET lock_timeout='5s'");}
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(fixture.rows()).isEqualTo(legacy);
        assertThat(fixture.value("SELECT installed_by FROM flyway_schema_history WHERE version='19'")).isEqualTo(login);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(fixture.number("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname=? AND p.proname IN ('finalize_sale','staff_confirm_cash','cash_payment_confirmed') AND r.rolname='smart_cinema_hold_owner'",fixture.schema)).isEqualTo(3);
        evidence.add("Actual production Flyway builder + least-privilege LOGIN installs V19 once, target 19/transaction/timeouts/no retry; rerun executes 0; existing rows unchanged and three new functions owned by Hold owner.");
    }
    @Test @Order(6) void runtimeProofReadsNoAuditMetadataAndRevealsOnlyBoolean()throws Exception {
        fixture.fixture.fixture();var f=fixture.fixture;
        long hold=fixture.number("SELECT id FROM acquire_seat_holds(?,?,ARRAY[?]::bigint[],interval '5 minutes')",f.showtime,f.staff,f.couple);
        long b=fixture.number("SELECT create_booking(?,?,ARRAY[?]::bigint[])",f.showtime,f.staff,hold);
        long p=fixture.number("SELECT initiate_payment(?,?)",b,f.staff);
        fixture.command("SELECT staff_confirm_cash(?,?,?,10000)",b,p,f.staff);
        try(var db=operator()) {
            db.setAutoCommit(false);try(var s=db.createStatement()){s.execute("SET LOCAL ROLE smart_cinema_hold_runtime");
                try(var q=db.prepareStatement("SELECT cash_payment_confirmed(?),cash_payment_confirmed(?)")){q.setLong(1,p);q.setLong(2,Long.MAX_VALUE);try(var r=q.executeQuery()){r.next();assertThat(r.getBoolean(1)).isTrue();assertThat(r.getBoolean(2)).isFalse();assertThat(r.getObject(1)).isInstanceOf(Boolean.class);assertThat(r.getMetaData().getColumnTypeName(1)).isEqualTo("bool");}}
                SQLException denied=catchThrowableOfType(()->s.executeQuery("SELECT metadata FROM audit_records"),SQLException.class);assertThat((Throwable)denied).isNotNull();assertThat(denied.getSQLState()).isEqualTo("42501");
            }db.rollback();
        }
        fixture.command("SELECT staff_set_status(?,?,'BLOCKED')",f.admin,f.staff);
        assertThat(fixture.value("SELECT cash_payment_confirmed(?)::text",p)).isEqualTo("true");
        evidence.add("Restricted runtime calls boolean CASH proof; raw audit metadata SELECT denied 42501; unknown payment false; later Staff blocking preserves valid historical recognition.");
    }
    @AfterAll void cleanupOnlyCreatedLocalLogin()throws Exception {
        if(created)try(var db=operator();var s=db.createStatement()) {
            s.execute("REVOKE REFERENCES(id) ON "+fixture.schema+".users FROM "+login);
            s.execute("REVOKE SELECT,INSERT ON "+fixture.schema+".flyway_schema_history FROM "+login);
            s.execute("REVOKE USAGE,CREATE ON SCHEMA "+fixture.schema+" FROM "+login);
            s.execute("REVOKE CONNECT ON DATABASE smartcinema_phase4e_test FROM "+login);
            s.execute("REVOKE smart_cinema_hold_owner,smart_cinema_staff_owner FROM "+login);
            s.execute("DROP ROLE "+login);created=false;
        }
        if(fixture.operator!=null&&fixture.originalPublic!=null)try(var db=DriverManager.getConnection(StaffPosMigrationReviewTests.ROOT,fixture.operator.getProperty("user"),fixture.operator.getProperty("password"))) {
            db.setReadOnly(true);db.setAutoCommit(false);assertThat(StaffPosPostgresTests.snapshot(db)).as("Local public data/history/global roles/memberships restored after isolated installer rehearsal").isEqualTo(fixture.originalPublic);
        }
        if(loader!=null)loader.close();
        Files.createDirectories(StaffPosMigrationReviewTests.DIR);
        Files.writeString(StaffPosMigrationReviewTests.DIR.resolve("installer-evidence.txt"),String.join("\n",evidence)+"\nCreated LOCAL migration login revoked/dropped; no DROP OWNED/CASCADE, no public data reset or global privilege drift.\n");
    }
}
