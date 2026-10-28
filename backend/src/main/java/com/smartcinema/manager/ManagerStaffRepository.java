package com.smartcinema.manager;

import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import com.smartcinema.staff.StaffRepository.Assignment;

@Repository
public class ManagerStaffRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    public ManagerStaffRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; this.named=new NamedParameterJdbcTemplate(jdbc); }
    public record Profile(String id,String fullName,String email,String phone,String status) {
        @Override public String toString() { return "StaffProfile[redacted]"; }
    }
    public record Membership(Profile staff,Assignment assignment) { }
    public record Detail(Profile staff,List<Assignment> assignments) { }
    private static final String ASSIGNMENTS="""
        SELECT ca.*,c.name cinema_name,u.full_name,u.email,u.phone,u.status account_status
        FROM cinema_assignments ca JOIN cinemas c ON c.id=ca.cinema_id JOIN users u ON u.id=ca.user_id
        WHERE ca.assignment_type='STAFF' AND u.role='STAFF' AND c.id=:cinema AND
        """+ManagerScope.predicate("c.id");
    private MapSqlParameterSource params(long actor,long cinema,long user) { return new MapSqlParameterSource("actor",actor).addValue("cinema",cinema).addValue("user",user); }
    private static Profile profile(ResultSet r)throws SQLException { return new Profile(r.getString("user_id"),r.getString("full_name"),r.getString("email"),r.getString("phone"),r.getString("account_status")); }
    private static Assignment assignment(ResultSet r)throws SQLException { return new Assignment(r.getString("id"),r.getString("user_id"),r.getString("cinema_id"),r.getString("cinema_name"),r.getString("assignment_type"),r.getString("status"),r.getTimestamp("effective_at").toInstant()); }
    public List<Membership> memberships(long actor,long cinema) { return named.query(ASSIGNMENTS+" ORDER BY ca.id",params(actor,cinema,0),(r,n)->new Membership(profile(r),assignment(r))); }
    public Profile profile(long actor,long cinema,long user) {
        return named.query(ASSIGNMENTS+" AND u.id=:user ORDER BY ca.id LIMIT 1",params(actor,cinema,user),(r,n)->profile(r)).stream().findFirst().orElseThrow(()->new ManagerFailure(404));
    }
    public List<Assignment> assignments(long actor,long cinema,long user) { return named.query(ASSIGNMENTS+" AND u.id=:user ORDER BY ca.id",params(actor,cinema,user),(r,n)->assignment(r)); }
    public Assignment assignment(long actor,long cinema,long user,long id) {
        return named.query(ASSIGNMENTS+" AND u.id=:user AND ca.id=:id",params(actor,cinema,user).addValue("id",id),(r,n)->assignment(r)).stream().findFirst().orElseThrow(()->new ManagerFailure(404));
    }
    public long save(long actor,long source,long user,ManagerRequest.Assignment input,Long assignment,String status) {
        return jdbc.queryForObject("SELECT manager_assign_staff(?,?,?,?,?,?,?)",Long.class,actor,source,user,input==null?null:input.cinemaId(),input==null?null:Timestamp.from(input.effectiveAt()),assignment,status);
    }
}
