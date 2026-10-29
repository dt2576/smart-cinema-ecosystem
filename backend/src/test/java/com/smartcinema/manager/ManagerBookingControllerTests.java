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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.smartcinema.auth.*;
import static com.smartcinema.manager.ManagerBookingResponse.*;

/** Isolated HTTP/security fixtures; no account, Booking, Payment or Ticket is persisted. */
@WebMvcTest(controllers=ManagerBookingController.class,properties={"spring.config.import=","auth.jwt.secret=fixture-key-with-at-least-thirty-two-characters"})
@Import({AuthSecurityConfiguration.class,SecurityProblemHandler.class,ManagerExceptionHandler.class})
class ManagerBookingControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean ManagerBookingService service;
    @MockitoBean com.smartcinema.staff.StaffRateLimiter limiter;
    static final String ROOT="/api/v1/manager/bookings";
    static RequestPostProcessor role(String role){return jwt().jwt(j->j.subject("7")).authorities(new SimpleGrantedAuthority("ROLE_"+role));}
    static Item item(){var now=Instant.parse("2026-10-29T00:00:00Z");return new Item("9007199254740993","QA-EXACT","PENDING","PENDING","2","Cinema","3","Hall","4","Movie","5",now,now,now.plusSeconds(600),now,null,1,2,0,"12345.6789",new Payment("9007199254740994","PENDING","12345.6789","VND","VNPAY",now,null,true));}
    @Test void anonymousAndOtherRolesCannotListOrRead()throws Exception{
        for(String path:List.of(ROOT,ROOT+"/9007199254740993")){mvc.perform(get(path)).andExpect(status().isUnauthorized());for(String role:List.of("ADMIN","STAFF","CUSTOMER"))mvc.perform(get(path).with(role(role))).andExpect(status().isForbidden());}verifyNoInteractions(service);
    }
    @Test void exactIdentityAndMoneySerializationNeverExposeCustomerOrSecrets()throws Exception{
        when(service.list(eq(7L),any())).thenReturn(new Page(List.of(item()),0,20,1,1,item().createdAt()));
        mvc.perform(get(ROOT).with(role("MANAGER"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.items[0].id").value("9007199254740993")).andExpect(jsonPath("$.items[0].finalAmount").value("12345.6789"))
            .andExpect(jsonPath("$.items[0].latestPayment.reconciliationRequired").value(true)).andExpect(jsonPath("$.items[0].customerId").doesNotExist())
            .andExpect(jsonPath("$.items[0].bookingQr").doesNotExist()).andExpect(jsonPath("$.items[0].latestPayment.internalReference").doesNotExist());
    }
    @Test void detailShowsStoredSnapshotsAndActualTicketsWithoutInventingIssuance()throws Exception{
        when(service.detail(7,9007199254740993L)).thenReturn(new Detail(item(),new Amounts("12345.6789","0.0000","12345.6789","0.0000","12345.6789"),List.of(new Seat("8","9","A","1-2","COUPLE",2,"12345.6789","12345.6789")),List.of(),List.of(item().latestPayment()),List.of(),item().createdAt()));
        mvc.perform(get(ROOT+"/9007199254740993").with(role("MANAGER"))).andExpect(status().isOk()).andExpect(jsonPath("$.seats[0].guestCount").value(2)).andExpect(jsonPath("$.tickets").isEmpty()).andExpect(jsonPath("$.booking.issuedTicketCount").value(0)).andExpect(jsonPath("$.customer").doesNotExist()).andExpect(jsonPath("$.bookingQr").doesNotExist());
    }
    @Test void invalidFiltersIdentityAndForgedActorFailBeforeService()throws Exception{
        for(String query:List.of("actor=9","cinemaId=01","page=-1","status=SUCCESS","paymentStatus=PAID","size=101","page=0&page=1","createdFrom=2026-10-29"))mvc.perform(get(ROOT+"?"+query).with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT+"/01").with(role("MANAGER"))).andExpect(status().isBadRequest());mvc.perform(get(ROOT+"/1?cinemaId=2").with(role("MANAGER"))).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT).with(jwt().jwt(j->j.subject("bad")).authorities(new SimpleGrantedAuthority("ROLE_MANAGER")))).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void currentScopeDeniedMissingAndUnavailableRemainSafeNoStore()throws Exception{
        for(int status:List.of(403,404,503)){doThrow(new ManagerFailure(status)).when(service).detail(7,1);mvc.perform(get(ROOT+"/1").with(role("MANAGER"))).andExpect(status().is(status)).andExpect(header().string("Cache-Control","no-store"));}
    }
    @Test void managerNamespaceHasNoBookingMutationHandler()throws Exception{
        mvc.perform(post(ROOT).with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());mvc.perform(delete(ROOT+"/1").with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());mvc.perform(put(ROOT+"/1").with(role("MANAGER"))).andExpect(status().isMethodNotAllowed());verifyNoInteractions(service);
    }
}
