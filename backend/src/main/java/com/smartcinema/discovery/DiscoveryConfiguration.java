package com.smartcinema.discovery;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DiscoveryConfiguration {
    @Bean
    Clock discoveryClock() { return Clock.systemUTC(); }

    @Bean
    ZoneId discoveryZone(@Value("${discovery.time-zone:Asia/Ho_Chi_Minh}") String zone) {
        if (!ZoneId.getAvailableZoneIds().contains(zone)) {
            throw new IllegalArgumentException("DISCOVERY_TIME_ZONE must be a named timezone, not a numeric offset.");
        }
        return ZoneId.of(zone);
    }
}
