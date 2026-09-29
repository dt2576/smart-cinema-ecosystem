package com.smartcinema.concession;

import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ConcessionRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public ConcessionRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<ConcessionItemResponse> catalog() {
        return jdbc.query("""
                SELECT id,name,description,category,selling_price,image FROM concession_items WHERE status='ACTIVE'
                ORDER BY CASE category WHEN 'POPCORN' THEN 0 WHEN 'DRINK' THEN 1 ELSE 2 END,name COLLATE "C",id
                """, new MapSqlParameterSource(), (row, index) -> new ConcessionItemResponse(row.getString("id"),
                    row.getString("name"), row.getString("description"), row.getString("category"),
                    row.getBigDecimal("selling_price").toPlainString(), row.getString("image")));
    }

    public void edit(long bookingId, long userId, Long lineId, Long itemId, Integer quantity, String operation) {
        jdbc.queryForObject("SELECT edit_booking_concession(:booking,:user,:line,:item,:quantity,:operation)",
                new MapSqlParameterSource("booking", bookingId).addValue("user", userId)
                    .addValue("line", lineId, java.sql.Types.BIGINT).addValue("item", itemId, java.sql.Types.BIGINT)
                    .addValue("quantity", quantity, java.sql.Types.INTEGER).addValue("operation", operation),
                (row, index) -> row.getObject(1));
    }
}
