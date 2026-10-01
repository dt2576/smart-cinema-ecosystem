package com.smartcinema.demo;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.LongSupplier;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.movie.Movie;
import com.smartcinema.movie.MoviePublicationPolicy;

@Service
@Profile("demo-seed")
public class DemoSeedService {
    static final String MARKER = "Smart Cinema development demo v1 — fictional data, not a real business record.";
    static final String PREFIX = "[DEMO] ";
    private static final String[] GENRES = {"Action", "Adventure", "Science Fiction", "Drama", "Thriller", "Animation", "Comedy"};
    private static final String[] TITLES = {"Eclipse Protocol", "The Last Horizon", "Neon City", "Echoes of Tomorrow", "Midnight Signal",
            "Beyond Orion", "Silent Orbit", "Crimson Sky", "Clockwork Garden", "The Paper Moon"};
    private static final String[] BRANCHES = {"Central", "Riverside", "Westlake"};
    private final JdbcTemplate jdbc;
    private final EntityManager entities;
    private final ZoneId zone;

    public DemoSeedService(JdbcTemplate jdbc, EntityManager entities,
            @Value("${discovery.time-zone:Asia/Ho_Chi_Minh}") String timeZone) {
        this.jdbc = jdbc;
        this.entities = entities;
        this.zone = ZoneId.of(timeZone);
    }

    @Transactional
    public SeedResult seed() {
        // Only serializes seed commands in this database/schema; production lock/guard rules are untouched.
        jdbc.execute("SELECT pg_advisory_xact_lock(hashtextextended(current_database() || current_schema() || 'smart-cinema-demo-v1',0))");
        if (jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version='10' AND success", Integer.class) != 1) {
            throw new IllegalStateException("Demo seed requires successfully migrated V10 schema.");
        }
        Instant now = jdbc.queryForObject("SELECT clock_timestamp()", (row, number) -> row.getTimestamp(1).toInstant());
        return seedForDate(now.atZone(zone).toLocalDate());
    }

