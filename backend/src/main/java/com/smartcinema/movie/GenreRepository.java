package com.smartcinema.movie;

import java.util.List;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

@Repository
public class GenreRepository {
	@PersistenceContext
	private EntityManager entityManager;

	public List<Genre> findOptions() {
		// Query the vocabulary directly: associations must never multiply options.
		return entityManager.createQuery("select g from Genre g order by lower(g.name), g.id", Genre.class)
				.getResultList();
	}

	public List<MovieGenre> findForMovies(List<Long> movieIds) {
		if (movieIds.isEmpty()) { return List.of(); }
		return entityManager.createQuery("""
				select mg from MovieGenre mg join fetch mg.genre g
				where mg.movie.id in :ids order by lower(g.name), g.id
				""", MovieGenre.class).setParameter("ids", movieIds).getResultList();
	}
}
