package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.auth.*;
import com.smartcinema.admin.AdminReportResponse.Metrics;
import com.smartcinema.admin.AdminReportResponse.Period;
import static com.smartcinema.manager.ManagerReportResponse.*;

/** Isolated HTTP/security response fixtures; no real identity, financial result or data mutation. */
@WebMvcTest(controllers=ManagerReportingController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,ManagerReportExceptionHandler.class})
class ManagerReportingControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean ManagerReportService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter limiter;
    static final String PERIOD="?from=2026-10-27&to=2026-10-29";
    static final List<String> PATHS=List.of("/api/v1/manager/dashboard","/api/v1/manager/reports/summary","/api/v1/manager/reports/daily","/api/v1/manager/reports/breakdowns","/api/v1/manager/reports/concessions");
    static RequestPostProcessor role(String role) { return jwt().jwt(j->j.subject("7")).authorities(new SimpleGrantedAuthority("ROLE_"+role)); }
    static Activity activity() { return new Activity(List.of(new StatusCount("PAID","1")),List.of(new StatusCount("SUCCESS","2")),List.of(new StatusCount("VALID","0")),List.of(new StatusCount("ENDED","1")),"0","1"); }
    @Test void anonymousAndEveryWrongRoleDeniedAcrossAllResources() throws Exception {
        for(String path:PATHS) {
            mvc.perform(get(path+PERIOD)).andExpect(status().isUnauthorized());
            for(String role:List.of("ADMIN","STAFF","CUSTOMER"))mvc.perform(get(path+PERIOD).with(role(role))).andExpect(status().isForbidden());
        }
        verifyNoInteractions(service);
    }
    @Test void dashboardAliasesShareExactMetricsAndDoNotExposePrivateData() throws Exception {
        var q=ManagerReportRequest.parse(ManagerReportRequestTests.values(),false);
        when(service.summary(eq(7L),any())).thenReturn(new Summary(Period.of(q),new Metrics("1999999999999998.0000","2000000000000000.1234","2.1234","1999999999999998.0000","2.1234","2","3","4","5","6","7","3","42.8571"),activity()));
        String first=null;
        for(String path:PATHS.subList(0,2)) {
            var result=mvc.perform(get(path+PERIOD).with(role("MANAGER"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                    .andExpect(jsonPath("$.metrics.confirmedRevenue").value("1999999999999998.0000"))
                    .andExpect(jsonPath("$.activity.paymentsByStatus[0].count").value("2"))
                    .andExpect(jsonPath("$.period.paymentEnvironment").value("SANDBOX"))
                    .andExpect(jsonPath("$.customer").doesNotExist()).andExpect(jsonPath("$.bookingQr").doesNotExist()).andReturn().getResponse().getContentAsString();
            if(first==null)first=result;else assertThat(result).isEqualTo(first);
            assertThat(result).doesNotContain("customerId","email","ticketCode","internalReference","signature");
        }
    }
    @Test void allPaginatedAndDailyEndpointsUseTheTypedReadService() throws Exception {
        var q=ManagerReportRequest.parse(ManagerReportRequestTests.values(),false);
        when(service.daily(eq(7L),any())).thenReturn(new Daily(Period.of(q),List.of()));
        when(service.breakdown(eq(7L),any())).thenReturn(new Breakdowns(Period.of(q),com.smartcinema.admin.AdminReportQuery.Dimension.CINEMA,0,20,"0",List.of()));
        when(service.concessions(eq(7L),any())).thenReturn(new Concessions(Period.of(q),0,20,"1",List.of(new Concession("9007199254740993","Product","POPCORN","2","20000.1234","1"))));
        mvc.perform(get(PATHS.get(2)+PERIOD).with(role("MANAGER"))).andExpect(status().isOk());
        mvc.perform(get(PATHS.get(3)+PERIOD+"&dimension=CINEMA").with(role("MANAGER"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value("0"));
        mvc.perform(get(PATHS.get(4)+PERIOD).with(role("MANAGER"))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value("9007199254740993")).andExpect(jsonPath("$.items[0].grossAmount").value("20000.1234"));
    }
    @Test void malformedAndRepeatedFiltersNeverReachService() throws Exception {
        for(String query:List.of("",PERIOD+"&from=2026-10-28",PERIOD+"&actor=8",PERIOD+"&page=1",PERIOD+"&cinemaId=01",PERIOD+"&movieId=9223372036854775808"))
            mvc.perform(get(PATHS.getFirst()+query).with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(get(PATHS.get(3)+PERIOD+"&dimension=SQL").with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(get(PATHS.get(4)+PERIOD+"&dimension=CINEMA").with(role("MANAGER"))).andExpect(status().isBadRequest());verifyNoInteractions(service);
    }
    @Test void invalidSubjectAndCurrentScopeDenialAreSafe() throws Exception {
        mvc.perform(get(PATHS.getFirst()+PERIOD).with(jwt().jwt(j->j.subject("bad")).authorities(new SimpleGrantedAuthority("ROLE_MANAGER")))).andExpect(status().isForbidden());
        for(int status:List.of(403,404)) {
            doThrow(new ManagerFailure(status)).when(service).summary(eq(7L),any());
            mvc.perform(get(PATHS.getFirst()+PERIOD).with(role("MANAGER"))).andExpect(status().is(status)).andExpect(header().string("Cache-Control","no-store"));
        }
    }
    @Test void timeoutAndPersistenceFailuresAre503WithoutInternalDetails() throws Exception {
        when(service.summary(eq(7L),any())).thenThrow(new QueryTimeoutException("secret SQL credential"));
        var body=mvc.perform(get(PATHS.getFirst()+PERIOD).with(role("MANAGER"))).andExpect(status().isServiceUnavailable()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("secret","SQL","credential");
    }
    @Test void noMutationHandlerExists() throws Exception {
        for(String path:PATHS) {
            mvc.perform(post(path).with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());
            mvc.perform(put(path).with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());
            mvc.perform(delete(path).with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());
        }
        verifyNoInteractions(service);
    }
}
