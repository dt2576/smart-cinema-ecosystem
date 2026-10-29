package com.smartcinema.manager;

import java.time.Instant;
import java.util.List;

/** Operational projections only; no Customer PII, QR bearer token or provider verification metadata. */
public final class ManagerBookingResponse {
    private ManagerBookingResponse(){ }
    public record Page(List<Item> items,int page,int size,long totalElements,long totalPages,Instant serverTime){ }
    public record Payment(String id,String status,String amount,String currency,String provider,
            Instant initiatedAt,Instant completedAt,boolean reconciliationRequired){ }
    public record Item(String id,String bookingCode,String status,String storedStatus,
            String cinemaId,String cinemaName,String hallId,String hallName,String movieId,String movieTitle,
            String showtimeId,Instant startsAt,Instant createdAt,Instant expiresAt,Instant paymentStartedAt,Instant paidAt,
            int seatUnitCount,int guestCount,int issuedTicketCount,String finalAmount,Payment latestPayment){ }
    public record Amounts(String seatAmount,String concessionAmount,String subtotal,String discount,String finalAmount){ }
    public record Seat(String id,String seatId,String row,String number,String type,int guestCount,String unitPrice,String finalPrice){ }
    public record Concession(String id,String itemId,String name,String category,int quantity,String unitPrice,String totalPrice){ }
    public record Ticket(String id,String bookingSeatId,String seatId,String status,Instant issuedAt,Instant checkedInAt){ }
    public record Detail(Item booking,Amounts amounts,List<Seat> seats,List<Concession> concessions,
            List<Payment> payments,List<Ticket> tickets,Instant serverTime){ }
}
