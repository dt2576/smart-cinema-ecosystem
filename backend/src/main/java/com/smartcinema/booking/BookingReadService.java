package com.smartcinema.booking;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.seat.SeatRepository;

@Service
public class BookingReadService {
    private final BookingReadRepository repository;
    private final SeatRepository clock;
    public BookingReadService(BookingReadRepository repository, SeatRepository clock) {
        this.repository = repository; this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public BookingHistoryResponse history(long user, BookingHistoryQuery query) {
        return repository.history(user, query, clock.now());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public BookingTicketsResponse tickets(long booking, long user) {
        var now = clock.now();
        var owned = repository.owned(booking, user, now);
        if (!"PAID".equals(owned.status())) {
            return new BookingTicketsResponse(owned.id(), owned.effectiveStatus(), now, null, List.of());
        }
        if (owned.paidAt() == null || !safeText(owned.qr(), 128)) { throw new BookingReadUnavailableException(); }
        var seats = repository.issuedSeats(booking);
        if (seats.isEmpty() || seats.size() != owned.seatUnitCount()) { throw new BookingReadUnavailableException(); }
        var ticketIds = new HashSet<String>(); var codes = new HashSet<String>();
        var bookingSeatIds = new HashSet<String>(); var seatIds = new HashSet<String>();
        var tickets = new ArrayList<CustomerTicket>();
        for (var seat : seats) {
            if (!positiveId(seat.ticketId()) || !positiveId(seat.bookingSeatId()) || !positiveId(seat.seatId())
                    || !safeText(seat.ticketCode(), 64) || seat.status() == null
                    || !Set.of("VALID", "CHECKED_IN", "EXPIRED", "CANCELLED").contains(seat.status())
                    || seat.seatType() == null || !Set.of("STANDARD", "VIP", "COUPLE").contains(seat.seatType())
                    || !owned.paidAt().equals(seat.issuedAt()) || !owned.paidAt().equals(seat.soldAt())
                    || !ticketIds.add(seat.ticketId()) || !codes.add(seat.ticketCode())
                    || !bookingSeatIds.add(seat.bookingSeatId()) || !seatIds.add(seat.seatId())) {
                throw new BookingReadUnavailableException();
            }
            tickets.add(new CustomerTicket(seat.ticketId(), seat.bookingSeatId(), seat.seatId(), seat.ticketCode(),
                    seat.status(), seat.seatType(), "COUPLE".equals(seat.seatType()) ? 2 : 1));
        }
        return new BookingTicketsResponse(owned.id(), owned.effectiveStatus(), now, owned.qr(), List.copyOf(tickets));
    }

    private static boolean safeText(String value, int max) {
        return value != null && !value.isBlank() && value.codePointCount(0, value.length()) <= max
                && value.codePoints().noneMatch(Character::isISOControl);
    }
    private static boolean positiveId(String value) {
        try { return value != null && value.matches("[1-9][0-9]{0,18}") && Long.parseLong(value) > 0; }
        catch (NumberFormatException exception) { return false; }
    }
}
