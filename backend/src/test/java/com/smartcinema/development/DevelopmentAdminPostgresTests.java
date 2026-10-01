package com.smartcinema.development;

import static org.assertj.core.api.Assertions.*;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import com.smartcinema.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@SpringBootTest(classes = DevelopmentAdminApplication.AdminConfiguration.class,
        properties = {"spring.main.web-application-type=none", "spring.profiles.active=development-admin-cli",
                "development.admin.confirm=development-only"})
@EnabledIfEnvironmentVariable(named = "DEMO_DB_TESTS", matches = "true")
@ExtendWith(OutputCaptureExtension.class)
class DevelopmentAdminPostgresTests {
    private static final String SCHEMA = "admin_provision_" + UUID.randomUUID().toString().replace("-", "");
    private static final String EMAIL = UUID.randomUUID() + "@example.test";
    private static final String PASSWORD = UUID.randomUUID().toString();
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.flyway.schemas", () -> SCHEMA + ",public");
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.url", () -> { String url = System.getenv("DB_URL");
            return url + (url.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA + ",public"; });
        properties.add("DEV_ADMIN_EMAIL", () -> EMAIL);
        properties.add("DEV_ADMIN_PASSWORD", () -> PASSWORD);
        properties.add("DEV_ADMIN_NAME", () -> "Development test actor");
        properties.add("DEV_ADMIN_PHONE", () -> "0901234567");
    }
    @Autowired DevelopmentAdminService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ConfigurableEnvironment environment;

    @BeforeEach void restore() {
        environment.getPropertySources().remove("invalid-admin-input");
        jdbc.update("UPDATE users SET role='ADMIN', status='ACTIVE', full_name='Development test actor', phone='+84901234567' WHERE email=?", EMAIL);
    }
    @Test void creationHashesPasswordAndRerunDoesNotMutate() {
        var user = users.findByEmail(EMAIL).orElseThrow();
        assertThat(user.getRole()).isEqualTo(com.smartcinema.user.UserRole.ADMIN);
        assertThat(user.getStatus()).isEqualTo(com.smartcinema.user.AccountStatus.ACTIVE);
        assertThat(user.getPasswordHash()).startsWith("$2").isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, user.getPasswordHash())).isTrue();
        var before = jdbc.queryForMap("SELECT * FROM users WHERE email=?", EMAIL);
        assertThat(service.provision()).isEqualTo(DevelopmentAdminService.Result.UNCHANGED);
        assertThat(jdbc.queryForMap("SELECT * FROM users WHERE email=?", EMAIL)).isEqualTo(before);
    }
    @Test void concurrentCreationUsesOneAccountAndLogsNoCredentials(CapturedOutput output) throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String password = UUID.randomUUID().toString();
        environment.getPropertySources().addFirst(new MapPropertySource("invalid-admin-input",
                java.util.Map.of("DEV_ADMIN_EMAIL", email, "DEV_ADMIN_PASSWORD", password)));
        var pool = Executors.newFixedThreadPool(2);
        try {
            var start = new CountDownLatch(1);
            Callable<DevelopmentAdminService.Result> task = () -> { start.await(); return service.provision(); };
            var first = pool.submit(task); var second = pool.submit(task); start.countDown();
            assertThat(java.util.List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(DevelopmentAdminService.Result.CREATED, DevelopmentAdminService.Result.UNCHANGED);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isEqualTo(1);
            var user = users.findByEmail(email).orElseThrow();
            assertThat(passwords.matches(password, user.getPasswordHash())).isTrue();
            assertThat(output.getAll()).doesNotContain(password, email, user.getPasswordHash());
        } finally { pool.shutdownNow(); }
    }
    @Test void nonAdminBlockedOrConflictingIdentityIsNeverChanged() {
        for (String role : new String[]{"CUSTOMER", "STAFF", "MANAGER"}) {
            jdbc.update("UPDATE users SET role=? WHERE email=?", role, EMAIL);
            assertConflictUnchanged();
        }
        jdbc.update("UPDATE users SET role='ADMIN',status='BLOCKED' WHERE email=?", EMAIL);
        assertConflictUnchanged();
        jdbc.update("UPDATE users SET status='ACTIVE', full_name='Other identity' WHERE email=?", EMAIL);
        assertConflictUnchanged();
    }
    @Test void invalidOrDifferentPasswordIsRejectedWithoutDisclosure() {
        environment.getPropertySources().addFirst(new MapPropertySource("invalid-admin-input", java.util.Map.of("DEV_ADMIN_PASSWORD", UUID.randomUUID().toString())));
        assertConflictUnchanged();
        environment.getPropertySources().replace("invalid-admin-input", new MapPropertySource("invalid-admin-input", java.util.Map.of("DEV_ADMIN_PASSWORD", "<PASSWORD>")));
        assertThatThrownBy(service::provision).isInstanceOf(IllegalArgumentException.class).hasMessageNotContaining(PASSWORD);
    }
    @Test void concurrentRerunsRetainOneAccountAndHash() throws Exception {
        String hash = users.findByEmail(EMAIL).orElseThrow().getPasswordHash();
        var pool = Executors.newFixedThreadPool(2);
        try {
            var start = new CountDownLatch(1);
            Callable<DevelopmentAdminService.Result> task = () -> { start.await(); return service.provision(); };
            var first = pool.submit(task); var second = pool.submit(task); start.countDown();
            assertThat(first.get(20, TimeUnit.SECONDS)).isEqualTo(DevelopmentAdminService.Result.UNCHANGED);
            assertThat(second.get(20, TimeUnit.SECONDS)).isEqualTo(DevelopmentAdminService.Result.UNCHANGED);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, EMAIL)).isEqualTo(1);
            assertThat(users.findByEmail(EMAIL).orElseThrow().getPasswordHash()).isEqualTo(hash);
        } finally { pool.shutdownNow(); }
    }
    private void assertConflictUnchanged() {
        var before = jdbc.queryForMap("SELECT * FROM users WHERE email=?", EMAIL);
        assertThatThrownBy(service::provision).isInstanceOf(IllegalStateException.class).hasMessageNotContaining(PASSWORD).hasMessageNotContaining(EMAIL);
        assertThat(jdbc.queryForMap("SELECT * FROM users WHERE email=?", EMAIL)).isEqualTo(before);
    }
}
