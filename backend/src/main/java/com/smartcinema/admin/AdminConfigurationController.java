package com.smartcinema.admin;

import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.admin.AdminConfigurationRepository.*;
import static com.smartcinema.admin.AdminMovieController.*;
import static com.smartcinema.movie.MovieQuery.positiveId;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminConfigurationController {
    private final AdminConfigurationService service;
    public AdminConfigurationController(AdminConfigurationService service) { this.service=service; }
    @GetMapping("/cinemas") public ResponseEntity<List<Cinema>> cinemas(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.cinemas(actor(jwt)));
    }
    @GetMapping("/cinemas/{cinemaId}") public ResponseEntity<Cinema> cinema(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.cinema(actor(jwt),positiveId("cinemaId",cinemaId)));
    }
    @PostMapping("/cinemas") public ResponseEntity<Cinema> createCinema(@AuthenticationPrincipal Jwt jwt,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); Cinema result=service.saveCinema(actor(jwt),null,AdminConfigurationRequest.cinema(body)); return created("cinemas",result.id(),result);
    }
    @PutMapping("/cinemas/{cinemaId}") public ResponseEntity<Cinema> updateCinema(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.saveCinema(actor(jwt),positiveId("cinemaId",cinemaId),AdminConfigurationRequest.cinema(body)));
    }
    @GetMapping("/cinemas/{cinemaId}/halls") public ResponseEntity<List<Hall>> halls(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.halls(actor(jwt),positiveId("cinemaId",cinemaId)));
    }
    @PostMapping("/cinemas/{cinemaId}/halls") public ResponseEntity<Hall> createHall(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); Hall result=service.saveHall(actor(jwt),positiveId("cinemaId",cinemaId),null,AdminConfigurationRequest.hall(body)); return created("halls",result.id(),result);
    }
    @GetMapping("/halls/{hallId}") public ResponseEntity<Hall> hall(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.hall(actor(jwt),positiveId("hallId",hallId)));
    }
    @PutMapping("/halls/{hallId}") public ResponseEntity<Hall> updateHall(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); long id=positiveId("hallId",hallId); Hall current=service.hall(actor(jwt),id);
        return ok(service.saveHall(actor(jwt),Long.parseLong(current.cinemaId()),id,AdminConfigurationRequest.hall(body)));
    }
    @GetMapping("/halls/{hallId}/seats") public ResponseEntity<List<Seat>> seats(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.seats(actor(jwt),positiveId("hallId",hallId)));
    }
    @PostMapping("/halls/{hallId}/seats") public ResponseEntity<List<Seat>> initialize(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ResponseEntity.created(URI.create("/api/v1/admin/halls/"+hallId+"/seats")).cacheControl(CacheControl.noStore())
            .body(service.initialize(actor(jwt),positiveId("hallId",hallId),AdminConfigurationRequest.layout(body)));
    }
    @GetMapping("/seats/{seatId}") public ResponseEntity<Seat> seat(@AuthenticationPrincipal Jwt jwt,@PathVariable String seatId,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.seat(actor(jwt),positiveId("seatId",seatId)));
    }
    @PutMapping("/seats/{seatId}") public ResponseEntity<Seat> updateSeat(@AuthenticationPrincipal Jwt jwt,@PathVariable String seatId,@RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> q) {
        noQuery(q); return ok(service.saveSeat(actor(jwt),positiveId("seatId",seatId),AdminConfigurationRequest.seat(body)));
    }
    private <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
    private <T> ResponseEntity<T> created(String resource,String id,T value) { return ResponseEntity.created(URI.create("/api/v1/admin/"+resource+"/"+id)).cacheControl(CacheControl.noStore()).body(value); }
}
