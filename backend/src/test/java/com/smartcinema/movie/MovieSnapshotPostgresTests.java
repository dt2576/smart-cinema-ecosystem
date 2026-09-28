package com.smartcinema.movie;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;
import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "MOVIE_DB_TESTS", matches = "true")
class MovieSnapshotPostgresTests {
	@Autowired private MovieService service;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private DataSource dataSource;
	@MockitoSpyBean private MovieRepository movies;

	@Test
	void countAndItemsShareSnapshotDespiteConcurrentPublication() throws Exception {
		String title = "Snapshot " + UUID.randomUUID();
		String insert = """
				INSERT INTO movies(title,duration,release_date,age_rating,language,poster,status)
				VALUES (?,120,DATE '2026-01-01','Test rating','Test language','https://example.test/poster','PUBLISHED')
				""";
		jdbc.update(insert, title);
		try {
			doAnswer(invocation -> {
				long count = (long) invocation.callRealMethod();
				assertThat(jdbc.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("repeatable read");
				assertThat(jdbc.queryForObject("SHOW transaction_read_only", String.class)).isEqualTo("on");
				// An independent connection commits after count but before the page query.
				try (Connection writer = dataSource.getConnection();
						PreparedStatement statement = writer.prepareStatement(insert)) {
					writer.setAutoCommit(true);
					statement.setString(1, title);
					statement.executeUpdate();
				}
				return count;
			}).when(movies).countPublished(any(MovieQuery.class));
			var response = service.list(new MovieQuery(title, null, 0, 20, "id,asc"));
			assertThat(response.totalElements()).isEqualTo(1);
			assertThat(response.items()).hasSize(1);
			assertThat(jdbc.queryForObject("SELECT count(*) FROM movies WHERE title = ?", Long.class, title)).isEqualTo(2);
		} finally {
			doCallRealMethod().when(movies).countPublished(any(MovieQuery.class));
			jdbc.update("DELETE FROM movies WHERE title = ?", title);
		}
	}
}
