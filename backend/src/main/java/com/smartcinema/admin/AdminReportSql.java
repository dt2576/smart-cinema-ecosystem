package com.smartcinema.admin;

/** Each event has exactly one grain. Child rows are aggregated before financial snapshots are summed. */
final class AdminReportSql {
    private AdminReportSql() { }
    static final String COMMON = com.smartcinema.reporting.ReportSql.adminCommon();
    static final String METRICS = com.smartcinema.reporting.ReportSql.METRICS;
    static final String SUMMARY = com.smartcinema.reporting.ReportSql.SUMMARY;
    static final String DAILY = com.smartcinema.reporting.ReportSql.DAILY;
    static String key(AdminReportQuery.Dimension dimension) {
        return switch(dimension) { case CINEMA -> "s.cinema_id"; case MOVIE -> "s.movie_id"; case SHOWTIME -> "s.id"; };
    }
    static String breakdown(AdminReportQuery.Dimension dimension) {
        String labels=switch(dimension) {
            case CINEMA -> "s.cinema_name name,NULL::bigint cinema_id,NULL::bigint movie_id,NULL::timestamptz starts_at";
            case MOVIE -> "s.movie_name name,NULL::bigint cinema_id,NULL::bigint movie_id,NULL::timestamptz starts_at";
            case SHOWTIME -> "concat_ws(' / ',s.movie_name,s.cinema_name,s.hall_name) name,s.cinema_id,s.movie_id,s.start_time starts_at";
        };
        return "SELECT "+key(dimension)+" id,"+labels+","+METRICS+" FROM events e JOIN scoped s ON s.id=e.showtime_id "
            +"GROUP BY 1,2,3,4,5 ORDER BY revenue DESC,tickets_sold DESC,id ASC LIMIT :limit OFFSET :offset";
    }
    static String count(AdminReportQuery.Dimension dimension) {
        return "SELECT count(DISTINCT "+key(dimension)+") FROM events e JOIN scoped s ON s.id=e.showtime_id";
    }
}
