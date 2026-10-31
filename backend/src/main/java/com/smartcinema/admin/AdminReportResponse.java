package com.smartcinema.admin;

import java.time.*;
import java.util.List;

public final class AdminReportResponse {
    private AdminReportResponse() { }
    public record Period(LocalDate from,LocalDate to,Instant startInclusive,Instant endExclusive,
            String timezone,String currency,String paymentEnvironment,String cinemaId,String movieId,String showtimeId) {
        public static Period of(AdminReportQuery query) {
            return new Period(query.from(),query.to(),query.start(),query.end(),AdminReportQuery.ZONE.getId(),
                    "VND","SANDBOX",id(query.cinemaId()),id(query.movieId()),id(query.showtimeId()));
        }
        private static String id(Long value) { return value==null?null:value.toString(); }
    }
    public record Metrics(String confirmedRevenue,String grossAmount,String discountAmount,String seatGrossAmount,
            String concessionGrossAmount,String confirmedBookings,String ticketsSold,String guestsSold,String bookingsCreated,
            String showtimes,String capacitySeatUnits,String soldSeatUnits,String occupancyPercent) { }
    public record CashTotals(String confirmedRevenue,String confirmedBookings,String ticketsSold,String guestsSold) {
        public static CashTotals empty() {return new CashTotals("0.0000","0","0","0");}
    }
    public record Summary(Period period,Metrics metrics,CashTotals cashTotals) {
        public Summary(Period period,Metrics metrics) {this(period,metrics,null);}
    }
    public record Day(LocalDate date,Metrics metrics) { }
    public record Daily(Period period,List<Day> items) { }
    public record Breakdown(String id,String name,String cinemaId,String movieId,Instant startsAt,Metrics metrics) { }
    public record Breakdowns(Period period,AdminReportQuery.Dimension dimension,int page,int size,
            String totalElements,List<Breakdown> items) { }
}
