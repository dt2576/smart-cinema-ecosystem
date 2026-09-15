package com.smartcinema.auth;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import com.smartcinema.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "token_hash", nullable = false, unique = true, length = 64)
	private String tokenHash;

	@Column(name = "expires_at", nullable = false)
	private OffsetDateTime expiresAt;

	@Column(name = "revoked_at")
	private OffsetDateTime revokedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	protected RefreshToken() {
	}

	private RefreshToken(User user, String tokenHash, Instant issuedAt, Instant expiresAt) {
		this.user = user;
		this.tokenHash = tokenHash;
		this.createdAt = OffsetDateTime.ofInstant(issuedAt, ZoneOffset.UTC);
		this.expiresAt = OffsetDateTime.ofInstant(expiresAt, ZoneOffset.UTC);
	}

	public static RefreshToken issued(User user, String tokenHash, Instant issuedAt, Instant expiresAt) {
		return new RefreshToken(user, tokenHash, issuedAt, expiresAt);
	}

	public boolean isUsableAt(Instant instant) {
		return revokedAt == null && expiresAt.toInstant().isAfter(instant);
	}

	public void revoke(Instant instant) {
		if (revokedAt == null) revokedAt = OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
	}

	public User getUser() { return user; }
	public String getTokenHash() { return tokenHash; }
	public OffsetDateTime getExpiresAt() { return expiresAt; }
	public OffsetDateTime getRevokedAt() { return revokedAt; }
}
