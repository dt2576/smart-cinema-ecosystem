package com.smartcinema.manager;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.admin.AdminReportQuery;
import com.smartcinema.admin.AdminReportResponse.Period;
import static com.smartcinema.manager.ManagerReportResponse.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class ManagerReportService {
    private final ManagerRepository scope;
    private final ManagerReportRepository repository;
    public ManagerReportService(ManagerRepository scope,ManagerReportRepository repository) {
        this.scope=scope;this.repository=repository;
    }
    private void authorize(long actor,AdminReportQuery query) {
        scope.access(actor); // Existing current account/assignment gate also sets bounded SQL timeouts.
        if(query.cinemaId()!=null)scope.cinema(actor,query.cinemaId());
        if(query.showtimeId()!=null)scope.showtime(actor,query.showtimeId());
    }
    public Summary summary(long actor,AdminReportQuery query) {
        authorize(actor,query);return repository.summary(actor,query);
    }
    public Daily daily(long actor,AdminReportQuery query) {
        authorize(actor,query);return new Daily(Period.of(query),repository.daily(actor,query));
    }
    public Breakdowns breakdown(long actor,AdminReportQuery query) {
        authorize(actor,query);
        return new Breakdowns(Period.of(query),query.dimension(),query.page(),query.size(),
                repository.count(actor,query),repository.breakdown(actor,query));
    }
    public Concessions concessions(long actor,AdminReportQuery query) {
        authorize(actor,query);
        return new Concessions(Period.of(query),query.page(),query.size(),repository.concessionCount(actor,query),repository.concessions(actor,query));
    }
}
