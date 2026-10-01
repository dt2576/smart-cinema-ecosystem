package com.smartcinema.development;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;

/** Explicit non-web development entry point, excluded from normal component scanning. */
public final class DevelopmentAdminApplication {
    private DevelopmentAdminApplication() { }

    static void validateMode(String confirmation, String[] profiles) {
        if (!"development-only".equals(confirmation) || Arrays.stream(profiles)
                .anyMatch(profile -> Set.of("prod", "production", "staging").contains(profile.toLowerCase(Locale.ROOT)))) {
            throw new IllegalStateException("Admin provisioning requires development-only confirmation and rejects production/staging profiles.");
        }
    }

    public static void main(String[] args) {
        if (!Arrays.asList(args).contains("--development.admin.confirm=development-only")) {
            throw new IllegalArgumentException("Explicit development-only Admin confirmation is required.");
        }
        System.setProperty("spring.devtools.restart.enabled", "false");
        var application = new SpringApplication(AdminConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setAdditionalProfiles("development-admin-cli");
        // A constraint error can include private row values; keep provider SQL diagnostics out of CLI output.
        application.setDefaultProperties(java.util.Map.of(
                "logging.level.org.hibernate.orm.jdbc.error", "OFF",
                "logging.level.org.hibernate.engine.jdbc.spi.SqlExceptionHelper", "OFF"));
        application.addInitializers(context -> validateMode(context.getEnvironment().getProperty("development.admin.confirm"),
                context.getEnvironment().getActiveProfiles()));
        try (var context = application.run(args)) {
            if (!context.isActive()) { throw new IllegalStateException("Admin command did not start."); }
        }
    }

    @Configuration(proxyBeanMethods = false)
    @Profile("development-admin-cli")
    @EnableAutoConfiguration
    @EntityScan(basePackageClasses = User.class)
    @EnableJpaRepositories(basePackageClasses = UserRepository.class)
    @Import(DevelopmentAdminService.class)
    static class AdminConfiguration {
        @Bean PasswordEncoder developmentAdminPasswordEncoder() { return new BCryptPasswordEncoder(); }
        @Bean ApplicationRunner provisionAdmin(DevelopmentAdminService service) {
            return args -> {
                DevelopmentAdminService.Result result;
                try { result = service.provision(); }
                catch (RuntimeException failure) {
                    throw new IllegalStateException("Development Admin provisioning failed; check local inputs, account conflicts and datasource. No account promotion/reset was attempted.");
                }
                org.slf4j.LoggerFactory.getLogger(DevelopmentAdminApplication.class).info(
                        "Development Admin provisioning committed: {}. Credentials are not logged.", result);
            };
        }
    }
}
