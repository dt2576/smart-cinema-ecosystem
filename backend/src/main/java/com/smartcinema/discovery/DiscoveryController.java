package com.smartcinema.discovery;

import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.smartcinema.discovery.dto.CinemaResponse;
import com.smartcinema.discovery.dto.ShowtimeResponse;
import com.smartcinema.discovery.dto.ShowtimeSchedule;

@RestController
public class DiscoveryController {
    private final DiscoveryService service;
    public DiscoveryController(DiscoveryService service) { this.service = service; }

    @GetMapping("/api/v1/cinemas")
    public ResponseEntity<List<CinemaResponse>> cinemas(@RequestParam MultiValueMap<String, String> parameters) {
        DiscoveryQuery.validate(parameters, "movieId");
        Long movieId = parameters.containsKey("movieId") ? DiscoveryQuery.id("movieId", parameters.getFirst("movieId")) : null;
        return response(service.cinemas(movieId));
    }

    @GetMapping("/api/v1/cinemas/{cinemaId}")
    public ResponseEntity<CinemaResponse> cinema(@PathVariable String cinemaId,
            @RequestParam MultiValueMap<String, String> parameters) {
        DiscoveryQuery.validate(parameters);
        return response(service.cinema(DiscoveryQuery.id("cinemaId", cinemaId)));
    }

    @GetMapping("/api/v1/showtimes")
    public ResponseEntity<ShowtimeSchedule> showtimes(@RequestParam MultiValueMap<String, String> parameters) {
        DiscoveryQuery.validate(parameters, "movieId", "cinemaId", "date");
        return response(service.schedule(DiscoveryQuery.id("movieId", parameters.getFirst("movieId")),
                DiscoveryQuery.id("cinemaId", parameters.getFirst("cinemaId")),
                DiscoveryQuery.date(parameters.getFirst("date"))));
    }

    @GetMapping("/api/v1/showtimes/{showtimeId}")
    public ResponseEntity<ShowtimeResponse> showtime(@PathVariable String showtimeId,
            @RequestParam MultiValueMap<String, String> parameters) {
        DiscoveryQuery.validate(parameters);
        return response(service.showtime(DiscoveryQuery.id("showtimeId", showtimeId)));
    }

    private <T> ResponseEntity<T> response(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
