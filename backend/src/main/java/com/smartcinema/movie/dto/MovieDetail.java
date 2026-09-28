package com.smartcinema.movie.dto;

import java.time.LocalDate;
import java.util.List;

public record MovieDetail(String id, String title, Integer duration, LocalDate releaseDate,
		String ageRating, String language, String posterUrl, String status, List<GenreResponse> genres,
		String description, String trailerUrl) {
}
