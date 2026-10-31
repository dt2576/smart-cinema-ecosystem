package com.smartcinema.manager;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import com.smartcinema.admin.AdminReportQuery;
import com.smartcinema.admin.AdminReportResponse.Metrics;
import com.smartcinema.admin.AdminReportResponse.Period;

public final class ManagerReportResponse {
    private ManagerReportResponse() { }

    public record StatusCount(String status,String count) { }
    public record Activity(List<StatusCount> bookingsByStatus,List<StatusCount> paymentsByStatus,
            List<StatusCount> ticketsByStatus,List<StatusCount> showtimesByStatus,
            String checkedInTickets,String reconciliationAttempts) { }
    public record Summary(Period period,Metrics metrics,Activity activity,com.smartcinema.admin.AdminReportResponse.CashTotals cashTotals) {
        public Summary(Period period,Metrics metrics,Activity activity) {this(period,metrics,activity,null);}
    }
    public record Day(LocalDate date,Metrics metrics,Activity activity) { }
    public record Daily(Period period,List<Day> items) { }
    public record Performance(String id,String name,String cinemaId,String movieId,Instant startsAt,
            Metrics metrics,Activity activity) { }
    public record Breakdowns(Period period,AdminReportQuery.Dimension dimension,int page,int size,
            String totalElements,List<Performance> items) { }
    public record Concession(String id,String name,String category,String quantity,
            String grossAmount,String confirmedBookings) { }
    public record Concessions(Period period,int page,int size,String totalElements,List<Concession> items) { }
}
