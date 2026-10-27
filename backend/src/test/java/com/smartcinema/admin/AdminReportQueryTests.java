package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

class AdminReportQueryTests {
    static LinkedMultiValueMap<String,String> query() {
        var result=new LinkedMultiValueMap<String,String>();result.add("from","2026-10-27");result.add("to","2026-10-29");return result;
    }
    @Test void halfOpenVietnameseCalendarBoundary() {
        var q=AdminReportQuery.parse(query(),false);
        assertThat(q.start()).isEqualTo(Instant.parse("2026-10-26T17:00:00Z"));
        assertThat(q.end()).isEqualTo(Instant.parse("2026-10-28T17:00:00Z"));
    }
    @Test void strictDatesAndRangeBound() {
        for(String date:List.of("2026-02-30","2026-1-01","0000-01-01","2026-10-27T00:00Z"," 2026-10-27")) {
            var q=query();q.set("from",date);assertThatThrownBy(()->AdminReportQuery.parse(q,false)).isInstanceOf(AdminReportFailure.class);
        }
        for(String to:List.of("2026-10-27","2025-10-27","2027-10-29")) {
            var q=query();q.set("to",to);assertThatThrownBy(()->AdminReportQuery.parse(q,false)).isInstanceOf(AdminReportFailure.class);
        }
        var leap=query();leap.set("from","2024-01-01");leap.set("to","2025-01-01");assertThat(AdminReportQuery.parse(leap,false)).isNotNull();
    }
    @Test void requiredDuplicateBlankUnknownRejected() {
        var missing=query();missing.remove("from");assertThatThrownBy(()->AdminReportQuery.parse(missing,false)).isInstanceOf(AdminReportFailure.class);
        for(String key:List.of("from","cinemaId","unknown","size")) {
            var q=query();q.add(key,"");assertThatThrownBy(()->AdminReportQuery.parse(q,false)).isInstanceOf(AdminReportFailure.class);
        }
        var duplicate=query();duplicate.add("to","2026-10-30");assertThatThrownBy(()->AdminReportQuery.parse(duplicate,false)).isInstanceOf(AdminReportFailure.class);
    }
    @Test void canonicalBigintFiltersRemainExact() {
        for(String key:List.of("cinemaId","movieId","showtimeId"))for(String id:List.of("0","01","-1","1.0","1e3","9223372036854775808")) {
            var q=query();q.set(key,id);assertThatThrownBy(()->AdminReportQuery.parse(q,false)).isInstanceOf(AdminReportFailure.class);
        }
        var q=query();q.set("movieId","9007199254740993");assertThat(AdminReportQuery.parse(q,false).movieId()).isEqualTo(9007199254740993L);
    }
    @Test void enumAndPagingAreStrictBoundedAndOffsetDoesNotOverflow() {
        var q=query();q.set("dimension","CINEMA");q.set("page","2147483647");q.set("size","100");
        var parsed=AdminReportQuery.parse(q,true);assertThat(AdminReportRepository.parameters(parsed).getValue("offset")).isEqualTo(214748364700L);
        for(String dim:List.of("cinema","SQL","")){q.set("dimension",dim);assertThatThrownBy(()->AdminReportQuery.parse(q,true)).isInstanceOf(AdminReportFailure.class);}
        q.set("dimension","MOVIE");
        for(String size:List.of("0","101","1.0","01")){q.set("size",size);assertThatThrownBy(()->AdminReportQuery.parse(q,true)).isInstanceOf(AdminReportFailure.class);}
    }
}
