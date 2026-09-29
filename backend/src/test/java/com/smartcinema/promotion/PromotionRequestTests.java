package com.smartcinema.promotion;

import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.smartcinema.seat.SeatRequestException;

class PromotionRequestTests {
    @Test
    void codeIsNormalizedWithoutAcceptingAmountsOrWrongTypes() {
        assertThat(PromotionRequest.parse(Map.of("code", " test-code ")).code()).isEqualTo("TEST-CODE");
        for (Map<String, ?> body : java.util.List.<Map<String, ?>>of(Map.of(), Map.of("code", 1), Map.of("code", " "),
                Map.of("code", "X".repeat(51)), Map.of("code", "X", "discount", 0))) {
            assertThatThrownBy(() -> PromotionRequest.parse(body)).isInstanceOf(SeatRequestException.class);
        }
    }
}
