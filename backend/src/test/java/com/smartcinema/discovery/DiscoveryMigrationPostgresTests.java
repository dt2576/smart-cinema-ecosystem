package com.smartcinema.discovery;

import static org.assertj.core.api.Assertions.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.util.Arrays;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "DISCOVERY_DB_TESTS", matches = "true")
class DiscoveryMigrationPostgresTests {
    @Autowired private DataSource dataSource;
    @Autowired private Flyway flyway;

    @Test
    void freshSchemaAndUpgradePreserveOldChecksumsAndData() throws Exception {
        flyway.validate();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("4");
        String schema = "discovery_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        Flyway previous = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public")
                .locations("classpath:db/migration").target(MigrationVersion.fromVersion("3")).load();
        try {
            previous.migrate();
            var checksums = Arrays.stream(previous.info().applied()).filter(migration -> migration.getVersion() != null)
                    .map(migration -> migration.getChecksum()).toList();
            assertThat(checksums).containsExactly(1536752408, 1495804464, 1822747767);
            try (Connection connection = dataSource.getConnection(); var statement = connection.createStatement()) {
                statement.execute("INSERT INTO " + schema + ".movies(title,duration,status) VALUES ('Upgrade preserved',90,'DRAFT')");
            }
            Flyway upgrade = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public")
                    .locations("classpath:db/migration").load();
            assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
            upgrade.validate();
            assertThat(upgrade.migrate().migrationsExecuted).isZero();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(migration -> migration.getVersion() != null)
                    .limit(3).map(migration -> migration.getChecksum()).toList())
                    .isEqualTo(checksums);
            try (Connection connection = dataSource.getConnection(); var statement = connection.createStatement();
                    var result = statement.executeQuery("SELECT title FROM " + schema + ".movies")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString(1)).isEqualTo("Upgrade preserved");
            }
        } finally {
            // Only this test's UUID-generated schema; never Flyway clean/public or a user database.
            try (Connection connection = dataSource.getConnection(); var statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void constraintsRejectInvalidRowsAndHistoryBreakingParentDeletion() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.execute("INSERT INTO movies(id,title,duration,status) VALUES (700,'Migration fixture',60,'DRAFT')");
                statement.execute("INSERT INTO cinemas(id,name,address,status) VALUES (700,'Branch','Address','ACTIVE')");
                statement.execute("INSERT INTO halls(id,cinema_id,name,capacity,type,status) VALUES (700,700,'Hall',2,'Configured','ACTIVE')");
                String screening = """
                        INSERT INTO showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                        VALUES (700,700,700,'2030-01-01T10:00Z','2030-01-01T11:00Z','2030-01-01T11:15Z',0,'DRAFT','2030-01-01T10:00Z')
                        """;
                statement.execute(screening);
                for (String sql : new String[] {
                        "UPDATE cinemas SET name=' ' WHERE id=700", "UPDATE cinemas SET contact='' WHERE id=700",
                        "UPDATE cinemas SET operating_information=' ' WHERE id=700",
                        "UPDATE cinemas SET status='CLOSED' WHERE id=700", "UPDATE halls SET capacity=0 WHERE id=700",
                        "UPDATE halls SET cinema_id=999999 WHERE id=700", "UPDATE halls SET type=' ' WHERE id=700",
                        "UPDATE halls SET status='AVAILABLE' WHERE id=700", "UPDATE showtimes SET movie_id=999999 WHERE id=700",
                        "UPDATE showtimes SET base_price=-1 WHERE id=700", "UPDATE showtimes SET base_price='NaN' WHERE id=700",
                        "UPDATE showtimes SET base_price=1000000000000000 WHERE id=700",
                        "UPDATE showtimes SET start_time='-infinity' WHERE id=700",
                        "UPDATE showtimes SET end_time=start_time WHERE id=700",
                        "UPDATE showtimes SET occupied_until=end_time-interval '1 second' WHERE id=700",
                        "UPDATE showtimes SET booking_cut_off=start_time+interval '1 second' WHERE id=700",
                        "UPDATE showtimes SET status='SOLD_OUT' WHERE id=700", "DELETE FROM cinemas WHERE id=700",
                        "DELETE FROM halls WHERE id=700", "DELETE FROM movies WHERE id=700"}) {
                    reject(connection, sql);
                }
                // Buffer-only overlap, even for DRAFT, is forbidden; adjacent half-open intervals are valid.
                String overlapping = screening.replace("(700,700,700,", "(701,700,700,")
                        .replace("10:00Z", "11:00Z").replace("11:15Z", "12:15Z")
                        .replace("'2030-01-01T11:00Z','2030-01-01T11:00Z'", "'2030-01-01T11:00Z','2030-01-01T12:00Z'");
                reject(connection, overlapping);
                statement.execute(overlapping.replace("'DRAFT'", "'CANCELLED'"));
                statement.execute(overlapping.replace("(701,700,700,", "(702,700,700,")
                        .replace("11:00Z", "11:15Z"));
            } finally { connection.rollback(); }
        }
    }

    private void reject(Connection connection, String sql) throws Exception {
        Savepoint savepoint = connection.setSavepoint();
        try (var statement = connection.createStatement()) {
            assertThatThrownBy(() -> statement.execute(sql)).as(sql).isInstanceOf(SQLException.class);
        } finally {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }
}
