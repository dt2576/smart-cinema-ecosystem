package com.smartcinema.discovery;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.smartcinema.discovery.dto.CinemaResponse;

class DiscoveryControllerTests {
    private final DiscoveryService service = mock(DiscoveryService.class);
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new DiscoveryController(service))
                .setControllerAdvice(new DiscoveryExceptionHandler()).build();
    }

    @Test
    void stringIdsNullFieldsAndNoStoreAreExplicit() throws Exception {
        when(service.cinemas(Long.MAX_VALUE)).thenReturn(List.of(
                new CinemaResponse("9007199254740993", "Cinema", "Address", null, null)));
        mvc.perform(get("/api/v1/cinemas").param("movieId", Long.toString(Long.MAX_VALUE)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("""
                        [{"id":"9007199254740993","name":"Cinema","address":"Address","contact":null,"operatingInformation":null}]
                        """));
    }

    @Test
    void invalidFiltersAndIdsFailBeforeServices() throws Exception {
        for (String id : new String[] {"0", "-1", "abc", "1.0", " 1", "9223372036854775808"}) {
            mvc.perform(get("/api/v1/cinemas/" + id)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.cinemaId").exists());
            mvc.perform(get("/api/v1/showtimes/" + id)).andExpect(status().isBadRequest());
        }
        for (String date : new String[] {"", "2030-02-30", "2030-2-01", "0000-01-01", "2030-01-01T00:00:00Z"}) {
            mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "2").param("date", date))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.date").exists());
        }
        mvc.perform(get("/api/v1/showtimes")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/cinemas").param("movieId", "1", "2")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/cinemas").param("status", "INACTIVE")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/showtimes/1").param("date", "2030-01-01")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void unavailableAndDatabaseFailureAreSafeProblemDetails() throws Exception {
        when(service.cinema(1)).thenThrow(new DiscoveryUnavailableException("Cinema"));
        mvc.perform(get("/api/v1/cinemas/1")).andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Cinema is unavailable."));
        when(service.cinemas(null)).thenThrow(new DataAccessResourceFailureException("secret SQL"));
        mvc.perform(get("/api/v1/cinemas")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value("Discovery is temporarily unavailable. Please try again."));
    }
}
