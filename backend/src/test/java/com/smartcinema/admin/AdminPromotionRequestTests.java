package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminPromotionRequestTests {
    static final String CONTENT = "\"discountType\":\"PERCENTAGE\",\"discountValue\":\"10.1234\",\"validFrom\":\"2026-10-27T00:00:00Z\",\"validUntil\":\"2026-11-27T00:00:00Z\",\"minimumOrderAmount\":\"0\",\"usageLimit\":null,\"maxDiscountAmount\":\"1000.1234\"";
    static final String CREATE = "{\"code\":\" sample-code \"," + CONTENT + ",\"status\":\"ACTIVE\"}";
    static AdminPromotionRequest.Input parse(String s) { return AdminPromotionRequest.create(new AdminPromotionBody(s)); }
    @Test void normalizeCodeAndPreserveExactDecimal() {
        var v=parse(CREATE); assertThat(v.code()).isEqualTo("SAMPLE-CODE");
        assertThat(v.discountValue().toPlainString()).isEqualTo("10.1234");
        assertThat(v.maxDiscountAmount().toPlainString()).isEqualTo("1000.1234");
    }
    @Test void exactMonetaryBoundsAndPercentageLimit() {
        for(String value:List.of("-1","01","1e2","NaN","100.0001","0.00001","1000000000000000"))
            assertThatThrownBy(()->parse(CREATE.replace("10.1234",value))).isInstanceOf(AdminPromotionFailure.class);
        assertThat(parse(CREATE.replace("10.1234","100")).discountValue()).isEqualByComparingTo("100");
        assertThat(parse(CREATE.replace("10.1234","0")).discountValue()).isZero();
    }
    @Test void fixedAmountAllowsFractionButNoCap() {
        String v=CREATE.replace("PERCENTAGE","FIXED_AMOUNT").replace("\"1000.1234\"","null");
        assertThat(parse(v).discountValue()).isEqualByComparingTo("10.1234");
        assertThatThrownBy(()->parse(v.replace("\"maxDiscountAmount\":null","\"maxDiscountAmount\":\"0\""))).isInstanceOf(AdminPromotionFailure.class);
    }
    @Test void validityRequiresExplicitOffsetOrderedFiniteMicroseconds() {
        for(String value:List.of("2026-10-27T00:00:00","2026-11-27T00:00:00Z","2026-10-27T00:00:00.0000001Z","infinity"))
            assertThatThrownBy(()->parse(CREATE.replace("2026-10-27T00:00:00Z",value))).isInstanceOf(AdminPromotionFailure.class);
        assertThat(parse(CREATE.replace("2026-10-27T00:00:00Z","2026-10-27T07:00:00+07:00")).validFrom()).isEqualTo(Instant.parse("2026-10-27T00:00:00Z"));
    }
    @Test void usageIsNullablePositiveIntegerNotMoneyOrIdentity() {
        for(String v:List.of("0","-1","1.0","2147483648","\"1\"","true"))
            assertThatThrownBy(()->parse(CREATE.replace("\"usageLimit\":null","\"usageLimit\":"+v))).isInstanceOf(AdminPromotionFailure.class);
        assertThat(parse(CREATE.replace("\"usageLimit\":null","\"usageLimit\":2147483647")).usageLimit()).isEqualTo(Integer.MAX_VALUE);
    }
    @Test void codeEncodingAndLength() {
        for(String v:List.of(" ","X".repeat(51),"bad\u0000code","\uD800"))
            assertThatThrownBy(()->parse(CREATE.replace(" sample-code ",v))).isInstanceOf(AdminPromotionFailure.class);
    }
    @Test void malformedUnknownMissingDuplicateAndWrongTypesRejected() {
        for(String v:List.of("{}","null","[]",CREATE+"{}",CREATE.replace("\"code\":","\"code\":\"X\",\"code\":"),CREATE.replace("}",",\"id\":\"1\"}"),CREATE.replace("\"10.1234\"","10.1234")))
            assertThatThrownBy(()->parse(v)).isInstanceOf(AdminPromotionFailure.class);
    }
    @Test void immutableCodeAndSeparateStatus() {
        assertThat(AdminPromotionRequest.update(new AdminPromotionBody("{"+CONTENT+"}")).code()).isNull();
        assertThatThrownBy(()->AdminPromotionRequest.update(new AdminPromotionBody(CREATE))).isInstanceOf(AdminPromotionFailure.class);
        assertThat(AdminPromotionRequest.status(new AdminPromotionBody("{\"status\":\"INACTIVE\"}"))).isEqualTo("INACTIVE");
        assertThatThrownBy(()->parse(CREATE.replace("ACTIVE","EXPIRED"))).isInstanceOf(AdminPromotionFailure.class);
    }
    @Test void idsAreCanonicalAndToStringRedacted() {
        assertThat(AdminPromotionRequest.id("9223372036854775807")).isEqualTo(Long.MAX_VALUE);
        for(String v:List.of("0","01","-1","9223372036854775808","1.0")) assertThatThrownBy(()->AdminPromotionRequest.id(v)).isInstanceOf(AdminPromotionFailure.class);
        assertThat(parse(CREATE).toString()).doesNotContain("SAMPLE-CODE");
    }
}
