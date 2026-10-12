package com.smartcinema.staff;

import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StaffAdmissionRepository {
    private final JdbcTemplate jdbc;
    public StaffAdmissionRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Instant now() { return jdbc.queryForObject("SELECT clock_timestamp()",Timestamp.class).toInstant(); }
    public void staff(long actor) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND role='STAFF' AND status='ACTIVE')",Boolean.class,actor))) throw new StaffFailure(403);
    }
    public void scope(long actor,long cinema,Instant now) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM cinema_assignments WHERE user_id=? AND cinema_id=?
            AND assignment_type='STAFF' AND status='ACTIVE' AND effective_at<=?)
            """,Boolean.class,actor,cinema,Timestamp.from(now)))) throw new StaffFailure(403);
    }
    public List<StaffAssignmentResponse.Assignment> assignments(long actor,Instant now) {
        return jdbc.query("""
            SELECT a.id,a.cinema_id,c.name,a.effective_at FROM cinema_assignments a JOIN cinemas c ON c.id=a.cinema_id
            WHERE a.user_id=? AND a.assignment_type='STAFF' AND a.status='ACTIVE' AND a.effective_at<=? ORDER BY a.id
            """,(r,n)->new StaffAssignmentResponse.Assignment(r.getString(1),r.getString(2),r.getString(3),r.getTimestamp(4).toInstant()),actor,Timestamp.from(now));
    }
    public long resolve(String qr,long cinema) {
        // Bypass Spring's parameter-value TRACE logging for confidential QR binding.
        return jdbc.execute((ConnectionCallback<Long>) connection -> {
            try(var statement=connection.prepareStatement("""
                SELECT b.id FROM bookings b JOIN showtimes st ON st.id=b.showtime_id JOIN halls h ON h.id=st.hall_id
                WHERE b.booking_qr_token=? AND h.cinema_id=?
                """)) {
                statement.setString(1,qr);statement.setLong(2,cinema);
                try(var result=statement.executeQuery()) { if(!result.next()) throw new StaffFailure(404); return result.getLong(1); }
            }
        });
    }
    public Booking booking(long booking,long cinema,Instant now) {
        return jdbc.query("""
            SELECT b.id,b.booking_code,b.status,b.booking_qr_token,b.paid_at,
              CASE WHEN b.status='PENDING' AND b.expires_at<=? THEN 'EXPIRED' ELSE b.status END AS effective_status,
              st.movie_id,m.title,h.cinema_id,c.name AS cinema_name,st.hall_id,h.name AS hall_name,b.showtime_id,
              st.start_time,st.end_time,st.status AS showtime_status,c.status AS cinema_status,h.status AS hall_status
            FROM bookings b JOIN showtimes st ON st.id=b.showtime_id JOIN movies m ON m.id=st.movie_id
            JOIN halls h ON h.id=st.hall_id JOIN cinemas c ON c.id=h.cinema_id WHERE b.id=? AND c.id=?
            """,(r,n)->new Booking(r.getString("id"),r.getString("booking_code"),r.getString("status"),r.getString("effective_status"),
                r.getString("booking_qr_token"),instant(r,"paid_at"),r.getString("movie_id"),r.getString("title"),r.getString("cinema_id"),
                r.getString("cinema_name"),r.getString("hall_id"),r.getString("hall_name"),r.getString("showtime_id"),
                instant(r,"start_time"),instant(r,"end_time"),r.getString("showtime_status"),r.getString("cinema_status"),r.getString("hall_status")),
                Timestamp.from(now),booking,cinema).stream().findFirst().orElseThrow(()->new StaffFailure(404));
    }
    public List<IssuedSeat> issued(long booking) {
        return jdbc.query("""
            SELECT bs.id AS booking_seat_id,bs.seat_id,bs.seat_type_snapshot,bs.sold_at,s.row,s.number,
              t.id,t.ticket_code,t.status,t.issued_at,t.checked_in_at
            FROM booking_seats bs JOIN seats s ON s.id=bs.seat_id LEFT JOIN tickets t ON t.booking_seat_id=bs.id
            WHERE bs.booking_id=? ORDER BY t.id
            """,(r,n)->new IssuedSeat(r.getString("booking_seat_id"),r.getString("seat_id"),r.getString("seat_type_snapshot"),instant(r,"sold_at"),
                r.getString("row"),r.getString("number"),r.getString("id"),r.getString("ticket_code"),r.getString("status"),instant(r,"issued_at"),instant(r,"checked_in_at")),booking);
    }
    public List<StaffBookingResponse.Concession> concessions(long booking) {
        return jdbc.query("SELECT item_name_snapshot,category_snapshot,quantity FROM booking_concessions WHERE booking_id=? ORDER BY id",
            (r,n)->new StaffBookingResponse.Concession(r.getString(1),r.getString(2),r.getInt(3)),booking);
    }
    public List<String> checkIn(long actor,long booking,long cinema,List<Long> tickets) {
        return jdbc.execute((ConnectionCallback<List<String>>) connection -> {
            var array=connection.createArrayOf("bigint",tickets.toArray(Long[]::new));
            try(var statement=connection.prepareStatement("SELECT checked.id::text FROM check_in_tickets(?,?,?,?) checked ORDER BY checked.id")) {
                statement.setLong(1,actor);statement.setLong(2,booking);statement.setLong(3,cinema);statement.setArray(4,array);
                try(var result=statement.executeQuery()) {var ids=new ArrayList<String>();while(result.next()) ids.add(result.getString(1));return List.copyOf(ids);}
            } finally {array.free();}
        });
    }
    private static Instant instant(ResultSet r,String name) throws SQLException { Timestamp value=r.getTimestamp(name);return value==null?null:value.toInstant(); }
    public record Booking(String id,String code,String status,String effectiveStatus,String qr,Instant paidAt,String movieId,String title,
            String cinemaId,String cinemaName,String hallId,String hallName,String showtimeId,Instant startsAt,Instant endsAt,
            String showtimeStatus,String cinemaStatus,String hallStatus) { @Override public String toString(){return "StaffBooking[redacted]";} }
    public record IssuedSeat(String bookingSeatId,String seatId,String seatType,Instant soldAt,String row,String number,
            String id,String code,String status,Instant issuedAt,Instant checkedInAt) { }
}
