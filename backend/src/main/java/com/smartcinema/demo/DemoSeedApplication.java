package com.smartcinema.demo;

import java.util.Arrays;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;

/** Explicit, one-shot development command; never the normal application entry point. */
public final class DemoSeedApplication {
    private DemoSeedApplication() { }

    static void validateMode(String confirmation, String[] profiles) {
        if (!"development-only".equals(confirmation)
                || Arrays.stream(profiles).anyMatch(profile ->
                        java.util.Set.of("prod", "production", "staging").contains(profile.toLowerCase(java.util.Locale.ROOT)))) {
            throw new IllegalStateException("Demo seeding requires explicit development-only confirmation and rejects production/staging profiles.");
        }
    }

    public static void main(String[] args) {
        if (!Arrays.asList(args).contains("--demo.seed.confirm=development-only")) {
            throw new IllegalArgumentException("Demo seed requires --demo.seed.confirm=development-only. Never use a production database.");
        }
        System.setProperty("spring.devtools.restart.enabled", "false");
        var application = new SpringApplication(DemoConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setAdditionalProfiles("demo-seed", "demo-seed-cli");
        // Close pools and JPA after the one-shot runner finishes. No HTTP or provider components are loaded.
        try (var context = application.run(args)) {
            if (!context.isActive()) { throw new IllegalStateException("Demo seed context did not start."); }
        }
    }

    @Configuration(proxyBeanMethods = false)
    @Profile("demo-seed-cli")
    @EnableAutoConfiguration
    @EntityScan(basePackages = {"com.smartcinema.movie", "com.smartcinema.user"})
    @Import(DemoSeedService.class)
    static class DemoConfiguration {
        @Bean
        ApplicationRunner seedRunner(DemoSeedService seed, org.springframework.core.env.Environment environment) {
            return args -> {
                validateMode(environment.getProperty("demo.seed.confirm"), environment.getActiveProfiles());
                var result = seed.seed();
                org.slf4j.LoggerFactory.getLogger(DemoSeedApplication.class).info(
                        "DEVELOPMENT DEMO seed committed: {} Movies, {} Cinemas, {} Halls, {} Seat Units, {} Showtimes in current horizon; Promotion codes {}. No payment or entitlement data seeded.",
                        result.movies(), result.cinemas(), result.halls(), result.seatUnits(), result.showtimes(), result.promotionCodes());
            };
        }
    }
}
