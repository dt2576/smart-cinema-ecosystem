package com.smartcinema.payment;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class VnpayRecovery {
    private final VnpaySettings settings;
    private final VnpaySystemRepository repository;
    private final VnpayQueryClient client;
    private final VnpayService service;
    public VnpayRecovery(VnpaySettings settings,VnpaySystemRepository repository,VnpayQueryClient client,VnpayService service) {
        this.settings=settings; this.repository=repository; this.client=client; this.service=service;
    }
    @Scheduled(fixedDelayString="${vnpay.worker-delay:PT1M}")
    public void recover() {
        if(!settings.enabled() || !settings.confirmed("query") || !settings.confirmed("query-signature")) { return; }
        try {
            for(var binding:repository.claimQueries()) {
                try { service.acceptQuery(client.query(binding)); }
                catch(RuntimeException exception) { /* Remains unresolved; durable claim bounds retries. Never log signed data. */ }
            }
        } catch(VnpayUnavailableException exception) { /* Fail closed; no Payment lifecycle change. */ }
    }
}
