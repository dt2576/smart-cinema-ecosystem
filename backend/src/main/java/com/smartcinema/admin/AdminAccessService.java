package com.smartcinema.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/** Rechecks current database authority; a stale ADMIN token is insufficient. */
@Service
public class AdminAccessService {
    private final JdbcTemplate jdbc;
    public AdminAccessService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public AdminIdentity requireAdmin(long actorId) {
        return requireAdmin(actorId,true);
    }

    /** Reporting snapshot authorization, without locking users or requiring a write transaction. */
    public AdminIdentity requireAdminReadOnly(long actorId) {
        return requireAdmin(actorId,false);
    }

    private AdminIdentity requireAdmin(long actorId,boolean lock) {
        return jdbc.query("SELECT id, full_name, role, status FROM users WHERE id=?"+(lock?" FOR SHARE":""), (row, number) -> {
            if (!"ADMIN".equals(row.getString("role")) || !"ACTIVE".equals(row.getString("status"))) {
                throw denied();
            }
            return new AdminIdentity(row.getString("id"), row.getString("full_name"), "ADMIN");
        }, actorId).stream().findFirst().orElseThrow(AdminAccessService::denied);
    }

    private static AccessDeniedException denied() { return new AccessDeniedException("Active Admin access is required."); }
    public record AdminIdentity(String id, String fullName, String role) {}
}
