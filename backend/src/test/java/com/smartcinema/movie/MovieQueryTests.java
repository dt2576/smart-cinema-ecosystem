package com.smartcinema.movie;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.util.LinkedMultiValueMap;

class MovieQueryTests {
	@Test
	void defaultsAndLongOffset() {
		var parameters = new LinkedMultiValueMap<String, String>();
		assertThat(MovieQuery.parse(parameters)).isEqualTo(new MovieQuery(null, null, 0, 20, "title,asc"));
		parameters.add("page", "2147483647");
		parameters.add("size", "100");
		assertThat(MovieQuery.parse(parameters).offset()).isEqualTo(214748364700L);
	}

	@ParameterizedTest
	@CsvSource({"page,-1", "page,2147483648", "page,1.5", "size,0", "size,101",
			"genreId,0", "genreId,9223372036854775808", "sort,title", "status,PUBLISHED",
			"cinemaId,1", "size,+1"})
	void invalidParameters(String key, String value) {
		var parameters = new LinkedMultiValueMap<String, String>();
		parameters.add(key, value);
		assertThatThrownBy(() -> MovieQuery.parse(parameters)).isInstanceOf(InvalidMovieRequestException.class);
	}

	@Test
	void repeatsEmptyValuesAndCaseSensitiveSortAreRejected() {
		for (String key : new String[] {"page", "size", "genreId", "sort"}) {
			var parameters = new LinkedMultiValueMap<String, String>();
			parameters.add(key, "");
			assertThatThrownBy(() -> MovieQuery.parse(parameters)).isInstanceOf(InvalidMovieRequestException.class);
		}
		var parameters = new LinkedMultiValueMap<String, String>();
		parameters.add("q", "one");
		parameters.add("q", "two");
		assertThatThrownBy(() -> MovieQuery.parse(parameters)).isInstanceOf(InvalidMovieRequestException.class);
		parameters.clear();
		parameters.add("sort", "title,ASC");
		assertThatThrownBy(() -> MovieQuery.parse(parameters)).isInstanceOf(InvalidMovieRequestException.class);
	}

	@Test
	void trimsSearchAndCountsUnicodeCodePoints() {
		var parameters = new LinkedMultiValueMap<String, String>();
		parameters.add("q", "  \u2003 ");
		assertThat(MovieQuery.parse(parameters).q()).isNull();
		parameters.set("q", "  Star  Wars ");
		assertThat(MovieQuery.parse(parameters).q()).isEqualTo("Star  Wars");
		parameters.set("q", "🎬".repeat(255));
		assertThat(MovieQuery.parse(parameters).q()).hasSize(510);
		parameters.set("q", "🎬".repeat(256));
		assertThatThrownBy(() -> MovieQuery.parse(parameters)).isInstanceOf(InvalidMovieRequestException.class);
	}
}
