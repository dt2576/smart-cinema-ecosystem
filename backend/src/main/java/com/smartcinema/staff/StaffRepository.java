package com.smartcinema.staff;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class StaffRepository {
    private final JdbcTemplate jdbc;
    public StaffRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void admin(long actor) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND role='ADMIN' AND status='ACTIVE')", Boolean.class, actor))) throw new StaffFailure(403);
    }
    public void timeouts() { jdbc.execute("SET LOCAL lock_timeout='2s'"); jdbc.execute("SET LOCAL statement_timeout='5s'"); }
    public long create(long actor, String email, String name, String phone) { return jdbc.queryForObject("SELECT staff_create_account(?,?,?,?)", Long.class, actor, email, name, phone); }
    public long issue(long actor, long user, String digest, StaffInvitationCrypto.Encrypted encrypted) {
        return jdbc.queryForObject("SELECT staff_issue_invitation(?,?,?,?,?,?)", Long.class, actor, user, digest, encrypted.keyId(), encrypted.nonce(), encrypted.ciphertext());
    }
    public void password(String digest, String hash) {
        // Bind privately rather than through Spring's parameter-value TRACE logger.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try(var statement=connection.prepareStatement("SELECT staff_set_password(?,?)")) {
                statement.setString(1,digest); statement.setString(2,hash);
                try(var result=statement.executeQuery()) { result.next(); }
            }
            return null;
        });
    }
    public void status(long actor, long user, String status) { jdbc.queryForObject("SELECT staff_set_status(?,?,?)", Object.class, actor, user, status); }
    public long assign(long actor, long user, Long cinema, Instant effective, Long assignment, String status) {
        return jdbc.queryForObject("SELECT staff_assign_cinema(?,?,?,CAST(? AS timestamptz),?,?)", Long.class, actor, user, cinema, effective == null ? null : effective.toString(), assignment, status);
    }
    public boolean limit(String scope, String key) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT staff_rate_limit(?,?)", Boolean.class, scope, key)); }
    private static final String ACCOUNT = """
        SELECT u.id,u.full_name,u.email,u.phone,u.status,o.password_set_at,
          i.expires_at,d.status AS delivery_status,coalesce(d.attempts,0) AS attempts
        FROM users u JOIN staff_onboarding o ON o.user_id=u.id
        LEFT JOIN LATERAL (SELECT id,expires_at FROM staff_invitations WHERE user_id=u.id ORDER BY id DESC LIMIT 1) i ON true
        LEFT JOIN staff_invitation_deliveries d ON d.invitation_id=i.id
        """;
    private StaffAccount mapAccount(java.sql.ResultSet row, int n) throws java.sql.SQLException {
        return new StaffAccount(row.getString("id"), row.getString("full_name"), row.getString("email"), row.getString("phone"), row.getString("status"), row.getTimestamp("password_set_at") != null,
                row.getTimestamp("expires_at") == null ? null : row.getTimestamp("expires_at").toInstant(), row.getString("delivery_status") == null ? "NONE" : row.getString("delivery_status"), row.getInt("attempts"));
    }
    public StaffAccount account(long user) { return jdbc.query(ACCOUNT + " WHERE u.id=? AND u.role='STAFF'", this::mapAccount, user).stream().findFirst().orElseThrow(() -> new StaffFailure(404)); }
    public List<StaffAccount> accounts(int page, int size) { return jdbc.query(ACCOUNT + " WHERE u.role='STAFF' ORDER BY u.id LIMIT ? OFFSET ?", this::mapAccount, size, (long) page * size); }
    public List<Assignment> assignments(long user) {
        return jdbc.query("SELECT a.*,c.name FROM cinema_assignments a JOIN cinemas c ON c.id=a.cinema_id WHERE a.user_id=? ORDER BY a.id",
                (r,n) -> new Assignment(r.getString("id"), r.getString("user_id"), r.getString("cinema_id"), r.getString("name"), r.getString("assignment_type"), r.getString("status"), r.getTimestamp("effective_at").toInstant()), user);
    }
    @Transactional(timeout=10)
    public Optional<Delivery> claim(int max, Duration lease) {
        timeouts();
        return jdbc.query("""
            SELECT d.*,i.user_id,i.token_digest,i.expires_at,u.email,u.full_name FROM staff_claim_delivery(?,CAST(? AS interval)) d
            JOIN staff_invitations i ON i.id=d.invitation_id JOIN users u ON u.id=i.user_id
            """, (r,n) -> new Delivery(r.getLong("id"), r.getLong("user_id"), r.getString("token_digest"), r.getString("key_id"), r.getBytes("nonce"), r.getBytes("ciphertext"), r.getObject("lease_id", UUID.class), r.getInt("attempts"), r.getTimestamp("expires_at").toInstant(), r.getString("email"), r.getString("full_name")), max, lease.toSeconds() + " seconds").stream().findFirst();
    }
    public boolean deliverable(long id, UUID lease) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM staff_invitation_deliveries d JOIN staff_invitations i ON i.id=d.invitation_id
            WHERE d.id=? AND d.lease_id=? AND d.status='LEASED' AND i.revoked_at IS NULL AND i.consumed_at IS NULL AND i.expires_at>clock_timestamp())
            """, Boolean.class, id, lease));
    }
    @Transactional(timeout=10)
    public void finish(long id, UUID lease, boolean success, int max, Duration delay) { timeouts(); jdbc.queryForObject("SELECT staff_finish_delivery(?,?,?, ?,CAST(? AS interval))", Object.class, id, lease, success, max, delay.toSeconds() + " seconds"); }
    public record StaffAccount(String id, String fullName, String email, String phone, String status, boolean passwordSetupCompleted, Instant invitationExpiresAt, String deliveryStatus, int deliveryAttempts) { @Override public String toString() { return "StaffAccount[redacted]"; } }
    public record Assignment(String id, String userId, String cinemaId, String cinemaName, String assignmentType, String status, Instant effectiveAt) { }
    public record Delivery(long id, long user, String digest, String keyId, byte[] nonce, byte[] ciphertext, UUID lease, int attempts, Instant expiresAt, String email, String fullName) { @Override public String toString() { return "Delivery[redacted]"; } }
}
