package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.smartcinema.auth.AuthSecurityConfiguration;
import static com.smartcinema.admin.AdminReportResponse.*;

@WebMvcTest(controllers=AdminReportingController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,com.smartcinema.auth.SecurityProblemHandler.class,AdminReportExceptionHandler.class})
class AdminReportingControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean AdminReportService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter staffRateLimiter;
    static final String PERIOD="?from=2026-10-27&to=2026-10-29";
    static final List<String> PATHS=List.of("/api/v1/admin/dashboard","/api/v1/admin/reports/summary","/api/v1/admin/reports/daily","/api/v1/admin/reports/breakdowns");
    static org.springframework.test.web.servlet.request.RequestPostProcessor actor(String role) {
        return jwt().jwt(j->j.subject("1").claim("role",role)).authorities(new SimpleGrantedAuthority("ROLE_"+role));
    }
    @Test void anonymousEveryReadDenied()throws Exception {
        for(String path:PATHS)mvc.perform(get(path+PERIOD+"&dimension=CINEMA")).andExpect(status().isUnauthorized());verifyNoInteractions(service);
    }
    @Test void everyWrongRoleDenied()throws Exception {
        for(String role:List.of("CUSTOMER","STAFF","MANAGER"))for(String path:PATHS)
            mvc.perform(get(path+PERIOD).with(actor(role))).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void dashboardAndSummaryUseSameContractExactStringsNoStore()throws Exception {
        var q=AdminReportQuery.parse(AdminReportQueryTests.query(),false);
        when(service.summary(eq(1L),any())).thenReturn(new Summary(Period.of(q),new Metrics("99990.0000","100000.1234","10.1234","80000.0000","20000.1234","1","1","2","3","4","10","1","10.0000")));
        String first=null;
        for(String path:PATHS.subList(0,2)) {
            String result=mvc.perform(get(path+PERIOD).with(actor("ADMIN"))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.metrics.confirmedRevenue").value("99990.0000"))
                .andExpect(jsonPath("$.period.paymentEnvironment").value("SANDBOX")).andReturn().getResponse().getContentAsString();
            if(first==null)first=result;else assertThat(result).isEqualTo(first);
        }
    }
    @Test void invalidRequestsDoNotReachService()throws Exception {
        for(String suffix:List.of("","?from=2026-10-27&to=2026-10-27",PERIOD+"&cinemaId=01",PERIOD+"&from=2026-10-28",PERIOD+"&injected=query"))
            mvc.perform(get(PATHS.getFirst()+suffix).with(actor("ADMIN"))).andExpect(status().isBadRequest());
        mvc.perform(get(PATHS.getLast()+PERIOD).with(actor("ADMIN"))).andExpect(status().isBadRequest());verifyNoInteractions(service);
    }
    @Test void staleAdminAndDatabaseFailureAreSafe()throws Exception {
        when(service.summary(eq(1L),any())).thenThrow(new AccessDeniedException("private"));
        mvc.perform(get(PATHS.getFirst()+PERIOD).with(actor("ADMIN"))).andExpect(status().isForbidden());
        when(service.summary(eq(1L),any())).thenThrow(new DataAccessResourceFailureException("private SQL credential"));
        var r=mvc.perform(get(PATHS.getFirst()+PERIOD).with(actor("ADMIN"))).andExpect(status().isServiceUnavailable())
            .andExpect(header().string("Cache-Control","no-store")).andReturn();
        assertThat(r.getResponse().getContentAsString()).doesNotContain("private","SQL","credential");
    }
}
