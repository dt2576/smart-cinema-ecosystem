package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

class AdminConcessionRequestTests {
    private static final String CONTENT="\"name\":\"  Bắp rang  \",\"description\":null,\"category\":\"POPCORN\",\"sellingPrice\":\"0.1234\"";
    private AdminConcessionBody body(String text) { return new AdminConcessionBody(text); }
    @Test void exactDecimalAndExplicitStatus() {
        var input=AdminConcessionRequest.create(body("{"+CONTENT+",\"status\":\"INACTIVE\"}"));
        assertThat(input.name()).isEqualTo("Bắp rang"); assertThat(input.description()).isNull();
        assertThat(input.sellingPrice()).isEqualByComparingTo(new BigDecimal("0.1234")); assertThat(input.status()).isEqualTo("INACTIVE");
        assertThat(input.toString()).doesNotContain(input.name());
    }
    @Test void updateHasNoStatusAndNullableDescriptionClears() {
        assertThat(AdminConcessionRequest.update(body("{"+CONTENT+"}")).status()).isNull();
        assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT+",\"status\":\"ACTIVE\"}"))).isInstanceOf(AdminConcessionFailure.class);
    }
    @Test void rejectsMalformedDuplicateTrailingUnknownAndMissingFields() {
        for(String raw:new String[]{"null","[]","{}","{"+CONTENT+",\"name\":\"Other\"}","{"+CONTENT+"}{}","{"+CONTENT+",\"imageUrl\":null}"})
            assertThatThrownBy(()->AdminConcessionRequest.update(body(raw))).isInstanceOf(AdminConcessionFailure.class);
        assertThatThrownBy(()->AdminConcessionRequest.create(body("{"+CONTENT+"}"))).isInstanceOf(AdminConcessionFailure.class);
    }
    @Test void rejectsNoncanonicalPriceWithoutRounding() {
        for(String price:new String[]{"-1","1e2","01"," 1","1.",".5","1000000000000000","1.00000","NaN","Infinity"})
            assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT.replace("0.1234",price)+"}"))).isInstanceOf(AdminConcessionFailure.class);
        assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT.replace("\"0.1234\"","0.1234")+"}"))).isInstanceOf(AdminConcessionFailure.class);
    }
    @Test void permitsZeroAndMaximumPrice() {
        for(String price:new String[]{"0","0.0000","999999999999999.9999"})
            assertThat(AdminConcessionRequest.update(body("{"+CONTENT.replace("0.1234",price)+"}")).sellingPrice()).isEqualByComparingTo(new BigDecimal(price));
    }
    @Test void validatesUnicodeNameDescriptionAndTransportBounds() {
        assertThat(AdminConcessionRequest.update(body("{"+CONTENT.replace("  Bắp rang  ","😀".repeat(150))+"}")).name()).hasSize(300);
        for(String name:new String[]{" ","a".repeat(151),"\\u0000","\\ud800"})
            assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT.replace("  Bắp rang  ",name)+"}"))).isInstanceOf(AdminConcessionFailure.class);
        assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT.replace("null","\" \"")+"}"))).isInstanceOf(AdminConcessionFailure.class);
        assertThatThrownBy(()->AdminConcessionRequest.update(body(" ".repeat(AdminConcessionRequest.MAX_BODY_BYTES+1)))).isInstanceOf(AdminConcessionFailure.class);
    }
    @Test void exactCategoryAndStatusTokens() {
        for(String category:new String[]{"CUSTOM","popcorn",""})
            assertThatThrownBy(()->AdminConcessionRequest.update(body("{"+CONTENT.replace("POPCORN",category)+"}"))).isInstanceOf(AdminConcessionFailure.class);
        for(String status:new String[]{"DRAFT","active",""})
            assertThatThrownBy(()->AdminConcessionRequest.status(body("{\"status\":\""+status+"\"}"))).isInstanceOf(AdminConcessionFailure.class);
        assertThat(AdminConcessionRequest.status(body("{\"status\":\"ACTIVE\"}"))).isEqualTo("ACTIVE");
    }
    @Test void canonicalBigintIdsAndQueryRejection() {
        assertThat(AdminConcessionRequest.id("9007199254740993")).isEqualTo(9007199254740993L);
        assertThat(AdminConcessionRequest.id("9223372036854775807")).isEqualTo(Long.MAX_VALUE);
        for(String id:new String[]{"0","01","-1","9223372036854775808"," 1","1.0"})
            assertThatThrownBy(()->AdminConcessionRequest.id(id)).isInstanceOf(AdminConcessionFailure.class);
        var query=new LinkedMultiValueMap<String,String>(); query.add("page","0");
        assertThatThrownBy(()->AdminConcessionRequest.noQuery(query)).isInstanceOf(AdminConcessionFailure.class);
        assertThat(body("private").toString()).doesNotContain("private");
    }
}
