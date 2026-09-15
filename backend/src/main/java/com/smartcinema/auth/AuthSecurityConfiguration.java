package com.smartcinema.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
public class AuthSecurityConfiguration {

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		RequestMatcher registrationEndpoint =
				PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/users");

		return http
				.csrf(csrf -> csrf.ignoringRequestMatchers(registrationEndpoint))
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers(registrationEndpoint).permitAll()
						.anyRequest().authenticated())
				.build();
	}
}
