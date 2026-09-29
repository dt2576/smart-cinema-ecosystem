package com.smartcinema.promotion;

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
@EnabledIfEnvironmentVariable(named = "PROMOTION_DB_TESTS", matches = "true")
class PromotionMigrationPostgresTests {
    @Autowired private DataSource dataSource;
    @Autowired private Flyway flyway;

    @Test
    void freshAndPopulatedV7UpgradePreserveBookingAndTranslateFixedPromotion() throws Exception {
        flyway.validate();
        assertThat(Integer.parseInt(flyway.info().current().getVersion().getVersion())).isEqualTo(8);
        String schema = "promotion_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try {
            var old = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public")
                    .target(MigrationVersion.fromVersion("7")).load();
            old.migrate();
            var checksums = Arrays.stream(old.info().applied()).filter(m -> m.getVersion() != null).map(m -> m.getChecksum()).toList();
            assertThat(checksums).containsExactly(1536752408, 1495804464, 1822747767, -336975126, -226696638, -1104445100, -2107511975);
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
                sql.execute("SELECT create_booking(71,71,ARRAY(SELECT id FROM seat_holds))");
                sql.execute("SET ROLE smart_cinema_hold_owner");
                sql.execute("INSERT INTO promotions(code,discount_type,discount_value,valid_from,valid_until,minimum_order,status) VALUES ('UPGRADE-FIXED','FIXED',10,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',0,'ACTIVE')");
                sql.execute("RESET ROLE");
                sql.execute("RESET search_path");
            }
            var upgrade = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public").target(MigrationVersion.fromVersion("8")).load();
            assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
            upgrade.validate(); assertThat(upgrade.migrate().migrationsExecuted).isZero();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(m -> m.getVersion() != null).limit(7).map(m -> m.getChecksum()).toList()).isEqualTo(checksums);
            try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
                sql.execute("SET search_path TO " + schema + ",public");
                sql.execute("SET ROLE smart_cinema_hold_runtime");
                sql.execute("SELECT create_booking(71,71,ARRAY(SELECT id FROM seat_holds))");
                try (var result = sql.executeQuery("SELECT b.status,b.seat_amount,h.status,h.expires_at=b.expires_at,bs.sold_at IS NULL FROM bookings b JOIN seat_holds h ON h.booking_id=b.id JOIN booking_seats bs ON bs.booking_id=b.id")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo("PENDING");
                    assertThat(result.getBigDecimal(2)).isEqualByComparingTo("80");
                    assertThat(result.getString(3)).isEqualTo("ACTIVE"); assertThat(result.getBoolean(4)).isTrue(); assertThat(result.getBoolean(5)).isTrue();
                }
                sql.execute("RESET ROLE");
                sql.execute("SELECT configure_concession_item(NULL,'Upgrade popcorn',NULL,'POPCORN',12.3456,NULL,'ACTIVE')");
                sql.execute("SET ROLE smart_cinema_hold_runtime");
                sql.execute("SELECT edit_booking_concession((SELECT id FROM bookings),71,NULL,(SELECT id FROM concession_items),2,'ADD')");
                try (var result = sql.executeQuery("SELECT concession_amount,final_amount FROM bookings")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getBigDecimal(1)).isEqualByComparingTo("24.6912");
                    assertThat(result.getBigDecimal(2)).isEqualByComparingTo("104.6912");
                }
                sql.execute("SELECT edit_booking_promotion((SELECT id FROM bookings),71,'UPGRADE-FIXED','APPLY')");
                try (var result = sql.executeQuery("SELECT promotion_type_snapshot,discount,final_amount FROM bookings")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo("FIXED_AMOUNT");
                    assertThat(result.getBigDecimal(2)).isEqualByComparingTo("10"); assertThat(result.getBigDecimal(3)).isEqualByComparingTo("94.6912");
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
