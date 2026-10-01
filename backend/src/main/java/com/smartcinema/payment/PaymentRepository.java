package com.smartcinema.payment;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.seat.SeatUnavailableException;

@Repository
public class PaymentRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public PaymentRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public PaymentResponse initiate(long bookingId, long userId) {
        var parameters = new MapSqlParameterSource("booking", bookingId).addValue("user", userId);
        Long id = jdbc.queryForObject("SELECT initiate_payment(:booking,:user)", parameters, Long.class);
        parameters.addValue("id", id);
        var result = jdbc.query("""
                SELECT p.*,b.expires_at FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id
                WHERE p.id=:id AND b.id=:booking AND b.customer_id=:user
                """, parameters, (row, index) -> new PaymentResponse(row.getString("id"), row.getString("booking_id"),
                    row.getString("internal_reference"), row.getString("status"), row.getBigDecimal("amount").toPlainString(),
                    row.getString("currency"), row.getString("provider"), row.getTimestamp("initiated_at").toInstant(),
                    row.getTimestamp("expires_at").toInstant()));
        if (result.isEmpty()) { throw new SeatUnavailableException(); }
        return result.getFirst();
    }
}
