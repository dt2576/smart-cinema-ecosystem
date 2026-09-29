package com.smartcinema.promotion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.booking.BookingRepository;
import com.smartcinema.booking.BookingResponse;
import com.smartcinema.seat.SeatHoldSettings;
import com.smartcinema.seat.SeatRepository;

@Service
public class PromotionService {
    private final PromotionRepository repository;
    private final BookingRepository bookings;
    private final SeatRepository seats;
    private final SeatHoldSettings settings;
    public PromotionService(PromotionRepository repository, BookingRepository bookings, SeatRepository seats, SeatHoldSettings settings) {
        this.repository = repository; this.bookings = bookings; this.seats = seats; this.settings = settings;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse edit(long bookingId, long userId, String code, String operation) {
        seats.timeouts(settings);
        repository.edit(bookingId, userId, code, operation);
        return bookings.detail(bookingId, userId, seats.now());
    }
}
