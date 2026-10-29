package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.math.BigDecimal;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.util.LinkedMultiValueMap;

/** JDBC mapping/query-construction fixtures, independent of any database. */
class ManagerBookingRepositoryTests {
    final NamedParameterJdbcTemplate jdbc=mock(NamedParameterJdbcTemplate.class);
    final ManagerBookingRepository repository=new ManagerBookingRepository(jdbc);
    final Instant now=Instant.parse("2026-10-29T00:00:00Z");
    @SuppressWarnings("unchecked")
    void rows()throws Exception{
        var row=mock(ResultSet.class);var strings=Map.ofEntries(Map.entry("id","9007199254740993"),Map.entry("booking_code","QA-EXACT"),Map.entry("effective_status","EXPIRED"),Map.entry("stored_status","PENDING"),Map.entry("payment_id","9007199254740994"),Map.entry("payment_status","FAILED"),Map.entry("seat_type_snapshot","COUPLE"));
        when(row.getString(anyString())).thenAnswer(i->strings.get(i.getArgument(0)));
        when(row.getBigDecimal(anyString())).thenReturn(new BigDecimal("12345.6789"));when(row.getInt(anyString())).thenReturn(1);
        when(row.getTimestamp(anyString())).thenReturn(Timestamp.from(now));
        when(jdbc.queryForObject(anyString(),any(SqlParameterSource.class),eq(Long.class))).thenReturn(1L);
        doAnswer(i->List.of(((RowMapper<Object>)i.getArgument(2)).mapRow(row,0))).when(jdbc).query(anyString(),any(SqlParameterSource.class),any(RowMapper.class));
    }
    @Test void allDetailReadsRetainScopeAndNeverSelectCustomerQrOrProviderSecrets()throws Exception{
        rows();var detail=repository.detail(7,9007199254740993L,now);
        assertThat(detail.booking().id()).isEqualTo("9007199254740993");assertThat(detail.amounts().finalAmount()).isEqualTo("12345.6789");assertThat(detail.seats().getFirst().guestCount()).isEqualTo(2);
        var calls=mockingDetails(jdbc).getInvocations();assertThat(calls).hasSize(5);
        for(var call:calls){String sql=call.getArgument(0);assertThat(sql).contains(ManagerBookingRepository.SCOPE,"b.id=:id").doesNotContain("customer_id","booking_qr_token","provider_metadata","internal_reference","ticket_code","UPDATE ","INSERT ","DELETE ","FOR UPDATE");var p=(SqlParameterSource)call.getArgument(1);assertThat(p.getValue("actor")).isEqualTo(7L);assertThat(p.getValue("id")).isEqualTo(9007199254740993L);}
    }
    @Test void missingOrForeignDetailStopsBeforeChildQueries(){when(jdbc.query(anyString(),any(SqlParameterSource.class),org.mockito.ArgumentMatchers.<RowMapper<Object>>any())).thenReturn(List.of());assertThatThrownBy(()->repository.detail(7,99,now)).isInstanceOf(ManagerFailure.class);assertThat(mockingDetails(jdbc).getInvocations()).hasSize(1);}
    @Test void filtersAreBoundAndCountUsesSameScopeAsStablePage()throws Exception{
        rows();var values=new LinkedMultiValueMap<String,String>();values.set("bookingCode","' OR true --");values.set("status","EXPIRED");values.set("paymentStatus","FAILED");values.set("createdFrom","2026-10-28T00:00Z");values.set("createdTo","2026-10-30T00:00Z");
        var page=repository.list(7,ManagerBookingQuery.parse(values),now);assertThat(page.totalElements()).isEqualTo(1);assertThat(page.items().getFirst().storedStatus()).isEqualTo("PENDING");
        for(var call:mockingDetails(jdbc).getInvocations()){String sql=call.getArgument(0);assertThat(sql).contains(ManagerBookingRepository.SCOPE,"b.created_at>=:from","b.created_at<:to","lp.payment_status=:payment").doesNotContain("' OR true --");var p=(SqlParameterSource)call.getArgument(1);assertThat(p.getValue("code")).isEqualTo("' OR true --");}
        assertThat(mockingDetails(jdbc).getInvocations().stream().map(i->(String)i.getArgument(0))).anyMatch(s->s.contains("ORDER BY b.created_at DESC,b.id ASC LIMIT :limit OFFSET :offset"));
    }
    @Test void emptyPageHasZeroTotalPagesAndNoInventedPayment(){when(jdbc.queryForObject(anyString(),any(SqlParameterSource.class),eq(Long.class))).thenReturn(0L);when(jdbc.query(anyString(),any(SqlParameterSource.class),org.mockito.ArgumentMatchers.<RowMapper<Object>>any())).thenReturn(List.of());var page=repository.list(7,ManagerBookingQuery.parse(new LinkedMultiValueMap<>()),now);assertThat(page.items()).isEmpty();assertThat(page.totalPages()).isZero();}
}
