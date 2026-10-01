package com.smartcinema.admin;

import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class AdminShowtimeRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AdminShowtimeRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Showtime(String id,String movieId,String movieTitle,String cinemaId,String cinemaName,String hallId,String hallName,
        Instant startsAt,Instant endsAt,Instant occupiedUntil,Instant bookingCutOff,String basePrice,String status,boolean editable,List<String> transitions) {}
    private static final String SELECT="""
        SELECT s.*,m.title movie_title,c.id cinema_id,c.name cinema_name,h.name hall_name,
          (s.start_time>clock_timestamp() AND s.status IN ('DRAFT','SCHEDULED','OPEN_FOR_BOOKING')
           AND NOT EXISTS(SELECT 1 FROM seat_holds sh WHERE sh.showtime_id=s.id)
           AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.showtime_id=s.id)) editable
        FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN halls h ON h.id=s.hall_id JOIN cinemas c ON c.id=h.cinema_id
        """;
    public List<Showtime> list(AdminShowtimeRequest.Filter filter,ZoneId zone) {
        StringBuilder sql=new StringBuilder(SELECT+" WHERE true"); var parameters=new MapSqlParameterSource();
        if(filter.movieId()!=null) { sql.append(" AND s.movie_id=:movie"); parameters.addValue("movie",filter.movieId()); }
        if(filter.cinemaId()!=null) { sql.append(" AND c.id=:cinema"); parameters.addValue("cinema",filter.cinemaId()); }
        if(filter.hallId()!=null) { sql.append(" AND s.hall_id=:hall"); parameters.addValue("hall",filter.hallId()); }
        if(filter.status()!=null) { sql.append(" AND s.status=:status"); parameters.addValue("status",filter.status()); }
        if(filter.date()!=null) {
            sql.append(" AND s.start_time>=:start AND s.start_time<:end");
            parameters.addValue("start",Timestamp.from(filter.date().atStartOfDay(zone).toInstant()));
            parameters.addValue("end",Timestamp.from(filter.date().plusDays(1).atStartOfDay(zone).toInstant()));
        }
        return jdbc.query(sql+" ORDER BY s.start_time,s.id",parameters,(r,n)->map(r));
    }
    public Showtime detail(long id) {
        return jdbc.query(SELECT+" WHERE s.id=:id",new MapSqlParameterSource("id",id),(r,n)->map(r)).stream().findFirst().orElseThrow(AdminConfigurationException::missing);
    }
    public long save(long actor,Long id,AdminShowtimeRequest.Input input) {
        return jdbc.getJdbcTemplate().queryForObject("SELECT configure_showtime(?,?,?,?,?,?,?)",Long.class,actor,id,input.movieId(),input.hallId(),Timestamp.from(input.startsAt()),input.basePrice(),input.status());
    }
    private Showtime map(ResultSet r) throws SQLException {
        boolean editable=r.getBoolean("editable"); String status=r.getString("status");
        List<String> transitions=!editable?List.of():switch(status) {
            case "DRAFT" -> List.of("SCHEDULED","OPEN_FOR_BOOKING","CANCELLED");
            case "SCHEDULED" -> List.of("OPEN_FOR_BOOKING","CANCELLED");
            case "OPEN_FOR_BOOKING" -> List.of("CANCELLED");
            default -> List.of();
        };
        return new Showtime(r.getString("id"),r.getString("movie_id"),r.getString("movie_title"),r.getString("cinema_id"),r.getString("cinema_name"),r.getString("hall_id"),r.getString("hall_name"),
            r.getTimestamp("start_time").toInstant(),r.getTimestamp("end_time").toInstant(),r.getTimestamp("occupied_until").toInstant(),r.getTimestamp("booking_cut_off").toInstant(),r.getBigDecimal("base_price").toPlainString(),status,editable,transitions);
    }
}
