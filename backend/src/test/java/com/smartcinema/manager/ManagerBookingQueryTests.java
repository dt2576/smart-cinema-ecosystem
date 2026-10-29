package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

class ManagerBookingQueryTests {
    @Test void defaultsAndLargestPageOffsetRemainBounded(){var q=ManagerBookingQuery.parse(new LinkedMultiValueMap<>());assertThat(q.page()).isZero();assertThat(q.size()).isEqualTo(20);var v=new LinkedMultiValueMap<String,String>();v.set("page","2147483647");v.set("size","100");assertThat(ManagerBookingQuery.parse(v).offset()).isEqualTo(214748364700L);}
    @Test void exactBigintsAndOffsetPeriodPreservePrecision(){
        var v=new LinkedMultiValueMap<String,String>();v.set("cinemaId","9007199254740993");v.set("showtimeId","9223372036854775807");v.set("bookingCode","SC-Exact");v.set("status","EXPIRED");v.set("paymentStatus","FAILED");v.set("createdFrom","2026-10-29T07:00:00.123456+07:00");v.set("createdTo","2026-10-30T00:00:00Z");
        var q=ManagerBookingQuery.parse(v);assertThat(q.cinemaId()).isEqualTo(9007199254740993L);assertThat(q.showtimeId()).isEqualTo(Long.MAX_VALUE);assertThat(q.createdFrom()).isEqualTo(Instant.parse("2026-10-29T00:00:00.123456Z"));assertThat(q.bookingCode()).isEqualTo("SC-Exact");
    }
    @Test void unknownRepeatedBlankAndMalformedFiltersFail(){
        for(String key:List.of("customerId","actor","sort","qr","search")){var v=new LinkedMultiValueMap<String,String>();v.set(key,"1");assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
        for(String key:List.of("cinemaId","showtimeId","bookingId","bookingCode","status","paymentStatus","createdFrom","createdTo","page","size")){
            var v=new LinkedMultiValueMap<String,String>();v.add(key,"1");v.add(key,"2");assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);v.set(key,"");assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);
        }
    }
    @Test void idsPaginationStatesAndCodesCannotInventOrOverflow(){
        for(String value:List.of("0","01","-1","1e2","9223372036854775808"," 1")){var v=new LinkedMultiValueMap<String,String>();v.set("bookingId",value);assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
        for(String value:List.of("0","101","-1","1.5","01")){var v=new LinkedMultiValueMap<String,String>();v.set("size",value);assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
        for(String key:List.of("status","paymentStatus")){var v=new LinkedMultiValueMap<String,String>();v.set(key,"REFUNDED");assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
        for(String value:List.of("a".repeat(41),"code\nsecret")){var v=new LinkedMultiValueMap<String,String>();v.set("bookingCode",value);assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
    }
    @Test void datePeriodRequiresExplicitOffsetMicrosecondsAndIncreasingBounds(){
        for(String value:List.of("2026-10-29","2026-10-29T12:00:00","2026-02-30T00:00Z","2026-10-29T00:00:00.1234567Z")){var v=new LinkedMultiValueMap<String,String>();v.set("createdFrom",value);assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);}
        var v=new LinkedMultiValueMap<String,String>();v.set("createdFrom","2026-10-29T00:00Z");v.set("createdTo","2026-10-29T00:00Z");assertThatThrownBy(()->ManagerBookingQuery.parse(v)).isInstanceOf(ManagerFailure.class);
    }
}
