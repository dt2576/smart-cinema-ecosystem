package com.smartcinema.admin;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.slf4j.LoggerFactory;
import com.smartcinema.admin.AdminConfigurationRepository.*;

@Service
@Transactional(timeout=10)
public class AdminConfigurationService {
    private final AdminAccessService access;
    private final AdminConfigurationRepository repository;
    public AdminConfigurationService(AdminAccessService access,AdminConfigurationRepository repository) { this.access=access; this.repository=repository; }
    public List<Cinema> cinemas(long actor) { access.requireAdmin(actor); return repository.cinemas(); }
    public Cinema cinema(long actor,long id) { access.requireAdmin(actor); return repository.cinema(id); }
    public Cinema saveCinema(long actor,Long id,AdminConfigurationRequest.Cinema input) {
        access.requireAdmin(actor); long saved=repository.saveCinema(actor,id,input); auditAfterCommit(actor,"Cinema",saved,id==null?"CREATE":"UPDATE"); return repository.cinema(saved);
    }
    public List<Hall> halls(long actor,long cinema) { access.requireAdmin(actor); repository.cinema(cinema); return repository.halls(cinema); }
    public Hall hall(long actor,long id) { access.requireAdmin(actor); return repository.hall(id); }
    public Hall saveHall(long actor,long cinema,Long id,AdminConfigurationRequest.Hall input) {
        access.requireAdmin(actor); long saved=repository.saveHall(actor,cinema,id,input); auditAfterCommit(actor,"Hall",saved,id==null?"CREATE":"UPDATE"); return repository.hall(saved);
    }
    public List<Seat> seats(long actor,long hall) { access.requireAdmin(actor); repository.hall(hall); return repository.seats(hall); }
    public Seat seat(long actor,long id) { access.requireAdmin(actor); return repository.seat(id); }
    public List<Seat> initialize(long actor,long hall,List<AdminConfigurationRequest.Seat> units) {
        access.requireAdmin(actor); repository.initialize(actor,hall,units); auditAfterCommit(actor,"Hall",hall,"INITIALIZE_LAYOUT"); return repository.seats(hall);
    }
    public Seat saveSeat(long actor,long id,AdminConfigurationRequest.Seat input) {
        access.requireAdmin(actor); repository.saveSeat(actor,id,input); auditAfterCommit(actor,"Seat",id,"UPDATE"); return repository.seat(id);
    }
    private void auditAfterCommit(long actor,String resource,long id,String action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { LoggerFactory.getLogger(AdminConfigurationService.class).info("Admin configuration actorId={} resource={} resourceId={} action={}",actor,resource,id,action); }
        });
    }
}
