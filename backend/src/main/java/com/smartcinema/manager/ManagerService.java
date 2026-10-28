package com.smartcinema.manager;

import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.admin.*;
import static com.smartcinema.admin.AdminConfigurationRepository.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class ManagerService {
    private final ManagerRepository scope;
    private final AdminConfigurationRepository configuration;
    private final AdminShowtimeRepository showtimes;
    private final ZoneId zone;
    public ManagerService(ManagerRepository scope,AdminConfigurationRepository configuration,AdminShowtimeRepository showtimes,ZoneId discoveryZone) {
        this.scope=scope;this.configuration=configuration;this.showtimes=showtimes;this.zone=discoveryZone;
    }
    public List<Cinema> cinemas(long actor){scope.access(actor);return scope.cinemas(actor);}
    public Cinema cinema(long actor,long id){scope.access(actor);return scope.cinema(actor,id);}
    public List<Hall> halls(long actor,long id){scope.access(actor);return scope.halls(actor,id);}
    public Hall hall(long actor,long id){scope.access(actor);return scope.hall(actor,id);}
    public List<Seat> seats(long actor,long id){scope.access(actor);return scope.seats(actor,id);}
    public Seat seat(long actor,long id){scope.access(actor);return scope.seat(actor,id);}
    public List<ManagerRepository.Staff> staff(long actor,long id){scope.access(actor);return scope.staff(actor,id);}
    public AdminShowtimeService.Schedule showtimes(long actor,AdminShowtimeRequest.Filter filter) {
        scope.access(actor);if(filter.cinemaId()!=null)scope.cinema(actor,filter.cinemaId());if(filter.hallId()!=null)scope.hall(actor,filter.hallId());
        return new AdminShowtimeService.Schedule(zone.getId(),showtimes.listForManager(filter,zone,actor));
    }
    public AdminShowtimeService.Detail showtime(long actor,long id){scope.access(actor);return new AdminShowtimeService.Detail(zone.getId(),scope.showtime(actor,id));}
    @Transactional(timeout=10)
    public Hall saveHall(long actor,Long cinema,Long id,AdminConfigurationRequest.Hall input) {
        scope.access(actor);long parent=id==null?cinema:Long.parseLong(scope.hall(actor,id).cinemaId());scope.cinema(actor,parent);
        long saved=configuration.saveHall(actor,parent,id,input);return scope.hall(actor,saved);
    }
    @Transactional(timeout=10)
    public List<Seat> initialize(long actor,long hall,List<AdminConfigurationRequest.Seat> units){scope.access(actor);scope.hall(actor,hall);configuration.initialize(actor,hall,units);return scope.seats(actor,hall);}
    @Transactional(timeout=10)
    public Seat saveSeat(long actor,long id,AdminConfigurationRequest.Seat input){scope.access(actor);scope.seat(actor,id);configuration.saveSeat(actor,id,input);return scope.seat(actor,id);}
    @Transactional(timeout=10)
    public AdminShowtimeService.Detail saveShowtime(long actor,Long id,AdminShowtimeRequest.Input input) {
        scope.access(actor);if(id!=null)scope.showtime(actor,id);scope.hall(actor,input.hallId());
        long saved=showtimes.save(actor,id,input);return new AdminShowtimeService.Detail(zone.getId(),scope.showtime(actor,saved));
    }
}
