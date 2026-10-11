package com.smartcinema.booking;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import com.smartcinema.seat.SeatRepository;
import com.smartcinema.seat.SeatRequestException;

class BookingReadTests {
    @Test void paginationDefaultsAndLongOffsetFollowExistingCollectionBounds() {
        assertThat(BookingHistoryQuery.parse(new LinkedMultiValueMap<>())).isEqualTo(new BookingHistoryQuery(0, 20));
        var query = new LinkedMultiValueMap<String, String>(); query.add("page", "2147483647"); query.add("size", "100");
        assertThat(BookingHistoryQuery.parse(query).offset()).isEqualTo(214748364700L);
    }

    @Test void suppliedBlankRepeatedUnknownAndOverflowParametersAreRejectedWithoutEchoingValues() {
        for (var invalid : List.of("", "-1", "+1", " 1", "1.0", "2147483648", "9999999999999999999999999")) {
            var query = new LinkedMultiValueMap<String, String>(); query.add("page", invalid);
            assertThatThrownBy(() -> BookingHistoryQuery.parse(query)).isInstanceOf(SeatRequestException.class)
                    .hasMessage("Invalid pagination value.");
        }
        var repeated = new LinkedMultiValueMap<String, String>(); repeated.add("size", "20"); repeated.add("size", "20");
        assertThatThrownBy(() -> BookingHistoryQuery.parse(repeated)).isInstanceOf(SeatRequestException.class);
        var unknown = new LinkedMultiValueMap<String, String>(); unknown.add("secret-fixture", "secret-fixture-value");
        assertThatThrownBy(() -> BookingHistoryQuery.parse(unknown)).isInstanceOf(SeatRequestException.class)
                .hasMessage("Unsupported query parameter.");
    }

    @Test void entitlementDtoAndInternalRowsNeverPrintTokensOrTicketCodes() {
        var ticket = new CustomerTicket("1", "2", "3", "private-ticket-fixture", "VALID", "COUPLE", 2);
        var response = new BookingTicketsResponse("4", "PAID", Instant.EPOCH, "private-qr-fixture", List.of(ticket));
        var owned = new BookingReadRepository.OwnedBooking("4", "PAID", "PAID", "private-qr-fixture", Instant.EPOCH, 1);
        var seat = new BookingReadRepository.IssuedSeat("2", "3", "COUPLE", "1", "private-ticket-fixture", "VALID", Instant.EPOCH, Instant.EPOCH);
        for (Object value : List.of(ticket, response, owned, seat)) {
            assertThat(value.toString()).doesNotContain("private-qr-fixture", "private-ticket-fixture");
        }
    }

    @Test void serverIssuedOpaqueUtf8TokenIsNotNormalizedOrWrapped() {
        var repository = mock(BookingReadRepository.class); var clock = mock(SeatRepository.class);
        when(clock.now()).thenReturn(Instant.EPOCH);
        // Non-hash Unicode is a wire-contract fixture, not a newly issued production token.
        String token = " opaque-\u03a9-token ";
        when(repository.owned(4, 5, Instant.EPOCH)).thenReturn(new BookingReadRepository.OwnedBooking("4", "PAID", "PAID", token, Instant.EPOCH, 1));
        when(repository.issuedSeats(4)).thenReturn(List.of(new BookingReadRepository.IssuedSeat("2", "3", "COUPLE", "1", "code", "VALID", Instant.EPOCH, Instant.EPOCH)));
        assertThat(new BookingReadService(repository, clock).tickets(4, 5).bookingQr()).isEqualTo(token);
    }

    @Test void invalidPersistedQrFailsClosedWithoutLookingUpPartialTickets() {
        var repository = mock(BookingReadRepository.class); var clock = mock(SeatRepository.class);
        when(clock.now()).thenReturn(Instant.EPOCH);
        for (String token : java.util.Arrays.asList(null, "", " ", "private\nfixture", "x".repeat(129))) {
            when(repository.owned(4, 5, Instant.EPOCH)).thenReturn(new BookingReadRepository.OwnedBooking("4", "PAID", "PAID", token, Instant.EPOCH, 1));
            assertThatThrownBy(() -> new BookingReadService(repository, clock).tickets(4, 5))
                    .isInstanceOf(BookingReadUnavailableException.class).hasMessage("Booking data is temporarily unavailable.");
        }
        verify(repository, never()).issuedSeats(anyLong());
    }

    @Test void supportedIndividualStatusesRemainIndependent() {
        var repository = mock(BookingReadRepository.class); var clock = mock(SeatRepository.class);
        when(clock.now()).thenReturn(Instant.EPOCH);
        when(repository.owned(4, 5, Instant.EPOCH)).thenReturn(new BookingReadRepository.OwnedBooking("4", "PAID", "PAID", "opaque-fixture", Instant.EPOCH, 4));
        // Status fixtures only: this phase adds no Check-in or Ticket state writer.
        when(repository.issuedSeats(4)).thenReturn(List.of(
                new BookingReadRepository.IssuedSeat("10", "20", "STANDARD", "30", "a", "VALID", Instant.EPOCH, Instant.EPOCH),
                new BookingReadRepository.IssuedSeat("11", "21", "VIP", "31", "b", "CHECKED_IN", Instant.EPOCH, Instant.EPOCH),
                new BookingReadRepository.IssuedSeat("12", "22", "COUPLE", "32", "c", "EXPIRED", Instant.EPOCH, Instant.EPOCH),
                new BookingReadRepository.IssuedSeat("13", "23", "STANDARD", "33", "d", "CANCELLED", Instant.EPOCH, Instant.EPOCH)));
        var tickets = new BookingReadService(repository, clock).tickets(4, 5).tickets();
        assertThat(tickets).extracting(CustomerTicket::status).containsExactly("VALID", "CHECKED_IN", "EXPIRED", "CANCELLED");
        assertThat(tickets).extracting(CustomerTicket::guestCount).containsExactly(1, 1, 2, 1);
    }
}
