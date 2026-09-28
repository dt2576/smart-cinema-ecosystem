package com.smartcinema.booking;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.seat.SeatHoldSettings;
import com.smartcinema.seat.SeatRepository;

@Service
public class BookingService {
    private final BookingRepository repository;
    private final SeatRepository seats;
    private final SeatHoldSettings settings;
    public BookingService(BookingRepository repository, SeatRepository seats, SeatHoldSettings settings) {
        this.repository = repository; this.seats = seats; this.settings = settings;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse create(long userId, BookingRequest request) {
        seats.timeouts(settings);
        long id = repository.create(userId, request);
        return repository.detail(id, userId, seats.now());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public BookingResponse detail(long bookingId, long userId) {
        return repository.detail(bookingId, userId, seats.now());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void cancel(long bookingId, long userId) {
        seats.timeouts(settings);
        repository.cancel(bookingId, userId);
    }
}
