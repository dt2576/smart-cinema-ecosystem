package com.smartcinema.staff;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

class StaffAdmissionTests {
    @Test void opaqueUtf8PreservesSpacesCaseAndNormalization() {
        String token="  Vé e\u0301 É 😀 /?+%  ";
        assertThat(StaffAdmissionRequest.qr(Map.of("bookingQr",token)).equals(token)).isTrue();
    }
    @Test void invalidOpaqueTextFailsClosed() {
        for(String token:List.of(" ","x".repeat(129),"x\n","x\u007f","x\uD800","x\uDC00"))
            assertThatThrownBy(()->StaffAdmissionRequest.qr(Map.of("bookingQr",token))).isInstanceOf(StaffFailure.class);
        assertThat(StaffAdmissionRequest.safeText("😀".repeat(128),128)).isTrue();
    }
    @Test void canonicalIdsAndWholeSelection() {
        assertThat(StaffAdmissionRequest.tickets(Map.of("ticketIds",List.of("9007199254740993","9223372036854775807"))))
            .containsExactly(9007199254740993L,Long.MAX_VALUE);
        for(Object ids:List.of(List.of(),List.of("1","1"),List.of("01"),List.of(1),List.of("0"),List.of("9223372036854775808"),"1"))
            assertThatThrownBy(()->StaffAdmissionRequest.tickets(Map.of("ticketIds",ids))).isInstanceOf(StaffFailure.class);
    }
    @Test void exactSingleCinemaQuery() {
        var query=new LinkedMultiValueMap<String,String>();
        assertThatThrownBy(()->StaffAdmissionRequest.cinema(query)).isInstanceOf(StaffFailure.class);
        query.add("cinemaId","1");assertThat(StaffAdmissionRequest.cinema(query)).isEqualTo(1);
        query.add("cinemaId","1");assertThatThrownBy(()->StaffAdmissionRequest.cinema(query)).isInstanceOf(StaffFailure.class);
    }
    @Test void strictJsonRejectsUnknownDuplicateTrailingAndNumericIds() {
        for(String raw:List.of("{\"cinemaId\":\"1\",\"bookingQr\":\"a\",\"actor\":\"1\"}",
            "{\"cinemaId\":\"1\",\"cinemaId\":\"2\",\"bookingQr\":\"a\"}","{} {}","[]"))
            assertThatThrownBy(()->StaffRequest.body(new StaffSensitiveBody(raw),"cinemaId","bookingQr")).isInstanceOf(StaffFailure.class);
        var input=StaffRequest.body(new StaffSensitiveBody("{\"cinemaId\":1,\"bookingQr\":\"a\"}"),"cinemaId","bookingQr");
        assertThatThrownBy(()->StaffRequest.text(input,"cinemaId")).isInstanceOf(StaffFailure.class);
    }
    @Test void inclusiveWindowAtMicrosecondPrecision() {
        Instant start=Instant.parse("2026-10-13T12:00:00Z");
        for(Instant now:List.of(start.minusSeconds(1800),start,start.plusSeconds(900)))
            assertThat(StaffAdmissionService.reason(true,start,"OPEN_FOR_BOOKING","ACTIVE","ACTIVE",now)).isNull();
        for(Instant now:List.of(start.minusSeconds(1800).minusNanos(1000),start.plusSeconds(900).plusNanos(1000)))
            assertThat(StaffAdmissionService.reason(true,start,"STARTED","ACTIVE","ACTIVE",now)).isEqualTo("OUTSIDE_ADMISSION_WINDOW");
    }
    @Test void advisoryReasonsUseOnlyApprovedContextStates() {
        Instant now=Instant.now();
        for(String state:List.of("DRAFT","SCHEDULED","ENDED","CANCELLED"))
            assertThat(StaffAdmissionService.reason(true,now,state,"ACTIVE","ACTIVE",now)).isEqualTo("CONTEXT_UNAVAILABLE");
        assertThat(StaffAdmissionService.reason(false,now,"STARTED","ACTIVE","ACTIVE",now)).isEqualTo("NOT_PAID");
        assertThat(StaffAdmissionService.reason(true,now,"STARTED","ACTIVE","MAINTENANCE",now)).isEqualTo("CONTEXT_UNAVAILABLE");
    }
    @Test void bodyDiagnosticsAreRedactedAndBoundsRemainDistinct() {
        assertThat(new StaffSensitiveBody("private-fixture").toString()).doesNotContain("private-fixture");
        String body="{\"cinemaId\":\"1\",\"ticketIds\":[\"1\"]}"+" ".repeat(70000);
        assertThatThrownBy(()->StaffRequest.body(new StaffSensitiveBody(body),"cinemaId","ticketIds")).isInstanceOf(StaffFailure.class);
        assertThat(StaffRequest.body(new StaffSensitiveBody(body),1048576,"cinemaId","ticketIds")).containsKey("ticketIds");
    }
    @Test void interruptedBodyStreamFailsSafelyBeforeBindingOrCommand() throws Exception {
        var request=org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletRequest.class);
        org.mockito.Mockito.when(request.getRequestURI()).thenReturn("/api/v1/staff/bookings/1/check-ins");
        org.mockito.Mockito.when(request.getMethod()).thenReturn("POST");
        org.mockito.Mockito.when(request.getInputStream()).thenThrow(new java.io.IOException("private stream fixture"));
        var response=new org.springframework.mock.web.MockHttpServletResponse();var chain=org.mockito.Mockito.mock(jakarta.servlet.FilterChain.class);
        new StaffRequestFilter(org.mockito.Mockito.mock(StaffRateLimiter.class)).doFilter(request,response,chain);
        assertThat(response.getStatus()).isEqualTo(503);assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getContentAsString()).doesNotContain("private stream fixture");org.mockito.Mockito.verifyNoInteractions(chain);
    }
}
