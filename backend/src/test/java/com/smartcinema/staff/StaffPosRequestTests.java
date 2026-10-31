package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

class StaffPosRequestTests {
    @Test void amountRequiresExactDecimalStringWithinDatabasePrecision() {
        assertThat(StaffPosRequest.amount(Map.of("expectedAmount","12345.6789")).toPlainString()).isEqualTo("12345.6789");
        for(Object invalid:List.of(10000,"-1","+1","01","1e3","1.00001","1000000000000000","NaN"," 1","1 "))
            assertThatThrownBy(()->StaffPosRequest.amount(Map.of("expectedAmount",invalid))).isInstanceOf(StaffFailure.class);
    }
    @Test void identifiersAndSelectionsPreserveBigintAndWholeSeatUnits() {
        assertThat(StaffPosRequest.ids(Map.of("seatIds",List.of("9007199254740993","9223372036854775807")),"seatIds")).containsExactly(9007199254740993L,Long.MAX_VALUE);
        for(Object invalid:List.of(List.of(),List.of("01"),List.of(1),List.of("1","1"),List.of("9223372036854775808")))
            assertThatThrownBy(()->StaffPosRequest.ids(Map.of("seatIds",invalid),"seatIds")).isInstanceOf(StaffFailure.class);
    }
    @Test void queryRejectsUnknownRepeatedAndMissingScope() {
        var query=new LinkedMultiValueMap<String,String>();assertThatThrownBy(()->StaffPosRequest.cinema(query)).isInstanceOf(StaffFailure.class);
        query.add("cinemaId","1");StaffPosRequest.query(query,"cinemaId");query.add("cinemaId","2");assertThatThrownBy(()->StaffPosRequest.query(query,"cinemaId")).isInstanceOf(StaffFailure.class);
        query.clear();query.add("status","SUCCESS");assertThatThrownBy(()->StaffPosRequest.query(query,"cinemaId")).isInstanceOf(StaffFailure.class);
    }
    @Test void dateUsesStrictLocalIsoDayAndReceiptDiagnosticsAreRedacted() {
        assertThat(StaffPosRequest.date("2026-10-30").toString()).isEqualTo("2026-10-30");
        for(String date:List.of("0000-01-01","2026-02-30","2026-1-1","2026-10-30T00:00:00Z"," 2026-10-30"))assertThatThrownBy(()->StaffPosRequest.date(date)).isInstanceOf(StaffFailure.class);
        assertThat(new StaffPosResponse.Receipt(null,List.of(),List.of(),"private-qr-fixture").toString()).doesNotContain("private-qr-fixture");
    }
}
