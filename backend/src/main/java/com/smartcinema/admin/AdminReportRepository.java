package com.smartcinema.admin;

import java.math.RoundingMode;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.smartcinema.admin.AdminReportResponse.*;

@Repository
public class AdminReportRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    public AdminReportRepository(JdbcTemplate jdbc) { this.jdbc=jdbc;this.named=new NamedParameterJdbcTemplate(jdbc); }
    void timeouts() {
        jdbc.execute("SET LOCAL statement_timeout='5s'");
        jdbc.execute("SET LOCAL lock_timeout='2s'");
    }
    static MapSqlParameterSource parameters(AdminReportQuery q) {
        return new MapSqlParameterSource().addValue("start",Timestamp.from(q.start())).addValue("end",Timestamp.from(q.end()))
            .addValue("from",q.from()).addValue("to",q.to()).addValue("zone",AdminReportQuery.ZONE.getId())
            .addValue("cinema",q.cinemaId(),Types.BIGINT).addValue("movie",q.movieId(),Types.BIGINT)
            .addValue("showtime",q.showtimeId(),Types.BIGINT).addValue("limit",q.size()).addValue("offset",(long)q.page()*q.size());
    }
    public Metrics summary(AdminReportQuery q) {
        return named.queryForObject("WITH "+AdminReportSql.COMMON+AdminReportSql.SUMMARY,parameters(q),(r,n)->metrics(r));
    }
    public List<Day> daily(AdminReportQuery q) {
        return named.query("WITH "+AdminReportSql.COMMON+AdminReportSql.DAILY,parameters(q),
            (r,n)->new Day(r.getDate("report_day").toLocalDate(),metrics(r)));
    }
    public List<Breakdown> breakdown(AdminReportQuery q) {
        return named.query("WITH "+AdminReportSql.COMMON+AdminReportSql.breakdown(q.dimension()),parameters(q),
            (r,n)->new Breakdown(r.getString("id"),r.getString("name"),r.getString("cinema_id"),r.getString("movie_id"),
                r.getTimestamp("starts_at")==null?null:r.getTimestamp("starts_at").toInstant(),metrics(r)));
    }
    public String count(AdminReportQuery q) {
        return named.queryForObject("WITH "+AdminReportSql.COMMON+AdminReportSql.count(q.dimension()),parameters(q),String.class);
    }
    static Metrics metrics(ResultSet r) throws SQLException {
        return new Metrics(money(r,"revenue"),money(r,"gross"),money(r,"discount"),money(r,"seat_gross"),money(r,"concession_gross"),
            count(r,"confirmed_bookings"),count(r,"tickets_sold"),count(r,"guests_sold"),count(r,"bookings_created"),
            count(r,"showtimes"),count(r,"capacity"),count(r,"sold"),money(r,"occupancy"));
    }
    private static String money(ResultSet r,String key)throws SQLException {
        var value=r.getBigDecimal(key); return value==null?null:value.setScale(4,RoundingMode.UNNECESSARY).toPlainString();
    }
    private static String count(ResultSet r,String key)throws SQLException { return r.getBigDecimal(key).toBigIntegerExact().toString(); }
}
