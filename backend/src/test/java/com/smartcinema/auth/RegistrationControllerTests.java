package com.smartcinema.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.SpringValidatorAdapter;

import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.dto.RegisterUserResponse;
import com.smartcinema.user.AccountStatus;
import com.smartcinema.user.UserRole;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;

@ExtendWith(MockitoExtension.class)
class RegistrationControllerTests {

	@Mock
	private RegistrationService registrationService;

	private MockMvc mockMvc;
	private ValidatorFactory validatorFactory;

	@BeforeEach
	void setUp() {
		validatorFactory = Validation.buildDefaultValidatorFactory();
		mockMvc = MockMvcBuilders.standaloneSetup(new RegistrationController(registrationService))
				.setControllerAdvice(new AuthExceptionHandler())
				.setValidator(new SpringValidatorAdapter(validatorFactory.getValidator()))
				.build();
	}

	@AfterEach
	void tearDown() {
		validatorFactory.close();
	}

	@Test
	void createsCustomerWithoutExposingPassword() throws Exception {
		OffsetDateTime now = OffsetDateTime.parse("2026-09-15T10:00:00+07:00");
		when(registrationService.register(any(RegisterUserRequest.class))).thenReturn(new RegisterUserResponse(
				1L,
				"customer@example.com",
				"Nguyen Van A",
				"+84912345678",
				UserRole.CUSTOMER,
				AccountStatus.ACTIVE,
				now,
				now));

		mockMvc.perform(post("/api/v1/users")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "fullName": "Nguyen Van A",
						  "email": "customer@example.com",
						  "phone": "0912 345 678",
						  "password": "securePassword"
						}
						"""))
				.andExpect(status().isCreated())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.email").value("customer@example.com"))
				.andExpect(jsonPath("$.role").value("CUSTOMER"))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void rejectsInvalidRegistrationRequest() throws Exception {
		mockMvc.perform(post("/api/v1/users")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "fullName": "",
						  "email": "invalid-email",
						  "phone": "123",
						  "password": "short"
						}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("Invalid registration request"))
				.andExpect(jsonPath("$.errors.fullName").exists())
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.phone").exists())
				.andExpect(jsonPath("$.errors.password").exists());

		verifyNoInteractions(registrationService);
	}

	@Test
	void returnsConflictForDuplicateEmail() throws Exception {
		when(registrationService.register(any(RegisterUserRequest.class))).thenThrow(new DuplicateEmailException());

		mockMvc.perform(post("/api/v1/users")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "fullName": "Nguyen Van A",
						  "email": "customer@example.com",
						  "phone": "+84912345678",
						  "password": "securePassword"
						}
						"""))
				.andExpect(status().isConflict())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("Email already registered"))
				.andExpect(jsonPath("$.detail").value("An account with this email already exists."));
	}
}
