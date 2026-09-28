package com.smartcinema.movie;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "movie_genres", uniqueConstraints =
		@UniqueConstraint(name = "uq_movie_genres_pair", columnNames = {"movie_id", "genre_id"}))
public class MovieGenre {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "movie_id", nullable = false)
	private Movie movie;
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "genre_id", nullable = false)
	private Genre genre;

	protected MovieGenre() {
	}

	public Movie getMovie() { return movie; }
	public Genre getGenre() { return genre; }
}
