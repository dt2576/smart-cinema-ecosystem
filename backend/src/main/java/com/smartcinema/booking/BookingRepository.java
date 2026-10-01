package com.smartcinema.booking;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Repository;
import com.smartcinema.seat.SeatUnavailableException;

@Repository
public class BookingRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public BookingRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long create(long userId, BookingRequest request) {
        String ids = "{" + String.join(",", request.holdIds().stream().map(String::valueOf).toList()) + "}";
        return jdbc.queryForObject("SELECT create_booking(:showtime,:user,CAST(:holds AS bigint[]))",
                new MapSqlParameterSource("showtime", request.showtimeId()).addValue("user", userId).addValue("holds", ids), Long.class);
    }

    public void cancel(long bookingId, long userId) {
        jdbc.queryForObject("SELECT cancel_booking(:id,:user)", parameters(bookingId, userId), (row, index) -> row.getObject(1));
    }

    public BookingResponse detail(long bookingId, long userId, Instant now) {
        var parameters = parameters(bookingId, userId).addValue("now", Timestamp.from(now));
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=:user AND role='CUSTOMER' AND status='ACTIVE')",
                parameters, Boolean.class))) { throw new AccessDeniedException("Customer unavailable"); }
        // Labels/context are live references; only the dictionary's Seat type/price and monetary totals are snapshots.
        var lines = jdbc.query("""
                SELECT bs.*,s.row,s.number,h.id AS hold_id FROM booking_seats bs
                JOIN bookings b ON b.id=bs.booking_id JOIN seats s ON s.id=bs.seat_id
                JOIN seat_holds h ON h.booking_id=bs.booking_id AND h.seat_id=bs.seat_id
                WHERE b.id=:id AND b.customer_id=:user ORDER BY bs.seat_id
                """, parameters, (row, index) -> new BookingResponse.SeatLine(row.getString("id"), row.getString("seat_id"),
                    row.getString("hold_id"), row.getString("row"), row.getString("number"), row.getString("seat_type_snapshot"),
                    "COUPLE".equals(row.getString("seat_type_snapshot")) ? 2 : 1,
                    row.getBigDecimal("unit_price_snapshot").toPlainString(), row.getBigDecimal("final_price").toPlainString()));
        var concessions = jdbc.query("""
                SELECT bc.* FROM booking_concessions bc JOIN bookings b ON b.id=bc.booking_id
                WHERE b.id=:id AND b.customer_id=:user ORDER BY bc.id
                """, parameters, (row, index) -> new BookingResponse.ConcessionLine(row.getString("id"), row.getString("concession_item_id"),
                    row.getString("item_name_snapshot"), row.getString("category_snapshot"), row.getInt("quantity"),
                    row.getBigDecimal("unit_price_snapshot").toPlainString(), row.getBigDecimal("total_price").toPlainString()));
        var result = jdbc.query("""
                SELECT b.*,s.movie_id,s.hall_id,s.start_time,m.title,h.name AS hall_name,h.cinema_id,c.name AS cinema_name,
                    CASE WHEN b.status='PENDING' AND b.expires_at<=:now THEN 'EXPIRED' ELSE b.status END AS effective_status
                FROM bookings b JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id
                JOIN halls h ON h.id=s.hall_id JOIN cinemas c ON c.id=h.cinema_id WHERE b.id=:id AND b.customer_id=:user
                """, parameters, (row, index) -> new BookingResponse(row.getString("id"), row.getString("booking_code"),
                    row.getString("effective_status"), row.getString("showtime_id"), row.getString("movie_id"), row.getString("title"),
                    row.getString("cinema_id"), row.getString("cinema_name"), row.getString("hall_id"), row.getString("hall_name"),
                    row.getTimestamp("start_time").toInstant(), row.getTimestamp("created_at").toInstant(), row.getTimestamp("expires_at").toInstant(),
                    now, lines.size(), lines.stream().mapToInt(BookingResponse.SeatLine::guestCount).sum(),
                    row.getBigDecimal("seat_amount").toPlainString(), row.getBigDecimal("concession_amount").toPlainString(),
                    row.getBigDecimal("subtotal").toPlainString(), row.getBigDecimal("discount").toPlainString(), row.getBigDecimal("final_amount").toPlainString(), lines, concessions,
                    row.getString("promotion_id") == null ? null : new BookingResponse.PromotionSnapshot(row.getString("promotion_id"),
                        row.getString("promotion_code_snapshot"), row.getString("promotion_type_snapshot"),
                        row.getBigDecimal("promotion_value_snapshot").toPlainString(), row.getBigDecimal("promotion_minimum_snapshot").toPlainString(),
                        row.getBigDecimal("promotion_cap_snapshot") == null ? null : row.getBigDecimal("promotion_cap_snapshot").toPlainString()),
                    row.getTimestamp("payment_started_at") == null ? null : row.getTimestamp("payment_started_at").toInstant()));
        if (result.isEmpty()) { throw new SeatUnavailableException(); }
        return result.getFirst();
    }

    private MapSqlParameterSource parameters(long bookingId, long userId) {
        return new MapSqlParameterSource("id", bookingId).addValue("user", userId);
    }
}
