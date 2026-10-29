package com.smartcinema.reporting;

import com.smartcinema.manager.ManagerScope;

/** Shared authoritative reporting cohort. Only the fixed Cinema predicate varies. */
public final class ReportSql {
    private ReportSql() { }
    private static final String COMMON_TEMPLATE = """
        scoped AS (
          SELECT s.id,s.movie_id,h.cinema_id,s.start_time,s.status,m.title movie_name,c.name cinema_name,h.name hall_name
          FROM showtimes s JOIN halls h ON h.id=s.hall_id JOIN cinemas c ON c.id=h.cinema_id JOIN movies m ON m.id=s.movie_id
          WHERE %s(CAST(:cinema AS bigint) IS NULL OR h.cinema_id=:cinema)
            AND (CAST(:movie AS bigint) IS NULL OR s.movie_id=:movie)
            AND (CAST(:showtime AS bigint) IS NULL OR s.id=:showtime)
        ), candidates AS (
          SELECT b.* FROM bookings b JOIN scoped s ON s.id=b.showtime_id
          WHERE (b.created_at>=:start AND b.created_at<:end) OR (b.paid_at>=:start AND b.paid_at<:end)
            OR (b.status='PAID' AND s.start_time>=:start AND s.start_time<:end)
        ), payments AS (
          SELECT b.id booking_id,count(*) FILTER(WHERE p.status='SUCCESS') successes,
            count(*) FILTER(WHERE p.status='SUCCESS' AND p.amount=b.final_amount AND p.amount>0
              AND p.provider='VNPAY' AND p.currency='VND' AND p.environment='SANDBOX' AND p.completed_at IS NOT NULL
              AND NOT p.reconciliation_required AND EXISTS (
                SELECT 1 FROM payment_evidence e WHERE e.payment_id=p.id AND e.source IN ('IPN','QUERY') AND e.result='SUCCESS')) verified,
            bool_or(p.reconciliation_required) reconciliation
          FROM candidates b JOIN payment_transactions p ON p.booking_id=b.id GROUP BY b.id
        ), issuance AS (
          SELECT bs.booking_id,count(*) units,count(t.id) tickets,
            sum(CASE WHEN bs.seat_type_snapshot='COUPLE' THEN 2 ELSE 1 END) guests,
            bool_and(coalesce(bs.sold_at=b.paid_at AND t.issued_at=b.paid_at
              AND t.status IN ('VALID','CHECKED_IN','EXPIRED','CANCELLED'),false)) coherent
          FROM candidates b JOIN booking_seats bs ON bs.booking_id=b.id LEFT JOIN tickets t ON t.booking_seat_id=bs.id
          GROUP BY bs.booking_id
        ), sales AS (
          SELECT b.*,i.tickets,i.guests FROM candidates b JOIN payments p ON p.booking_id=b.id JOIN issuance i ON i.booking_id=b.id
          WHERE b.status='PAID' AND b.paid_at IS NOT NULL AND p.successes=1 AND p.verified=1
            AND NOT p.reconciliation AND i.units=i.tickets AND i.coherent
        ), capacity AS (
          SELECT ss.showtime_id,count(*) units FROM showtime_seats ss JOIN scoped s ON s.id=ss.showtime_id
          WHERE ss.is_sellable AND s.start_time>=:start AND s.start_time<:end GROUP BY ss.showtime_id
        ), allocated AS (
          SELECT b.showtime_id,count(*) units FROM candidates b JOIN scoped s ON s.id=b.showtime_id
          JOIN booking_seats bs ON bs.booking_id=b.id
          WHERE b.status='PAID' AND bs.sold_at=b.paid_at AND s.start_time>=:start AND s.start_time<:end GROUP BY b.showtime_id
        ), events(showtime_id,day,revenue,gross,discount,seat_gross,concession_gross,confirmed_bookings,
                  tickets_sold,guests_sold,bookings_created,showtimes,capacity,sold) AS (
          SELECT showtime_id,(paid_at AT TIME ZONE :zone)::date,final_amount,subtotal,discount,seat_amount,concession_amount,
            1,tickets,guests,0,0,0,0 FROM sales WHERE paid_at>=:start AND paid_at<:end
          UNION ALL
          SELECT showtime_id,(created_at AT TIME ZONE :zone)::date,0,0,0,0,0,0,0,0,1,0,0,0
            FROM candidates WHERE created_at>=:start AND created_at<:end
          UNION ALL
          SELECT s.id,(s.start_time AT TIME ZONE :zone)::date,0,0,0,0,0,0,0,0,0,1,coalesce(c.units,0),coalesce(a.units,0)
            FROM scoped s LEFT JOIN capacity c ON c.showtime_id=s.id LEFT JOIN allocated a ON a.showtime_id=s.id
            WHERE s.start_time>=:start AND s.start_time<:end AND s.status IN ('SCHEDULED','OPEN_FOR_BOOKING','STARTED','ENDED')
        )
        """;
    public static final String METRICS = """
        coalesce(sum(e.revenue),0) revenue,coalesce(sum(e.gross),0) gross,coalesce(sum(e.discount),0) discount,
        coalesce(sum(e.seat_gross),0) seat_gross,coalesce(sum(e.concession_gross),0) concession_gross,
        coalesce(sum(e.confirmed_bookings),0) confirmed_bookings,coalesce(sum(e.tickets_sold),0) tickets_sold,
        coalesce(sum(e.guests_sold),0) guests_sold,coalesce(sum(e.bookings_created),0) bookings_created,
        coalesce(sum(e.showtimes),0) showtimes,coalesce(sum(e.capacity),0) capacity,coalesce(sum(e.sold),0) sold,
        round(100.0*sum(e.sold)/nullif(sum(e.capacity),0),4) occupancy
        """;
    public static final String SUMMARY = "SELECT "+METRICS+" FROM events e";
    public static final String DAILY = """
        SELECT d.day::date report_day,
        """+METRICS+"""
        FROM generate_series(CAST(:from AS date)::timestamp,CAST(:to AS date)::timestamp-interval '1 day',interval '1 day') d(day)
        LEFT JOIN events e ON e.day=d.day::date GROUP BY d.day ORDER BY d.day
        """;
    public static String adminCommon() { return COMMON_TEMPLATE.formatted(""); }
    public static String managerCommon() {
        return COMMON_TEMPLATE.formatted(ManagerScope.predicate("h.cinema_id")+" AND ");
    }
}