package com.smartcinema.seat;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.seat.dto.*;

@Repository
public class SeatRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public SeatRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Instant now() {
        return jdbc.getJdbcTemplate().queryForObject("SELECT clock_timestamp()", Timestamp.class).toInstant();
    }

    public void timeouts(SeatHoldSettings settings) {
        jdbc.queryForObject("""
                SELECT set_config('lock_timeout',:lock,true),set_config('statement_timeout',:statement,true),
                set_config('idle_in_transaction_session_timeout',:idle,true)
                """, new MapSqlParameterSource("lock", settings.lockTimeout().toMillis() + "ms")
                .addValue("statement", settings.statementTimeout().toMillis() + "ms")
                .addValue("idle", settings.idleTimeout().toMillis() + "ms"), (row, index) -> row.getString(1));
    }

    public SeatMapResponse map(long showtimeId, Instant now) {
        var parameters = new MapSqlParameterSource("id", showtimeId).addValue("now", Timestamp.from(now));
        var context = jdbc.query("""
                SELECT s.movie_id,h.cinema_id,s.hall_id FROM showtimes s JOIN halls h ON h.id=s.hall_id
                JOIN cinemas c ON c.id=h.cinema_id JOIN movies m ON m.id=s.movie_id WHERE s.id=:id
                AND m.status='PUBLISHED' AND c.status='ACTIVE' AND h.status='ACTIVE'
                AND s.status='OPEN_FOR_BOOKING' AND s.start_time>:now AND s.booking_cut_off>:now
                """, parameters, (row, index) -> new String[] {row.getString(1), row.getString(2), row.getString(3)});
        if (context.isEmpty()) { throw new SeatUnavailableException(); }
        String[] parent = context.getFirst();
        parameters.addValue("hall", Long.parseLong(parent[2]));
        var units = jdbc.query("""
                SELECT seat.id,seat.row,seat.number,seat.seat_type,
                    CASE WHEN ss.id IS NULL OR NOT ss.is_sellable OR seat.physical_status<>'ACTIVE' THEN 'UNAVAILABLE'
                         WHEN EXISTS(SELECT 1 FROM seat_holds sh WHERE sh.showtime_id=:id AND sh.seat_id=seat.id
                             AND sh.status='ACTIVE' AND sh.expires_at>:now) THEN 'HELD'
                         ELSE 'AVAILABLE' END AS availability
                FROM seats seat LEFT JOIN showtime_seats ss ON ss.showtime_id=:id AND ss.seat_id=seat.id
                WHERE seat.hall_id=:hall ORDER BY seat.row COLLATE "C",seat.number COLLATE "C",seat.id
                """, parameters, (row, index) -> new SeatUnitResponse(row.getString("id"), row.getString("row"),
                    row.getString("number"), row.getString("seat_type"), "COUPLE".equals(row.getString("seat_type")) ? 2 : 1,
                    row.getString("availability")));
        return new SeatMapResponse(Long.toString(showtimeId), parent[0], parent[1], parent[2], now, units);
    }

    public List<SeatHoldResponse> acquire(long showtimeId, long userId, List<Long> seatIds, SeatHoldSettings settings) {
        // Build only a bound PostgreSQL array literal from already validated numeric values.
        String ids = "{" + String.join(",", seatIds.stream().map(String::valueOf).toList()) + "}";
        return jdbc.query("SELECT * FROM acquire_seat_holds(:showtime,:user,CAST(:seats AS bigint[]),CAST(:ttl AS interval))",
                new MapSqlParameterSource("showtime", showtimeId).addValue("user", userId)
                    .addValue("seats", ids).addValue("ttl", settings.ttl().toString()), (row, index) -> hold(row));
    }

    public List<SeatHoldResponse> mine(long showtimeId, long userId, Instant now) {
        var parameters = new MapSqlParameterSource("showtime", showtimeId).addValue("user", userId).addValue("now", Timestamp.from(now));
        Boolean active = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=:user AND role='CUSTOMER' AND status='ACTIVE')",
                parameters, Boolean.class);
        if (!Boolean.TRUE.equals(active)) { throw new org.springframework.security.access.AccessDeniedException("Customer unavailable"); }
        return jdbc.query("""
                SELECT sh.* FROM seat_holds sh JOIN showtimes s ON s.id=sh.showtime_id
                JOIN halls h ON h.id=s.hall_id JOIN cinemas c ON c.id=h.cinema_id JOIN movies m ON m.id=s.movie_id
                JOIN showtime_seats ss ON ss.showtime_id=sh.showtime_id AND ss.seat_id=sh.seat_id
                JOIN seats seat ON seat.id=sh.seat_id
                WHERE sh.showtime_id=:showtime AND sh.user_id=:user AND sh.status='ACTIVE' AND sh.expires_at>:now
                AND m.status='PUBLISHED' AND c.status='ACTIVE' AND h.status='ACTIVE' AND s.status='OPEN_FOR_BOOKING'
                AND s.start_time>:now AND s.booking_cut_off>:now AND ss.is_sellable AND seat.physical_status='ACTIVE'
                ORDER BY sh.seat_id
                """, parameters, (row, index) -> hold(row));
    }

    public void release(long showtimeId, long userId, long holdId) {
        jdbc.queryForObject("SELECT release_seat_hold(:showtime,:user,:hold)",
                new MapSqlParameterSource("showtime", showtimeId).addValue("user", userId).addValue("hold", holdId),
                (row, index) -> row.getObject(1));
    }

    public int expire(long showtimeId) {
        return jdbc.queryForObject("SELECT expire_seat_holds(:id)", new MapSqlParameterSource("id", showtimeId), Integer.class);
    }

    public List<Long> expiryCandidates(int limit) {
        return jdbc.query("""
                SELECT showtime_id FROM seat_holds WHERE status='ACTIVE' AND expires_at<=clock_timestamp()
                GROUP BY showtime_id ORDER BY min(expires_at),showtime_id LIMIT :limit
                """, new MapSqlParameterSource("limit", limit), (row, index) -> row.getLong(1));
    }

    private SeatHoldResponse hold(ResultSet row) throws SQLException {
        return new SeatHoldResponse(row.getString("id"), row.getString("showtime_id"), row.getString("seat_id"),
                row.getTimestamp("created_at").toInstant(), row.getTimestamp("expires_at").toInstant(), row.getString("status"));
    }
}
