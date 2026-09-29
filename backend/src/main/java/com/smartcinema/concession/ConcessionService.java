package com.smartcinema.concession;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.booking.BookingRepository;
import com.smartcinema.booking.BookingResponse;
import com.smartcinema.seat.SeatHoldSettings;
import com.smartcinema.seat.SeatRepository;

@Service
public class ConcessionService {
    private final ConcessionRepository repository;
    private final BookingRepository bookings;
    private final SeatRepository seats;
    private final SeatHoldSettings settings;
    public ConcessionService(ConcessionRepository repository, BookingRepository bookings, SeatRepository seats, SeatHoldSettings settings) {
        this.repository = repository; this.bookings = bookings; this.seats = seats; this.settings = settings;
    }
    @Transactional(readOnly = true)
    public List<ConcessionItemResponse> catalog() { return repository.catalog(); }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse edit(long bookingId, long userId, Long lineId, Long itemId, Integer quantity, String operation) {
        seats.timeouts(settings);
        repository.edit(bookingId, userId, lineId, itemId, quantity, operation);
        return bookings.detail(bookingId, userId, seats.now());
    }
}
