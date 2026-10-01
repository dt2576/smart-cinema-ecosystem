package com.smartcinema.payment;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.seat.SeatHoldSettings;
import com.smartcinema.seat.SeatRepository;

@Service
public class PaymentService {
    private final PaymentRepository repository;
    private final SeatRepository seats;
    private final SeatHoldSettings settings;
    public PaymentService(PaymentRepository repository, SeatRepository seats, SeatHoldSettings settings) {
        this.repository = repository; this.seats = seats; this.settings = settings;
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PaymentResponse initiate(long bookingId, long userId) {
        seats.timeouts(settings);
        return repository.initiate(bookingId, userId);
    }
}
