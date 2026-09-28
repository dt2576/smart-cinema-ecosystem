package com.smartcinema.movie;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Run against a disposable PostgreSQL database with MOVIE_DB_TESTS=true and DB_URL set.
 * Flyway applies V1-V3; each test's fixtures roll back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "MOVIE_DB_TESTS", matches = "true")
@Transactional(isolation = Isolation.REPEATABLE_READ)
class MovieCatalogPostgresTests {
	@Autowired private MockMvc mvc;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private MovieRepository movies;

	@BeforeEach
	void fixtures() {
		insert(1L, "alpha", "PUBLISHED", LocalDate.of(2025, 1, 1));
		insert(2L, "ALPHA", "PUBLISHED", LocalDate.of(2025, 1, 1));
		insert(3L, "Beta", "PUBLISHED", LocalDate.of(2099, 1, 1));
		insert(4L, "Literal 100%_!\\ end", "PUBLISHED", null);
		insert(5L, "Hidden draft", "DRAFT", null);
		insert(6L, "Hidden withdrawn", "UNPUBLISHED", null);
		insert(7L, "Hidden unknown", "UNKNOWN", null);
		insert(9007199254740993L, "Unicode café", "PUBLISHED", LocalDate.of(2026, 1, 1));
		jdbc.update("INSERT INTO genres(id,name) VALUES (11,'zeta'),(12,'Action'),(13,'action')");
		jdbc.update("INSERT INTO movie_genres(movie_id,genre_id) VALUES (1,11),(1,12),(1,13),(2,12),(5,12)");
	}

	private void insert(long id, String title, String status, LocalDate date) {
		jdbc.update("""
				INSERT INTO movies(id,title,duration,release_date,age_rating,language,poster,status)
				VALUES (?,?,120,?,'Test rating','Test language','https://example.test/poster',?)
				""", id, title, date, status);
	}

