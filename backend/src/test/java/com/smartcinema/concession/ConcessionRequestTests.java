package com.smartcinema.concession;

import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.smartcinema.seat.SeatRequestException;

class ConcessionRequestTests {
    @Test
    void stringIdsAndPositiveIntegerQuantityAreExact() {
        assertThat(ConcessionRequest.add(Map.of("itemId", "9007199254740993", "quantity", 2)))
                .isEqualTo(new ConcessionRequest(9007199254740993L, 2));
        assertThat(ConcessionRequest.update(Map.of("quantity", Integer.MAX_VALUE))).isEqualTo(Integer.MAX_VALUE);
    }
    @Test
    void disallowsAmountSnapshotAndWrongTypes() {
        assertThatThrownBy(() -> ConcessionRequest.add(Map.of("itemId", 1, "quantity", 1))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> ConcessionRequest.add(Map.of("itemId", "1", "quantity", 1, "price", 0))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> ConcessionRequest.update(Map.of("quantity", "1"))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> ConcessionRequest.update(Map.of("quantity", 0))).isInstanceOf(SeatRequestException.class);
        assertThatThrownBy(() -> ConcessionRequest.update(Map.of("quantity", 1.0))).isInstanceOf(SeatRequestException.class);
    }
}
