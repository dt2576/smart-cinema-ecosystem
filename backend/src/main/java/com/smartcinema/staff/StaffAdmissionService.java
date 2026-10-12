package com.smartcinema.staff;

import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffAdmissionService {
    private final StaffAdmissionRepository repository;
    private final StaffRepository settings;
    private final StaffRateLimiter limiter;
    public StaffAdmissionService(StaffAdmissionRepository repository,StaffRepository settings,StaffRateLimiter limiter) {
        this.repository=repository;this.settings=settings;this.limiter=limiter;
    }
    private Instant authorize(long actor,Long cinema,boolean command) {
        settings.timeouts(); repository.staff(actor); Instant now=repository.now();
        if(cinema!=null) repository.scope(actor,cinema,now);
        // Independent bounded technical ledger; operational domain reads stay read-only.
        if(!limiter.allow(command?"CHECKIN":"STAFF_READ",Long.toString(actor))) throw new StaffFailure(429);
        return now;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
    public StaffAssignmentResponse assignments(long actor) {
        Instant now=authorize(actor,null,false);return new StaffAssignmentResponse(now,repository.assignments(actor,now));
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
    public StaffBookingResponse resolve(long actor,long cinema,String qr) {
        Instant now=authorize(actor,cinema,false);return projection(repository.resolve(qr,cinema),cinema,now);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
    public StaffBookingResponse recover(long actor,long booking,long cinema) {
        return projection(booking,cinema,authorize(actor,cinema,false));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public StaffCheckInResponse checkIn(long actor,long booking,long cinema,List<Long> tickets) {
        Instant now=authorize(actor,cinema,true);
        projection(booking,cinema,now); // Privacy and aggregate integrity before the protected command.
        var checked=repository.checkIn(actor,booking,cinema,tickets);
        var result=new StaffCheckInResponse(checked,projection(booking,cinema,repository.now()));
        // Spring commits (including deferred assertions) before returning to the controller.
        return result;
    }
    private StaffBookingResponse projection(long booking,long cinema,Instant now) {
        var b=repository.booking(booking,cinema,now); boolean paid="PAID".equals(b.status());
        String reason=reason(paid,b.startsAt(),b.showtimeStatus(),b.cinemaStatus(),b.hallStatus(),now);
        var tickets=new ArrayList<StaffBookingResponse.Ticket>();
        if(paid) {
            if(b.paidAt()==null || !StaffAdmissionRequest.safeText(b.qr(),128)) throw new StaffFailure(503);
            var units=repository.issued(booking); if(units.isEmpty()) throw new StaffFailure(503);
            var ids=new HashSet<String>();var codes=new HashSet<String>();var seatIds=new HashSet<String>();var lineIds=new HashSet<String>();
            for(var t:units) {
                if(!positiveId(t.id()) || !positiveId(t.bookingSeatId()) || !positiveId(t.seatId())
                    || !StaffAdmissionRequest.safeText(t.code(),64) || t.status()==null || !Set.of("VALID","CHECKED_IN","EXPIRED","CANCELLED").contains(t.status())
                    || t.seatType()==null || !Set.of("STANDARD","VIP","COUPLE").contains(t.seatType())
                    || !b.paidAt().equals(t.issuedAt()) || !b.paidAt().equals(t.soldAt())
                    || ("CHECKED_IN".equals(t.status()) ? t.checkedInAt()==null || t.checkedInAt().isBefore(t.issuedAt()) : t.checkedInAt()!=null)
                    || !ids.add(t.id()) || !codes.add(t.code()) || !seatIds.add(t.seatId()) || !lineIds.add(t.bookingSeatId())) throw new StaffFailure(503);
                tickets.add(new StaffBookingResponse.Ticket(t.id(),t.bookingSeatId(),t.seatId(),t.code(),t.row(),t.number(),t.seatType(),
                    "COUPLE".equals(t.seatType())?2:1,t.status(),t.checkedInAt(),reason==null && "VALID".equals(t.status())));
            }
        }
        return new StaffBookingResponse(b.id(),b.code(),b.effectiveStatus(),b.movieId(),b.title(),b.cinemaId(),b.cinemaName(),b.hallId(),b.hallName(),
            b.showtimeId(),b.startsAt(),b.endsAt(),b.showtimeStatus(),now,reason==null,reason,List.copyOf(tickets),repository.concessions(booking));
    }
    static String reason(boolean paid,Instant startsAt,String showtime,String cinema,String hall,Instant now) {
        if(!paid) return "NOT_PAID";
        if(startsAt==null || !("OPEN_FOR_BOOKING".equals(showtime) || "STARTED".equals(showtime)) || !"ACTIVE".equals(cinema) || !"ACTIVE".equals(hall)) return "CONTEXT_UNAVAILABLE";
        if(now.isBefore(startsAt.minusSeconds(1800)) || now.isAfter(startsAt.plusSeconds(900))) return "OUTSIDE_ADMISSION_WINDOW";
        return null;
    }
    private static boolean positiveId(String value) {try{return StaffRequest.id(value)>0;}catch(StaffFailure failure){return false;}}
}
