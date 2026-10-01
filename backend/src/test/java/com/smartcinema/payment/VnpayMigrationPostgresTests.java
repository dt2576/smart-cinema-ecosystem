package com.smartcinema.payment;

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
@EnabledIfEnvironmentVariable(named = "PAYMENT_DB_TESTS", matches = "true")
class VnpayMigrationPostgresTests {
    @Autowired private DataSource dataSource;
    @Autowired private Flyway flyway;

    @Test
    void freshAndPopulatedV9UpgradePreserveAttemptsAndChecksums() throws Exception {
        flyway.validate();
        assertThat(Integer.parseInt(flyway.info().current().getVersion().getVersion())).isEqualTo(11);
        String schema = "vnpay_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try {
            var old = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public")
                    .target(MigrationVersion.fromVersion("9")).load();
            old.migrate();
            var checksums = Arrays.stream(old.info().applied()).filter(m -> m.getVersion() != null).map(m -> m.getChecksum()).toList();
            assertThat(checksums.subList(0,7)).containsExactly(1536752408, 1495804464, 1822747767, -336975126, -226696638, -1104445100, -2107511975);
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
                sql.execute("SELECT initiate_payment((SELECT id FROM bookings),71)");
                sql.execute("SET ROLE smart_cinema_hold_owner");
                sql.execute("INSERT INTO promotions(code,discount_type,discount_value,valid_from,valid_until,minimum_order,status) VALUES ('UPGRADE-FIXED','FIXED_AMOUNT',10,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',0,'ACTIVE')");
                sql.execute("RESET ROLE");
                sql.execute("RESET search_path");
            }
            var upgrade = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema, "public").target(MigrationVersion.fromVersion("10")).load();
            assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
            upgrade.validate(); assertThat(upgrade.migrate().migrationsExecuted).isZero();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(m -> m.getVersion() != null).limit(9).map(m -> m.getChecksum()).toList()).isEqualTo(checksums);
            try (Connection connection = dataSource.getConnection(); var sql = connection.createStatement()) {
                sql.execute("SET search_path TO " + schema + ",public");
                try(var result=sql.executeQuery("SELECT p.status,p.amount,p.provider IS NULL,p.currency IS NULL,p.initiated_at=b.payment_started_at FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo("INITIATED");
                    assertThat(result.getBigDecimal(2)).isEqualByComparingTo("80");
                    assertThat(result.getBoolean(3)).isTrue();assertThat(result.getBoolean(4)).isTrue();assertThat(result.getBoolean(5)).isTrue();
                }
                sql.execute("SET ROLE smart_cinema_hold_runtime");
                sql.execute("SELECT bind_vnpay_submission((SELECT id FROM payment_transactions),71,'TEST0001','https://example.test/return','127.0.0.1')");
                sql.execute("RESET ROLE");sql.execute("SET ROLE smart_cinema_payment_system");
                sql.execute("SELECT record_vnpay_result(merchant_code,merchant_reference,submitted_amount,'9911','IPN',repeat('a',64),'SUCCESS','00','00') FROM payment_transactions");
                sql.execute("RESET ROLE");
                try(var result=sql.executeQuery("SELECT b.status,b.booking_qr_token IS NOT NULL,(SELECT count(*) FROM tickets) FROM bookings b")) {
                    assertThat(result.next()).isTrue();assertThat(result.getString(1)).isEqualTo("PAID");assertThat(result.getBoolean(2)).isTrue();assertThat(result.getInt(3)).isEqualTo(1);
                }
            }
        } finally {
            try(Connection connection=dataSource.getConnection();var sql=connection.createStatement()) {
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }
}
