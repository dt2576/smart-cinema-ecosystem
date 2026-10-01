package com.smartcinema.development;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class DevelopmentAdminSafetyTests {
    @Test void normalStartupDoesNotCreateProvisioner() {
        new ApplicationContextRunner().withUserConfiguration(DevelopmentAdminService.class,
                DevelopmentAdminApplication.AdminConfiguration.class)
                .run(context -> assertThat(context).doesNotHaveBean(DevelopmentAdminService.class));
    }
    @Test void explicitAcknowledgementIsRequiredBeforeStartup() {
        assertThatThrownBy(() -> DevelopmentAdminApplication.main(new String[0])).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DevelopmentAdminApplication.validateMode(null, new String[0])).isInstanceOf(IllegalStateException.class);
    }
    @Test void recognizedProductionProfilesCannotBeEnabled() {
        for (String profile : new String[]{"prod", "PRODUCTION", "staging"}) {
            assertThatThrownBy(() -> DevelopmentAdminApplication.validateMode("development-only", new String[]{profile}))
                    .isInstanceOf(IllegalStateException.class);
        }
        assertThatCode(() -> DevelopmentAdminApplication.validateMode("development-only", new String[]{"development-admin-cli"}))
                .doesNotThrowAnyException();
    }
}
