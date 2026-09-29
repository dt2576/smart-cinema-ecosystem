package com.smartcinema.promotion;

import java.sql.Types;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PromotionRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public PromotionRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void edit(long bookingId, long userId, String code, String operation) {
        jdbc.queryForObject("SELECT edit_booking_promotion(:booking,:user,:code,:operation)",
                new MapSqlParameterSource("booking", bookingId).addValue("user", userId)
                    .addValue("code", code, Types.VARCHAR).addValue("operation", operation),
                (row, index) -> row.getObject(1));
    }
}
