package com.smartcinema.movie;

import java.time.LocalDate;
import org.springframework.stereotype.Service;

/**
 * Shared publication validation. Admin writers validate the locked persisted
 * state and content inside the same transaction; public reads remain separate.
 */
@Service
public class MoviePublicationPolicy {
	public void validateTransition(Movie movie, MovieStatus target) {
		MovieStatus current;
		try {
			current = MovieStatus.valueOf(movie.getStatus());
		} catch (IllegalArgumentException | NullPointerException exception) {
			throw new InvalidMovieRequestException("status", "Unknown Movie status.");
		}
		if (target == null || !(current == target
				|| current == MovieStatus.DRAFT && target == MovieStatus.PUBLISHED
				|| current == MovieStatus.PUBLISHED && target == MovieStatus.UNPUBLISHED
				|| current == MovieStatus.UNPUBLISHED && target == MovieStatus.PUBLISHED)) {
			throw new InvalidMovieRequestException("status", "Movie status transition is not allowed.");
		}
		if (target == MovieStatus.PUBLISHED) { validatePublication(movie); }
	}

	public void validatePublication(Movie movie) {
		requiredText("title", movie.getTitle(), 255);
		if (movie.getDuration() == null || movie.getDuration() <= 0) {
			throw new InvalidMovieRequestException("duration", "A positive duration is required.");
		}
		if (movie.getReleaseDate() == null || movie.getReleaseDate().equals(LocalDate.MIN)
				|| movie.getReleaseDate().equals(LocalDate.MAX)) {
			throw new InvalidMovieRequestException("releaseDate", "A finite release date is required.");
		}
		requiredText("ageRating", movie.getAgeRating(), 20);
		requiredText("language", movie.getLanguage(), 100);
		requiredText("posterUrl", movie.getPosterUrl(), 2048);
		if (movie.getDescription() != null) { requiredText("description", movie.getDescription(), Integer.MAX_VALUE); }
		if (movie.getTrailerUrl() != null) { requiredText("trailerUrl", movie.getTrailerUrl(), 2048); }
	}

	private void requiredText(String field, String value, int maximum) {
		if (value == null || value.isBlank() || value.codePointCount(0, value.length()) > maximum) {
			throw new InvalidMovieRequestException(field, "A nonblank value of at most " + maximum + " characters is required.");
		}
	}
}
