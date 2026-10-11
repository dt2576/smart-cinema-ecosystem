package com.smartcinema.booking;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Repository;
import com.smartcinema.seat.SeatUnavailableException;

@Repository
public class BookingReadRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public BookingReadRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    private void activeCustomer(long user) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM users WHERE id=:user AND role='CUSTOMER' AND status='ACTIVE')",
                new MapSqlParameterSource("user", user), Boolean.class))) {
            throw new AccessDeniedException("Customer unavailable");
        }
    }

    public BookingHistoryResponse history(long user, BookingHistoryQuery query, Instant now) {
        activeCustomer(user);
        var parameters = new MapSqlParameterSource("user", user).addValue("now", Timestamp.from(now))
                .addValue("offset", query.offset()).addValue("size", query.size());
        long total = jdbc.queryForObject("SELECT count(*) FROM bookings WHERE customer_id=:user", parameters, Long.class);
        var items = jdbc.query("""
                SELECT b.id,b.booking_code,b.showtime_id,b.created_at,b.expires_at,b.payment_started_at,b.final_amount,
                    CASE WHEN b.status='PENDING' AND b.expires_at<=:now THEN 'EXPIRED' ELSE b.status END AS effective_status,
                    st.movie_id,m.title,st.hall_id,h.name AS hall_name,h.cinema_id,c.name AS cinema_name,st.start_time,
                    units.seat_count,units.guest_count
                FROM bookings b JOIN showtimes st ON st.id=b.showtime_id JOIN movies m ON m.id=st.movie_id
                JOIN halls h ON h.id=st.hall_id JOIN cinemas c ON c.id=h.cinema_id
                CROSS JOIN LATERAL (SELECT count(*) AS seat_count,
                    coalesce(sum(CASE WHEN bs.seat_type_snapshot='COUPLE' THEN 2 ELSE 1 END),0) AS guest_count
                    FROM booking_seats bs WHERE bs.booking_id=b.id) units
                WHERE b.customer_id=:user ORDER BY b.created_at DESC,b.id ASC LIMIT :size OFFSET :offset
                """, parameters, (row, index) -> new BookingHistoryItem(row.getString("id"), row.getString("booking_code"),
                    row.getString("effective_status"), row.getString("movie_id"), row.getString("title"),
                    row.getString("cinema_id"), row.getString("cinema_name"), row.getString("hall_id"), row.getString("hall_name"),
                    row.getString("showtime_id"), row.getTimestamp("start_time").toInstant(),
                    row.getTimestamp("created_at").toInstant(), row.getTimestamp("expires_at").toInstant(),
                    row.getTimestamp("payment_started_at") == null ? null : row.getTimestamp("payment_started_at").toInstant(),
                    row.getInt("seat_count"), row.getInt("guest_count"), row.getBigDecimal("final_amount").toPlainString()));
        return new BookingHistoryResponse(items, query.page(), query.size(), total,
                total / query.size() + (total % query.size() == 0 ? 0 : 1), now);
    }

    public OwnedBooking owned(long booking, long user, Instant now) {
        activeCustomer(user);
        var rows = jdbc.query("""
                SELECT b.id,b.status,b.booking_qr_token,b.paid_at,
                    (SELECT count(*) FROM booking_seats WHERE booking_id=b.id) AS seat_count,
                    CASE WHEN status='PENDING' AND expires_at<=:now THEN 'EXPIRED' ELSE status END AS effective_status
                FROM bookings b WHERE b.id=:id AND b.customer_id=:user
                """, new MapSqlParameterSource("id", booking).addValue("user", user).addValue("now", Timestamp.from(now)),
                (row, index) -> new OwnedBooking(row.getString("id"), row.getString("status"), row.getString("effective_status"),
                    row.getString("booking_qr_token"), row.getTimestamp("paid_at") == null ? null : row.getTimestamp("paid_at").toInstant(),
                    row.getInt("seat_count")));
        if (rows.isEmpty()) { throw new SeatUnavailableException(); }
        return rows.getFirst();
    }

    // Called only after the service has established current Customer ownership in the same transaction.
    public List<IssuedSeat> issuedSeats(long booking) {
        return jdbc.query("""
                SELECT bs.id AS booking_seat_id,bs.seat_id,bs.seat_type_snapshot,bs.sold_at,
                    t.id AS ticket_id,t.ticket_code,t.status,t.issued_at
                FROM booking_seats bs LEFT JOIN tickets t ON t.booking_seat_id=bs.id
                WHERE bs.booking_id=:id ORDER BY t.id
                """, new MapSqlParameterSource("id", booking), (row, index) -> new IssuedSeat(row.getString("booking_seat_id"),
                    row.getString("seat_id"), row.getString("seat_type_snapshot"), row.getString("ticket_id"),
                    row.getString("ticket_code"), row.getString("status"),
                    row.getTimestamp("sold_at") == null ? null : row.getTimestamp("sold_at").toInstant(),
                    row.getTimestamp("issued_at") == null ? null : row.getTimestamp("issued_at").toInstant()));
    }

    public record OwnedBooking(String id, String status, String effectiveStatus, String qr, Instant paidAt, int seatUnitCount) {
        @Override public String toString() { return "OwnedBooking[redacted]"; }
    }
    public record IssuedSeat(String bookingSeatId, String seatId, String seatType, String ticketId,
            String ticketCode, String status, Instant soldAt, Instant issuedAt) {
        @Override public String toString() { return "IssuedSeat[redacted]"; }
    }
}
