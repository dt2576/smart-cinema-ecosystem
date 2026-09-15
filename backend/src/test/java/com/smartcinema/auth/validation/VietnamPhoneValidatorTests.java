package com.smartcinema.auth.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class VietnamPhoneValidatorTests {

	private final VietnamPhoneValidator validator = new VietnamPhoneValidator();

	@ParameterizedTest
	@CsvSource({
			"'0912 345 678', +84912345678",
			"'912345678', +84912345678",
			"'+84 912-345-678', +84912345678"
	})
	void acceptsAndNormalizesApprovedPhoneFormats(String input, String expected) {
		assertThat(validator.isValid(input, null)).isTrue();
		assertThat(VietnamPhoneValidator.normalize(input)).isEqualTo(expected);
	}

	@ParameterizedTest
	@ValueSource(strings = { "123", "+841234", "81234567", "09123456789" })
	void rejectsInvalidPhoneFormats(String input) {
		assertThat(validator.isValid(input, null)).isFalse();
	}
}
