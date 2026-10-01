package com.smartcinema.movie;

import java.time.LocalDate;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "movies")
public class Movie {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	@Column(nullable = false, length = 255)
	private String title;
	@Column(columnDefinition = "text")
	private String description;
	@Column(nullable = false)
	private Integer duration;
	@Column(name = "release_date")
	private LocalDate releaseDate;
	@Column(name = "age_rating", length = 20)
	private String ageRating;
	@Column(length = 100)
	private String language;
	@Column(name = "poster", length = 2048)
	private String posterUrl;
	@Column(name = "trailer", length = 2048)
	private String trailerUrl;
	// Keep raw storage tokens readable; unknown values must fail closed, not break enum hydration.
	@Column(nullable = false, length = 30)
	private String status;

	protected Movie() {
	}

	public static Movie draft(String title, Integer duration) {
		Movie movie = new Movie();
		movie.title = title;
		movie.duration = duration;
		movie.status = MovieStatus.DRAFT.name();
		return movie;
	}

	public void updateContent(String title, Integer duration, LocalDate releaseDate, String ageRating,
			String language, String posterUrl, String description, String trailerUrl) {
		this.title = title;
		this.duration = duration;
		this.releaseDate = releaseDate;
		this.ageRating = ageRating;
		this.language = language;
		this.posterUrl = posterUrl;
		this.description = description;
		this.trailerUrl = trailerUrl;
	}

	public void changeStatus(MovieStatus status) { this.status = status.name(); }

	public Long getId() { return id; }
	public String getTitle() { return title; }
	public String getDescription() { return description; }
	public Integer getDuration() { return duration; }
	public LocalDate getReleaseDate() { return releaseDate; }
	public String getAgeRating() { return ageRating; }
	public String getLanguage() { return language; }
	public String getPosterUrl() { return posterUrl; }
	public String getTrailerUrl() { return trailerUrl; }
	public String getStatus() { return status; }
}
