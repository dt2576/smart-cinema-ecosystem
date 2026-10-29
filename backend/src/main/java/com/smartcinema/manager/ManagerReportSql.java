package com.smartcinema.manager;

import com.smartcinema.admin.AdminReportQuery.Dimension;
import com.smartcinema.reporting.ReportSql;

/** Operational events are aggregated separately: never join activity rows into financial headers. */
final class ManagerReportSql {
    private ManagerReportSql() { }
    static final String COMMON=ReportSql.managerCommon()+"""
        , activity_events(showtime_id,day,booking_status,payment_status,ticket_status,showtime_status,checked_in,reconciliation) AS (
          SELECT b.showtime_id,(b.created_at AT TIME ZONE :zone)::date,b.status,NULL,NULL,NULL,0,0
          FROM bookings b JOIN scoped s ON s.id=b.showtime_id WHERE b.created_at>=:start AND b.created_at<:end
          UNION ALL
          SELECT b.showtime_id,(p.initiated_at AT TIME ZONE :zone)::date,NULL,p.status,NULL,NULL,0,
            CASE WHEN p.reconciliation_required THEN 1 ELSE 0 END
          FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id JOIN scoped s ON s.id=b.showtime_id
          WHERE p.initiated_at>=:start AND p.initiated_at<:end
          UNION ALL
          SELECT b.showtime_id,(t.issued_at AT TIME ZONE :zone)::date,NULL,NULL,t.status,NULL,0,0
          FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id
          JOIN bookings b ON b.id=bs.booking_id JOIN scoped s ON s.id=b.showtime_id
          WHERE t.issued_at>=:start AND t.issued_at<:end
          UNION ALL
          SELECT s.id,(s.start_time AT TIME ZONE :zone)::date,NULL,NULL,NULL,s.status,0,0 FROM scoped s
          WHERE s.start_time>=:start AND s.start_time<:end
          UNION ALL
          SELECT b.showtime_id,(t.checked_in_at AT TIME ZONE :zone)::date,NULL,NULL,NULL,NULL,1,0
          FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id
          JOIN bookings b ON b.id=bs.booking_id JOIN scoped s ON s.id=b.showtime_id
          WHERE t.checked_in_at>=:start AND t.checked_in_at<:end
        )
        """;
    static final String[] BOOKING_STATES={"PENDING","PAID","EXPIRED","CANCELLED"};
    static final String[] PAYMENT_STATES={"INITIATED","PENDING","SUCCESS","FAILED","CANCELLED"};
    static final String[] TICKET_STATES={"VALID","CHECKED_IN","EXPIRED","CANCELLED"};
    static final String[] SHOWTIME_STATES={"DRAFT","SCHEDULED","OPEN_FOR_BOOKING","STARTED","ENDED","CANCELLED"};
    static final String[] METRIC_COLUMNS={"revenue","gross","discount","seat_gross","concession_gross",
            "confirmed_bookings","tickets_sold","guests_sold","bookings_created","showtimes","capacity","sold","occupancy"};
    static String activityColumns() {
        var sql=new StringBuilder();
        for(var group:new Object[][]{{"booking",BOOKING_STATES},{"payment",PAYMENT_STATES},{"ticket",TICKET_STATES},{"showtime",SHOWTIME_STATES}}) {
            String prefix=(String)group[0];
            for(String state:(String[])group[1])sql.append("count(*) FILTER(WHERE ae.").append(prefix).append("_status='")
                    .append(state).append("') ").append(prefix).append('_').append(state.toLowerCase(java.util.Locale.ROOT)).append(',');
        }
        return sql+"coalesce(sum(ae.checked_in),0) checked_in,coalesce(sum(ae.reconciliation),0) reconciliation";
    }
    static String activityProjection(String alias) {
        var sql=new StringBuilder();
        for(var group:new Object[][]{{"booking",BOOKING_STATES},{"payment",PAYMENT_STATES},{"ticket",TICKET_STATES},{"showtime",SHOWTIME_STATES}})
            for(String state:(String[])group[1]) {
                String column=group[0]+"_"+state.toLowerCase(java.util.Locale.ROOT);
                sql.append("coalesce(").append(alias).append('.').append(column).append(",0) ").append(column).append(',');
            }
        return sql+"coalesce("+alias+".checked_in,0) checked_in,coalesce("+alias+".reconciliation,0) reconciliation";
    }
    static String financialProjection(String alias) {
        return java.util.Arrays.stream(METRIC_COLUMNS).map(c->c.equals("occupancy")?alias+"."+c+" "+c:"coalesce("+alias+"."+c+",0) "+c)
                .collect(java.util.stream.Collectors.joining(","));
    }
    static final String SUMMARY=", financial AS ("+ReportSql.SUMMARY+"), activity AS (SELECT "+activityColumns()+
            " FROM activity_events ae) SELECT f.*,a.* FROM financial f CROSS JOIN activity a";
    static final String DAILY=", financial AS ("+ReportSql.DAILY+"), activity AS (SELECT ae.day,"+activityColumns()+
            " FROM activity_events ae GROUP BY ae.day) SELECT f.*,"+activityProjection("a")+
            " FROM financial f LEFT JOIN activity a ON a.day=f.report_day ORDER BY f.report_day";

