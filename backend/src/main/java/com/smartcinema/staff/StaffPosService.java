package com.smartcinema.staff;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.booking.*;
import com.smartcinema.discovery.DiscoveryRepository;
import com.smartcinema.discovery.dto.ShowtimeSchedule;
import com.smartcinema.payment.*;
import com.smartcinema.promotion.PromotionRepository;
import com.smartcinema.seat.*;
import com.smartcinema.seat.dto.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class StaffPosService {
    private final StaffAdmissionRepository access;
    private final StaffRepository settings;
    private final StaffPosRepository repository;
    private final DiscoveryRepository discovery;
    private final SeatRepository seats;
    private final SeatHoldSettings holdSettings;
    private final BookingRepository bookings;
    private final PromotionRepository promotions;
    private final VnpayService vnpay;
    private final StaffAdmissionService admission;
    private final ZoneId discoveryZone;
    public StaffPosService(StaffAdmissionRepository access,StaffRepository settings,StaffPosRepository repository,
            DiscoveryRepository discovery,SeatRepository seats,SeatHoldSettings holdSettings,BookingRepository bookings,
            PromotionRepository promotions,VnpayService vnpay,StaffAdmissionService admission,ZoneId discoveryZone) {
        this.access=access;this.settings=settings;this.repository=repository;this.discovery=discovery;this.seats=seats;
        this.holdSettings=holdSettings;this.bookings=bookings;this.promotions=promotions;this.vnpay=vnpay;this.admission=admission;this.discoveryZone=discoveryZone;
    }
    private Instant authorize(long actor,long cinema,boolean sale) {
        settings.timeouts();access.staff(actor);Instant now=access.now();access.scope(actor,cinema,now);
        if(sale) repository.ready();return now;
    }
    public StaffPosResponse.Movies movies(long actor,long cinema) {
        Instant now=authorize(actor,cinema,false);return new StaffPosResponse.Movies(now,discovery.saleMovies(cinema,now));
    }
    public ShowtimeSchedule showtimes(long actor,long cinema,long movie,LocalDate date) {
        Instant now=authorize(actor,cinema,false);
        LocalDate day=date==null?now.atZone(discoveryZone).toLocalDate():date;
        return new ShowtimeSchedule(discoveryZone.getId(),now,day,discovery.dates(movie,cinema,now,discoveryZone.getId()),
            discovery.showtimes(movie,cinema,now,day.atStartOfDay(discoveryZone).toInstant(),day.plusDays(1).atStartOfDay(discoveryZone).toInstant()));
    }
    public SeatMapResponse map(long actor,long cinema,long showtime) {
        Instant now=authorize(actor,cinema,false);repository.showtime(showtime,cinema);return seats.map(showtime,now);
    }
    public SeatHoldBatch holds(long actor,long cinema,long showtime) {
        Instant now=authorize(actor,cinema,true);repository.showtime(showtime,cinema);seats.map(showtime,now);
        return new SeatHoldBatch(now,repository.holds(showtime,actor,now));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public SeatHoldBatch acquire(long actor,long cinema,long showtime,List<Long> units) {
        authorize(actor,cinema,true);repository.showtime(showtime,cinema);seats.timeouts(holdSettings);
        var held=seats.acquire(showtime,actor,units,holdSettings);return new SeatHoldBatch(access.now(),held);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public void release(long actor,long cinema,long showtime,long hold) {
        authorize(actor,cinema,true);repository.showtime(showtime,cinema);seats.timeouts(holdSettings);seats.release(showtime,actor,hold);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public BookingResponse create(long actor,long cinema,long showtime,List<Long> holds) {
        authorize(actor,cinema,true);repository.showtime(showtime,cinema);seats.timeouts(holdSettings);
        return bookings.counterDetail(bookings.create(actor,new BookingRequest(showtime,holds)),actor,access.now());
    }
    public StaffPosResponse.Receipt receipt(long actor,long cinema,long booking) {
        Instant now=authorize(actor,cinema,true);repository.owned(actor,cinema,booking);return projection(actor,cinema,booking,now);
    }
    private StaffPosResponse.Receipt projection(long actor,long cinema,long booking,Instant now) {
        var detail=bookings.counterDetail(booking,actor,now);
        var payments=repository.payments(booking);
        if(!"PAID".equals(detail.status())) return new StaffPosResponse.Receipt(detail,payments,List.of(),null);
        var issued=admission.recover(actor,booking,cinema);
        if(payments.stream().filter(p->"SUCCESS".equals(p.status()) && new BigDecimal(p.amount()).compareTo(new BigDecimal(detail.finalAmount()))==0 && !p.reconciliationRequired()).count()!=1)
            throw new StaffFailure(503);
        return new StaffPosResponse.Receipt(detail,payments,issued.tickets(),repository.qr(booking));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public StaffPosResponse.Receipt initiate(long actor,long cinema,long booking) {
        authorize(actor,cinema,true);repository.owned(actor,cinema,booking);seats.timeouts(holdSettings);repository.initiate(booking,actor);
        return projection(actor,cinema,booking,access.now());
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public StaffPosResponse.Receipt cash(long actor,long cinema,long booking,long payment,BigDecimal amount) {
        authorize(actor,cinema,true);repository.owned(actor,cinema,booking);seats.timeouts(holdSettings);repository.cash(booking,payment,actor,amount);
        return projection(actor,cinema,booking,access.now());
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public VnpayRedirectResponse submit(long actor,long cinema,long booking,long payment,String ip) {
        authorize(actor,cinema,true);repository.owned(actor,cinema,booking);seats.timeouts(holdSettings);
        return vnpay.submitCounter(booking,payment,actor,ip);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public BookingResponse promotion(long actor,long cinema,long booking,String code,String operation) {
        authorize(actor,cinema,true);repository.owned(actor,cinema,booking);seats.timeouts(holdSettings);promotions.edit(booking,actor,code,operation);
        return bookings.counterDetail(booking,actor,access.now());
    }
    @Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
    public void cancel(long actor,long cinema,long booking) {
        authorize(actor,cinema,true);repository.owned(actor,cinema,booking);seats.timeouts(holdSettings);bookings.cancel(booking,actor);
    }
}
