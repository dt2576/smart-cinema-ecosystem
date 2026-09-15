package com.smartcinema.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.SpringValidatorAdapter;

import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.auth.dto.TokenRenewalRequest;
import com.smartcinema.user.UserRole;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;

@ExtendWith(MockitoExtension.class)
class TokenRenewalControllerTests {
	@Mock private TokenRenewalService service;
	private MockMvc mockMvc;
	private ValidatorFactory validatorFactory;

	@BeforeEach
	void setUp() {
		validatorFactory = Validation.buildDefaultValidatorFactory();
		mockMvc = MockMvcBuilders.standaloneSetup(new TokenRenewalController(service))
				.setControllerAdvice(new AuthExceptionHandler())
				.setValidator(new SpringValidatorAdapter(validatorFactory.getValidator())).build();
	}

	@AfterEach void tearDown() { validatorFactory.close(); }

	@Test
	void returnsRotatedTokenPair() throws Exception {
		when(service.renew(any(TokenRenewalRequest.class))).thenReturn(new LoginResponse(
				"new-access", "Bearer", 900, "new-refresh", 2592000,
				1L, "customer@example.com", "Nguyen Van A", UserRole.CUSTOMER));

		mockMvc.perform(post("/api/v1/auth/token-renewals").contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"valid-refresh\"}"))
				.andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.accessToken").value("new-access"))
				.andExpect(jsonPath("$.refreshToken").value("new-refresh"));
	}

	@Test
	void rejectsMissingRefreshToken() throws Exception {
		mockMvc.perform(post("/api/v1/auth/token-renewals").contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"\"}"))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.refreshToken").exists());
		verifyNoInteractions(service);
	}

	@Test
	void returnsStandardizedUnauthorizedForRejectedRefreshToken() throws Exception {
		when(service.renew(any(TokenRenewalRequest.class))).thenThrow(new RefreshTokenRejectedException());
		mockMvc.perform(post("/api/v1/auth/token-renewals").contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"rejected-refresh\"}"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.title").value("Token renewal failed"));
	}
}
