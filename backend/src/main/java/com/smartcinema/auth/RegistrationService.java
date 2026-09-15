package com.smartcinema.auth;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.hibernate.exception.ConstraintViolationException;

import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.dto.RegisterUserResponse;
import com.smartcinema.auth.validation.VietnamPhoneValidator;
import com.smartcinema.user.User;
import com.smartcinema.user.UserRepository;

@Service
public class RegistrationService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public RegistrationService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public RegisterUserResponse register(RegisterUserRequest request) {
		String email = request.email().trim().toLowerCase(Locale.ROOT);
		if (userRepository.existsByEmail(email)) {
			throw new DuplicateEmailException();
		}

		User user = User.registeredCustomer(
				email,
				passwordEncoder.encode(request.password()),
				request.fullName().trim(),
				VietnamPhoneValidator.normalize(request.phone()));

		try {
			return RegisterUserResponse.from(userRepository.saveAndFlush(user));
		}
		catch (DataIntegrityViolationException exception) {
			if (isDuplicateEmail(exception)) {
				throw new DuplicateEmailException();
			}
			throw exception;
		}
	}

	private boolean isDuplicateEmail(DataIntegrityViolationException exception) {
		Throwable cause = exception;
		while (cause != null) {
			if (cause instanceof ConstraintViolationException constraintViolation
					&& "uq_users_email".equals(constraintViolation.getConstraintName())) {
				return true;
			}
			cause = cause.getCause();
		}
		return false;
	}
}
