package com.smartcinema.admin;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.smartcinema.manager.*;
import com.smartcinema.staff.StaffRepository.Assignment;

@Repository
public class AdminManagerRepository {
    private final JdbcTemplate jdbc;
    public AdminManagerRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record ManagerAccount(String id,String fullName,String email,String phone,String status) { }
    public List<ManagerAccount> managers(){return jdbc.query("SELECT id,full_name,email,phone,status FROM users WHERE role='MANAGER' ORDER BY id",(r,n)->new ManagerAccount(r.getString("id"),r.getString("full_name"),r.getString("email"),r.getString("phone"),r.getString("status")));}
    private void manager(long id){if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND role='MANAGER')",Boolean.class,id)))throw new ManagerFailure(404);}
    public List<Assignment> assignments(long user){manager(user);return jdbc.query("""
        SELECT ca.*,c.name cinema_name FROM cinema_assignments ca JOIN cinemas c ON c.id=ca.cinema_id
        WHERE ca.user_id=? AND ca.assignment_type='MANAGER' ORDER BY ca.id
        """,(r,n)->new Assignment(r.getString("id"),r.getString("user_id"),r.getString("cinema_id"),r.getString("cinema_name"),r.getString("assignment_type"),r.getString("status"),r.getTimestamp("effective_at").toInstant()),user);}
    public Assignment assignment(long user,long id){return assignments(user).stream().filter(a->a.id().equals(Long.toString(id))).findFirst().orElseThrow(()->new ManagerFailure(404));}
    public long save(long actor,long user,ManagerRequest.Assignment input,Long id,String status){return jdbc.queryForObject("SELECT admin_assign_manager(?,?,?,?,?,?)",Long.class,actor,user,input==null?null:input.cinemaId(),input==null?null:Timestamp.from(input.effectiveAt()),id,status);}
    public void timeouts(){jdbc.execute("SET LOCAL statement_timeout='5s'");jdbc.execute("SET LOCAL lock_timeout='2s'");}
}
