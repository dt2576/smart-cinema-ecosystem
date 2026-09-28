package com.smartcinema.seat;

import static org.assertj.core.api.Assertions.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties="seat-hold.cleanup-enabled=false")
@EnabledIfEnvironmentVariable(named="SEAT_DB_TESTS",matches="true")
class SeatMigrationPostgresTests {
    @Autowired private DataSource dataSource;
    @Autowired private Flyway flyway;

    @Test
    void freshAndV4UpgradePreserveHistoryAndStageBookingLinkSafely() throws Exception {
        flyway.validate();
        assertThat(Integer.parseInt(flyway.info().current().getVersion().getVersion())).isGreaterThanOrEqualTo(5);
        String schema="seat_upgrade_"+UUID.randomUUID().toString().replace("-","");
        try {
            var old=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public")
                    .target(MigrationVersion.fromVersion("4")).load();
            old.migrate();
            var checksums=Arrays.stream(old.info().applied()).filter(m -> m.getVersion()!=null).map(m -> m.getChecksum()).toList();
            assertThat(checksums).containsExactly(1536752408,1495804464,1822747767,-336975126);
            try(Connection connection=dataSource.getConnection();var sql=connection.createStatement()) {
                sql.execute("INSERT INTO "+schema+".cinemas(id,name,address,status) VALUES (71,'Preserved','Address','ACTIVE')");
            }
            var upgrade=Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema,"public").target(MigrationVersion.fromVersion("5")).load();
            assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
            upgrade.validate();
            assertThat(upgrade.migrate().migrationsExecuted).isZero();
            assertThat(Arrays.stream(upgrade.info().applied()).filter(m -> m.getVersion()!=null).limit(4).map(m -> m.getChecksum()).toList()).isEqualTo(checksums);
            try(Connection connection=dataSource.getConnection();var sql=connection.createStatement()) {
                try(var result=sql.executeQuery("SELECT name FROM "+schema+".cinemas WHERE id=71")) {
                    assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo("Preserved");
                }
                sql.execute("INSERT INTO "+schema+".halls(id,cinema_id,name,capacity,type,status) VALUES (71,71,'Hall',2,'Configured','ACTIVE')");
                sql.execute("INSERT INTO "+schema+".movies(id,title,duration,status) VALUES (71,'Movie',60,'PUBLISHED')");
                sql.execute("INSERT INTO "+schema+".showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,booking_cut_off,base_price,status) "
                        +"VALUES (71,71,71,now()+interval '1 hour',now()+interval '2 hours',now()+interval '2 hours',now()+interval '1 hour',100,'OPEN_FOR_BOOKING')");
                sql.execute("SELECT "+schema+".initialize_hall_seats(71,'[{\"row\":\"H\",\"number\":\"9-10\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}]')");
                sql.execute("SELECT "+schema+".initialize_showtime_seats(71,ARRAY(SELECT id FROM "+schema+".seats))");
                sql.execute("INSERT INTO "+schema+".users(id,email,password_hash,full_name,phone,role,status) VALUES (71,'test@example.test','hash','Name','0123','CUSTOMER','ACTIVE')");
                sql.execute("SELECT * FROM "+schema+".acquire_seat_holds(71,71,ARRAY(SELECT id FROM "+schema+".seats),interval '10 minutes')");
                sql.execute("SET ROLE smart_cinema_hold_owner");
                assertThatThrownBy(() -> sql.execute("INSERT INTO "+schema+".seat_holds(showtime_id,seat_id,user_id,expires_at) "
                        +"SELECT 71,id,71,clock_timestamp()+interval '1 minute' FROM "+schema+".seats"))
                        .isInstanceOfSatisfying(SQLException.class,error -> assertThat(error.getSQLState()).isEqualTo("23505"));
                for(String change:new String[] {"booking_id=1","status='CONSUMED'","expires_at=expires_at+interval '1 minute'","seat_id=99999"}) {
                    assertThatThrownBy(() -> sql.execute("UPDATE "+schema+".seat_holds SET "+change)).isInstanceOf(SQLException.class);
                }
                assertThatThrownBy(() -> sql.execute("DELETE FROM "+schema+".seat_holds")).isInstanceOf(SQLException.class);
                assertThatThrownBy(() -> sql.execute("INSERT INTO "+schema+".showtime_seats(showtime_id,seat_id,hall_id,is_sellable) VALUES (71,1,999,true)"))
                        .isInstanceOf(SQLException.class);
                assertThatThrownBy(() -> sql.execute("INSERT INTO "+schema+".seats(hall_id,row,number,seat_type,physical_status) VALUES (71,'H','9-10','COUPLE','ACTIVE')"))
                        .isInstanceOf(SQLException.class);
                sql.execute("RESET ROLE");
            }
        } finally {
            try(Connection connection=dataSource.getConnection();var sql=connection.createStatement()) {
                sql.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");
            }
        }
    }
}
