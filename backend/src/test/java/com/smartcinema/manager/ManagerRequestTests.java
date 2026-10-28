package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import com.smartcinema.admin.AdminConfigurationRequest;

class ManagerRequestTests {
    static byte[] raw(String value){return value.getBytes(StandardCharsets.UTF_8);}
    @Test void canonicalBigintIdentityRejectsAliasesAndOverflow(){
        assertThat(ManagerRequest.id("9007199254740993")).isEqualTo(9007199254740993L);
        for(String id:List.of("0","01","-1","1.0","1e3","9223372036854775808"))assertThatThrownBy(()->ManagerRequest.id(id)).isInstanceOf(ManagerFailure.class);
    }
    @Test void strictJsonRejectsDuplicatesTrailingUnknownAndNonobjects(){
        for(String json:List.of("[]","null","{}{}","{\"name\":\"A\",\"name\":\"B\"}"))assertThatThrownBy(()->ManagerRequest.body(raw(json))).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->AdminConfigurationRequest.hall(ManagerRequest.body(raw("{\"name\":\"A\",\"capacity\":1,\"type\":\"2D\",\"status\":\"ACTIVE\",\"actorId\":\"1\"}")))).isInstanceOf(com.smartcinema.movie.InvalidMovieRequestException.class);
    }
    @Test void hallSeatValidatorsAreTheExistingDomainValidators(){
        var hall=AdminConfigurationRequest.hall(ManagerRequest.body(raw("{\"name\":\" A \",\"capacity\":2,\"type\":\"2D\",\"status\":\"ACTIVE\"}")));
        assertThat(hall.name()).isEqualTo("A");assertThat(hall.capacity()).isEqualTo(2);
        var seat=AdminConfigurationRequest.seat(ManagerRequest.body(raw("{\"row\":\"A\",\"number\":\"1-2\",\"type\":\"COUPLE\",\"physicalStatus\":\"ACTIVE\"}")));
        assertThat(seat.type()).isEqualTo("COUPLE");
    }
    @Test void assignmentRequiresExplicitOffsetAndImmutableContent(){
        var value=ManagerRequest.assignment(raw("{\"cinemaId\":\"9007199254740993\",\"effectiveAt\":\"2026-10-27T08:00:00.123456+07:00\"}"));
        assertThat(value.effectiveAt().toString()).isEqualTo("2026-10-27T01:00:00.123456Z");
        for(String instant:List.of("2026-10-27T08:00:00","infinity","2026-10-27T08:00:00.1234567Z"))
            assertThatThrownBy(()->ManagerRequest.assignment(raw("{\"cinemaId\":\"1\",\"effectiveAt\":\""+instant+"\"}"))).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->ManagerRequest.status(raw("{\"status\":\"INACTIVE\",\"effectiveAt\":\"2026-10-27T00:00:00Z\"}"))).isInstanceOf(ManagerFailure.class);
    }
    @Test void reusedShowtimeValidationPreservesExactPriceAndCanonicalNestedIds(){
        var value=ManagerRequest.showtime(raw("{\"movieId\":\"1\",\"hallId\":\"2\",\"startsAt\":\"2030-01-01T08:00:00Z\",\"basePrice\":\"12345.6789\",\"status\":\"DRAFT\"}"));
        assertThat(value.basePrice().toPlainString()).isEqualTo("12345.6789");
        assertThatThrownBy(()->ManagerRequest.showtime(raw("{\"movieId\":\"01\",\"hallId\":\"2\"}"))).isInstanceOf(ManagerFailure.class);
    }
    @Test void duplicateUnknownAndNoncanonicalFiltersRejected(){
        for(String key:List.of("cinemaId","hallId","movieId")){var q=new LinkedMultiValueMap<String,String>();q.add(key,"01");assertThatThrownBy(()->ManagerRequest.filter(q)).isInstanceOf(ManagerFailure.class);}
        var q=new LinkedMultiValueMap<String,String>();q.add("cinemaId","1");q.add("cinemaId","2");assertThatThrownBy(()->ManagerRequest.filter(q)).isInstanceOf(RuntimeException.class);
        q.clear();q.add("actorId","1");assertThatThrownBy(()->ManagerRequest.filter(q)).isInstanceOf(RuntimeException.class);
    }
    @Test void scopeSqlCannotAcceptUserControlledExpressions(){assertThat(ManagerScope.predicate("c.id")).contains("assignment_type='MANAGER'","mu.status='ACTIVE'","effective_at<=clock_timestamp()");assertThatThrownBy(()->ManagerScope.predicate("1 OR true")).isInstanceOf(IllegalArgumentException.class);}
}