    static String key(Dimension dimension) {
        return switch(dimension) { case CINEMA->"s.cinema_id";case MOVIE->"s.movie_id";case SHOWTIME->"s.id"; };
    }
    private static String groups(Dimension dimension) {
        return ", report_groups AS (SELECT DISTINCT "+key(dimension)+" id FROM (SELECT showtime_id FROM events UNION SELECT showtime_id FROM activity_events) ev JOIN scoped s ON s.id=ev.showtime_id) ";
    }
    static String count(Dimension dimension) { return groups(dimension)+"SELECT count(*) FROM report_groups"; }
    static String breakdown(Dimension dimension) {
        String key=key(dimension);
        String labels=switch(dimension) {
            case CINEMA->"s.cinema_name name,NULL::bigint cinema_id,NULL::bigint movie_id,NULL::timestamptz starts_at";
            case MOVIE->"s.movie_name name,NULL::bigint cinema_id,NULL::bigint movie_id,NULL::timestamptz starts_at";
            case SHOWTIME->"concat_ws(' / ',s.movie_name,s.cinema_name,s.hall_name) name,s.cinema_id,s.movie_id,s.start_time starts_at";
        };
        return groups(dimension)+", labels AS (SELECT DISTINCT "+key+" id,"+labels+" FROM scoped s), financial AS (SELECT "+key+" id,"+ReportSql.METRICS+
                " FROM events e JOIN scoped s ON s.id=e.showtime_id GROUP BY 1), activity AS (SELECT "+key+" id,"+activityColumns()+
                " FROM activity_events ae JOIN scoped s ON s.id=ae.showtime_id GROUP BY 1) SELECT g.id,l.name,l.cinema_id,l.movie_id,l.starts_at,"+
                financialProjection("f")+","+activityProjection("a")+" FROM report_groups g JOIN labels l ON l.id=g.id "+
                "LEFT JOIN financial f ON f.id=g.id LEFT JOIN activity a ON a.id=g.id "+
                "ORDER BY coalesce(f.revenue,0) DESC,coalesce(f.tickets_sold,0) DESC,g.id ASC LIMIT :limit OFFSET :offset";
    }
    static final String CONCESSION_COMMON=ReportSql.managerCommon()+"""
        , product_sales AS (
          SELECT ci.id,ci.name,ci.category,sum(bc.quantity) quantity,sum(bc.total_price) gross,count(DISTINCT b.id) bookings
          FROM sales b JOIN booking_concessions bc ON bc.booking_id=b.id JOIN concession_items ci ON ci.id=bc.concession_item_id
          WHERE b.paid_at>=:start AND b.paid_at<:end GROUP BY ci.id,ci.name,ci.category
        )
        """;
    static final String CONCESSION_COUNT="SELECT count(*) FROM product_sales";
    static final String CONCESSIONS="SELECT * FROM product_sales ORDER BY quantity DESC,gross DESC,id ASC LIMIT :limit OFFSET :offset";
}
