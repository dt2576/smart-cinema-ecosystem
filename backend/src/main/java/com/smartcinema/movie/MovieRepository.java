package com.smartcinema.movie;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

@Repository
public class MovieRepository {
	@PersistenceContext
	private EntityManager entityManager;

	public long countPublished(MovieQuery filter) {
		Query query = entityManager.createNativeQuery("SELECT count(*) FROM movies m" + where(filter));
		bind(query, filter);
		return ((Number) query.getSingleResult()).longValue();
	}

	@SuppressWarnings("unchecked")
	public List<Movie> findPublished(MovieQuery filter) {
		Query query = entityManager.createNativeQuery("SELECT m.* FROM movies m" + where(filter)
				+ " ORDER BY " + order(filter.sort()) + " LIMIT :limit OFFSET :offset", Movie.class);
		bind(query, filter);
		query.setParameter("limit", filter.size());
		query.setParameter("offset", filter.offset());
		return query.getResultList();
	}

	public Optional<Movie> findPublishedById(long id) {
		return entityManager.createQuery(
				"select m from Movie m where m.id = :id and m.status = :status", Movie.class)
				.setParameter("id", id).setParameter("status", MovieStatus.PUBLISHED.name())
				.getResultStream().findFirst();
	}

	private String where(MovieQuery filter) {
		String sql = " WHERE m.status = :status";
		if (filter.q() != null) {
			sql += " AND lower(m.title) LIKE lower(:pattern) ESCAPE '!'";
		}
		if (filter.genreId() != null) {
			sql += " AND EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = :genreId)";
		}
		return sql;
	}

	private void bind(Query query, MovieQuery filter) {
		query.setParameter("status", MovieStatus.PUBLISHED.name());
		if (filter.q() != null) {
			query.setParameter("pattern", "%" + filter.q().replace("!", "!!")
					.replace("%", "!%").replace("_", "!_") + "%");
		}
		if (filter.genreId() != null) { query.setParameter("genreId", filter.genreId()); }
	}

	private String order(String sort) {
		// Only constant SQL fragments are used, never caller-supplied identifiers.
		return switch (sort) {
			case "title,asc" -> "lower(m.title) ASC, m.id ASC";
			case "title,desc" -> "lower(m.title) DESC, m.id ASC";
			case "releaseDate,asc" -> "m.release_date ASC NULLS LAST, m.id ASC";
			case "releaseDate,desc" -> "m.release_date DESC NULLS LAST, m.id ASC";
			case "id,asc" -> "m.id ASC";
			case "id,desc" -> "m.id DESC";
			default -> throw new InvalidMovieRequestException("sort", "Unsupported sort.");
		};
	}
}
