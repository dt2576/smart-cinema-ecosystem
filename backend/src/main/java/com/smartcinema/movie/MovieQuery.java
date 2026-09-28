package com.smartcinema.movie;

import java.util.Set;
import org.springframework.util.MultiValueMap;

public record MovieQuery(String q, Long genreId, int page, int size, String sort) {
	private static final Set<String> PARAMETERS = Set.of("q", "genreId", "page", "size", "sort");
	private static final Set<String> SORTS = Set.of(
			"title,asc", "title,desc", "releaseDate,asc", "releaseDate,desc", "id,asc", "id,desc");

	public static MovieQuery parse(MultiValueMap<String, String> parameters) {
		parameters.forEach((key, values) -> {
			if (!PARAMETERS.contains(key)) {
				throw invalid(key, "Unsupported query parameter.");
			}
			if (values.size() != 1) {
				throw invalid(key, "Parameter must occur once.");
			}
		});
		String q = parameters.getFirst("q");
		if (q != null) {
			q = q.strip();
			if (q.codePointCount(0, q.length()) > 255) {
				throw invalid("q", "Must contain at most 255 characters.");
			}
			if (q.isEmpty()) { q = null; }
		}
		Long genreId = parameters.containsKey("genreId")
				? positiveId("genreId", parameters.getFirst("genreId")) : null;
		int page = (int) number("page", parameters.getFirst("page"), 0, 0, Integer.MAX_VALUE);
		int size = (int) number("size", parameters.getFirst("size"), 20, 1, 100);
		String sort = parameters.containsKey("sort") ? parameters.getFirst("sort") : "title,asc";
		if (!SORTS.contains(sort)) {
			throw invalid("sort", "Use title, releaseDate or id with asc or desc.");
		}
		return new MovieQuery(q, genreId, page, size, sort);
	}

	public static long positiveId(String name, String value) {
		if (value == null) { throw invalid(name, "A positive bigint ID is required."); }
		return number(name, value, 0, 1, Long.MAX_VALUE);
	}

	private static long number(String name, String value, long fallback, long minimum, long maximum) {
		if (value == null) { return fallback; }
		try {
			if (!value.matches("[0-9]+")) { throw new NumberFormatException(); }
			long result = Long.parseLong(value);
			if (result < minimum || result > maximum) { throw new NumberFormatException(); }
			return result;
		} catch (NumberFormatException exception) {
			throw invalid(name, "Must be an integer between " + minimum + " and " + maximum + ".");
		}
	}

	private static InvalidMovieRequestException invalid(String name, String message) {
		return new InvalidMovieRequestException(name, message);
	}

	public long offset() { return (long) page * size; }
}
