package com.smartcinema.manager;

import java.net.URI;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.admin.*;
import static com.smartcinema.admin.AdminConfigurationRepository.*;
import static com.smartcinema.manager.ManagerRequest.*;

@RestController
@RequestMapping("/api/v1/manager")
public class ManagerController {
    private final ManagerService service;
    public ManagerController(ManagerService service){this.service=service;}
    @GetMapping("/cinemas") public ResponseEntity<List<Cinema>> cinemas(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.cinemas(actor(jwt)));}
    @GetMapping("/cinemas/{cinemaId}") public ResponseEntity<Cinema> cinema(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.cinema(actor(jwt),id(cinemaId)));}
    @GetMapping("/cinemas/{cinemaId}/halls") public ResponseEntity<List<Hall>> halls(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.halls(actor(jwt),id(cinemaId)));}
    @PostMapping(value="/cinemas/{cinemaId}/halls",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Hall> createHall(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);var saved=service.saveHall(actor(jwt),id(cinemaId),null,AdminConfigurationRequest.hall(body(raw)));return created("halls/"+saved.id(),saved);}
    @GetMapping("/halls/{hallId}") public ResponseEntity<Hall> hall(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.hall(actor(jwt),id(hallId)));}
    @PutMapping(value="/halls/{hallId}",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Hall> updateHall(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.saveHall(actor(jwt),null,id(hallId),AdminConfigurationRequest.hall(body(raw))));}
    @GetMapping("/halls/{hallId}/seats") public ResponseEntity<List<Seat>> seats(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.seats(actor(jwt),id(hallId)));}
    @PostMapping(value="/halls/{hallId}/seats",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Seat>> initialize(@AuthenticationPrincipal Jwt jwt,@PathVariable String hallId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);return created("halls/"+hallId+"/seats",service.initialize(actor(jwt),id(hallId),AdminConfigurationRequest.layout(body(raw))));}
    @GetMapping("/seats/{seatId}") public ResponseEntity<Seat> seat(@AuthenticationPrincipal Jwt jwt,@PathVariable String seatId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.seat(actor(jwt),id(seatId)));}
    @PutMapping(value="/seats/{seatId}",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Seat> updateSeat(@AuthenticationPrincipal Jwt jwt,@PathVariable String seatId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.saveSeat(actor(jwt),id(seatId),AdminConfigurationRequest.seat(body(raw))));}
    @GetMapping("/cinemas/{cinemaId}/staff") public ResponseEntity<List<ManagerRepository.Staff>> staff(@AuthenticationPrincipal Jwt jwt,@PathVariable String cinemaId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.staff(actor(jwt),id(cinemaId)));}
    @GetMapping("/showtimes") public ResponseEntity<AdminShowtimeService.Schedule> showtimes(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> q){return ok(service.showtimes(actor(jwt),filter(q)));}
    @GetMapping("/showtimes/{showtimeId}") public ResponseEntity<AdminShowtimeService.Detail> showtime(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.showtime(actor(jwt),id(showtimeId)));}
    @PostMapping(value="/showtimes",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminShowtimeService.Detail> createShowtime(@AuthenticationPrincipal Jwt jwt,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);var saved=service.saveShowtime(actor(jwt),null,ManagerRequest.showtime(raw));return created("showtimes/"+saved.showtime().id(),saved);}
    @PutMapping(value="/showtimes/{showtimeId}",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminShowtimeService.Detail> updateShowtime(@AuthenticationPrincipal Jwt jwt,@PathVariable String showtimeId,@RequestBody byte[] raw,@RequestParam MultiValueMap<String,String> q){noQuery(q);return ok(service.saveShowtime(actor(jwt),id(showtimeId),ManagerRequest.showtime(raw)));}
    private <T> ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    private <T> ResponseEntity<T> created(String path,T value){return ResponseEntity.created(URI.create("/api/v1/manager/"+path)).cacheControl(CacheControl.noStore()).body(value);}
}
