package com.smartcinema.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.*;
import com.smartcinema.auth.*;

/** MVC/security fixtures, not PostgreSQL verification. */
@WebMvcTest(controllers=AdminPromotionController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,AdminPromotionWebConfiguration.class,AdminPromotionExceptionHandler.class})
class AdminPromotionControllerTests {
    private static final String ROOT="/api/v1/admin/promotions";
    @Autowired MockMvc mvc;
    @MockitoBean AdminPromotionService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter staffRateLimiter;
    private RequestPostProcessor actor(String role) { return jwt().jwt(t->t.subject("1")).authorities(()->"ROLE_"+role); }
    private AdminPromotion item() { return new AdminPromotion("9007199254740993","TEST","PERCENTAGE","10.1234",Instant.parse("2026-10-27T00:00:00Z"),Instant.parse("2026-11-27T00:00:00Z"),"0.0000",null,"ACTIVE",null); }
    private List<MockHttpServletRequestBuilder> operations() { return List.of(get(ROOT),get(ROOT+"/1"),post(ROOT).content(AdminPromotionRequestTests.CREATE),put(ROOT+"/1").content("{"+AdminPromotionRequestTests.CONTENT+"}"),put(ROOT+"/1/status").content("{\"status\":\"INACTIVE\"}")); }
    @Test void anonymousEveryEndpoint401() throws Exception {
        for(var r:operations()) mvc.perform(r.contentType("application/json")).andExpect(status().isUnauthorized()); verifyNoInteractions(service);
    }
    @Test void otherRolesDeniedEveryEndpoint() throws Exception {
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) for(var r:operations()) mvc.perform(r.with(actor(role)).contentType("application/json")).andExpect(status().isForbidden()); verifyNoInteractions(service);
    }
    @Test void readResponsesUseExactStringsAndNoStore() throws Exception {
        when(service.list(1)).thenReturn(List.of(item())); when(service.detail(1,9007199254740993L)).thenReturn(item());
        for(String p:List.of(ROOT,ROOT+"/9007199254740993")) {
            var r=mvc.perform(get(p).with(actor("ADMIN"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn();
            assertThat(r.getResponse().getContentAsString()).contains("\"9007199254740993\"","\"10.1234\"");
        }
    }
    @Test void emptyReadIsArray() throws Exception {
        when(service.list(1)).thenReturn(List.of()); mvc.perform(get(ROOT).with(actor("ADMIN"))).andExpect(content().json("[]"));
    }
    @Test void mutationsAreExplicitSeparateCommands() throws Exception {
        when(service.create(eq(1L),any())).thenReturn(item()); when(service.update(eq(1L),eq(1L),any())).thenReturn(item()); when(service.status(1,1,"INACTIVE")).thenReturn(item());
        mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(AdminPromotionRequestTests.CREATE)).andExpect(status().isCreated()).andExpect(header().string("Location",ROOT+"/9007199254740993"));
        mvc.perform(put(ROOT+"/1").with(actor("ADMIN")).contentType("application/json").content("{"+AdminPromotionRequestTests.CONTENT+"}")).andExpect(status().isOk());
        mvc.perform(put(ROOT+"/1/status").with(actor("ADMIN")).contentType("application/json").content("{\"status\":\"INACTIVE\"}")).andExpect(status().isOk());
        verify(service).update(eq(1L),eq(1L),argThat(v->v.code()==null&&v.status()==null));
    }
    @Test void badUtf8OversizeDuplicateAndUnknownRejected() throws Exception {
        for(byte[] v:List.of(new byte[]{(byte)0xc3,(byte)0x28},new byte[AdminPromotionRequest.MAX_BODY_BYTES+1],"{\"code\":1,\"code\":2}".getBytes(),"{\"invented\":true}".getBytes())) mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(v)).andExpect(status().isBadRequest()); verifyNoInteractions(service);
    }
    @Test void pathQueryAndSubjectRejectBeforeService() throws Exception {
        for(String v:List.of("0","01","9223372036854775808")) mvc.perform(get(ROOT+"/"+v).with(actor("ADMIN"))).andExpect(status().isBadRequest());
        for(var r:operations()) mvc.perform(r.with(actor("ADMIN")).queryParam("page","0").contentType("application/json")).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT).with(jwt().jwt(t->t.subject("01")).authorities(()->"ROLE_ADMIN"))).andExpect(status().isForbidden()); verifyNoInteractions(service);
    }
    @Test void sqlFailuresMapToSafeErrors() throws Exception {
        for(var p:List.of(new String[]{"P0004","403"},new String[]{"P0002","404"},new String[]{"P0001","400"},new String[]{"23505","409"},new String[]{"55P03","409"},new String[]{"40001","409"},new String[]{"42501","503"})) {
            doThrow(new DataIntegrityViolationException("private sql",new SQLException("private",p[0]))).when(service).list(1);
            var r=mvc.perform(get(ROOT).with(actor("ADMIN"))).andExpect(status().is(Integer.parseInt(p[1]))).andExpect(header().string("Cache-Control","no-store")).andReturn(); assertThat(r.getResponse().getContentAsString()).doesNotContain("private");
        }
    }
    @Test void noDelete() throws Exception { mvc.perform(delete(ROOT+"/1").with(actor("ADMIN"))).andExpect(status().isMethodNotAllowed()); }
}
