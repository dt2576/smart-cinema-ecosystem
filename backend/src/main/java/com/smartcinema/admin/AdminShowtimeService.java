package com.smartcinema.admin;

import java.time.ZoneId;
import java.util.List;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.*;

@Service
@Transactional(timeout=10)
public class AdminShowtimeService {
    private final AdminAccessService access; private final AdminShowtimeRepository repository; private final ZoneId discoveryZone;
    public AdminShowtimeService(AdminAccessService access,AdminShowtimeRepository repository,ZoneId discoveryZone) { this.access=access; this.repository=repository; this.discoveryZone=discoveryZone; }
    public record Schedule(String timeZone,List<AdminShowtimeRepository.Showtime> items) {}
    public record Detail(String timeZone,AdminShowtimeRepository.Showtime showtime) {}
    @Transactional(isolation=Isolation.REPEATABLE_READ) public Schedule list(long actor,AdminShowtimeRequest.Filter filter) {
        access.requireAdmin(actor); return new Schedule(discoveryZone.getId(),repository.list(filter,discoveryZone));
    }
    public Detail detail(long actor,long id) { access.requireAdmin(actor); return new Detail(discoveryZone.getId(),repository.detail(id)); }
    public Detail save(long actor,Long id,AdminShowtimeRequest.Input input) {
        access.requireAdmin(actor); long saved=repository.save(actor,id,input);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { LoggerFactory.getLogger(AdminShowtimeService.class).info("Admin Showtime actorId={} resourceId={} action={}",actor,saved,id==null?"CREATE":"UPDATE"); }
        });
        return new Detail(discoveryZone.getId(),repository.detail(saved));
    }
}
