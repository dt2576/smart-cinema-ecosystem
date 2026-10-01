package com.smartcinema.admin;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import com.smartcinema.movie.InvalidMovieRequestException;
import com.smartcinema.movie.MovieQuery;

/** Strict full content replacement; status has a separate publication resource. */
public record AdminMovieRequest(String title, Integer duration, LocalDate releaseDate, String ageRating,
        String language, String posterUrl, String description, String trailerUrl, List<Long> genreIds) {
    private static final Set<String> FIELDS = Set.of("title", "duration", "releaseDate", "ageRating", "language",
            "posterUrl", "description", "trailerUrl", "genreIds");

    public static AdminMovieRequest parse(Map<String, Object> body) {
        if (body == null) { throw invalid("body", "Movie content is required."); }
        body.keySet().forEach(key -> { if (!FIELDS.contains(key)) { throw invalid(key, "Unsupported Movie field."); } });
        String title = text(body, "title", 255, true);
        Object rawDuration = body.get("duration");
        if (!(rawDuration instanceof Integer duration) || duration <= 0) {
            throw invalid("duration", "A positive integer duration is required.");
        }
        LocalDate date = null;
        if (body.get("releaseDate") != null) {
            if (!(body.get("releaseDate") instanceof String value) || !value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
                throw invalid("releaseDate", "Use a finite YYYY-MM-DD date or null.");
            }
            try { date = LocalDate.parse((String) body.get("releaseDate")); }
            catch (DateTimeParseException exception) { throw invalid("releaseDate", "Use a valid YYYY-MM-DD date."); }
            if (date.getYear() < 1) { throw invalid("releaseDate", "Use a year between 0001 and 9999."); }
        }
        if (!(body.get("genreIds") instanceof List<?> values)) { throw invalid("genreIds", "An array of string Genre IDs is required."); }
        List<Long> ids = new ArrayList<>();
        for (Object value : values) {
            if (!(value instanceof String id)) { throw invalid("genreIds", "Genre IDs must be strings."); }
            long parsed = MovieQuery.positiveId("genreIds", id);
            if (ids.contains(parsed)) { throw invalid("genreIds", "Duplicate Genre IDs are not allowed."); }
            ids.add(parsed);
        }
        ids.sort(Long::compare);
        return new AdminMovieRequest(title, duration, date, text(body,"ageRating",20,false),
                text(body,"language",100,false), text(body,"posterUrl",2048,false),
                text(body,"description",Integer.MAX_VALUE,false), text(body,"trailerUrl",2048,false), List.copyOf(ids));
    }

    private static String text(Map<String,Object> body, String field, int maximum, boolean required) {
        Object value = body.get(field);
        if (value == null && !required) { return null; }
        if (!(value instanceof String string) || string.isBlank() || string.codePointCount(0,string.length()) > maximum) {
            throw invalid(field, "A nonblank value of at most " + maximum + " characters is required when supplied.");
        }
        return string.strip();
    }

    private static InvalidMovieRequestException invalid(String field, String message) { return new InvalidMovieRequestException(field,message); }
}
