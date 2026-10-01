package com.smartcinema.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class LocalDatabaseConfigurationTests {

    @TempDir
    Path directory;

    private StandardEnvironment load(Path envFile, Map<String, Object> overrides) {
        // Isolate ConfigData itself: an actual developer .env must never affect these fixtures.
        Path applicationFile = directory.resolve("application.properties");
        try (var stream = getClass().getResourceAsStream("/application.properties")) {
            String application = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            application = application.replaceAll("(?m)^spring\\.config\\.import=.*$",
                    "spring.config.import=optional:" + envFile.toUri() + "[.properties]");
            Files.writeString(applicationFile, application);
        } catch (java.io.IOException exception) {
            throw new java.io.UncheckedIOException(exception);
        }
        var environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("testConfiguration", Map.of(
                "spring.config.location", applicationFile.toUri().toString())));
        if (!overrides.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("explicitOverrides", overrides));
        }
        ConfigDataEnvironmentPostProcessor.applyTo(environment);
        return environment;
    }

    @Test
    void importsExtensionlessLocalFileWithoutChangingSslParameters() throws Exception {
        var file = directory.resolve(".env");
        Files.writeString(file, "DB_URL=jdbc:postgresql://database.invalid/neondb?sslmode=require&connectTimeout=10\n"
                + "DB_USERNAME=fixture_owner\nDB_PASSWORD=fixture-only-not-a-secret\n");
        var environment = load(file, Map.of());
        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://database.invalid/neondb?sslmode=require&connectTimeout=10");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("fixture_owner");
        assertThat(environment.getProperty("spring.datasource.password").equals("fixture-only-not-a-secret")).isTrue();
        assertMigrationSettings(environment);
    }

    @Test
    void missingFileRetainsLocalDefaultsAndMigrationSettings() {
        var environment = load(directory.resolve("missing.env"), Map.of());
        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://localhost:5432/smart_cinema");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("postgres");
        assertThat(environment.getProperty("spring.datasource.password").equals("123456")).isTrue();
        assertMigrationSettings(environment);
    }

    @Test
    void explicitEnvironmentOverridesStillWinOverFile() throws Exception {
        var file = directory.resolve(".env");
        Files.writeString(file, "DB_USERNAME=file_owner\n");
        assertThat(load(file, Map.of("DB_USERNAME", "override_owner"))
                .getProperty("spring.datasource.username")).isEqualTo("override_owner");
    }

    @Test
    void actualApplicationDeclaresBothSupportedWorkingDirectoryImports() throws Exception {
        var properties = new java.util.Properties();
        try (var stream = getClass().getResourceAsStream("/application.properties")) {
            properties.load(stream);
        }
        assertThat(properties.getProperty("spring.config.import"))
                .isEqualTo("optional:file:./backend/.env[.properties],optional:file:./.env[.properties]");
    }

    private void assertMigrationSettings(StandardEnvironment environment) {
        assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        assertThat(environment.getProperty("spring.flyway.enabled")).isEqualTo("true");
        assertThat(environment.getProperty("spring.flyway.locations")).isEqualTo("classpath:db/migration");
        assertThat(environment.getProperty("spring.flyway.validate-migration-naming")).isEqualTo("true");
    }
}
