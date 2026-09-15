package com.smartcinema;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;

@SpringBootTest(properties = "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration")
@AutoConfigureMockMvc
class SmartCinemaApplicationTests {

	@MockitoBean
	private UserRepository userRepository;

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

}
