package com.smartcinema.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import com.smartcinema.auth.dto.TokenRevocationRequest;

@ExtendWith(MockitoExtension.class)
class TokenRevocationControllerTests {

	@Mock private TokenRevocationService service;
	@Mock private Jwt jwt;
	private TokenRevocationController controller;

	@BeforeEach
	void setUp() {
		controller = new TokenRevocationController(service);
	}

	@Test
	void returnsNoContentAfterRevocation() {
		when(jwt.getSubject()).thenReturn("42");
		TokenRevocationRequest request = new TokenRevocationRequest("current-refresh");

		var response = controller.revoke(jwt, request);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		verify(service).revokeCurrent("42", request);
	}
}
