package com.smartcinema.discovery;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.discovery.dto.CinemaResponse;
import com.smartcinema.discovery.dto.ShowtimeResponse;
import com.smartcinema.discovery.dto.ShowtimeSchedule;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class DiscoveryService {
    private final DiscoveryRepository repository;
    private final Clock discoveryClock;
    private final ZoneId discoveryZone;

    public DiscoveryService(DiscoveryRepository repository, Clock discoveryClock, ZoneId discoveryZone) {
        this.repository = repository;
        this.discoveryClock = discoveryClock;
        this.discoveryZone = discoveryZone;
    }

    public List<CinemaResponse> cinemas(Long movieId) {
        Instant now = discoveryClock.instant();
        if (movieId != null) { requireMovie(movieId); }
        return repository.cinemas(movieId, now);
    }

    public CinemaResponse cinema(long id) {
        return repository.cinema(id).orElseThrow(() -> new DiscoveryUnavailableException("Cinema"));
    }

    public ShowtimeSchedule schedule(long movieId, long cinemaId, LocalDate requestedDate) {
        Instant now = discoveryClock.instant();
        requireMovie(movieId);
        cinema(cinemaId);
        LocalDate date = requestedDate == null ? now.atZone(discoveryZone).toLocalDate() : requestedDate;
        return new ShowtimeSchedule(discoveryZone.getId(), now, date,
                repository.dates(movieId, cinemaId, now, discoveryZone.getId()),
                repository.showtimes(movieId, cinemaId, now, date.atStartOfDay(discoveryZone).toInstant(),
                        date.plusDays(1).atStartOfDay(discoveryZone).toInstant()));
    }

    public ShowtimeResponse showtime(long id) {
        return repository.showtime(id, discoveryClock.instant())
                .orElseThrow(() -> new DiscoveryUnavailableException("Showtime"));
    }

    private void requireMovie(long id) {
        if (!repository.publishedMovieExists(id)) { throw new DiscoveryUnavailableException("Movie"); }
    }
}