    SeedResult seedForDate(LocalDate today) {
        long[] genres = new long[GENRES.length];
        for (int i = 0; i < GENRES.length; i++) {
            String name = PREFIX + GENRES[i];
            genres[i] = existingOrInsert("Genre", "SELECT id FROM genres WHERE name=?", new Object[]{name}, Map.of(),
                    () -> id("INSERT INTO genres(name) VALUES (?) RETURNING id", name));
        }
        long[] movies = new long[TITLES.length];
        for (int i = 0; i < TITLES.length; i++) {
            String title = PREFIX + TITLES[i];
            int duration = 90 + i * 5;
            movies[i] = existingOrInsert("Movie", "SELECT * FROM movies WHERE title=?", new Object[]{title},
                    Map.of("description", MARKER, "duration", duration, "status", "PUBLISHED", "release_date", java.sql.Date.valueOf(LocalDate.of(2026, 1, 1)),
                            "age_rating", "T13", "language", "Vietnamese", "poster", "http://localhost:3000/file.svg"),
                    () -> id("""
                            INSERT INTO movies(title,description,duration,release_date,age_rating,language,poster,status)
                            VALUES (?,?,?,DATE '2026-01-01','T13','Vietnamese','http://localhost:3000/file.svg','PUBLISHED') RETURNING id
                            """, title, MARKER, duration));
            new MoviePublicationPolicy().validatePublication(entities.find(Movie.class, movies[i]));
            for (long genre : new long[]{genres[i % genres.length], genres[(i + 2) % genres.length]}) {
                jdbc.update("""
                        INSERT INTO movie_genres(movie_id,genre_id) SELECT ?,?
                        WHERE NOT EXISTS(SELECT 1 FROM movie_genres WHERE movie_id=? AND genre_id=?)
                        """, movies[i], genre, movies[i], genre);
            }
        }
        var halls = new ArrayList<Long>();
        for (String branch : BRANCHES) {
            String name = PREFIX + "Smart Cinema " + branch;
            String address = "Demo-only " + branch + " district, fictional address";
            long cinema = existingOrInsert("Cinema", "SELECT * FROM cinemas WHERE name=?", new Object[]{name},
                    Map.of("address", address, "operating_information", MARKER, "status", "ACTIVE"),
                    () -> id("INSERT INTO cinemas(name,address,operating_information,status) VALUES (?,?,?,'ACTIVE') RETURNING id", name, address, MARKER));
            for (int number = 1; number <= 2; number++) {
                String hallName = "Demo Hall " + number;
                halls.add(existingOrInsert("Hall", "SELECT * FROM halls WHERE cinema_id=? AND name=?", new Object[]{cinema, hallName},
                        Map.of("capacity", 50, "type", "Demo configured hall", "status", "ACTIVE"),
                        () -> id("INSERT INTO halls(cinema_id,name,capacity,type,status) VALUES (?,?,50,'Demo configured hall','ACTIVE') RETURNING id", cinema, hallName)));
            }
        }
        var showtimes = new ArrayList<Long>();
        for (int hallIndex = 0; hallIndex < halls.size(); hallIndex++) {
            long hall = halls.get(hallIndex);
            for (int day = 1; day <= 3; day++) {
                for (int slot = 0; slot < 4; slot++) {
                    int movieIndex = Math.floorMod(today.plusDays(day).toEpochDay() + hallIndex * 4 + slot, movies.length);
                    long movie = movies[movieIndex];
                    Instant start = today.plusDays(day).atTime(10 + slot * 3, 0).atZone(zone).toInstant();
                    Timestamp startsAt = Timestamp.from(start);
                    Timestamp endsAt = Timestamp.from(start.plusSeconds((90 + movieIndex * 5) * 60L));
                    Timestamp occupiedUntil = Timestamp.from(endsAt.toInstant().plusSeconds(15 * 60L));
                    Timestamp cutOff = Timestamp.from(start.minusSeconds(15 * 60L));
                    showtimes.add(existingOrInsert("Showtime", "SELECT * FROM showtimes WHERE hall_id=? AND start_time=?", new Object[]{hall, startsAt},
                            Map.of("movie_id", movie, "end_time", endsAt, "occupied_until", occupiedUntil, "booking_cut_off", cutOff,
                                    "base_price", new BigDecimal("90000.0000"), "status", "OPEN_FOR_BOOKING"),
                            () -> id("""
                                    INSERT INTO showtimes(movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                                    VALUES (?,?,?,?,?,90000,'OPEN_FOR_BOOKING',?) RETURNING id
                                    """, movie, hall, startsAt, endsAt, occupiedUntil, cutOff)));
                }
            }
        }
        // Deployment-only existing writers. Caller must already be authorized; seed grants nothing.
        jdbc.execute("SET LOCAL ROLE smart_cinema_hold_owner");
        for (long hall : halls) { initializeSeats(hall); }
        for (long showtime : showtimes) { initializeMembership(showtime); }
        seedConcessions();
        List<String> codes = seedPromotions(today);
        jdbc.execute("RESET ROLE");
        return new SeedResult(movies.length, BRANCHES.length, halls.size(), halls.size() * 45, showtimes.size(), codes);
    }

    private void initializeSeats(long hall) {
        if (jdbc.queryForObject("SELECT count(*) FROM seats WHERE hall_id=?", Integer.class, hall) == 0) {
            var units = new ArrayList<String>();
            for (char row = 'A'; row <= 'D'; row++) {
                for (int number = 1; number <= 10; number++) {
                    units.add("{\"row\":\"" + row + "\",\"number\":\"" + number + "\",\"type\":\""
                            + (row == 'D' ? "VIP" : "STANDARD") + "\",\"physicalStatus\":\"ACTIVE\"}");
                }
            }
            for (int number = 1; number <= 9; number += 2) {
                units.add("{\"row\":\"E\",\"number\":\"" + number + "-" + (number + 1) + "\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}");
            }
            jdbc.queryForObject("SELECT initialize_hall_seats(?,CAST(? AS jsonb))", Object.class, hall, "[" + String.join(",", units) + "]");
        }
        var actual = jdbc.queryForList("SELECT row,number,seat_type,physical_status FROM seats WHERE hall_id=?", hall);
        var expected = new ArrayList<Map<String, Object>>();
        for (char row = 'A'; row <= 'E'; row++) {
            for (int number = 1; number <= 10; number += row == 'E' ? 2 : 1) {
                expected.add(Map.of("row", String.valueOf(row), "number", row == 'E' ? number + "-" + (number + 1) : String.valueOf(number),
                        "seat_type", row == 'E' ? "COUPLE" : row == 'D' ? "VIP" : "STANDARD", "physical_status", "ACTIVE"));
            }
        }
        if (actual.size() != 45 || !actual.containsAll(expected)) { conflict("Seat layout"); }
    }

