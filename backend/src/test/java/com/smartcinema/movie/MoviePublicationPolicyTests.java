package com.smartcinema.movie;

import static org.assertj.core.api.Assertions.*;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class MoviePublicationPolicyTests {
	private final MoviePublicationPolicy policy = new MoviePublicationPolicy();

	private Movie complete(String status) {
		Movie movie = new Movie();
		set(movie, "status", status);
		set(movie, "title", "Film");
		set(movie, "duration", 120);
		set(movie, "releaseDate", LocalDate.of(2099, 1, 1));
		set(movie, "ageRating", "Test rating");
		set(movie, "language", "Test language");
		set(movie, "posterUrl", "https://example.test/poster");
		return movie;
	}

	private void set(Movie movie, String field, Object value) {
		ReflectionTestUtils.setField(movie, field, value);
	}

	@Test
	void lifecycleMatrixAcceptsOnlyAdoptedTransitions() {
		for (MovieStatus from : MovieStatus.values()) {
			for (MovieStatus to : MovieStatus.values()) {
				boolean allowed = from == to || to == MovieStatus.PUBLISHED
						|| from == MovieStatus.PUBLISHED && to == MovieStatus.UNPUBLISHED;
				if (allowed) {
					assertThatCode(() -> policy.validateTransition(complete(from.name()), to)).doesNotThrowAnyException();
				} else {
					assertThatThrownBy(() -> policy.validateTransition(complete(from.name()), to))
							.isInstanceOf(InvalidMovieRequestException.class);
				}
			}
		}
		assertThatThrownBy(() -> policy.validateTransition(complete("UNKNOWN"), MovieStatus.PUBLISHED))
				.isInstanceOf(InvalidMovieRequestException.class);
		assertThatThrownBy(() -> policy.validateTransition(complete("DRAFT"), null))
				.isInstanceOf(InvalidMovieRequestException.class);
	}

	@Test
	void everyPublicationFieldIsRequiredIncludingForPublishedEditsAndRepublication() {
		for (String state : new String[] {"DRAFT", "UNPUBLISHED", "PUBLISHED"}) {
			for (String field : new String[] {"title", "duration", "releaseDate", "ageRating", "language", "posterUrl"}) {
				Movie movie = complete(state);
				set(movie, field, null);
				assertThatThrownBy(() -> policy.validateTransition(movie, MovieStatus.PUBLISHED))
						.isInstanceOf(InvalidMovieRequestException.class);
			}
		}
	}

	@Test
	void publicationRejectsInvalidValuesButDoesNotRequireOptionalFieldsOrPastRelease() {
		assertThatCode(() -> policy.validatePublication(complete("DRAFT"))).doesNotThrowAnyException();
		for (Object[] invalid : new Object[][] {
				{"title", " "}, {"title", "x".repeat(256)}, {"duration", 0}, {"duration", -1},
				{"releaseDate", LocalDate.MAX}, {"releaseDate", LocalDate.MIN},
				{"ageRating", "x".repeat(21)}, {"language", "x".repeat(101)},
				{"posterUrl", " "}, {"posterUrl", "x".repeat(2049)},
				{"description", " "}, {"trailerUrl", "x".repeat(2049)}}) {
			Movie movie = complete("DRAFT");
			set(movie, (String) invalid[0], invalid[1]);
			assertThatThrownBy(() -> policy.validatePublication(movie))
					.isInstanceOf(InvalidMovieRequestException.class);
		}
	}

	@Test
	void withdrawalDoesNotRequireCompletePublicationData() {
		Movie movie = complete("PUBLISHED");
		set(movie, "posterUrl", null);
		assertThatCode(() -> policy.validateTransition(movie, MovieStatus.UNPUBLISHED)).doesNotThrowAnyException();
	}
}
