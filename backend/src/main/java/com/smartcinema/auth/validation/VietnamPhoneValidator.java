package com.smartcinema.auth.validation;

import java.util.regex.Pattern;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class VietnamPhoneValidator implements ConstraintValidator<VietnamPhone, String> {

	private static final Pattern PHONE_PATTERN = Pattern.compile("(?:0\\d{9}|\\d{9}|\\+84\\d{9})");

	@Override
	public boolean isValid(String value, ConstraintValidatorContext context) {
		if (value == null || value.isBlank()) {
			return true;
		}

		return PHONE_PATTERN.matcher(normalizeSeparators(value)).matches();
	}

	public static String normalize(String value) {
		String phone = normalizeSeparators(value);
		if (phone.startsWith("0")) {
			return "+84" + phone.substring(1);
		}
		if (!phone.startsWith("+84")) {
			return "+84" + phone;
		}
		return phone;
	}

	private static String normalizeSeparators(String value) {
		return value.replaceAll("[\\s()-]", "");
	}
}
