package com.smartcinema.movie;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.movie.dto.GenreResponse;
import com.smartcinema.movie.dto.MovieDetail;
import com.smartcinema.movie.dto.MoviePage;
import com.smartcinema.movie.dto.MovieSummary;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class MovieService {
	private final MovieRepository movies;
	private final GenreRepository genres;

	public MovieService(MovieRepository movies, GenreRepository genres) {
		this.movies = movies;
		this.genres = genres;
	}

	public MoviePage list(MovieQuery query) {
		long total = movies.countPublished(query);
		List<Movie> page = query.offset() >= total ? List.of() : movies.findPublished(query);
		Map<Long, List<GenreResponse>> associations = loadGenres(page);
		List<MovieSummary> items = page.stream().map(movie -> new MovieSummary(
				movie.getId().toString(), movie.getTitle(), movie.getDuration(), movie.getReleaseDate(),
				movie.getAgeRating(), movie.getLanguage(), movie.getPosterUrl(), movie.getStatus(),
				associations.getOrDefault(movie.getId(), List.of()))).toList();
		long totalPages = total / query.size() + (total % query.size() == 0 ? 0 : 1);
		return new MoviePage(items, query.page(), query.size(), total, totalPages, query.sort());
	}

	public MovieDetail detail(long id) {
		Movie movie = movies.findPublishedById(id).orElseThrow(MovieNotFoundException::new);
		List<GenreResponse> movieGenres = loadGenres(List.of(movie)).getOrDefault(id, List.of());
		return new MovieDetail(movie.getId().toString(), movie.getTitle(), movie.getDuration(),
				movie.getReleaseDate(), movie.getAgeRating(), movie.getLanguage(), movie.getPosterUrl(),
				movie.getStatus(), movieGenres, movie.getDescription(), movie.getTrailerUrl());
	}

	private Map<Long, List<GenreResponse>> loadGenres(List<Movie> page) {
		Map<Long, List<GenreResponse>> result = new HashMap<>();
		for (MovieGenre link : genres.findForMovies(page.stream().map(Movie::getId).toList())) {
			Genre genre = link.getGenre();
			result.computeIfAbsent(link.getMovie().getId(), ignored -> new ArrayList<>())
					.add(new GenreResponse(genre.getId().toString(), genre.getName()));
		}
		return result;
	}
}
