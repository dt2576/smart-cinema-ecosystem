package com.smartcinema.staff;

import java.net.URI;
import java.time.Duration;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public final class StaffInvitationSettings {
    private final Environment environment;
    public StaffInvitationSettings(Environment environment) { this.environment = environment; }
    public String value(String key, String fallback) { return environment.getProperty("staff.invitations." + key, fallback); }
    public boolean enabled() { return Boolean.parseBoolean(value("delivery-enabled", "false")); }
    public String activationBase() {
        try {
            URI uri = URI.create(value("activation-base-url", ""));
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getQuery() != null || uri.getFragment() != null || uri.getPath().isBlank()) throw new StaffFailure(503);
            return uri.toASCIIString();
        } catch (RuntimeException failure) { throw new StaffFailure(503); }
    }
    public int maxAttempts() { return integer("max-attempts", 5, 1, 10); }
    public Duration lease() { return duration("lease", "PT5M", Duration.ofMinutes(1), Duration.ofMinutes(30)); }
    public Duration backoff(int attempts) {
        Duration initial = duration("retry-initial", "PT30S", Duration.ofSeconds(1), Duration.ofMinutes(30));
        Duration cap = duration("retry-max", "PT30M", initial, Duration.ofHours(1));
        return Duration.ofMillis(Math.min(cap.toMillis(), initial.toMillis() * (1L << Math.min(10, Math.max(0, attempts - 1)))));
    }
    public void requireMail() {
        String host = environment.getProperty("spring.mail.host", ""), from = sender();
        boolean local = host.equals("127.0.0.1") || host.equals("localhost") || host.equals("::1");
        boolean auth = Boolean.parseBoolean(environment.getProperty("spring.mail.properties.mail.smtp.auth", "true"));
        if (host.isBlank() || from.isBlank() || (local && !Boolean.parseBoolean(value("allow-local-smtp", "false")))) throw new StaffFailure(503);
        if (auth && (environment.getProperty("spring.mail.username", "").isBlank() || environment.getProperty("spring.mail.password", "").isBlank())) throw new StaffFailure(503);
        boolean tls = Boolean.parseBoolean(environment.getProperty("spring.mail.properties.mail.smtp.starttls.required", "true"));
        boolean ssl = Boolean.parseBoolean(environment.getProperty("spring.mail.properties.mail.smtp.ssl.enable", "false"));
        if (!local && (!auth || (!tls && !ssl))) throw new StaffFailure(503);
        long totalTimeout=0;
        for(String key:new String[]{"connectiontimeout","timeout","writetimeout"}) {
            try {
                int timeout=Integer.parseInt(environment.getProperty("spring.mail.properties.mail.smtp."+key,"5000"));
                if(timeout<100||timeout>30000) throw new StaffFailure(503);totalTimeout+=timeout;
            } catch(RuntimeException failure) {throw new StaffFailure(503);}
        }
        if (lease().toMillis() <= totalTimeout) throw new StaffFailure(503);
    }
    public String sender() {
        String from = value("from-address", "");
        if (!from.matches("[^\\s<>@]+@[^\\s<>@]+\\.[^\\s<>@]+")) throw new StaffFailure(503); return from;
    }
    public String senderName() {
        String name = value("from-name", "Smart Cinema");
        if (name.length() > 100 || name.codePoints().anyMatch(Character::isISOControl)) throw new StaffFailure(503); return name;
    }
    private int integer(String key, int fallback, int min, int max) {
        try { int n = Integer.parseInt(value(key, Integer.toString(fallback))); if (n < min || n > max) throw new StaffFailure(503); return n; }
        catch (RuntimeException failure) { throw new StaffFailure(503); }
    }
    private Duration duration(String key, String fallback, Duration min, Duration max) {
        try { Duration d = Duration.parse(value(key, fallback)); if (d.compareTo(min) < 0 || d.compareTo(max) > 0) throw new StaffFailure(503); return d; }
        catch (RuntimeException failure) { throw new StaffFailure(503); }
    }
}
