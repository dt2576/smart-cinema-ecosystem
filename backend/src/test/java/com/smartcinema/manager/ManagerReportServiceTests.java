package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.*;

class ManagerReportServiceTests {
    final ManagerRepository scope=mock(ManagerRepository.class);
    final ManagerReportRepository repository=mock(ManagerReportRepository.class);
    final ManagerReportService service=new ManagerReportService(scope,repository);
    @Test void everyRequestRechecksCurrentManagerAndAssignment() {
        var q=ManagerReportRequest.parse(ManagerReportRequestTests.values("dimension","CINEMA"),true);
        service.summary(7,q);service.daily(7,q);service.breakdown(7,q);service.concessions(7,q);
        verify(scope,times(4)).access(7);verify(repository).summary(7,q);verify(repository).daily(7,q);
        verify(repository).count(7,q);verify(repository).breakdown(7,q);verify(repository).concessionCount(7,q);verify(repository).concessions(7,q);
    }
    @Test void revokedInactiveOrChangedActorStopsAllAggregates() {
        var q=ManagerReportRequest.parse(ManagerReportRequestTests.values(),false);
        doThrow(new ManagerFailure(403)).when(scope).access(7);
        assertThatThrownBy(()->service.summary(7,q)).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.daily(7,q)).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.breakdown(7,q)).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.concessions(7,q)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(repository);
    }
    @Test void explicitForeignCinemaOrShowtimeFailsBeforeAnyDataRead() {
        var cinema=ManagerReportRequest.parse(ManagerReportRequestTests.values("cinemaId","2"),false);
        when(scope.cinema(7,2)).thenThrow(new ManagerFailure(404));
        assertThatThrownBy(()->service.summary(7,cinema)).isInstanceOf(ManagerFailure.class);
        var showtime=ManagerReportRequest.parse(ManagerReportRequestTests.values("showtimeId","3"),false);
        when(scope.showtime(7,3)).thenThrow(new ManagerFailure(404));
        assertThatThrownBy(()->service.concessions(7,showtime)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(repository);
    }
    @Test void currentScopedFilterValidationPrecedesRepositoryAndTransactionIsBoundedReadOnly() {
        var q=ManagerReportRequest.parse(ManagerReportRequestTests.values("cinemaId","2","showtimeId","3"),false);
        service.summary(7,q);var order=inOrder(scope,repository);
        order.verify(scope).access(7);order.verify(scope).cinema(7,2);order.verify(scope).showtime(7,3);order.verify(repository).summary(7,q);
        var tx=ManagerReportService.class.getAnnotation(Transactional.class);
        assertThat(tx.readOnly()).isTrue();assertThat(tx.isolation()).isEqualTo(Isolation.REPEATABLE_READ);assertThat(tx.timeout()).isEqualTo(10);
    }
}
