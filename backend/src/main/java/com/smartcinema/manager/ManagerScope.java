package com.smartcinema.manager;

/** Only internal column expressions are accepted here; no request text becomes SQL. */
public final class ManagerScope {
    private ManagerScope() { }
    public static String predicate(String cinemaColumn) {
        if(!java.util.Set.of("c.id","h.cinema_id").contains(cinemaColumn))throw new IllegalArgumentException("Unsupported scope column");
        return """
            EXISTS(SELECT 1 FROM cinema_assignments ca JOIN users mu ON mu.id=ca.user_id
              WHERE ca.user_id=:actor AND mu.role='MANAGER' AND mu.status='ACTIVE'
              AND ca.assignment_type='MANAGER' AND ca.status='ACTIVE' AND ca.effective_at<=clock_timestamp()
              AND ca.cinema_id=
            """+cinemaColumn+")";
    }
}
