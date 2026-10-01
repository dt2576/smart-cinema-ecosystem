package com.smartcinema.payment;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Duration;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Explicit deployment attestations are not claims that this repository passed sandbox certification. */
@Component
public class VnpaySettings {
    private final Environment environment;
    public VnpaySettings(Environment environment) { this.environment = environment; }
    public String value(String key, String fallback) { return environment.getProperty("vnpay." + key, fallback); }
    public boolean confirmed(String key) { return Boolean.parseBoolean(value(key + "-confirmed", "false")); }
    public boolean enabled() { return Boolean.parseBoolean(value("enabled", "false")); }
    public String merchant() { return value("merchant-code", ""); }
    public String secret() { return value("hash-secret", ""); }
    public String returnUrl() { return value("return-url", ""); }
    public Duration responseTimeout() { return Duration.parse(value("response-timeout", "PT10S")); }
    public void require(String confirmation) {
        if (!enabled() || !confirmed(confirmation) || !merchant().matches("[A-Za-z0-9]{8}") || secret().isBlank()) {
            throw new VnpayUnavailableException();
        }
    }
    public void submissionReady() {
        require("signature"); require("amount-window"); require("ipn"); require("success");
        if (!value("system-db-url", "").startsWith("jdbc:postgresql:") || value("system-db-username", "").isBlank()) {
            throw new VnpayUnavailableException();
        }
        if (!httpsUrl(returnUrl()) || returnUrl().length() > 255 || !httpsUrl(value("frontend-result-url", ""))) {
            throw new VnpayUnavailableException();
        }
        if (!value("order-type", "").matches("[A-Za-z0-9]{1,100}")) { throw new VnpayUnavailableException(); }
    }
    public void amount(BigDecimal amount) {
        BigDecimal minimum;
        BigDecimal maximum;
        try { minimum = new BigDecimal(value("minimum-amount", "0")); maximum = new BigDecimal(value("maximum-amount", "0")); }
        catch (NumberFormatException exception) { throw new VnpayUnavailableException(); }
        if (minimum.signum() <= 0 || maximum.compareTo(minimum) < 0) { throw new VnpayUnavailableException(); }
        if (amount.compareTo(minimum) < 0 || amount.compareTo(maximum) > 0) {
            throw new VnpayConflictException("Amount is outside confirmed sandbox limits.");
        }
    }
    private boolean httpsUrl(String value) {
        try {
            URI uri=URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost()!=null && uri.getUserInfo()==null && uri.getFragment()==null;
        } catch (IllegalArgumentException exception) { return false; }
    }
}
