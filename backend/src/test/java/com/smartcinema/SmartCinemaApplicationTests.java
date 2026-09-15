package com.smartcinema;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;
import com.smartcinema.auth.RefreshTokenRepository;

@SpringBootTest(properties = {
		"spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
		"auth.jwt.secret=test-secret-with-at-least-thirty-two-bytes"
})
@AutoConfigureMockMvc
class SmartCinemaApplicationTests {

	@MockitoBean
	private UserRepository userRepository;

	@MockitoBean
	private RefreshTokenRepository refreshTokenRepository;

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void registrationEndpointAllowsAnonymousPostWithoutCsrfToken() throws Exception {
		when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/v1/users")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "fullName": "Nguyen Van A",
						  "email": "  Customer@Example.COM  ",
						  "phone": "0912 345 678",
						  "password": "securePassword"
						}
						"""))
				.andExpect(status().isCreated());
	}

	@Test
	void loginEndpointAllowsAnonymousPostWithoutCsrfToken() throws Exception {
		mockMvc.perform(post("/api/v1/auth/tokens")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "invalid@example.com",
						  "password": "wrong-password"
						}
						"""))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenRenewalEndpointAllowsAnonymousPostWithoutCsrfToken() throws Exception {
		when(refreshTokenRepository.findForUpdateByTokenHash(any(String.class)))
				.thenReturn(Optional.empty());

		mockMvc.perform(post("/api/v1/auth/token-renewals")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"refreshToken":"invalid-refresh-token"}
						"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.title").value("Token renewal failed"));
	}

	@Test
	void tokenRevocationEndpointRequiresAuthentication() throws Exception {
		mockMvc.perform(post("/api/v1/auth/token-revocations")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"current-refresh-token\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenRevocationEndpointAcceptsAuthenticatedPostWithoutCsrfToken() throws Exception {
		when(refreshTokenRepository.findForUpdateByTokenHash(any(String.class)))
				.thenReturn(Optional.empty());

		mockMvc.perform(post("/api/v1/auth/token-revocations")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "CUSTOMER"))
						.authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"already-revoked-token\"}"))
				.andExpect(status().isNoContent());
	}

	@Test
	void tokenRevocationEndpointValidatesRefreshCredential() throws Exception {
		mockMvc.perform(post("/api/v1/auth/token-revocations")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "CUSTOMER"))
						.authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.refreshToken").exists());
	}

	@Test
	void profileEndpointRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/v1/profile"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.title").value("Authentication required"))
				.andExpect(jsonPath("$.detail").value("A valid access token is required."));
	}

	@Test
	void profileEndpointUsesAuthenticatedTokenSubject() throws Exception {
		User user = User.registeredCustomer(
				"customer@example.com", "stored-hash", "Nguyen Van A", "+84912345678");
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		mockMvc.perform(get("/api/v1/profile")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "CUSTOMER"))
						.authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("customer@example.com"))
				.andExpect(jsonPath("$.role").value("CUSTOMER"))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void profileUpdateUsesTokenSubjectAndDoesNotRequireCsrf() throws Exception {
		User user = User.registeredCustomer(
				"customer@example.com", "stored-hash", "Nguyen Van A", "+84912345678");
		when(userRepository.findById(42L)).thenReturn(Optional.of(user));

		mockMvc.perform(patch("/api/v1/profile")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "CUSTOMER"))
						.authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "fullName": "Tran Thi B",
						  "phone": "0987 654 321",
						  "role": "ADMIN",
						  "status": "BLOCKED",
						  "email": "changed@example.com"
						}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.fullName").value("Tran Thi B"))
				.andExpect(jsonPath("$.phone").value("+84987654321"))
				.andExpect(jsonPath("$.email").value("customer@example.com"))
				.andExpect(jsonPath("$.role").value("CUSTOMER"))
				.andExpect(jsonPath("$.status").value("ACTIVE"));
	}

	@Test
	void profileEndpointRejectsNonCustomerRole() throws Exception {
		mockMvc.perform(get("/api/v1/profile")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "STAFF"))
						.authorities(new SimpleGrantedAuthority("ROLE_STAFF"))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.title").value("Access denied"))
				.andExpect(jsonPath("$.detail")
						.value("The authenticated account cannot access this resource."));
	}

	@Test
	void profileUpdateRejectsInvalidFields() throws Exception {
		mockMvc.perform(patch("/api/v1/profile")
				.with(jwt().jwt(token -> token.subject("42").claim("role", "CUSTOMER"))
						.authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"fullName":"","phone":"123"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title").value("Invalid request"))
				.andExpect(jsonPath("$.errors.fullName").exists())
				.andExpect(jsonPath("$.errors.phone").exists());
	}

}
