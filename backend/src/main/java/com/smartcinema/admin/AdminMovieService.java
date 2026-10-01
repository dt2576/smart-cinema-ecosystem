package com.smartcinema.admin;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.movie.*;
import com.smartcinema.movie.dto.*;

@Service
public class AdminMovieService {
    private static final Logger AUDIT = LoggerFactory.getLogger(AdminMovieService.class);
    private final AdminAccessService access;
    private final AdminMovieRepository movies;
    private final GenreRepository genres;
    private final MoviePublicationPolicy publication;

    public AdminMovieService(AdminAccessService access,AdminMovieRepository movies,GenreRepository genres,MoviePublicationPolicy publication) {
        this.access=access; this.movies=movies; this.genres=genres; this.publication=publication;
    }

    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public MoviePage list(long actor,MovieQuery query) {
        access.requireAdmin(actor);
        long total=movies.count(query);
        List<MovieSummary> items=movies.list(query).stream().map(movie -> new MovieSummary(movie.getId().toString(),
                movie.getTitle(),movie.getDuration(),movie.getReleaseDate(),movie.getAgeRating(),movie.getLanguage(),
                movie.getPosterUrl(),movie.getStatus(),associations(movie))).toList();
        return new MoviePage(items,query.page(),query.size(),total,total/query.size()+(total%query.size()==0?0:1),query.sort());
    }
    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public MovieDetail detail(long actor,long movieId) { access.requireAdmin(actor); return response(movies.find(movieId)); }

    @Transactional
    public MovieDetail create(long actor,AdminMovieRequest request) {
        access.requireAdmin(actor);
        Movie movie=Movie.draft(request.title(),request.duration());
        content(movie,request);
        movies.create(movie);
        movies.replaceGenres(movie.getId(),request.genreIds());
        auditAfterCommit(actor,movie.getId(),"CREATE_DRAFT");
        return response(movie);
    }
    @Transactional
    public MovieDetail update(long actor,long movieId,AdminMovieRequest request) {
        access.requireAdmin(actor);
        Movie movie=movies.lock(movieId);
        content(movie,request);
        publication.validateTransition(movie,currentStatus(movie));
        movies.replaceGenres(movieId,request.genreIds());
        auditAfterCommit(actor,movieId,"UPDATE_CONTENT");
        return response(movie);
    }
    @Transactional
    public MovieDetail publication(long actor,long movieId,MovieStatus target) {
        access.requireAdmin(actor);
        Movie movie=movies.lock(movieId);
        publication.validateTransition(movie,target);
        movie.changeStatus(target);
        movies.flush();
        auditAfterCommit(actor,movieId,"STATUS_"+target.name());
        return response(movie);
    }
    private MovieStatus currentStatus(Movie movie) {
        try { return MovieStatus.valueOf(movie.getStatus()); }
        catch(IllegalArgumentException exception) { throw new InvalidMovieRequestException("status","Unknown stored Movie status; no automatic relabeling is permitted."); }
    }
    private void content(Movie movie,AdminMovieRequest request) {
        movie.updateContent(request.title(),request.duration(),request.releaseDate(),request.ageRating(),request.language(),
                request.posterUrl(),request.description(),request.trailerUrl());
    }
    private List<GenreResponse> associations(Movie movie) {
        return genres.findForMovies(List.of(movie.getId())).stream()
                .map(link -> new GenreResponse(link.getGenre().getId().toString(),link.getGenre().getName())).toList();
    }
    private MovieDetail response(Movie movie) {
        return new MovieDetail(movie.getId().toString(),movie.getTitle(),movie.getDuration(),movie.getReleaseDate(),movie.getAgeRating(),
                movie.getLanguage(),movie.getPosterUrl(),movie.getStatus(),associations(movie),movie.getDescription(),movie.getTrailerUrl());
    }
    private void auditAfterCommit(long actor,long movieId,String action) {
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCommit() { AUDIT.info("Admin Movie operation actorId={} movieId={} action={}",actor,movieId,action); }
                });
    }
}
