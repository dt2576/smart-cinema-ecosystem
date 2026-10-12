package com.smartcinema.staff;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import jakarta.validation.Validator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartcinema.auth.dto.RegisterUserRequest;
import com.smartcinema.auth.validation.VietnamPhoneValidator;
import com.smartcinema.staff.StaffRepository.*;

@Service
@Transactional(timeout=10)
public class StaffOnboardingService {
    private final StaffRepository repository;
    private final StaffInvitationCrypto crypto;
    private final StaffRateLimiter limiter;
    private final PasswordEncoder passwords;
    private final Validator validator;
    public StaffOnboardingService(StaffRepository repository, StaffInvitationCrypto crypto, StaffRateLimiter limiter, PasswordEncoder passwords, Validator validator) {
        this.repository=repository; this.crypto=crypto; this.limiter=limiter; this.passwords=passwords; this.validator=validator;
    }
    private void admin(long actor) { repository.timeouts(); repository.admin(actor); }
    public StaffAccount create(long actor, String name, String email, String phone) {
        admin(actor);
        if (!validator.validate(new RegisterUserRequest(name,email,phone,"validation-only-placeholder")).isEmpty()) throw new StaffFailure(400);
        // Validate crypto configuration before creating an account; all later steps share this transaction.
        var token=crypto.token(); crypto.encrypt(1,token);
        long user=repository.create(actor,email.trim().toLowerCase(Locale.ROOT),name.trim(),VietnamPhoneValidator.normalize(phone));
        repository.issue(actor,user,token.digest(),crypto.encrypt(user,token)); return repository.account(user);
    }
    public StaffAccount reissue(long actor,long user) {
        admin(actor); if (!limiter.allow("REISSUE",Long.toString(actor))) throw new StaffFailure(429,3600);
        repository.account(user); var token=crypto.token(); repository.issue(actor,user,token.digest(),crypto.encrypt(user,token)); return repository.account(user);
    }
    public StaffAccount status(long actor,long user,String status) { admin(actor); repository.status(actor,user,status); return repository.account(user); }
    public List<StaffAccount> accounts(long actor,int page,int size) { admin(actor); return repository.accounts(page,size); }
    public StaffAccount account(long actor,long user) { admin(actor); return repository.account(user); }
    public List<Assignment> assignments(long actor,long user) { admin(actor); repository.account(user); return repository.assignments(user); }
    public Assignment assign(long actor,long user,long cinema,Instant effective) {
        admin(actor); long id=repository.assign(actor,user,cinema,effective,null,"ACTIVE"); return repository.assignments(user).stream().filter(a -> a.id().equals(Long.toString(id))).findFirst().orElseThrow(() -> new StaffFailure(503));
    }
    public Assignment assignmentStatus(long actor,long user,long assignment,String status) {
        admin(actor); long id=repository.assign(actor,user,null,null,assignment,status); return repository.assignments(user).stream().filter(a -> a.id().equals(Long.toString(id))).findFirst().orElseThrow(() -> new StaffFailure(503));
    }
    public void password(String token,String password) {
        repository.timeouts(); String digest=StaffInvitationCrypto.tokenDigest(token);
        if (password == null || password.isBlank() || password.length()<8 || password.getBytes(StandardCharsets.UTF_8).length>72) throw new StaffFailure(400);
        try { java.nio.charset.StandardCharsets.UTF_8.newEncoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).encode(java.nio.CharBuffer.wrap(password)); }
        catch(java.nio.charset.CharacterCodingException failure) { throw new StaffFailure(400); }
        repository.password(digest,passwords.encode(password));
    }
}
