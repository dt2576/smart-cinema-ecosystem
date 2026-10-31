package com.smartcinema.staff;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StaffPosRepository {
    private final JdbcTemplate jdbc;
    public StaffPosRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void ready() {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regprocedure(current_schema()||'.staff_confirm_cash(bigint,bigint,bigint,numeric)') IS NOT NULL",Boolean.class))) throw new StaffFailure(503);
    }
    public void owned(long actor,long cinema,long booking) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM bookings b JOIN showtimes st ON st.id=b.showtime_id JOIN halls h ON h.id=st.hall_id
            WHERE b.id=? AND b.selling_staff_id=? AND h.cinema_id=?)
            """,Boolean.class,booking,actor,cinema))) throw new StaffFailure(404);
    }
    public void showtime(long showtime,long cinema) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM showtimes st JOIN halls h ON h.id=st.hall_id WHERE st.id=? AND h.cinema_id=?)",Boolean.class,showtime,cinema))) throw new StaffFailure(404);
    }
    public long initiate(long booking,long actor) { return jdbc.queryForObject("SELECT initiate_payment(?,?)",Long.class,booking,actor); }
    public void cash(long booking,long payment,long actor,BigDecimal amount) { jdbc.queryForObject("SELECT staff_confirm_cash(?,?,?,?)",Long.class,booking,payment,actor,amount); }
    public List<StaffPosResponse.Payment> payments(long booking) {
        return jdbc.query("SELECT id,status,amount,currency,provider,initiated_at,completed_at,reconciliation_required FROM payment_transactions WHERE booking_id=? ORDER BY id",
            (r,n)->new StaffPosResponse.Payment(r.getString(1),r.getString(2),r.getBigDecimal(3).toPlainString(),r.getString(4),r.getString(5),r.getTimestamp(6).toInstant(),r.getTimestamp(7)==null?null:r.getTimestamp(7).toInstant(),r.getBoolean(8)),booking);
    }
    public String qr(long booking) { return jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=? AND status='PAID'",String.class,booking); }
    public List<com.smartcinema.seat.dto.SeatHoldResponse> holds(long showtime,long actor,Instant now) {
        return jdbc.query("SELECT id,showtime_id,seat_id,created_at,expires_at,status FROM seat_holds WHERE showtime_id=? AND user_id=? AND booking_id IS NULL AND status='ACTIVE' AND expires_at>? ORDER BY seat_id",
            (r,n)->new com.smartcinema.seat.dto.SeatHoldResponse(r.getString(1),r.getString(2),r.getString(3),r.getTimestamp(4).toInstant(),r.getTimestamp(5).toInstant(),r.getString(6)),showtime,actor,java.sql.Timestamp.from(now));
    }
}
