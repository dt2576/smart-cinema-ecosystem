package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.smartcinema.admin.AdminConfigurationRepository.Cinema;
import com.smartcinema.staff.StaffRepository.Assignment;

class ManagerStaffServiceTests {
    final ManagerRepository scope=mock(ManagerRepository.class);
    final ManagerStaffRepository repository=mock(ManagerStaffRepository.class);
    final ManagerStaffService service=new ManagerStaffService(scope,repository);
    @Test void readsResolveScopeBeforeQueryAndOnlyReturnRequestedCinema() {
        when(repository.memberships(1,2)).thenReturn(List.of());assertThat(service.memberships(1,2)).isEmpty();
        var order=inOrder(scope,repository);order.verify(scope).access(1);order.verify(scope).cinema(1,2);order.verify(repository).memberships(1,2);
    }
    @Test void foreignOrRevokedContextDoesNotMaterializeStaffData() {
        doThrow(new ManagerFailure(404)).when(scope).cinema(1,2);assertThatThrownBy(()->service.detail(1,2,3)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(repository);
    }
    @Test void creationChecksKnownSourceResourceAndTargetCinemaBeforeProtectedWriter() {
        var input=new ManagerRequest.Assignment(4,Instant.parse("2030-01-01T00:00:00Z"));
        when(repository.profile(1,2,3)).thenReturn(new ManagerStaffRepository.Profile("3","QA","qa@example.test","0910000000","BLOCKED"));
        when(scope.cinema(1,4)).thenReturn(new Cinema("4","QA","QA",null,null,"ACTIVE"));
        when(repository.save(1,2,3,input,null,"ACTIVE")).thenReturn(5L);
        var expected=new Assignment("5","3","4","QA","STAFF","ACTIVE",input.effectiveAt());when(repository.assignment(1,4,3,5)).thenReturn(expected);
        assertThat(service.assign(1,2,3,input)).isEqualTo(expected);
        var order=inOrder(scope,repository);order.verify(scope).access(1);order.verify(scope).cinema(1,2);order.verify(repository).profile(1,2,3);order.verify(scope).cinema(1,4);order.verify(repository).save(1,2,3,input,null,"ACTIVE");order.verify(repository).assignment(1,4,3,5);
    }
    @Test void nestedAssignmentIdentityIsValidatedBeforeStatusMutation() {
        doThrow(new ManagerFailure(404)).when(repository).assignment(1,2,3,5);
        assertThatThrownBy(()->service.status(1,2,3,5,"INACTIVE")).isInstanceOf(ManagerFailure.class);verify(repository,never()).save(anyLong(),anyLong(),anyLong(),any(),any(),any());
    }
}
