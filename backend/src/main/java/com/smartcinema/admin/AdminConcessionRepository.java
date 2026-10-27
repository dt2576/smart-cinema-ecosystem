package com.smartcinema.admin;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminConcessionRepository {
    private final JdbcTemplate jdbc;
    public AdminConcessionRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void timeouts() {
        jdbc.execute("SET LOCAL lock_timeout='2s'"); jdbc.execute("SET LOCAL statement_timeout='5s'");
    }
    public List<AdminConcessionItem> list() {
        return jdbc.query("SELECT * FROM concession_items ORDER BY CASE category WHEN 'POPCORN' THEN 0 WHEN 'DRINK' THEN 1 ELSE 2 END,name COLLATE \"C\",id",(r,n)->item(r));
    }
    public AdminConcessionItem detail(long id) {
        return jdbc.query("SELECT * FROM concession_items WHERE id=?",(r,n)->item(r),id).stream().findFirst().orElseThrow(()->new AdminConcessionFailure(404));
    }
    public long save(long actor,Long id,String operation,AdminConcessionRequest.Input input,String status) {
        return jdbc.queryForObject("SELECT admin_configure_concession_item(?,?,?,?,?,?,?,?)",Long.class,
            actor,id,operation,input==null?null:input.name(),input==null?null:input.description(),input==null?null:input.category(),
            input==null?null:input.sellingPrice(),status);
    }
    private AdminConcessionItem item(ResultSet r) throws SQLException {
        return new AdminConcessionItem(r.getString("id"),r.getString("name"),r.getString("description"),r.getString("category"),
            r.getBigDecimal("selling_price").toPlainString(),r.getString("image"),r.getString("status"),
            r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
    }
}
