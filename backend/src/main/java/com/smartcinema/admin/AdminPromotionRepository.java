package com.smartcinema.admin;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminPromotionRepository {
    private final JdbcTemplate jdbc;
    public AdminPromotionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void timeouts() {
        jdbc.execute("SET LOCAL lock_timeout='2s'");
        jdbc.execute("SET LOCAL statement_timeout='5s'");
    }
    public List<AdminPromotion> list() {
        return jdbc.query("SELECT * FROM promotions ORDER BY code COLLATE \"C\",id", (r,n) -> item(r));
    }
    public AdminPromotion detail(long id) {
        return jdbc.query("SELECT * FROM promotions WHERE id=?", (r,n) -> item(r), id).stream()
            .findFirst().orElseThrow(() -> new AdminPromotionFailure(404));
    }
    public long save(long actor, Long id, String operation, AdminPromotionRequest.Input input, String status) {
        return jdbc.queryForObject("SELECT admin_configure_promotion(?,?,?,?,?,?,?,?,?,?,?,?)", Long.class,
            actor, id, operation, input == null ? null : input.code(), input == null ? null : input.discountType(),
            input == null ? null : input.discountValue(), input == null ? null : input.validFrom().atOffset(ZoneOffset.UTC),
            input == null ? null : input.validUntil().atOffset(ZoneOffset.UTC), input == null ? null : input.minimumOrderAmount(),
            input == null ? null : input.usageLimit(), status, input == null ? null : input.maxDiscountAmount());
    }
    private AdminPromotion item(ResultSet r) throws SQLException {
        var cap = r.getBigDecimal("max_discount_amount");
        return new AdminPromotion(r.getString("id"), r.getString("code"), r.getString("discount_type"),
            r.getBigDecimal("discount_value").toPlainString(), r.getTimestamp("valid_from").toInstant(),
            r.getTimestamp("valid_until").toInstant(), r.getBigDecimal("minimum_order").toPlainString(),
            r.getObject("usage_limit", Integer.class), r.getString("status"), cap == null ? null : cap.toPlainString());
    }
}
