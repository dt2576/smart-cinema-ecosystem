package com.smartcinema.discovery;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import com.smartcinema.discovery.dto.CinemaResponse;

class DiscoveryServiceTests {
    private final DiscoveryRepository repository = mock(DiscoveryRepository.class);
    private final Instant now = Instant.parse("2030-01-01T17:00:00Z");
    private final Clock clock = mock(Clock.class);
    private final DiscoveryService service = new DiscoveryService(repository, clock, ZoneId.of("Asia/Ho_Chi_Minh"));

    @Test
    void configuredZoneMustBeNamedToAvoidOppositeSqlOffsetConventions() {
        var configuration = new DiscoveryConfiguration();
        assertThat(configuration.discoveryZone("Asia/Ho_Chi_Minh")).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (String zone : new String[] {"+07:00", "UTC+07:00", "invalid"}) {
            assertThatThrownBy(() -> configuration.discoveryZone(zone)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void scheduleUsesOneInstantAndLocalCalendarBoundaries() {
        when(clock.instant()).thenReturn(now);
        when(repository.publishedMovieExists(1)).thenReturn(true);
        when(repository.cinema(2)).thenReturn(Optional.of(new CinemaResponse("2", "Branch", "Address", null, null)));
        when(repository.dates(1, 2, now, "Asia/Ho_Chi_Minh")).thenReturn(List.of(LocalDate.of(2030, 1, 3)));
        var result = service.schedule(1, 2, null);
        assertThat(result.date()).isEqualTo(LocalDate.of(2030, 1, 2));
        assertThat(result.serverTime()).isEqualTo(now);
        assertThat(result.dates()).containsExactly(LocalDate.of(2030, 1, 3));
        verify(repository).showtimes(1, 2, now, now, now.plusSeconds(86400));
        verify(clock, times(1)).instant();
    }

    @Test
    void hiddenParentsStopQueriesAndMissingDetailIsUnavailable() {
        when(clock.instant()).thenReturn(now);
        assertThatThrownBy(() -> service.cinemas(1L)).isInstanceOf(DiscoveryUnavailableException.class)
                .hasMessage("Movie is unavailable.");
        verify(repository, never()).cinemas(any(), any());
        when(repository.publishedMovieExists(1)).thenReturn(true);
        assertThatThrownBy(() -> service.schedule(1, 2, null)).hasMessage("Cinema is unavailable.");
        verify(repository, never()).dates(anyLong(), anyLong(), any(), any());
        assertThatThrownBy(() -> service.showtime(3)).hasMessage("Showtime is unavailable.");
    }

    @Test
    void explicitDateUsesZoneRulesRatherThanTwentyFourHourAssumption() {
        when(clock.instant()).thenReturn(now);
        when(repository.publishedMovieExists(1)).thenReturn(true);
        when(repository.cinema(2)).thenReturn(Optional.of(new CinemaResponse("2", "Branch", "Address", null, null)));
        new DiscoveryService(repository, clock, ZoneId.of("America/New_York"))
                .schedule(1, 2, LocalDate.of(2030, 3, 10));
        verify(repository).showtimes(1, 2, now, Instant.parse("2030-03-10T05:00:00Z"),
                Instant.parse("2030-03-11T04:00:00Z"));
    }
}
