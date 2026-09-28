package com.smartcinema.movie;

import java.util.List;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.smartcinema.movie.dto.GenreResponse;

@RestController
@RequestMapping("/api/v1/genres")
public class GenreController {
	private final GenreService genres;

	public GenreController(GenreService genres) {
		this.genres = genres;
	}

	@GetMapping
	public List<GenreResponse> list(@RequestParam MultiValueMap<String, String> parameters) {
		if (!parameters.isEmpty()) {
			throw new InvalidMovieRequestException(parameters.keySet().iterator().next(),
					"Genre options do not accept query parameters.");
		}
		return genres.listOptions();
	}
}
