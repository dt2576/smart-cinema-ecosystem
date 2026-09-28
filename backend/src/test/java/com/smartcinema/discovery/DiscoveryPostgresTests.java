package com.smartcinema.discovery;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "DISCOVERY_DB_TESTS", matches = "true")
@Transactional(isolation = Isolation.REPEATABLE_READ)
class DiscoveryPostgresTests {
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DiscoveryRepository repository;
    @MockitoBean(name = "discoveryClock") private Clock clock;
    private static final Instant NOW = Instant.parse("2030-01-01T16:00:00Z");

    @BeforeEach
    void seed() {
        when(clock.instant()).thenReturn(NOW);
        jdbc.update("INSERT INTO movies(id,title,duration,status) VALUES (1,'Visible',60,'PUBLISHED'),(2,'Hidden',60,'DRAFT')");
        jdbc.update("""
                INSERT INTO cinemas(id,name,address,status) VALUES
                (1,'Main','Address','ACTIVE'),(2,'Closed','Address','TEMPORARILY_CLOSED'),
                (3,'Inactive','Address','INACTIVE'),(4,'No screening','Address','ACTIVE'),
                (9007199254740993,'Large ID','Address','ACTIVE')
                """);
        jdbc.update("""
                INSERT INTO halls(id,cinema_id,name,capacity,type,status) VALUES
                (1,1,'Hall 1',100,'Configured','ACTIVE'),(2,1,'Maintenance',100,'Configured','MAINTENANCE'),
                (3,1,'Inactive',100,'Configured','INACTIVE'),(4,2,'Closed branch',100,'Configured','ACTIVE'),
                (5,3,'Inactive branch',100,'Configured','ACTIVE'),
                (9007199254740993,9007199254740993,'Large hall',100,'Configured','ACTIVE')
                """);
        screening(11, 1, 1, "2030-01-01T16:30:00Z", "OPEN_FOR_BOOKING");
        screening(12, 1, 1, "2030-01-01T18:00:00Z", "OPEN_FOR_BOOKING");
        screening(13, 1, 1, "2030-01-02T17:00:00Z", "OPEN_FOR_BOOKING");
        screening(9007199254740993L, 1, 9007199254740993L, "2030-01-01T16:30:00Z", "OPEN_FOR_BOOKING");
    }

    private void screening(long id, long movieId, long hallId, String startsAt, String status) {
        OffsetDateTime start = OffsetDateTime.parse(startsAt);
        jdbc.update("""
                INSERT INTO showtimes(id,movie_id,hall_id,start_time,end_time,occupied_until,base_price,status,booking_cut_off)
                VALUES (?,?,?,?,?,?,90000,?,?)
                """, id, movieId, hallId, start, start.plusHours(1), start.plusHours(1), status, start);
    }

