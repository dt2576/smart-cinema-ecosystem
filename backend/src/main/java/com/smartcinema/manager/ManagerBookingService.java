package com.smartcinema.manager;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.seat.SeatRepository;
import static com.smartcinema.manager.ManagerBookingResponse.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class ManagerBookingService {
    private final ManagerRepository scope;
    private final ManagerBookingRepository repository;
    private final SeatRepository clock;
    public ManagerBookingService(ManagerRepository scope,ManagerBookingRepository repository,SeatRepository clock){this.scope=scope;this.repository=repository;this.clock=clock;}
    public Page list(long actor,ManagerBookingQuery query){
        scope.access(actor);
        if(query.cinemaId()!=null)scope.cinema(actor,query.cinemaId());
        if(query.showtimeId()!=null)scope.showtime(actor,query.showtimeId());
        return repository.list(actor,query,clock.now());
    }
    public Detail detail(long actor,long booking){scope.access(actor);return repository.detail(actor,booking,clock.now());}
}
