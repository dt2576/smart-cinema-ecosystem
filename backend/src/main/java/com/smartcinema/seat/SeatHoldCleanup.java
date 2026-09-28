package com.smartcinema.seat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name="seat-hold.cleanup-enabled",havingValue="true",matchIfMissing=true)
public class SeatHoldCleanup {
    private static final Logger LOGGER=LoggerFactory.getLogger(SeatHoldCleanup.class);
    private final SeatRepository repository;
    private final SeatService service;
    private final int batchSize;
    public SeatHoldCleanup(SeatRepository repository, SeatService service,
            @Value("${seat-hold.cleanup-batch-size:100}") int batchSize) {
        if(batchSize<1) { throw new IllegalArgumentException("Hold cleanup batch size must be positive."); }
        this.repository=repository; this.service=service; this.batchSize=batchSize;
    }
    @Scheduled(fixedDelayString="${seat-hold.cleanup-delay:PT30S}",initialDelayString="${seat-hold.cleanup-delay:PT30S}")
    public void run() {
        try {
            for(long id:repository.expiryCandidates(batchSize)) {
                try { service.expire(id); }
                catch(org.springframework.dao.DataAccessException exception) { LOGGER.warn("Seat Hold cleanup deferred for Showtime {}",id); }
            }
        } catch(org.springframework.dao.DataAccessException exception) { LOGGER.warn("Seat Hold cleanup temporarily unavailable"); }
    }
}
