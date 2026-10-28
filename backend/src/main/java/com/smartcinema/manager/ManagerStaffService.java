package com.smartcinema.manager;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.staff.StaffRepository.Assignment;
import com.smartcinema.manager.ManagerStaffRepository.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class ManagerStaffService {
    private final ManagerRepository scope;
    private final ManagerStaffRepository repository;
    public ManagerStaffService(ManagerRepository scope,ManagerStaffRepository repository) { this.scope=scope;this.repository=repository; }
    private void authorize(long actor,long cinema) { scope.access(actor);scope.cinema(actor,cinema); }
    public List<Membership> memberships(long actor,long cinema) { authorize(actor,cinema);return repository.memberships(actor,cinema); }
    public Detail detail(long actor,long cinema,long user) { authorize(actor,cinema);return new Detail(repository.profile(actor,cinema,user),repository.assignments(actor,cinema,user)); }
    @Transactional(timeout=10)
    public Assignment assign(long actor,long source,long user,ManagerRequest.Assignment input) {
        authorize(actor,source);repository.profile(actor,source,user);scope.cinema(actor,input.cinemaId());
        long saved=repository.save(actor,source,user,input,null,"ACTIVE");
        return repository.assignment(actor,input.cinemaId(),user,saved);
    }
    @Transactional(timeout=10)
    public Assignment status(long actor,long cinema,long user,long assignment,String status) {
        authorize(actor,cinema);repository.profile(actor,cinema,user);repository.assignment(actor,cinema,user,assignment);
        long saved=repository.save(actor,cinema,user,null,assignment,status);
        return repository.assignment(actor,cinema,user,saved);
    }
}
