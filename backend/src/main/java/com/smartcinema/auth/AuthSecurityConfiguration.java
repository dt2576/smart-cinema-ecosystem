package com.smartcinema.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
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
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityProblemHandler securityProblemHandler)
			throws Exception {
		RequestMatcher registrationEndpoint =
				PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/users");
		RequestMatcher loginEndpoint =
				PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/auth/tokens");
		RequestMatcher tokenRenewalEndpoint =
				PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/auth/token-renewals");
		RequestMatcher tokenRevocationEndpoint =
				PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/auth/token-revocations");
		RequestMatcher profileEndpoint = PathPatternRequestMatcher.pathPattern("/api/v1/profile");

		return http
				.csrf(csrf -> csrf.ignoringRequestMatchers(
						registrationEndpoint, loginEndpoint, tokenRenewalEndpoint,
						tokenRevocationEndpoint, profileEndpoint))
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers(registrationEndpoint, loginEndpoint, tokenRenewalEndpoint).permitAll()
						.requestMatchers(tokenRevocationEndpoint).authenticated()
						.requestMatchers(profileEndpoint).hasRole("CUSTOMER")
						.anyRequest().authenticated())
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint(securityProblemHandler)
						.accessDeniedHandler(securityProblemHandler))
				.oauth2ResourceServer(resourceServer -> resourceServer
						.authenticationEntryPoint(securityProblemHandler)
						.accessDeniedHandler(securityProblemHandler)
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
				.build();
	}

	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
		authoritiesConverter.setAuthoritiesClaimName("role");
		authoritiesConverter.setAuthorityPrefix("ROLE_");
		JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();
		authenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
		return authenticationConverter;
	}

	@Bean
	JwtEncoder jwtEncoder(@Value("${auth.jwt.secret}") String secret) {
		return NimbusJwtEncoder.withSecretKey(jwtSecretKey(secret))
				.build();
	}

	@Bean
	JwtDecoder jwtDecoder(@Value("${auth.jwt.secret}") String secret) {
		return NimbusJwtDecoder.withSecretKey(jwtSecretKey(secret))
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
	}

	@Bean
	Duration accessTokenTtl(@Value("${auth.jwt.access-token-ttl}") Duration accessTokenTtl) {
		if (accessTokenTtl.isZero() || accessTokenTtl.isNegative()) {
			throw new IllegalArgumentException("Access token TTL must be positive.");
		}
		return accessTokenTtl;
	}

	@Bean
	Duration refreshTokenTtl(@Value("${auth.jwt.refresh-token-ttl}") Duration refreshTokenTtl) {
		if (refreshTokenTtl.isZero() || refreshTokenTtl.isNegative()) {
			throw new IllegalArgumentException("Refresh token TTL must be positive.");
		}
		return refreshTokenTtl;
	}

	private SecretKey jwtSecretKey(String secret) {
		byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
		if (secretBytes.length < 32) {
			throw new IllegalArgumentException("AUTH_JWT_SECRET must contain at least 32 UTF-8 bytes.");
		}
		return new SecretKeySpec(secretBytes, "HmacSHA256");
	}
}