	@Test
	void anonymousListIsPublishedOnlyStableAndDoesNotDuplicateMovieRows() throws Exception {
		mvc.perform(get("/api/v1/movies"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(5))
				.andExpect(jsonPath("$.totalPages").value(1))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.sort").value("title,asc"))
				.andExpect(jsonPath("$.items.length()").value(5))
				.andExpect(jsonPath("$.items[0].id").value("1"))
				.andExpect(jsonPath("$.items[1].id").value("2"))
				.andExpect(jsonPath("$.items[0].genres[0].id").value("12"))
				.andExpect(jsonPath("$.items[0].genres[1].id").value("13"))
				.andExpect(jsonPath("$.items[0].genres[2].id").value("11"))
				.andExpect(jsonPath("$.items[0].posterUrl").value("https://example.test/poster"))
				.andExpect(jsonPath("$.items[0].description").doesNotExist());
	}

	@Test
	void detailPreservesStringIdsOptionalNullsAndEmptyGenres() throws Exception {
		mvc.perform(get("/api/v1/movies/9007199254740993"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("9007199254740993"))
				.andExpect(jsonPath("$.genres.length()").value(0))
				.andExpect(jsonPath("$.releaseDate").value("2026-01-01"))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("\"description\":null")))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("\"trailerUrl\":null")));
	}

	@Test
	void hiddenAndMissingDetailAreIndistinguishableEvenForAdmin() throws Exception {
		for (long id : new long[] {5, 6, 7, 999}) {
			mvc.perform(get("/api/v1/movies/" + id))
					.andExpect(status().isNotFound())
					.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
					.andExpect(jsonPath("$.detail").value("Movie is unavailable."));
			mvc.perform(get("/api/v1/movies/" + id).with(jwt().authorities(() -> "ROLE_ADMIN")))
					.andExpect(status().isNotFound())
					.andExpect(jsonPath("$.detail").value("Movie is unavailable."));
		}
	}

	@Test
	void titleSearchAndGenreFilterCombineAndReturnAllGenres() throws Exception {
		mvc.perform(get("/api/v1/movies").param("q", "  AlPhA ").param("genreId", "11"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.items[0].id").value("1"))
				.andExpect(jsonPath("$.items[0].genres.length()").value(3));
		mvc.perform(get("/api/v1/movies").param("genreId", "12"))
				.andExpect(jsonPath("$.totalElements").value(2));
		mvc.perform(get("/api/v1/movies").param("genreId", "999"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0))
				.andExpect(jsonPath("$.totalPages").value(0)).andExpect(jsonPath("$.items.length()").value(0));
	}

	@Test
	void searchTreatsWildcardEscapeAndBackslashLiterallyAndDoesNotSearchDescription() throws Exception {
		for (String literal : new String[] {"%", "_", "!", "\\", "100%_!\\", "café"}) {
			mvc.perform(get("/api/v1/movies").param("q", literal))
					.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
		}
		mvc.perform(get("/api/v1/movies").param("q", "cafe")).andExpect(jsonPath("$.totalElements").value(0));
		jdbc.update("UPDATE movies SET description='description needle' WHERE id=1");
		mvc.perform(get("/api/v1/movies").param("q", "needle")).andExpect(jsonPath("$.totalElements").value(0));
		mvc.perform(get("/api/v1/movies").param("q", "  ")).andExpect(jsonPath("$.totalElements").value(5));
	}

	@Test
	void paginationAllSortDirectionsAndNullsLast() throws Exception {
		String[][] expected = {
				{"title,asc", "1", "9007199254740993"}, {"title,desc", "9007199254740993", "2"},
				{"releaseDate,asc", "1", "4"}, {"releaseDate,desc", "3", "4"},
				{"id,asc", "1", "9007199254740993"}, {"id,desc", "9007199254740993", "1"}};
		for (String[] order : expected) {
			mvc.perform(get("/api/v1/movies").param("sort", order[0]))
					.andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(order[1]))
					.andExpect(jsonPath("$.items[4].id").value(order[2]));
		}
		mvc.perform(get("/api/v1/movies").param("size", "2").param("page", "1"))
				.andExpect(jsonPath("$.totalElements").value(5)).andExpect(jsonPath("$.totalPages").value(3))
				.andExpect(jsonPath("$.items.length()").value(2)).andExpect(jsonPath("$.items[0].id").value("3"));
		mvc.perform(get("/api/v1/movies").param("size", "100").param("page", "2147483647"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0))
				.andExpect(jsonPath("$.totalElements").value(5));
		assertThat(movies.findPublished(new MovieQuery(null, null, Integer.MAX_VALUE, 100, "id,asc"))).isEmpty();
	}

	@Test
	void badParametersUseProblemDetailAndDoNotExposeQueries() throws Exception {
		for (String[] invalid : new String[][] {
				{"size","101"}, {"page","-1"}, {"genreId","0"}, {"sort","title;drop table movies,asc"},
				{"status","DRAFT"}, {"cinemaId","1"}, {"q","x".repeat(256)}}) {
			mvc.perform(get("/api/v1/movies").param(invalid[0],invalid[1]))
					.andExpect(status().isBadRequest())
					.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
					.andExpect(jsonPath("$.errors." + invalid[0]).exists());
		}
		mvc.perform(get("/api/v1/movies").param("genreId","11","12")).andExpect(status().isBadRequest());
		for (String id : new String[] {"0","-1","abc","9223372036854775808"}) {
			mvc.perform(get("/api/v1/movies/" + id)).andExpect(status().isBadRequest());
		}
		mvc.perform(get("/api/v1/movies/1").param("status","DRAFT")).andExpect(status().isBadRequest());
	}

	@Test
	void publicAccessDoesNotGrantWriteOrPreviewRoutes() throws Exception {
		mvc.perform(get("/api/v1/movies").with(jwt().authorities(() -> "ROLE_CUSTOMER")))
				.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(5));
		mvc.perform(post("/api/v1/movies").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden());
		mvc.perform(get("/api/v1/movies/1/preview")).andExpect(status().isUnauthorized());
	}
}
