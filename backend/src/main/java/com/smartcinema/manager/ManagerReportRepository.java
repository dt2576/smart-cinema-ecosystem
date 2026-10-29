package com.smartcinema.manager;

import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.admin.AdminReportQuery;
import com.smartcinema.admin.AdminReportRepository;
import com.smartcinema.admin.AdminReportResponse.Period;
import static com.smartcinema.manager.ManagerReportResponse.*;

@Repository
public class ManagerReportRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public ManagerReportRepository(JdbcTemplate jdbc) { this.jdbc=new NamedParameterJdbcTemplate(jdbc); }

    static MapSqlParameterSource parameters(long actor,AdminReportQuery query) {
        return AdminReportRepository.parameters(query).addValue("actor",actor);
    }
    public Summary summary(long actor,AdminReportQuery query) {
        return jdbc.queryForObject("WITH "+ManagerReportSql.COMMON+ManagerReportSql.SUMMARY,parameters(actor,query),
                (r,n)->new Summary(Period.of(query),AdminReportRepository.metrics(r),activity(r)));
    }
    public List<Day> daily(long actor,AdminReportQuery query) {
        return jdbc.query("WITH "+ManagerReportSql.COMMON+ManagerReportSql.DAILY,parameters(actor,query),
                (r,n)->new Day(r.getDate("report_day").toLocalDate(),AdminReportRepository.metrics(r),activity(r)));
    }
    public String count(long actor,AdminReportQuery query) {
        return jdbc.queryForObject("WITH "+ManagerReportSql.COMMON+ManagerReportSql.count(query.dimension()),parameters(actor,query),String.class);
    }
    public List<Performance> breakdown(long actor,AdminReportQuery query) {
        return jdbc.query("WITH "+ManagerReportSql.COMMON+ManagerReportSql.breakdown(query.dimension()),parameters(actor,query),
                (r,n)->new Performance(r.getString("id"),r.getString("name"),r.getString("cinema_id"),r.getString("movie_id"),
                        r.getTimestamp("starts_at")==null?null:r.getTimestamp("starts_at").toInstant(),
                        AdminReportRepository.metrics(r),activity(r)));
    }
    public String concessionCount(long actor,AdminReportQuery query) {
        return jdbc.queryForObject("WITH "+ManagerReportSql.CONCESSION_COMMON+ManagerReportSql.CONCESSION_COUNT,parameters(actor,query),String.class);
    }
    public List<Concession> concessions(long actor,AdminReportQuery query) {
        return jdbc.query("WITH "+ManagerReportSql.CONCESSION_COMMON+ManagerReportSql.CONCESSIONS,parameters(actor,query),
                (r,n)->new Concession(r.getString("id"),r.getString("name"),r.getString("category"),count(r,"quantity"),
                        r.getBigDecimal("gross").setScale(4,RoundingMode.UNNECESSARY).toPlainString(),count(r,"bookings")));
    }
    static Activity activity(ResultSet result) throws SQLException {
        return new Activity(statuses(result,"booking",ManagerReportSql.BOOKING_STATES),
                statuses(result,"payment",ManagerReportSql.PAYMENT_STATES),statuses(result,"ticket",ManagerReportSql.TICKET_STATES),
                statuses(result,"showtime",ManagerReportSql.SHOWTIME_STATES),count(result,"checked_in"),count(result,"reconciliation"));
    }
    private static List<StatusCount> statuses(ResultSet result,String prefix,String[] states) throws SQLException {
        var items=new java.util.ArrayList<StatusCount>();
        for(String state:states)items.add(new StatusCount(state,count(result,prefix+"_"+state.toLowerCase(java.util.Locale.ROOT))));
        return List.copyOf(items);
    }
    private static String count(ResultSet result,String column) throws SQLException {
        return result.getBigDecimal(column).toBigIntegerExact().toString();
    }
}
