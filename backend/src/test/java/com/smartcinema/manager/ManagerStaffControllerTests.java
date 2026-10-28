package com.smartcinema.manager;

import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.*;
import com.smartcinema.auth.*;
import com.smartcinema.staff.StaffRepository.Assignment;
import com.smartcinema.manager.ManagerStaffRepository.*;

/** MVC/security fixtures only; PostgreSQL scope and locking are verified separately. */
@WebMvcTest(controllers=ManagerStaffController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,ManagerExceptionHandler.class})
class ManagerStaffControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean ManagerStaffService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter limiter;
    static final String ROOT="/api/v1/manager/cinemas/2";
    static final Assignment ASSIGNMENT=new Assignment("9007199254740993","3","2","QA Cinema","STAFF","ACTIVE",Instant.parse("2030-01-01T00:00:00Z"));
    private static RequestPostProcessor role(String role) { return jwt().jwt(j->j.subject("7")).authorities(new SimpleGrantedAuthority("ROLE_"+role)); }
    private static List<MockHttpServletRequestBuilder> operations() { return List.of(get(ROOT+"/staff-assignments"),get(ROOT+"/staff/3"),post(ROOT+"/staff/3/cinema-assignments").content("{\"cinemaId\":\"2\",\"effectiveAt\":\"2030-01-01T00:00:00Z\"}"),put(ROOT+"/staff/3/cinema-assignments/4/status").content("{\"status\":\"INACTIVE\"}")); }
    @Test void anonymousEveryOperationDenied()throws Exception { for(var r:operations())mvc.perform(r.contentType("application/json")).andExpect(status().isUnauthorized());verifyNoInteractions(service); }
    @Test void customerStaffAndAdminCannotEnterManagerNamespace()throws Exception { for(String role:List.of("CUSTOMER","STAFF","ADMIN"))for(var r:operations())mvc.perform(r.with(role(role)).contentType("application/json")).andExpect(status().isForbidden());verifyNoInteractions(service); }
    @Test void historyUsesServerSubjectAndStringIdentitiesWithoutInvitationFields()throws Exception {
        when(service.memberships(7,2)).thenReturn(List.of(new Membership(new Profile("3","QA Staff","staff@example.test","0910000000","BLOCKED"),ASSIGNMENT)));
        mvc.perform(get(ROOT+"/staff-assignments").with(role("MANAGER"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
          .andExpect(jsonPath("$[0].assignment.id").value("9007199254740993")).andExpect(jsonPath("$[0].staff.status").value("BLOCKED"))
          .andExpect(jsonPath("$[0].staff.passwordSetupCompleted").doesNotExist()).andExpect(jsonPath("$[0].staff.deliveryStatus").doesNotExist());
    }
    @Test void createUsesExplicitSourceAndTargetScopeAndReturnsOwnedDetailLocation()throws Exception {
        when(service.assign(eq(7L),eq(2L),eq(3L),any())).thenReturn(ASSIGNMENT);
        mvc.perform(post(ROOT+"/staff/3/cinema-assignments").with(role("MANAGER")).contentType("application/json").content("{\"cinemaId\":\"2\",\"effectiveAt\":\"2030-01-01T00:00:00Z\"}"))
          .andExpect(status().isCreated()).andExpect(header().string("Location",ROOT+"/staff/3")).andExpect(jsonPath("$.assignmentType").value("STAFF"));
    }
    @Test void statusOnlyCommandCannotReassignOrAlterEffectiveInstant()throws Exception {
        when(service.status(7,2,3,4,"INACTIVE")).thenReturn(new Assignment("4","3","2","QA Cinema","STAFF","INACTIVE",ASSIGNMENT.effectiveAt()));
        mvc.perform(put(ROOT+"/staff/3/cinema-assignments/4/status").with(role("MANAGER")).contentType("application/json").content("{\"status\":\"INACTIVE\"}"))
          .andExpect(status().isOk()).andExpect(jsonPath("$.effectiveAt").value("2030-01-01T00:00:00Z"));
        verify(service).status(7,2,3,4,"INACTIVE");
    }
    @Test void forgedRolesActorsIdsAndDuplicateFieldsNeverReachService()throws Exception {
        for(String raw:List.of("{\"cinemaId\":2,\"effectiveAt\":\"2030-01-01T00:00:00Z\"}","{\"cinemaId\":\"2\",\"effectiveAt\":\"2030-01-01T00:00:00Z\",\"role\":\"ADMIN\"}","{\"cinemaId\":\"2\",\"cinemaId\":\"9\",\"effectiveAt\":\"2030-01-01T00:00:00Z\"}","{\"cinemaId\":\"2\",\"effectiveAt\":\"2030-01-01T00:00:00.1234567Z\"}"))
          mvc.perform(post(ROOT+"/staff/3/cinema-assignments").with(role("MANAGER")).contentType("application/json").content(raw)).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT+"/staff/03").with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT+"/staff-assignments?userId=9").with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(put(ROOT+"/staff/3/cinema-assignments/4/status").with(role("MANAGER")).contentType("application/json").content("{\"status\":\"BLOCKED\"}")).andExpect(status().isBadRequest());verifyNoInteractions(service);
    }
    @Test void currentDeniedMissingAndConflictingStatesRemainSafe()throws Exception {
        for(int code:List.of(403,404,409,503)) { doThrow(new ManagerFailure(code)).when(service).memberships(7,2);
          mvc.perform(get(ROOT+"/staff-assignments").with(role("MANAGER"))).andExpect(status().is(code)).andExpect(header().string("Cache-Control","no-store")); }
    }
}
