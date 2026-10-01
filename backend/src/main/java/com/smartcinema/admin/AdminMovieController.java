package com.smartcinema.admin;

import java.net.URI;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import com.smartcinema.movie.*;
import com.smartcinema.movie.dto.*;

@RestController
@RequestMapping("/api/v1/admin/movies")
public class AdminMovieController {
    private final AdminMovieService service;
    public AdminMovieController(AdminMovieService service) { this.service=service; }

    @GetMapping
    public ResponseEntity<MoviePage> list(@AuthenticationPrincipal Jwt jwt,@RequestParam MultiValueMap<String,String> query) {
        return response(service.list(actor(jwt),MovieQuery.parse(query)));
    }
    @GetMapping("/{movieId}")
    public ResponseEntity<MovieDetail> detail(@AuthenticationPrincipal Jwt jwt,@PathVariable String movieId,
            @RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return response(service.detail(actor(jwt),MovieQuery.positiveId("movieId",movieId)));
    }
    @PostMapping
    public ResponseEntity<MovieDetail> create(@AuthenticationPrincipal Jwt jwt,@RequestBody Map<String,Object> body,
            @RequestParam MultiValueMap<String,String> query) {
        noQuery(query);
        MovieDetail movie=service.create(actor(jwt),AdminMovieRequest.parse(body));
        return ResponseEntity.created(URI.create("/api/v1/admin/movies/"+movie.id())).cacheControl(CacheControl.noStore()).body(movie);
    }
    @PutMapping("/{movieId}")
    public ResponseEntity<MovieDetail> update(@AuthenticationPrincipal Jwt jwt,@PathVariable String movieId,
            @RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query); return response(service.update(actor(jwt),MovieQuery.positiveId("movieId",movieId),AdminMovieRequest.parse(body)));
    }
    @PutMapping("/{movieId}/publication")
    public ResponseEntity<MovieDetail> publication(@AuthenticationPrincipal Jwt jwt,@PathVariable String movieId,
            @RequestBody Map<String,Object> body,@RequestParam MultiValueMap<String,String> query) {
        noQuery(query);
        if (!body.keySet().equals(java.util.Set.of("status")) || !(body.get("status") instanceof String)) {
            throw new InvalidMovieRequestException("status","Supply exactly one publication status field.");
        }
        MovieStatus target;
        try { target=MovieStatus.valueOf((String)body.get("status")); }
        catch(IllegalArgumentException exception) { throw new InvalidMovieRequestException("status","Use DRAFT, PUBLISHED or UNPUBLISHED."); }
        return response(service.publication(actor(jwt),MovieQuery.positiveId("movieId",movieId),target));
    }
    static long actor(Jwt jwt) {
        try { return MovieQuery.positiveId("subject",jwt==null?null:jwt.getSubject()); }
        catch(InvalidMovieRequestException exception) { throw new AccessDeniedException("Active Admin access is required."); }
    }
    static void noQuery(MultiValueMap<String,String> query) {
        if (!query.isEmpty()) { throw new InvalidMovieRequestException(query.keySet().iterator().next(),"Query parameters are not supported here."); }
    }
    private <T> ResponseEntity<T> response(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
