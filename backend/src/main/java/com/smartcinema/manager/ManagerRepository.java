package com.smartcinema.manager;

import java.util.*;
import java.time.Instant;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import com.smartcinema.admin.AdminConfigurationRepository;
import com.smartcinema.admin.AdminShowtimeRepository;
import static com.smartcinema.admin.AdminConfigurationRepository.*;

@Repository
public class ManagerRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    public ManagerRepository(JdbcTemplate jdbc) {this.jdbc=jdbc;this.named=new NamedParameterJdbcTemplate(jdbc);}
    public void access(long actor) {
        jdbc.execute("SET LOCAL statement_timeout='5s'");jdbc.execute("SET LOCAL lock_timeout='2s'");
        boolean allowed=Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM users u JOIN cinema_assignments ca ON ca.user_id=u.id
             WHERE u.id=? AND u.role='MANAGER' AND u.status='ACTIVE' AND ca.assignment_type='MANAGER'
             AND ca.status='ACTIVE' AND ca.effective_at<=clock_timestamp())
            """,Boolean.class,actor));
        if(!allowed)throw new ManagerFailure(403);
    }
    private MapSqlParameterSource params(long actor,long id) {return new MapSqlParameterSource("actor",actor).addValue("id",id);}
    private static final String CINEMAS="SELECT c.* FROM cinemas c WHERE "+ManagerScope.predicate("c.id");
    private static final String HALLS="SELECT h.*,EXISTS(SELECT 1 FROM seats s WHERE s.hall_id=h.id) initialized FROM halls h WHERE "+ManagerScope.predicate("h.cinema_id");
    private static final RowMapper<Cinema> CINEMA=(r,n)->new Cinema(r.getString("id"),r.getString("name"),r.getString("address"),r.getString("contact"),r.getString("operating_information"),r.getString("status"));
    private static final RowMapper<Hall> HALL=(r,n)->new Hall(r.getString("id"),r.getString("cinema_id"),r.getString("name"),r.getInt("capacity"),r.getString("type"),r.getString("status"),r.getBoolean("initialized"));
    public List<Cinema> cinemas(long actor) {return named.query(CINEMAS+" ORDER BY c.id",params(actor,0),CINEMA);}
    public Cinema cinema(long actor,long id) {return one(named.query(CINEMAS+" AND c.id=:id",params(actor,id),CINEMA));}
    public List<Hall> halls(long actor,long cinema) {cinema(actor,cinema);return named.query(HALLS+" AND h.cinema_id=:id ORDER BY h.id",params(actor,cinema),HALL);}
    public Hall hall(long actor,long id) {return one(named.query(HALLS+" AND h.id=:id",params(actor,id),HALL));}
    private static final String SEATS=AdminConfigurationRepository.SEAT_SELECT+" JOIN halls h ON h.id=s.hall_id WHERE "+ManagerScope.predicate("h.cinema_id");
    public List<Seat> seats(long actor,long hall) {hall(actor,hall);return named.query(SEATS+" AND s.hall_id=:id ORDER BY s.row,s.number,s.id",params(actor,hall),(r,n)->AdminConfigurationRepository.mapSeat(r));}
    public Seat seat(long actor,long id) {return one(named.query(SEATS+" AND s.id=:id",params(actor,id),(r,n)->AdminConfigurationRepository.mapSeat(r)));}
    public AdminShowtimeRepository.Showtime showtime(long actor,long id) {
        return one(named.query(AdminShowtimeRepository.SELECT+" WHERE s.id=:id AND "+ManagerScope.predicate("c.id"),params(actor,id),(r,n)->AdminShowtimeRepository.map(r)));
    }
    public record Staff(String id,String fullName,String email,String phone,String status,String assignmentId,Instant effectiveAt) { }
    public List<Staff> staff(long actor,long cinema) {
        cinema(actor,cinema);
        return named.query("""
            SELECT u.id,u.full_name,u.email,u.phone,u.status,ca.id assignment_id,ca.effective_at
            FROM cinema_assignments ca JOIN users u ON u.id=ca.user_id JOIN cinemas c ON c.id=ca.cinema_id
            WHERE ca.assignment_type='STAFF' AND ca.status='ACTIVE' AND ca.effective_at<=clock_timestamp()
             AND u.role='STAFF' AND c.id=:id AND
            """+ManagerScope.predicate("c.id")+" ORDER BY u.id",params(actor,cinema),
            (r,n)->new Staff(r.getString("id"),r.getString("full_name"),r.getString("email"),r.getString("phone"),r.getString("status"),r.getString("assignment_id"),r.getTimestamp("effective_at").toInstant()));
    }
    private static <T> T one(List<T> values) {return values.stream().findFirst().orElseThrow(()->new ManagerFailure(404));}
}
