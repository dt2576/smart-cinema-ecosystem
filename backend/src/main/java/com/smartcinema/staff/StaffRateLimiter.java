package com.smartcinema.staff;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffRateLimiter {
    private final StaffRepository repository;
    public StaffRateLimiter(StaffRepository repository) { this.repository = repository; }
    @Transactional(propagation=Propagation.REQUIRES_NEW, timeout=10)
    public boolean allow(String scope, String key) { repository.timeouts(); return repository.limit(scope, StaffInvitationCrypto.digest(key)); }
}
