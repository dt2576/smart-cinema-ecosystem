package com.smartcinema.admin;

import java.net.URI;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import static com.smartcinema.admin.AdminMovieController.*;
import static com.smartcinema.movie.MovieQuery.positiveId;

@RestController
@RequestMapping("/api/v1/admin/showtimes")
public class AdminShowtimeController {
    private final AdminShowtimeService service;
    public AdminShowtimeController(AdminShowtimeService service) { this.service=service; }
    @GetMapping public ResponseEntity<AdminShowtimeService.Schedule> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return ok(service.list(actor(jwt),AdminShowtimeRequest.filter(query)));
    }
    @GetMapping("/{showtimeId}") public ResponseEntity<AdminShowtimeService.Detail> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.detail(actor(jwt),positiveId("showtimeId",showtimeId)));
    }
    @PostMapping public ResponseEntity<AdminShowtimeService.Detail> create(@AuthenticationPrincipal Jwt jwt,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); var result=service.save(actor(jwt),null,AdminShowtimeRequest.parse(body));
        return ResponseEntity.created(URI.create("/api/v1/admin/showtimes/"+result.showtime().id())).cacheControl(CacheControl.noStore()).body(result);
    }
    @PutMapping("/{showtimeId}") public ResponseEntity<AdminShowtimeService.Detail> update(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return ok(service.save(actor(jwt),positiveId("showtimeId",showtimeId),AdminShowtimeRequest.parse(body)));
    }
    private <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
