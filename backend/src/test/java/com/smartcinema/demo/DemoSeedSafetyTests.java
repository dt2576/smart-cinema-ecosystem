package com.smartcinema.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.*;

class DemoSeedSafetyTests {
    @Test
    void ordinaryApplicationDoesNotInstantiateSeedService() {
        new ApplicationContextRunner().withUserConfiguration(DemoSeedService.class)
                .run(context -> assertThat(context).doesNotHaveBean(DemoSeedService.class));
    }

    @Test
    void cliRequiresConfirmationBeforeOpeningApplicationOrDatabase() {
        assertThatThrownBy(() -> DemoSeedApplication.main(new String[0]))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("confirm");
    }

    @Test
    void confirmationCannotEnableSeedingWithProductionProfiles() {
        for (String profile : new String[]{"prod", "PRODUCTION", "staging"}) {
            assertThatThrownBy(() -> DemoSeedApplication.validateMode("development-only", new String[]{profile}))
                    .isInstanceOf(IllegalStateException.class);
        }
        assertThatThrownBy(() -> DemoSeedApplication.validateMode(null, new String[]{"demo-seed"}))
                .isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> DemoSeedApplication.validateMode("development-only", new String[]{"demo-seed", "demo-seed-cli"}))
                .doesNotThrowAnyException();
    }
}
