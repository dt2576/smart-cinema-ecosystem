package com.smartcinema.movie;

import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.smartcinema.movie.dto.MovieDetail;
import com.smartcinema.movie.dto.MoviePage;

@RestController
@RequestMapping("/api/v1/movies")
public class MovieController {
	private final MovieService movies;

	public MovieController(MovieService movies) { this.movies = movies; }

	@GetMapping
	public MoviePage list(@RequestParam MultiValueMap<String, String> parameters) {
		return movies.list(MovieQuery.parse(parameters));
	}

	@GetMapping("/{id}")
	public MovieDetail detail(@PathVariable String id,
			@RequestParam MultiValueMap<String, String> parameters) {
		if (!parameters.isEmpty()) {
			throw new InvalidMovieRequestException(parameters.keySet().iterator().next(),
					"Detail does not accept query parameters.");
		}
		return movies.detail(MovieQuery.positiveId("id", id));
	}
}
