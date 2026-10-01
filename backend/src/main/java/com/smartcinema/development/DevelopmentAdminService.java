package com.smartcinema.development;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.validation.VietnamPhoneValidator;
import com.smartcinema.user.*;

@Service
@Profile("development-admin-cli")
public class DevelopmentAdminService {
    private final Environment environment;
    private final Validator validator;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JdbcTemplate jdbc;
    private final EntityManager entities;

    public DevelopmentAdminService(Environment environment, Validator validator, UserRepository users,
            PasswordEncoder passwords, JdbcTemplate jdbc, EntityManager entities) {
        this.environment = environment; this.validator = validator; this.users = users;
        this.passwords = passwords; this.jdbc = jdbc; this.entities = entities;
    }

    @Transactional
    public Result provision() {
        DevelopmentAdminApplication.validateMode(environment.getProperty("development.admin.confirm"), environment.getActiveProfiles());
        String email = required("DEV_ADMIN_EMAIL").trim().toLowerCase(Locale.ROOT);
        String password = required("DEV_ADMIN_PASSWORD");
        String name = required("DEV_ADMIN_NAME").trim();
        String phone = required("DEV_ADMIN_PHONE");
        if (!validator.validate(new RegisterUserRequest(name, email, phone, password)).isEmpty()
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Invalid development Admin input; follow registration name/email/phone rules and password length 8–72 UTF-8 bytes.");
        }
        phone = VietnamPhoneValidator.normalize(phone);
        // Serialize this explicit command for the same normalized identity without changing existing users.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(current_schema() || ':development-admin:' || ?, 0))",
                rs -> { }, email);
        var existing = users.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            entities.refresh(user, LockModeType.PESSIMISTIC_WRITE);
            if (user.getRole() != UserRole.ADMIN || user.getStatus() != AccountStatus.ACTIVE
                    || !name.equals(user.getFullName()) || !phone.equals(user.getPhone())
                    || !passwords.matches(password, user.getPasswordHash())) {
                throw new IllegalStateException("Existing account conflicts with requested development Admin; no account was changed.");
            }
            return Result.UNCHANGED;
        }
        users.saveAndFlush(User.developmentAdmin(email, passwords.encode(password), name, phone));
        return Result.CREATED;
    }

    private String required(String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank() || value.contains("<") || value.contains("${")) {
            throw new IllegalArgumentException("Missing or placeholder development Admin input: " + key);
        }
        return value;
    }

    public enum Result { CREATED, UNCHANGED }
}
