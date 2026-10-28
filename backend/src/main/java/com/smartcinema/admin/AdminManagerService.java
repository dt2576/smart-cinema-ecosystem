package com.smartcinema.admin;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import com.smartcinema.manager.ManagerRequest;
import com.smartcinema.staff.StaffRepository.Assignment;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=10)
public class AdminManagerService {
    private final AdminAccessService access;
    private final AdminManagerRepository repository;
    public AdminManagerService(AdminAccessService access,AdminManagerRepository repository){this.access=access;this.repository=repository;}
    private void authorize(long actor){repository.timeouts();access.requireAdminReadOnly(actor);}
    public List<AdminManagerRepository.ManagerAccount> list(long actor){authorize(actor);return repository.managers();}
    public List<Assignment> assignments(long actor,long user){authorize(actor);return repository.assignments(user);}
    @Transactional(timeout=10)
    public Assignment assign(long actor,long user,ManagerRequest.Assignment input){authorize(actor);long id=repository.save(actor,user,input,null,"ACTIVE");return repository.assignment(user,id);}
    @Transactional(timeout=10)
    public Assignment status(long actor,long user,long assignment,String status){authorize(actor);long id=repository.save(actor,user,null,assignment,status);return repository.assignment(user,id);}
}
