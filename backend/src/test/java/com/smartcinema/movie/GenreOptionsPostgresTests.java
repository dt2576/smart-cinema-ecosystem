package com.smartcinema.movie;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Uses the existing opt-in Movie PostgreSQL suite and a disposable database; fixtures roll back. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "MOVIE_DB_TESTS", matches = "true")
@Transactional
class GenreOptionsPostgresTests {
	@Autowired private MockMvc mvc;
	@Autowired private JdbcTemplate jdbc;

	@Test
	void emptyVocabularyIsPublicAndReturnsEmptyArray() throws Exception {
		mvc.perform(get("/api/v1/genres")).andExpect(status().isOk()).andExpect(content().json("[]"));
	}

	@Test
	void vocabularyHasOneOptionPerIdRegardlessOfMovieLinksAndPreservesDuplicateNames() throws Exception {
		jdbc.update("""
				INSERT INTO genres(id,name) VALUES
				(23,'zeta'),(13,'action'),(12,'Action'),(11,'Action'),(9007199254740993,'Drama')
				""");
		jdbc.update("""
				INSERT INTO movies(id,title,duration,status) VALUES
				(101,'Published one',120,'PUBLISHED'),(102,'Published two',120,'PUBLISHED'),
				(103,'Draft',120,'DRAFT'),(104,'Withdrawn',120,'UNPUBLISHED')
				""");
		jdbc.update("""
				INSERT INTO movie_genres(movie_id,genre_id) VALUES
				(101,11),(102,11),(103,11),(103,12),(104,13)
				""");
		String expected = """
				[{"id":"11","name":"Action"},{"id":"12","name":"Action"},
				{"id":"13","name":"action"},{"id":"9007199254740993","name":"Drama"},
				{"id":"23","name":"zeta"}]
				""";
		String first = mvc.perform(get("/api/v1/genres")).andExpect(status().isOk())
				.andExpect(content().json(expected)).andExpect(jsonPath("$[0].id").value("11"))
				.andExpect(jsonPath("$[1].id").value("12")).andExpect(jsonPath("$[2].id").value("13"))
				.andExpect(jsonPath("$[3].id").value("9007199254740993"))
				.andExpect(jsonPath("$[4].id").value("23"))
				.andReturn().getResponse().getContentAsString();
		mvc.perform(get("/api/v1/genres").with(jwt().authorities(() -> "ROLE_CUSTOMER")))
				.andExpect(status().isOk()).andExpect(content().string(first));
		mvc.perform(get("/api/v1/movies").param("genreId", "11"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
		mvc.perform(get("/api/v1/movies").param("genreId", "12"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void queryValidationAndSecurityDoNotExposeGenreAdminRoutes() throws Exception {
		mvc.perform(get("/api/v1/genres").param("page", "0"))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.page").exists());
		mvc.perform(post("/api/v1/genres").with(csrf())).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/v1/genres").with(csrf()).with(jwt().authorities(() -> "ROLE_ADMIN")))
				.andExpect(status().isMethodNotAllowed());
		mvc.perform(get("/api/v1/genres/11")).andExpect(status().isUnauthorized());
	}
}
