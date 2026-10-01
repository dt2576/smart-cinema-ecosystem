package com.smartcinema.admin;

import java.util.List;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import com.smartcinema.movie.*;

@Repository
public class AdminMovieRepository {
    @PersistenceContext private EntityManager em;

    public Movie lock(long id) {
        Movie movie = em.find(Movie.class,id,LockModeType.PESSIMISTIC_WRITE);
        if (movie == null) { throw new MovieNotFoundException(); }
        return movie;
    }
    public Movie find(long id) {
        Movie movie = em.find(Movie.class,id);
        if (movie == null) { throw new MovieNotFoundException(); }
        return movie;
    }
    public void create(Movie movie) { em.persist(movie); }
    public void flush() { em.flush(); }

    public void replaceGenres(long movieId, List<Long> genreIds) {
        for (long genreId : genreIds) {
            if (em.find(Genre.class,genreId,LockModeType.PESSIMISTIC_READ) == null) {
                throw new InvalidMovieRequestException("genreIds","Every selected Genre must exist.");
            }
        }
        em.flush();
        em.createNativeQuery("DELETE FROM movie_genres WHERE movie_id=:id").setParameter("id",movieId).executeUpdate();
        for (long genreId : genreIds) {
            em.createNativeQuery("INSERT INTO movie_genres(movie_id,genre_id) VALUES (:movie,:genre)")
                    .setParameter("movie",movieId).setParameter("genre",genreId).executeUpdate();
        }
    }

    public long count(MovieQuery filter) {
        Query query = em.createNativeQuery("SELECT count(*) FROM movies m" + where(filter));
        bind(query,filter);
        return ((Number)query.getSingleResult()).longValue();
    }
    @SuppressWarnings("unchecked")
    public List<Movie> list(MovieQuery filter) {
        Query query = em.createNativeQuery("SELECT m.* FROM movies m" + where(filter) + " ORDER BY " + order(filter.sort())
                + " LIMIT :limit OFFSET :offset",Movie.class);
        bind(query,filter);
        return query.setParameter("limit",filter.size()).setParameter("offset",filter.offset()).getResultList();
    }
    private String where(MovieQuery filter) {
        String sql = " WHERE 1=1";
        if (filter.q()!=null) { sql += " AND lower(m.title) LIKE lower(:pattern) ESCAPE '!'"; }
        if (filter.genreId()!=null) { sql += " AND EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id=m.id AND mg.genre_id=:genre)"; }
        return sql;
    }
    private void bind(Query query,MovieQuery filter) {
        if (filter.q()!=null) { query.setParameter("pattern","%"+filter.q().replace("!","!!").replace("%","!%").replace("_","!_")+"%"); }
        if (filter.genreId()!=null) { query.setParameter("genre",filter.genreId()); }
    }
    private String order(String sort) {
        return switch(sort) {
            case "title,asc" -> "lower(m.title) ASC,m.id ASC";
            case "title,desc" -> "lower(m.title) DESC,m.id ASC";
            case "releaseDate,asc" -> "m.release_date ASC NULLS LAST,m.id ASC";
            case "releaseDate,desc" -> "m.release_date DESC NULLS LAST,m.id ASC";
            case "id,asc" -> "m.id ASC";
            case "id,desc" -> "m.id DESC";
            default -> throw new InvalidMovieRequestException("sort","Unsupported sort.");
        };
    }
}
