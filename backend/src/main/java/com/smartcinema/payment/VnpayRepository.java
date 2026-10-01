package com.smartcinema.payment;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.seat.SeatUnavailableException;

@Repository
public class VnpayRepository {
    private final JdbcTemplate jdbc;
    public VnpayRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public VnpaySubmission owned(long booking, long payment, long user) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND status='ACTIVE' AND role='CUSTOMER')",Boolean.class,user))) {
            throw new org.springframework.security.access.AccessDeniedException("Active Customer required");
        }
        var rows = jdbc.query("""
            SELECT p.* FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id JOIN users u ON u.id=b.customer_id
            WHERE p.id=? AND b.id=? AND b.customer_id=? AND u.status='ACTIVE' AND u.role='CUSTOMER'
            """, (r,i) -> new VnpaySubmission(r.getString("id"), r.getString("booking_id"),r.getString("status"),r.getBigDecimal("amount"),
                r.getString("merchant_code"),r.getString("merchant_reference"),r.getString("submitted_amount"),
                r.getTimestamp("provider_created_at")==null?null:r.getTimestamp("provider_created_at").toInstant(),
                r.getTimestamp("provider_expires_at")==null?null:r.getTimestamp("provider_expires_at").toInstant(),
                r.getString("return_url"),r.getString("client_ip"),r.getBoolean("reconciliation_required")),payment,booking,user);
        if(rows.isEmpty()) { throw new SeatUnavailableException(); }
        return rows.getFirst();
    }
    public void bind(long payment,long user,String merchant,String returnUrl,String ip,String orderType) {
        jdbc.queryForObject("SELECT bind_vnpay_submission(?,?,?,?,?,?)",Long.class,payment,user,merchant,returnUrl,ip,orderType);
    }
    public String orderType(long payment) { return jdbc.queryForObject("SELECT provider_metadata->>'order_type' FROM payment_transactions WHERE id=?",String.class,payment); }
    public boolean queryAllowsRecovery(long payment,String freshness) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM payment_evidence WHERE payment_id=? AND source='QUERY'
                AND result='PENDING' AND observed_at>clock_timestamp()-CAST(? AS interval))
            """,Boolean.class,payment,freshness));
    }
    public String bookingStatus(long booking) { return jdbc.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,booking); }
    public String bookingQr(long booking) {
        return jdbc.queryForObject("SELECT booking_qr_token FROM bookings WHERE id=? AND status='PAID'",String.class,booking);
    }
    public java.util.List<java.util.Map<String,Object>> tickets(long booking) {
        return jdbc.query("""
            SELECT t.*,bs.seat_id,bs.seat_type_snapshot FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id
            WHERE bs.booking_id=? ORDER BY t.id
            """,(r,i)->java.util.Map.of("id",r.getString("id"),"bookingSeatId",r.getString("booking_seat_id"),
                "seatId",r.getString("seat_id"),"ticketCode",r.getString("ticket_code"),"status",r.getString("status"),
                "seatType",r.getString("seat_type_snapshot"),"guestCount","COUPLE".equals(r.getString("seat_type_snapshot"))?2:1),booking);
    }
}
