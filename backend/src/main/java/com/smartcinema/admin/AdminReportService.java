package com.smartcinema.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.smartcinema.admin.AdminReportResponse.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class AdminReportService {
    private final AdminAccessService access;
    private final AdminReportRepository repository;
    public AdminReportService(AdminAccessService access,AdminReportRepository repository) { this.access=access;this.repository=repository; }
    private void authorize(long actor) { repository.timeouts();access.requireAdminReadOnly(actor); }
    public Summary summary(long actor,AdminReportQuery query) {
        authorize(actor);return new Summary(Period.of(query),repository.summary(query));
    }
    public Daily daily(long actor,AdminReportQuery query) {
        authorize(actor);return new Daily(Period.of(query),repository.daily(query));
    }
    public Breakdowns breakdown(long actor,AdminReportQuery query) {
        authorize(actor);return new Breakdowns(Period.of(query),query.dimension(),query.page(),query.size(),repository.count(query),repository.breakdown(query));
    }
}
