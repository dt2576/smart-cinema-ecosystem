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

import com.smartcinema.auth.dto.LoginRequest;
import com.smartcinema.auth.dto.LoginResponse;
import com.smartcinema.user.UserRole;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;

@ExtendWith(MockitoExtension.class)
class LoginControllerTests {

	@Mock
	private LoginService loginService;

	private MockMvc mockMvc;
	private ValidatorFactory validatorFactory;

	@BeforeEach
	void setUp() {
		validatorFactory = Validation.buildDefaultValidatorFactory();
		mockMvc = MockMvcBuilders.standaloneSetup(new LoginController(loginService))
				.setControllerAdvice(new AuthExceptionHandler())
				.setValidator(new SpringValidatorAdapter(validatorFactory.getValidator()))
				.build();
	}

	@AfterEach
	void tearDown() {
		validatorFactory.close();
	}

	@Test
	void returnsAccessTokenAndUserSummaryForValidCredentials() throws Exception {
		when(loginService.login(any(LoginRequest.class))).thenReturn(new LoginResponse(
				"signed-token", "Bearer", 900, "refresh-token", 2592000,
				1L, "customer@example.com", "Nguyen Van A", UserRole.CUSTOMER));

		mockMvc.perform(post("/api/v1/auth/tokens")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"customer@example.com","password":"securePassword"}
						"""))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.accessToken").value("signed-token"))
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.expiresIn").value(900))
				.andExpect(jsonPath("$.refreshToken").value("refresh-token"))
				.andExpect(jsonPath("$.refreshExpiresIn").value(2592000))
				.andExpect(jsonPath("$.email").value("customer@example.com"))
				.andExpect(jsonPath("$.role").value("CUSTOMER"))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void rejectsInvalidLoginRequest() throws Exception {
		mockMvc.perform(post("/api/v1/auth/tokens")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"invalid","password":""}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("Invalid request"))
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.password").exists());

		verifyNoInteractions(loginService);
	}

	@Test
	void returnsStandardizedUnauthorizedError() throws Exception {
		when(loginService.login(any(LoginRequest.class))).thenThrow(new AuthenticationFailedException());

		mockMvc.perform(post("/api/v1/auth/tokens")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"customer@example.com","password":"wrong-password"}
						"""))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("Authentication failed"))
				.andExpect(jsonPath("$.detail")
						.value("Email or password is invalid, or the account is unavailable."));
	}
}
