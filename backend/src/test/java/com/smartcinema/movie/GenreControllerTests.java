package com.smartcinema.movie;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.smartcinema.movie.dto.GenreResponse;

@ExtendWith(MockitoExtension.class)
class GenreControllerTests {
	@Mock private GenreService service;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new GenreController(service))
				.setControllerAdvice(new GenreExceptionHandler()).build();
	}

	@Test
	void returnsPlainArrayWithStringIdsAndEmptyArrayWhenNoOptions() throws Exception {
		when(service.listOptions()).thenReturn(List.of(new GenreResponse("9007199254740993", "Drama")), List.of());
		mvc.perform(get("/api/v1/genres")).andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(content().json("[{\"id\":\"9007199254740993\",\"name\":\"Drama\"}]"));
		mvc.perform(get("/api/v1/genres")).andExpect(status().isOk()).andExpect(content().json("[]"));
	}

	@Test
	void rejectsUnsupportedAndRepeatedQueryParameters() throws Exception {
		for (String key : new String[] {"page", "size", "sort", "q", "status", "genreId"}) {
			mvc.perform(get("/api/v1/genres").param(key, "", "1"))
					.andExpect(status().isBadRequest())
					.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
					.andExpect(jsonPath("$.errors." + key).exists());
		}
		verifyNoInteractions(service);
	}

	@Test
	void databaseFailureUsesSafeProblemDetailInsteadOfEmptyOptions() throws Exception {
		when(service.listOptions()).thenThrow(new DataAccessResourceFailureException("secret SQL connection detail"));
		mvc.perform(get("/api/v1/genres")).andExpect(status().isServiceUnavailable())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("Genre options unavailable"))
				.andExpect(jsonPath("$.detail").value("Genre options are temporarily unavailable. Please try again."));
	}
}