    private void initializeMembership(long showtime) {
        long hall = jdbc.queryForObject("SELECT hall_id FROM showtimes WHERE id=?", Long.class, showtime);
        if (jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE showtime_id=?", Integer.class, showtime) == 0) {
            String units = jdbc.queryForObject("SELECT '{' || string_agg(id::text,',' ORDER BY id) || '}' FROM seats WHERE hall_id=?", String.class, hall);
            jdbc.queryForObject("SELECT initialize_showtime_seats(?,CAST(? AS bigint[]))", Object.class, showtime, units);
        }
        if (jdbc.queryForObject("SELECT count(*) FROM showtime_seats WHERE showtime_id=? AND hall_id=? AND is_sellable", Integer.class, showtime, hall) != 45) {
            conflict("Showtime membership");
        }
    }

    private void seedConcessions() {
        String[] names = {"Popcorn Small", "Popcorn Large", "Coke", "Water", "Popcorn + Coke Combo"};
        String[] categories = {"POPCORN", "POPCORN", "DRINK", "DRINK", "COMBO"};
        int[] prices = {35000, 55000, 25000, 15000, 60000};
        for (int i = 0; i < names.length; i++) {
            String name = PREFIX + names[i]; String category = categories[i]; BigDecimal price = BigDecimal.valueOf(prices[i]).setScale(4);
            existingOrInsert("Concession", "SELECT * FROM concession_items WHERE name=?", new Object[]{name},
                    Map.of("description", MARKER, "category", category, "selling_price", price, "status", "ACTIVE"),
                    () -> id("SELECT configure_concession_item(NULL,?,?,?,?,NULL,'ACTIVE')", name, MARKER, category, price));
        }
    }

    private List<String> seedPromotions(LocalDate today) {
        String suffix = today.toString().replace("-", "");
        String[] codes = {"SCDEMO10-" + suffix, "SCWELCOME50K-" + suffix};
        Timestamp from = Timestamp.from(today.minusDays(1).atStartOfDay(zone).toInstant());
        Timestamp until = Timestamp.from(today.plusDays(7).atStartOfDay(zone).toInstant());
        for (int i = 0; i < codes.length; i++) {
            String code = codes[i]; String type = i == 0 ? "PERCENTAGE" : "FIXED_AMOUNT";
            BigDecimal value = new BigDecimal(i == 0 ? "10.0000" : "50000.0000");
            BigDecimal minimum = new BigDecimal(i == 0 ? "100000.0000" : "150000.0000");
            BigDecimal cap = i == 0 ? new BigDecimal("40000.0000") : null;
            var expected = new java.util.HashMap<String, Object>();
            expected.putAll(Map.of("discount_type", type, "discount_value", value, "minimum_order", minimum, "usage_limit", 100,
                    "valid_from", from, "valid_until", until, "status", "ACTIVE"));
            expected.put("max_discount_amount", cap);
            existingOrInsert("Promotion", "SELECT * FROM promotions WHERE code=?", new Object[]{code}, expected,
                    () -> id("SELECT configure_promotion(NULL,?,?,?,?,?,?,100,'ACTIVE',?)", code, type, value, from, until, minimum, cap));
        }
        return Arrays.asList(codes);
    }

    private long existingOrInsert(String kind, String query, Object[] keys, Map<String, Object> expected, LongSupplier insert) {
        var rows = jdbc.queryForList(query, keys);
        if (rows.isEmpty()) { return insert.getAsLong(); }
        if (rows.size() != 1) { conflict(kind + " duplicate identity"); }
        var row = rows.getFirst();
        for (var entry : expected.entrySet()) {
            if (!Objects.equals(row.get(entry.getKey()), entry.getValue())) { conflict(kind + " identity/content collision"); }
        }
        return ((Number) row.get("id")).longValue();
    }

    private long id(String sql, Object... arguments) { return jdbc.queryForObject(sql, Long.class, arguments); }
    private void conflict(String kind) { throw new IllegalStateException("Demo seed stopped: " + kind + ". Existing data was not overwritten; transaction rolls back."); }
    public record SeedResult(int movies, int cinemas, int halls, int seatUnits, int showtimes, List<String> promotionCodes) { }
}
