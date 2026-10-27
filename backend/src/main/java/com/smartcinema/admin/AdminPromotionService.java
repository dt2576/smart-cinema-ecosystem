package com.smartcinema.admin;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(isolation=Isolation.READ_COMMITTED,timeout=10)
public class AdminPromotionService {
    private final AdminAccessService access;
    private final AdminPromotionRepository repository;
    public AdminPromotionService(AdminAccessService access,AdminPromotionRepository repository) { this.access=access; this.repository=repository; }
    private void authorize(long actor) { repository.timeouts(); access.requireAdmin(actor); }
    // Logical reads reuse the existing locking authorizer; do not set PostgreSQL readOnly=true.
    @Transactional(isolation=Isolation.REPEATABLE_READ,timeout=10)
    public List<AdminPromotion> list(long actor) { authorize(actor); return repository.list(); }
    @Transactional(isolation=Isolation.REPEATABLE_READ,timeout=10)
    public AdminPromotion detail(long actor,long id) { authorize(actor); return repository.detail(id); }
    public AdminPromotion create(long actor,AdminPromotionRequest.Input input) {
        authorize(actor); return repository.detail(repository.save(actor,null,"CREATE",input,input.status()));
    }
    public AdminPromotion update(long actor,long id,AdminPromotionRequest.Input input) {
        authorize(actor); return repository.detail(repository.save(actor,id,"UPDATE",input,null));
    }
    public AdminPromotion status(long actor,long id,String status) {
        authorize(actor); return repository.detail(repository.save(actor,id,"STATUS",null,status));
    }
}
