package com.smartcinema.manager;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.*;
import org.junit.jupiter.api.Test;
import com.smartcinema.admin.*;

class ManagerServiceTests {
    final ManagerRepository scope=mock(ManagerRepository.class);
    final AdminConfigurationRepository configuration=mock(AdminConfigurationRepository.class);
    final AdminShowtimeRepository showtimes=mock(AdminShowtimeRepository.class);
    final ManagerService service=new ManagerService(scope,configuration,showtimes,ZoneId.of("Asia/Ho_Chi_Minh"));
    @Test void noCurrentAssignmentStopsEveryWriterBeforeDomainCalls(){
        doThrow(new ManagerFailure(403)).when(scope).access(7);
        assertThatThrownBy(()->service.saveHall(7,1L,null,new AdminConfigurationRequest.Hall("Hall",2,"2D","ACTIVE"))).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.saveSeat(7,1,new AdminConfigurationRequest.Seat("A","1","STANDARD","ACTIVE"))).isInstanceOf(ManagerFailure.class);
        verifyNoInteractions(configuration,showtimes);
    }
    @Test void foreignHallAndSeatNeverReachSharedConfigurationWriter(){
        when(scope.hall(7,9)).thenThrow(new ManagerFailure(404));when(scope.seat(7,10)).thenThrow(new ManagerFailure(404));
        assertThatThrownBy(()->service.saveHall(7,null,9L,new AdminConfigurationRequest.Hall("Hall",2,"2D","ACTIVE"))).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.saveSeat(7,10,new AdminConfigurationRequest.Seat("A","1","STANDARD","ACTIVE"))).isInstanceOf(ManagerFailure.class);verifyNoInteractions(configuration);
    }
    @Test void bothExistingShowtimeAndRequestedHallMustBeScoped(){
        var input=new AdminShowtimeRequest.Input(1,9,Instant.parse("2030-01-01T00:00:00Z"),new BigDecimal("1.1234"),"DRAFT");
        when(scope.showtime(7,8)).thenThrow(new ManagerFailure(404));assertThatThrownBy(()->service.saveShowtime(7,8L,input)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(showtimes);
        when(scope.hall(7,9)).thenThrow(new ManagerFailure(404));assertThatThrownBy(()->service.saveShowtime(7,null,input)).isInstanceOf(ManagerFailure.class);verifyNoInteractions(showtimes);
    }
    @Test void foreignCinemaOrNestedHallFilterCannotBecomeUnscopedList(){
        when(scope.cinema(7,9)).thenThrow(new ManagerFailure(404));when(scope.hall(7,10)).thenThrow(new ManagerFailure(404));
        assertThatThrownBy(()->service.showtimes(7,new AdminShowtimeRequest.Filter(null,null,9L,null,null))).isInstanceOf(ManagerFailure.class);
        assertThatThrownBy(()->service.showtimes(7,new AdminShowtimeRequest.Filter(null,null,null,10L,null))).isInstanceOf(ManagerFailure.class);verifyNoInteractions(showtimes);
    }
}
