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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.*;
import com.smartcinema.auth.*;

/** Real MVC/security/parser with a mocked application boundary; not database evidence. */
@WebMvcTest(controllers=AdminConcessionController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,AdminConcessionWebConfiguration.class,AdminConcessionExceptionHandler.class})
class AdminConcessionControllerTests {
    private static final String ROOT="/api/v1/admin/concession-items";
    private static final String CONTENT="\"name\":\"Bắp rang\",\"description\":null,\"category\":\"POPCORN\",\"sellingPrice\":\"10.1234\"";
    private static final String CREATE="{"+CONTENT+",\"status\":\"ACTIVE\"}";
    @Autowired MockMvc mvc;
    @MockitoBean AdminConcessionService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter staffRateLimiter;
    private RequestPostProcessor actor(String role) { return jwt().jwt(t->t.subject("1")).authorities(()->"ROLE_"+role); }
    private AdminConcessionItem item() { return new AdminConcessionItem("9007199254740993","Bắp rang",null,"POPCORN","10.1234",null,"ACTIVE",Instant.parse("2026-10-25T00:00:00Z"),Instant.parse("2026-10-25T00:00:00Z")); }
    private List<MockHttpServletRequestBuilder> operations() { return List.of(get(ROOT),get(ROOT+"/1"),post(ROOT).content(CREATE),put(ROOT+"/1").content("{"+CONTENT+"}"),put(ROOT+"/1/status").content("{\"status\":\"INACTIVE\"}")); }
    @Test void anonymousEveryEndpoint401WithoutCsrf() throws Exception {
        for(var request:operations()) mvc.perform(request.contentType("application/json")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void allOtherRolesDeniedOnEveryEndpoint() throws Exception {
        for(String role:List.of("CUSTOMER","STAFF","MANAGER")) for(var request:operations())
            mvc.perform(request.with(actor(role)).contentType("application/json")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void listAndDetailKeepExactStringsAndNoStore() throws Exception {
        when(service.list(1)).thenReturn(List.of(item())); when(service.detail(1,9007199254740993L)).thenReturn(item());
        for(String path:List.of(ROOT,ROOT+"/9007199254740993")) {
            var result=mvc.perform(get(path).with(actor("ADMIN"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn();
            assertThat(result.getResponse().getContentAsString()).contains("\"9007199254740993\"","\"10.1234\"").doesNotContain("stock","currency");
        }
    }
    @Test void emptyCatalogIsAnArray() throws Exception {
        when(service.list(1)).thenReturn(List.of()); mvc.perform(get(ROOT).with(actor("ADMIN"))).andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void createHasLocation201AndNoCsrfRequirement() throws Exception {
        when(service.create(eq(1L),any())).thenReturn(item());
        mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(CREATE))
            .andExpect(status().isCreated()).andExpect(header().string("Location",ROOT+"/9007199254740993")).andExpect(header().string("Cache-Control","no-store"));
        verify(service).create(eq(1L),argThat(input->input.sellingPrice().toPlainString().equals("10.1234") && input.status().equals("ACTIVE")));
    }
    @Test void contentAndStatusUseSeparateCommands() throws Exception {
        when(service.update(eq(1L),eq(1L),any())).thenReturn(item()); when(service.status(1,1,"INACTIVE")).thenReturn(item());
        mvc.perform(put(ROOT+"/1").with(actor("ADMIN")).contentType("application/json").content("{"+CONTENT+"}")).andExpect(status().isOk());
        mvc.perform(put(ROOT+"/1/status").with(actor("ADMIN")).contentType("application/json").content("{\"status\":\"INACTIVE\"}")).andExpect(status().isOk());
        verify(service).update(eq(1L),eq(1L),argThat(input->input.status()==null)); verify(service).status(1,1,"INACTIVE");
    }
    @Test void duplicateUnknownTrailingAndNonobjectBodies400() throws Exception {
        for(String body:List.of("null","[]","{}",CREATE+"{}",CREATE.replace("\"name\":","\"name\":\"Other\",\"name\":"),CREATE.replace("}",",\"imageUrl\":null}")))
            mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(body)).andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control","no-store"));
        verifyNoInteractions(service);
    }
    @Test void rawInvalidUtf8AndOversizedInput400() throws Exception {
        for(byte[] bytes:List.of(new byte[]{(byte)0xc3,(byte)0x28},new byte[AdminConcessionRequest.MAX_BODY_BYTES+1]))
            mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(bytes)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void invalidPriceAndStatus400WithSafeFieldError() throws Exception {
        mvc.perform(post(ROOT).with(actor("ADMIN")).contentType("application/json").content(CREATE.replace("10.1234","123.00001")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.sellingPrice").exists()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("123.00001"))));
        mvc.perform(put(ROOT+"/1/status").with(actor("ADMIN")).contentType("application/json").content("{\"status\":\"DRAFT\"}")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void invalidIdsAndQueriesRejectBeforeService() throws Exception {
        for(String id:List.of("0","01","9223372036854775808")) mvc.perform(get(ROOT+"/"+id).with(actor("ADMIN"))).andExpect(status().isBadRequest());
        for(var request:operations()) mvc.perform(request.with(actor("ADMIN")).queryParam("page","0").contentType("application/json")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void invalidSubject403EvenWithAdminAuthority() throws Exception {
        mvc.perform(get(ROOT).with(jwt().jwt(t->t.subject("01")).authorities(()->"ROLE_ADMIN"))).andExpect(status().isForbidden()); verifyNoInteractions(service);
    }
    @Test void currentAccountDenial403AndMissing404AreSafe() throws Exception {
        when(service.list(1)).thenThrow(new AccessDeniedException("private actor diagnostic"));
        mvc.perform(get(ROOT).with(actor("ADMIN"))).andExpect(status().isForbidden()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private"))));
        when(service.detail(1,1)).thenThrow(new AdminConcessionFailure(404)); mvc.perform(get(ROOT+"/1").with(actor("ADMIN"))).andExpect(status().isNotFound());
    }
    @Test void databaseFailuresHaveSafeStatusAndNoStore() throws Exception {
        for(var pair:List.of(new String[]{"P0004","403"},new String[]{"P0002","404"},new String[]{"P0001","400"},new String[]{"55P03","409"},new String[]{"40001","409"},new String[]{"42501","503"},new String[]{"XX000","503"})) {
            doThrow(new DataIntegrityViolationException("private sql diagnostic",new SQLException("private",pair[0]))).when(service).list(1);
            mvc.perform(get(ROOT).with(actor("ADMIN"))).andExpect(status().is(Integer.parseInt(pair[1]))).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private"))));
        }
    }
    @Test void noDeleteEndpoint() throws Exception { mvc.perform(delete(ROOT+"/1").with(actor("ADMIN"))).andExpect(status().isMethodNotAllowed()); }
}
