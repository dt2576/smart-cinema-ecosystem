package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import com.smartcinema.admin.AdminReportFailure;
import com.smartcinema.admin.AdminReportQuery;

class ManagerReportRequestTests {
    static LinkedMultiValueMap<String,String> values(String... pairs) {
        var values=new LinkedMultiValueMap<String,String>();values.set("from","2026-10-27");values.set("to","2026-10-29");
        for(int i=0;i<pairs.length;i+=2)values.set(pairs[i],pairs[i+1]);return values;
    }
    @Test void sameHalfOpenVietnamPeriodAsAdmin() {
        var q=ManagerReportRequest.parse(values(),false);
        assertThat(q).isEqualTo(AdminReportQuery.parse(values(),false));
        assertThat(q.start()).isEqualTo(Instant.parse("2026-10-26T17:00:00Z"));
        assertThat(q.end()).isEqualTo(Instant.parse("2026-10-28T17:00:00Z"));
    }
    @Test void invalidUnknownRepeatedConflictingAndOverlongPeriodsFail() {
        for(var q:List.of(values("from","2026-02-30"),values("from","0000-01-01"),values("to","2026-10-27"),
                values("from","2025-01-01"),values("timezone","UTC"),values("groupBy","month"),values("cinemaId","01"),
                values("movieId","9223372036854775808"),values("showtimeId","' OR true --"),values("page","0")))
            assertThatThrownBy(()->ManagerReportRequest.parse(q,false)).isInstanceOf(AdminReportFailure.class);
        var repeated=values();repeated.add("from","2026-10-28");
        assertThatThrownBy(()->ManagerReportRequest.parse(repeated,false)).isInstanceOf(AdminReportFailure.class);
    }
    @Test void breakdownIsBoundedAndUsesOnlyExistingDimensions() {
        var q=ManagerReportRequest.parse(values("dimension","MOVIE","page","2147483647","size","100","cinemaId","9223372036854775807"),true);
        assertThat(q.cinemaId()).isEqualTo(Long.MAX_VALUE);assertThat((long)q.page()*q.size()).isEqualTo(214748364700L);
        for(var v:List.of(values(),values("dimension","CONCESSION"),values("dimension","MOVIE","size","101"),values("dimension","CINEMA","page","-1")))
            assertThatThrownBy(()->ManagerReportRequest.parse(v,true)).isInstanceOf(AdminReportFailure.class);
    }
    @Test void concessionPagingHasNoInventedDimensionOrSort() {
        var q=ManagerReportRequest.concessions(values("page","2","size","5","cinemaId","1"));
        assertThat(q.page()).isEqualTo(2);assertThat(q.size()).isEqualTo(5);assertThat(q.dimension()).isNull();
        for(var v:List.of(values("dimension","CINEMA"),values("sort","price"),values("size","0"),values("page","01"),values("page","2147483648")))
            assertThatThrownBy(()->ManagerReportRequest.concessions(v)).isInstanceOf(AdminReportFailure.class);
        var repeat=values();repeat.add("size","5");repeat.add("size","10");
        assertThatThrownBy(()->ManagerReportRequest.concessions(repeat)).isInstanceOf(AdminReportFailure.class);
    }
    @Test void workloadAndScopeAreFixedNotSqlControlled() {
        assertThat(ManagerReportSql.COMMON).contains(ManagerScope.predicate("h.cinema_id"),"JOIN scoped s ON s.id=b.showtime_id");
        assertThat(ManagerReportSql.CONCESSION_COMMON).contains(ManagerScope.predicate("h.cinema_id"));
        for(var d:AdminReportQuery.Dimension.values())assertThat(ManagerReportSql.breakdown(d)).contains("LIMIT :limit OFFSET :offset","g.id ASC");
        assertThat(ManagerReportSql.CONCESSIONS).contains("quantity DESC,gross DESC,id ASC LIMIT :limit OFFSET :offset");
    }
}
