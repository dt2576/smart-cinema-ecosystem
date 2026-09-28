package com.smartcinema.movie.dto;

import java.util.List;

public record MoviePage(List<MovieSummary> items, int page, int size,
		long totalElements, long totalPages, String sort) {
}
