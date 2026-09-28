package com.smartcinema.booking;

import static org.assertj.core.api.Assertions.*;
import java.sql.Connection;
import java.util.Arrays;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "seat-hold.cleanup-enabled=false")
@EnabledIfEnvironmentVariable(named = "BOOKING_DB_TESTS", matches = "true")
class BookingMigrationPostgresTests {
    @Autowired private DataSource dataSource;
    @Autowired private Flyway flyway;

    @Test
    void freshAndPopulatedV5UpgradePreserveHistoryAndEnableOnlyPendingBookings() throws Exception {
        flyway.validate();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("6");
        String schema = "booking_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try {
            var old = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public")
                    .target(MigrationVersion.fromVersion("5")).load();
            old.migrate();
            var checksums = Arrays.stream(old.info().applied()).filter(m -> m.getVersion() != null).map(m -> m.getChecksum()).toList();
            assertThat(checksums).containsExactly(1536752408, 1495804464, 1822747767, -336975126, -226696638);
            try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
                sql.execute("SET search_path TO " + schema + ",public");
                sql.execute("INSERT INTO users(id,email,password_hash,full_name,phone,role,status) VALUES (71,'upgrade@example.test','hash','Name','0123','CUSTOMER','ACTIVE')");
                sql.execute("INSERT INTO cinemas(id,name,address,status) VALUES (71,'Preserved','Address','ACTIVE')");
                sql.execute("INSERT INTO halls(id,cinema_id,name,capacity,type,status) VALUES (71,71,'Hall',2,'Configured','ACTIVE')");
                sql.execute("INSERT INTO movies(id,title,duration,status) VALUES (71,'Movie',60,'PUBLISHED')");
                sql.execute("INSERT INTO showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) "
                        + "VALUES (71,71,71,statement_timestamp()+interval '1 hour',statement_timestamp()+interval '2 hours',statement_timestamp()+interval '2 hours',statement_timestamp()+interval '1 hour',80,'OPEN_FOR_BOOKING')");
                sql.execute("SELECT initialize_hall_seats(71,'[{\"row\":\"H\",\"number\":\"9-10\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}]')");
                sql.execute("SELECT initialize_showtime_seats(71,ARRAY(SELECT id FROM seats))");
                sql.execute("SELECT * FROM acquire_seat_holds(71,71,ARRAY(SELECT id FROM seats),interval '10 minutes')");
                sql.execute("RESET search_path");
            }
            var upgrade = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public").load();
            assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
            upgrade.validate(); assertThat(upgrade.migrate().migrationsExecuted).isZero();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(m -> m.getVersion() != null).limit(5).map(m -> m.getChecksum()).toList()).isEqualTo(checksums);
            try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
                sql.execute("SET search_path TO " + schema + ",public");
                sql.execute("SET ROLE smart_cinema_hold_runtime");
                sql.execute("SELECT create_booking(71,71,ARRAY(SELECT id FROM seat_holds))");
                try (var result = sql.executeQuery("SELECT b.status,b.seat_amount,h.status,h.expires_at=b.expires_at,bs.sold_at IS NULL FROM bookings b JOIN seat_holds h ON h.booking_id=b.id JOIN booking_seats bs ON bs.booking_id=b.id")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo("PENDING");
                    assertThat(result.getBigDecimal(2)).isEqualByComparingTo("80");
                    assertThat(result.getString(3)).isEqualTo("ACTIVE"); assertThat(result.getBoolean(4)).isTrue(); assertThat(result.getBoolean(5)).isTrue();
                }
                sql.execute("SELECT cancel_booking((SELECT id FROM bookings),71)");
                sql.execute("RESET ROLE");
                try (var result = sql.executeQuery("SELECT indexdef FROM pg_indexes WHERE schemaname='" + schema + "' AND indexname='uq_booking_seats_sold_pair'")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).contains("UNIQUE", "sold_at IS NOT NULL");
                }
                sql.execute("RESET search_path");
            }
        } finally {
            try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }
}
