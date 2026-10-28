package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.*;
import com.smartcinema.admin.*;
import com.smartcinema.auth.*;

/** Security/MVC fixtures, never PostgreSQL or scope-finalization proof. */
@WebMvcTest(controllers={ManagerController.class,AdminManagerController.class},properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,ManagerExceptionHandler.class})
class ManagerControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean ManagerService service;
    @MockitoBean AdminManagerService assignments;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter staffRateLimiter;
    private static RequestPostProcessor role(String role){return jwt().jwt(j->j.subject("7")).authorities(new SimpleGrantedAuthority("ROLE_"+role));}
    private static List<MockHttpServletRequestBuilder> operations(){return List.of(get("/api/v1/manager/cinemas"),get("/api/v1/manager/cinemas/1"),get("/api/v1/manager/cinemas/1/halls"),post("/api/v1/manager/cinemas/1/halls").content("{}"),get("/api/v1/manager/halls/1"),put("/api/v1/manager/halls/1").content("{}"),get("/api/v1/manager/halls/1/seats"),post("/api/v1/manager/halls/1/seats").content("{}"),get("/api/v1/manager/seats/1"),put("/api/v1/manager/seats/1").content("{}"),get("/api/v1/manager/showtimes"),get("/api/v1/manager/showtimes/1"),post("/api/v1/manager/showtimes").content("{}"),put("/api/v1/manager/showtimes/1").content("{}"),get("/api/v1/manager/cinemas/1/staff"));}
    @Test void anonymousEveryManagerOperationDenied()throws Exception{for(var request:operations())mvc.perform(request.contentType("application/json")).andExpect(status().isUnauthorized());verifyNoInteractions(service);}
    @Test void allOtherRolesIncludingAdminDeniedManagerOperations()throws Exception{for(String role:List.of("CUSTOMER","STAFF","ADMIN"))for(var request:operations())mvc.perform(request.with(role(role)).contentType("application/json")).andExpect(status().isForbidden());verifyNoInteractions(service);}
    @Test void managerCannotGrantItsOwnAssignment()throws Exception{
        for(var request:List.of(get("/api/v1/admin/managers"),get("/api/v1/admin/managers/7/cinema-assignments"),post("/api/v1/admin/managers/7/cinema-assignments").content("{}"),put("/api/v1/admin/managers/7/cinema-assignments/1/status").content("{}")))mvc.perform(request.with(role("MANAGER")).contentType("application/json")).andExpect(status().isForbidden());verifyNoInteractions(assignments);
    }
    @Test void managerReadUsesSubjectAndExactStringIdentityNoStore()throws Exception{
        when(service.cinemas(7)).thenReturn(List.of(new AdminConfigurationRepository.Cinema("9007199254740993","Cinema","Address",null,null,"ACTIVE")));
        mvc.perform(get("/api/v1/manager/cinemas").with(role("MANAGER"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$[0].id").value("9007199254740993"));verify(service).cinemas(7);
    }
    @Test void scopedHallCreationAndLocationUseValidatedContent()throws Exception{
        when(service.saveHall(eq(7L),eq(2L),isNull(),any())).thenReturn(new AdminConfigurationRepository.Hall("3","2","Hall",2,"2D","ACTIVE",false));
        mvc.perform(post("/api/v1/manager/cinemas/2/halls").with(role("MANAGER")).contentType("application/json").content("{\"name\":\"Hall\",\"capacity\":2,\"type\":\"2D\",\"status\":\"ACTIVE\"}")).andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/manager/halls/3"));
    }
    @Test void identityAndBodyTamperingNeverReachWriter()throws Exception{
        mvc.perform(get("/api/v1/manager/halls/01").with(role("MANAGER"))).andExpect(status().isBadRequest());
        for(String content:List.of("{\"name\":\"A\",\"name\":\"B\"}","{\"name\":\"Hall\",\"capacity\":1,\"type\":\"2D\",\"status\":\"ACTIVE\",\"cinemaId\":\"9\"}"))mvc.perform(put("/api/v1/manager/halls/1").with(role("MANAGER")).contentType("application/json").content(content)).andExpect(status().isBadRequest());verifyNoInteractions(service);
    }
    @Test void currentRevokedScopeAndDatabaseErrorsAreSafe()throws Exception{
        when(service.cinemas(7)).thenThrow(new ManagerFailure(403));mvc.perform(get("/api/v1/manager/cinemas").with(role("MANAGER"))).andExpect(status().isForbidden());
        when(service.cinema(7,2)).thenThrow(new ManagerFailure(404));mvc.perform(get("/api/v1/manager/cinemas/2").with(role("MANAGER"))).andExpect(status().isNotFound());
        for(String state:List.of("P0003","23505","23P01","57014")){
            doThrow(new DataAccessResourceFailureException("private SQL",new SQLException("credential",state))).when(service).hall(7,1);
            var result=mvc.perform(get("/api/v1/manager/halls/1").with(role("MANAGER"))).andExpect(status().isConflict()).andReturn();assertThat(result.getResponse().getContentAsString()).doesNotContain("private","credential");
        }
        doThrow(new DataAccessResourceFailureException("private SQL")).when(service).hall(7,1);mvc.perform(get("/api/v1/manager/halls/1").with(role("MANAGER"))).andExpect(status().isServiceUnavailable());
    }
    @Test void adminAssignmentReadsAreStillAdminOnly()throws Exception{
        when(assignments.list(7)).thenReturn(List.of());mvc.perform(get("/api/v1/admin/managers").with(role("ADMIN"))).andExpect(status().isOk()).andExpect(content().json("[]"));
        for(String role:List.of("CUSTOMER","STAFF"))mvc.perform(get("/api/v1/admin/managers").with(role(role))).andExpect(status().isForbidden());
    }
}
