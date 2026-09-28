package com.smartcinema.seat;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SeatControllerTests {
    @Test
    void identifiersAreStringsAndDuplicateNormalizedIdsCannotBypassValidation() {
        assertThat(SeatRequest.seats(Map.of("seatIds",List.of("9223372036854775807","9007199254740993"))))
                .containsExactly(9007199254740993L,Long.MAX_VALUE);
        for(var body:List.of(Map.of("seatIds",List.of("1","01")),Map.of("seatIds",List.of(1)),
                Map.of("seatIds",List.of()),Map.of("seatIds",List.of("9223372036854775808")),
                Map.of("seatIds",List.of("1"),"expiresAt","2099-01-01"))) {
            assertThatThrownBy(() -> SeatRequest.seats(body)).isInstanceOf(SeatRequestException.class);
        }
    }

    @Test
    void badPublicReadIsRejectedBeforeRepositoryAndFailureUsesProblemDetail() throws Exception {
        var service=mock(SeatService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new SeatController(service)).setControllerAdvice(new SeatExceptionHandler()).build();
        mvc.perform(get("/api/v1/showtimes/no/seats")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.showtimeId").exists());
        mvc.perform(get("/api/v1/showtimes/1/seats").param("userId","2")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
        when(service.map(1)).thenThrow(new DataAccessResourceFailureException("secret SQL"));
        mvc.perform(get("/api/v1/showtimes/1/seats")).andExpect(status().isServiceUnavailable())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Seat data is temporarily unavailable. Please try again."));
    }

    @Test
    void databaseConflictsHaveSafeStableResponses() {
        var handler=new SeatExceptionHandler();
        for(String state:List.of("P0003","23505","55P03","40P01","40001","57014")) {
            var response=handler.database(new UncategorizedSQLException("task","secret SQL",new SQLException("secret owner",state)));
            assertThat(response.getStatus()).isEqualTo(409);
            assertThat(response.getDetail()).doesNotContain("secret");
        }
    }

    @Test
    void operationalTimeoutsAndTtlCannotBeDisabledOrNegative() {
        for(Duration invalid:List.of(Duration.ZERO,Duration.ofMillis(-1),Duration.ofNanos(1))) {
            assertThatThrownBy(() -> new SeatHoldSettings(invalid,Duration.ofSeconds(1),Duration.ofSeconds(2),Duration.ofSeconds(3)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> new SeatHoldSettings(Duration.ofMinutes(10),Duration.ofSeconds(3),Duration.ofSeconds(2),Duration.ofSeconds(3)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