    @Test
    void cinemaOptionsAreActiveDistinctMovieFilteredAndPublic() throws Exception {
        mvc.perform(get("/api/v1/cinemas")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(get("/api/v1/cinemas").param("movieId", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("1")).andExpect(jsonPath("$[1].id").value("9007199254740993"));
        mvc.perform(get("/api/v1/cinemas/4")).andExpect(status().isOk());
        for (String id : new String[] {"2", "3", "999"}) {
            mvc.perform(get("/api/v1/cinemas/" + id)).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.detail").value("Cinema is unavailable."));
        }
        for (String id : new String[] {"2", "999"}) {
            mvc.perform(get("/api/v1/cinemas").param("movieId", id)).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.detail").value("Movie is unavailable."));
        }
        assertThat(repository.cinemas(1L, NOW)).hasSize(2);
    }

    @Test
    void localDatesDayBoundaryAndHallProjectionDoNotDependOnDatabaseZone() throws Exception {
        jdbc.execute("SET LOCAL TIME ZONE 'America/Los_Angeles'");
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.date").value("2030-01-01"))
                .andExpect(jsonPath("$.timeZone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.serverTime").value(NOW.toString()))
                .andExpect(jsonPath("$.dates[0]").value("2030-01-01"))
                .andExpect(jsonPath("$.dates[1]").value("2030-01-02"))
                .andExpect(jsonPath("$.dates[2]").value("2030-01-03"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value("11"))
                .andExpect(jsonPath("$.items[0].hall.name").value("Hall 1"))
                .andExpect(jsonPath("$.items[0].startsAt").value("2030-01-01T16:30:00Z"))
                .andExpect(jsonPath("$.items[0].basePrice").doesNotExist())
                .andExpect(jsonPath("$.items[0].hasAvailableSeats").doesNotExist())
                .andExpect(jsonPath("$.items[0].hall.capacity").doesNotExist());
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "1").param("date", "2030-01-03"))
                .andExpect(jsonPath("$.items[0].id").value("13"));
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "4"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dates.length()").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "1").param("date", "2029-12-31"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void exactStartAndEarlierCutoffAreExclusiveWithoutLifecycleWorker() throws Exception {
        when(clock.instant()).thenReturn(Instant.parse("2030-01-01T16:30:00Z"));
        mvc.perform(get("/api/v1/showtimes/11")).andExpect(status().isNotFound());
        jdbc.update("UPDATE showtimes SET booking_cut_off='2030-01-01T16:00:00Z' WHERE id=12");
        when(clock.instant()).thenReturn(NOW);
        mvc.perform(get("/api/v1/showtimes/12")).andExpect(status().isNotFound());
        assertThat(repository.dates(1, 1, NOW, "Asia/Ho_Chi_Minh"))
                .containsExactly(LocalDate.of(2030, 1, 1), LocalDate.of(2030, 1, 3));
        when(clock.instant()).thenReturn(Instant.parse("2030-01-02T18:00:00Z"));
        mvc.perform(get("/api/v1/cinemas").param("movieId", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void everyNonEligibleStateIsHiddenEvenForAdmin() throws Exception {
        for (String state : new String[] {"DRAFT", "SCHEDULED", "STARTED", "ENDED", "CANCELLED"}) {
            jdbc.update("UPDATE showtimes SET status=? WHERE id=11", state);
            mvc.perform(get("/api/v1/showtimes/11").with(jwt().authorities(() -> "ROLE_ADMIN")))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("Showtime is unavailable."));
        }
        jdbc.update("UPDATE showtimes SET status='OPEN_FOR_BOOKING' WHERE id=11");
        for (int hall : new int[] {2, 3, 4, 5}) {
            jdbc.update("UPDATE showtimes SET hall_id=? WHERE id=11", hall);
            mvc.perform(get("/api/v1/showtimes/11")).andExpect(status().isNotFound());
        }
        jdbc.update("UPDATE showtimes SET hall_id=1,movie_id=2 WHERE id=11");
        mvc.perform(get("/api/v1/showtimes/11")).andExpect(status().isNotFound());
        jdbc.update("UPDATE movies SET status='UNPUBLISHED' WHERE id=2");
        mvc.perform(get("/api/v1/showtimes/11")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/showtimes/999")).andExpect(status().isNotFound());
    }

    @Test
    void sameStartSortIsStableAndAllIdsAreStrings() throws Exception {
        jdbc.update("INSERT INTO halls(id,cinema_id,name,capacity,type,status) VALUES (6,1,'Hall 2',100,'Configured','ACTIVE')");
        screening(10, 1, 6, "2030-01-01T16:30:00Z", "OPEN_FOR_BOOKING");
        mvc.perform(get("/api/v1/showtimes").param("movieId", "1").param("cinemaId", "1"))
                .andExpect(jsonPath("$.items[0].id").value("10")).andExpect(jsonPath("$.items[1].id").value("11"));
        mvc.perform(get("/api/v1/showtimes/9007199254740993"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("9007199254740993"))
                .andExpect(jsonPath("$.cinemaId").value("9007199254740993"))
                .andExpect(jsonPath("$.hall.id").value("9007199254740993"))
                .andExpect(jsonPath("$.movieId").value("1"));
    }

    @Test
    void readPermissionDoesNotOpenWritesOrHallAdministration() throws Exception {
        mvc.perform(get("/api/v1/cinemas").with(jwt().authorities(() -> "ROLE_CUSTOMER"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/cinemas").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
        for (String path : new String[] {"/api/v1/cinemas", "/api/v1/showtimes"}) {
            mvc.perform(post(path).with(csrf())).andExpect(status().isUnauthorized());
            mvc.perform(post(path).with(csrf()).with(jwt().authorities(() -> "ROLE_ADMIN")))
                    .andExpect(status().isMethodNotAllowed());
        }
        mvc.perform(get("/api/v1/halls")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/showtimes/11/administration")).andExpect(status().isUnauthorized());
    }
}
