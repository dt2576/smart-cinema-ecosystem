package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.*;
import org.springframework.util.LinkedMultiValueMap;
import com.smartcinema.seat.SeatRepository;

class ManagerBookingServiceTests {
    final ManagerRepository scope=mock(ManagerRepository.class);
    final ManagerBookingRepository repository=mock(ManagerBookingRepository.class);
    final SeatRepository clock=mock(SeatRepository.class);
    final ManagerBookingService service=new ManagerBookingService(scope,repository,clock);
    final ManagerBookingQuery query=ManagerBookingQuery.parse(new LinkedMultiValueMap<>());
    @Test void currentInvalidOrRevokedAuthorityStopsListAndDetail(){doThrow(new ManagerFailure(403)).when(scope).access(7);assertThatThrownBy(()->service.list(7,query)).isInstanceOf(ManagerFailure.class);assertThatThrownBy(()->service.detail(7,1)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(repository,clock);}
    @Test void explicitForeignCinemaAndShowtimeNeverReachReads(){
        var v=new LinkedMultiValueMap<String,String>();v.set("cinemaId","2");when(scope.cinema(7,2)).thenThrow(new ManagerFailure(404));assertThatThrownBy(()->service.list(7,ManagerBookingQuery.parse(v))).isInstanceOf(ManagerFailure.class);
        v.clear();v.set("showtimeId","3");when(scope.showtime(7,3)).thenThrow(new ManagerFailure(404));assertThatThrownBy(()->service.list(7,ManagerBookingQuery.parse(v))).isInstanceOf(ManagerFailure.class);verifyNoInteractions(repository,clock);
    }
    @Test void assignedRequestUsesDatabaseClockAndRechecksEveryCall(){var now=Instant.parse("2026-10-29T00:00:00Z");when(clock.now()).thenReturn(now);service.list(7,query);service.detail(7,9007199254740993L);verify(scope,times(2)).access(7);verify(repository).list(7,query,now);verify(repository).detail(7,9007199254740993L,now);}
    @Test void serviceIsReadOnlyConsistentAndBounded(){var tx=ManagerBookingService.class.getAnnotation(Transactional.class);assertThat(tx.readOnly()).isTrue();assertThat(tx.isolation()).isEqualTo(Isolation.REPEATABLE_READ);assertThat(tx.timeout()).isEqualTo(10);}
}
