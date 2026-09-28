package com.smartcinema.movie;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.movie.dto.GenreResponse;

@Service
public class GenreService {
	private final GenreRepository genres;

	public GenreService(GenreRepository genres) {
		this.genres = genres;
	}

	@Transactional(readOnly = true)
	public List<GenreResponse> listOptions() {
		return genres.findOptions().stream()
				.map(genre -> new GenreResponse(genre.getId().toString(), genre.getName()))
				.toList();
	}
}
