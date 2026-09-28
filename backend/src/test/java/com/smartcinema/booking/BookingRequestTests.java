package com.smartcinema.booking;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.smartcinema.seat.SeatRequestException;

class BookingRequestTests {
    @Test
    void rejectsNormalizedDuplicatesNumericIdsAndClientPricing() {
        assertThatThrownBy(() -> BookingRequest.parse(Map.of("showtimeId", "1", "holdIds", List.of("01", "1")))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> BookingRequest.parse(Map.of("showtimeId", "1", "holdIds", List.of(1)))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> BookingRequest.parse(Map.of("showtimeId", "1", "holdIds", List.of("1"), "price", "0"))).isInstanceOf(SeatRequestException.class);
    }
    @Test
    void preservesBigintPrecisionAndRejectsOverflow() {
        assertThat(BookingRequest.parse(Map.of("showtimeId", "9007199254740993", "holdIds", List.of("9223372036854775807"))))
                .isEqualTo(new BookingRequest(9007199254740993L, List.of(Long.MAX_VALUE)));
        assertThatThrownBy(() -> BookingRequest.parse(Map.of("showtimeId", "1", "holdIds", List.of("9223372036854775808")))).isInstanceOf(SeatRequestException.class);
    }
}
