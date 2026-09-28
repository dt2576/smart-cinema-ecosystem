package com.smartcinema.seat;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.seat.dto.*;

@Service
public class SeatService {
    private final SeatRepository repository;
    private final SeatHoldSettings settings;
    public SeatService(SeatRepository repository, SeatHoldSettings settings) { this.repository=repository; this.settings=settings; }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public SeatMapResponse map(long showtimeId) { return repository.map(showtimeId, repository.now()); }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public SeatHoldBatch acquire(long showtimeId, long userId, List<Long> seatIds) {
        repository.timeouts(settings);
        var holds=repository.acquire(showtimeId,userId,seatIds,settings);
        return new SeatHoldBatch(repository.now(),holds);
    }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public SeatHoldBatch mine(long showtimeId, long userId) {
        var now=repository.now();
        return new SeatHoldBatch(now,repository.mine(showtimeId,userId,now));
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void release(long showtimeId, long userId, long holdId) {
        repository.timeouts(settings);
        repository.release(showtimeId,userId,holdId);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public int expire(long showtimeId) {
        repository.timeouts(settings);
        return repository.expire(showtimeId);
    }
}
