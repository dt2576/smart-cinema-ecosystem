package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.demo.DemoSeedService;
import com.smartcinema.seat.SeatService;
import com.smartcinema.booking.*;
import com.smartcinema.movie.MovieStatus;

@SpringBootTest(properties="seat-hold.cleanup-enabled=false")
@ActiveProfiles("demo-seed")
@EnabledIfEnvironmentVariable(named="MOVIE_DB_TESTS",matches="true")
@Transactional
class AdminMovieSnapshotPostgresTests {
    private static final String SCHEMA="admin_snapshot_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema",()->SCHEMA);
        properties.add("spring.flyway.schemas",()->SCHEMA+",public");
        properties.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        properties.add("spring.datasource.url",()->{ String url=System.getenv("DB_URL"); return url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA+",public"; });
    }
    @Autowired DemoSeedService seed;
    @Autowired JdbcTemplate jdbc;
    @Autowired SeatService seats;
    @Autowired BookingService bookings;
    @Autowired AdminMovieService movies;

    @Test void metadataEditsAndUnpublicationPreserveBookingSnapshotsOriginsAndSchedule() {
        seed.seed();
        long admin=account("ADMIN"); long customer=account("CUSTOMER");
        var screening=jdbc.queryForMap("SELECT id,movie_id,hall_id,end_time,occupied_until FROM showtimes ORDER BY start_time,id LIMIT 1");
        long showtime=((Number)screening.get("id")).longValue(); long movie=((Number)screening.get("movie_id")).longValue();
        long seat=jdbc.queryForObject("SELECT id FROM seats WHERE hall_id=? AND seat_type='COUPLE' ORDER BY id LIMIT 1",Long.class,screening.get("hall_id"));
        var holds=seats.acquire(showtime,customer,List.of(seat));
        var before=bookings.create(customer,new BookingRequest(showtime,holds.holds().stream().map(hold->Long.valueOf(hold.id())).toList()));
        var content=AdminMovieRequest.parse(Map.of("title","Admin changed title","duration",99,"releaseDate","2026-10-01","ageRating","T13",
                "language","Vietnamese","posterUrl","https://example.test/poster","genreIds",List.of()));
        movies.update(admin,movie,content);
        movies.publication(admin,movie,MovieStatus.UNPUBLISHED);
        var after=bookings.detail(Long.valueOf(before.id()),customer);
        // Booking v1.x deliberately projects catalog labels live; pricing/unit snapshots are immutable.
        assertThat(after.movieTitle()).isEqualTo("Admin changed title");
        assertThat(after.expiresAt()).isEqualTo(before.expiresAt());
        assertThat(after.seats()).isEqualTo(before.seats());
        assertThat(after.guestCount()).isEqualTo(2);
        assertThat(after.finalAmount()).isEqualTo(before.finalAmount());
        assertThat(after.status()).isEqualTo("PENDING");
        var schedule=jdbc.queryForMap("SELECT end_time,occupied_until FROM showtimes WHERE id=?",showtime);
        assertThat(schedule.get("end_time")).isEqualTo(screening.get("end_time"));
        assertThat(schedule.get("occupied_until")).isEqualTo(screening.get("occupied_until"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_seats WHERE sold_at IS NOT NULL",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tickets",Long.class)).isZero();
    }
    private long account(String role) {
        return jdbc.queryForObject("INSERT INTO users(email,password_hash,full_name,phone,role,status) VALUES (?,'test-only-hash','Test actor','0901234567',?,'ACTIVE') RETURNING id",
                Long.class,UUID.randomUUID()+"@example.test",role);
    }
}
