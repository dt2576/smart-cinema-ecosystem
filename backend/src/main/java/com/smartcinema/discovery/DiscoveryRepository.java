package com.smartcinema.discovery;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.discovery.dto.CinemaResponse;
import com.smartcinema.discovery.dto.HallSummary;
import com.smartcinema.discovery.dto.ShowtimeResponse;

/** Read projections only. No write path or seat-availability inference. */
@Repository
public class DiscoveryRepository {
    private static final String FROM = """
            FROM showtimes s JOIN halls h ON h.id=s.hall_id
            JOIN cinemas c ON c.id=h.cinema_id JOIN movies m ON m.id=s.movie_id
            """;
    private static final String ELIGIBLE = """
            m.status='PUBLISHED' AND c.status='ACTIVE' AND h.status='ACTIVE'
            AND s.status='OPEN_FOR_BOOKING' AND s.start_time > :now AND s.booking_cut_off > :now
            """;
    private static final String FIELDS = """
            SELECT s.id,s.movie_id,c.id AS cinema_id,h.id AS hall_id,h.name AS hall_name,
            s.start_time,s.end_time,s.booking_cut_off
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public DiscoveryRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean publishedMovieExists(long movieId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM movies WHERE id=:id AND status='PUBLISHED')",
                new MapSqlParameterSource("id", movieId), Boolean.class));
    }

    public List<CinemaResponse> cinemas(Long movieId, Instant now) {
        String sql = "SELECT branch.* FROM cinemas branch WHERE branch.status='ACTIVE'";
        if (movieId != null) {
            sql += " AND EXISTS (SELECT 1 " + FROM + " WHERE " + ELIGIBLE
                    + " AND s.movie_id=:movieId AND c.id=branch.id)";
        }
        return jdbc.query(sql + " ORDER BY branch.id", parameters(now).addValue("movieId", movieId),
                (row, index) -> cinema(row));
    }

    public Optional<CinemaResponse> cinema(long id) {
        return jdbc.query("SELECT * FROM cinemas WHERE id=:id AND status='ACTIVE'",
                new MapSqlParameterSource("id", id), (row, index) -> cinema(row)).stream().findFirst();
    }

    public List<LocalDate> dates(long movieId, long cinemaId, Instant now, String zone) {
        return jdbc.query("SELECT DISTINCT (s.start_time AT TIME ZONE :zone)::date AS local_date "
                + FROM + " WHERE " + ELIGIBLE + " AND m.id=:movieId AND c.id=:cinemaId ORDER BY local_date",
                parameters(now).addValue("movieId", movieId).addValue("cinemaId", cinemaId).addValue("zone", zone),
                (row, index) -> row.getObject("local_date", LocalDate.class));
    }

    public List<ShowtimeResponse> showtimes(long movieId, long cinemaId, Instant now, Instant from, Instant until) {
        return jdbc.query(FIELDS + FROM + " WHERE " + ELIGIBLE
                + " AND m.id=:movieId AND c.id=:cinemaId AND s.start_time >= :from AND s.start_time < :until"
                + " ORDER BY s.start_time,s.id",
                parameters(now).addValue("movieId", movieId).addValue("cinemaId", cinemaId)
                        .addValue("from", Timestamp.from(from)).addValue("until", Timestamp.from(until)),
                (row, index) -> showtime(row));
    }

    public Optional<ShowtimeResponse> showtime(long id, Instant now) {
        return jdbc.query(FIELDS + FROM + " WHERE " + ELIGIBLE + " AND s.id=:id",
                parameters(now).addValue("id", id), (row, index) -> showtime(row)).stream().findFirst();
    }

    private MapSqlParameterSource parameters(Instant now) {
        return new MapSqlParameterSource("now", Timestamp.from(now));
    }

    private CinemaResponse cinema(ResultSet row) throws SQLException {
        return new CinemaResponse(row.getString("id"), row.getString("name"), row.getString("address"),
                row.getString("contact"), row.getString("operating_information"));
    }

    private ShowtimeResponse showtime(ResultSet row) throws SQLException {
        return new ShowtimeResponse(row.getString("id"), row.getString("movie_id"), row.getString("cinema_id"),
                new HallSummary(row.getString("hall_id"), row.getString("hall_name")),
                row.getTimestamp("start_time").toInstant(), row.getTimestamp("end_time").toInstant(),
                row.getTimestamp("booking_cut_off").toInstant());
    }
}
