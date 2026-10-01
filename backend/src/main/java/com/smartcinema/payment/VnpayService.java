package com.smartcinema.payment;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;

@Service
public class VnpayService {
    static final String PAYMENT_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    static final DateTimeFormatter DATE=DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private final VnpaySettings settings;
    private final VnpayRepository repository;
    private final VnpaySystemRepository system;
    public VnpayService(VnpaySettings settings,VnpayRepository repository,VnpaySystemRepository system) {
        this.settings=settings; this.repository=repository; this.system=system;
    }
    @Transactional
    public VnpayRedirectResponse submit(long booking,long payment,long user,String ip) {
        settings.submissionReady();
        VnpaySubmission before=repository.owned(booking,payment,user);
        VnpayProtocol.amount(before.amount()); settings.amount(before.amount());
        if(before.reference()!=null && !settings.confirmed("reopened-url")) { throw new VnpayUnavailableException(); }
        if(before.reference()!=null && !repository.queryAllowsRecovery(payment,settings.value("query-delay","PT5M"))) {
            throw new VnpayConflictException("Payment remains unresolved. Await verified query recovery before reopening.");
        }
        repository.bind(payment,user,settings.merchant(),settings.returnUrl(),ip,settings.value("order-type",""));
        VnpaySubmission bound=repository.owned(booking,payment,user);
        long minimum=Long.parseLong(settings.value("minimum-window-seconds","0"));
        if(minimum<=0) { throw new VnpayUnavailableException(); }
        if(!bound.expiresAt().isAfter(Instant.now().plusSeconds(minimum))) {
            throw new VnpayConflictException("Insufficient original Seat deadline for sandbox submission.");
        }
        Map<String,String> fields=new TreeMap<>();
        fields.put("vnp_Version","2.1.0"); fields.put("vnp_Command","pay"); fields.put("vnp_TmnCode",bound.merchant());
        fields.put("vnp_Amount",bound.wireAmount()); fields.put("vnp_CurrCode","VND"); fields.put("vnp_TxnRef",bound.reference());
        fields.put("vnp_CreateDate",DATE.format(bound.createdAt())); fields.put("vnp_ExpireDate",DATE.format(bound.expiresAt()));
        fields.put("vnp_ReturnUrl",bound.returnUrl()); fields.put("vnp_IpAddr",bound.clientIp()); fields.put("vnp_Locale","vn");
        fields.put("vnp_OrderInfo","Payment " + bound.reference()); fields.put("vnp_OrderType",repository.orderType(payment));
        String canonical=VnpayProtocol.canonical(fields);
        return new VnpayRedirectResponse(bound.paymentId(),bound.bookingId(),bound.status(),"VNPAY","SANDBOX","VND",
                bound.amount().toPlainString(),bound.expiresAt(),PAYMENT_URL+"?"+canonical+"&vnp_SecureHash="+VnpayProtocol.sign(canonical,settings.secret()));
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public VnpayPaymentResponse detail(long booking,long payment,long user) {
        var value=repository.owned(booking,payment,user);
        String bookingStatus=repository.bookingStatus(booking);
        boolean paid="PAID".equals(bookingStatus);
        return new VnpayPaymentResponse(value.paymentId(),value.bookingId(),value.status(),value.amount().toPlainString(),bookingStatus,
                value.reconciliationRequired(),paid?repository.bookingQr(booking):null,paid?repository.tickets(booking):java.util.List.of());
    }
    public String ipn(MultiValueMap<String,String> input) {
        settings.require("ipn"); settings.require("signature");
        Map<String,String> fields=VnpayProtocol.singleValues(input);
        String canonical=VnpayProtocol.canonical(fields);
        if(!VnpayProtocol.valid(canonical,fields.get("vnp_SecureHash"),settings.secret())) { return "97"; }
        return accept(fields,"IPN",canonical);
    }
    public boolean validReturn(MultiValueMap<String,String> input) {
        settings.require("signature");
        Map<String,String> fields=VnpayProtocol.singleValues(input);
        return settings.merchant().equals(fields.get("vnp_TmnCode"))
                && VnpayProtocol.valid(VnpayProtocol.canonical(fields),fields.get("vnp_SecureHash"),settings.secret());
    }
    public String acceptQuery(Map<String,String> fields) {
        settings.require("query"); settings.require("query-signature");
        String canonical=VnpayProtocol.queryResponse(fields);
        if(!VnpayProtocol.valid(canonical,fields.get("vnp_SecureHash"),settings.secret())) { return "97"; }
        // Query API errors (including 91) are not transaction outcomes.
        if(!"00".equals(fields.get("vnp_ResponseCode"))) { return "99"; }
        if(!"querydr".equals(fields.get("vnp_Command"))) { return "97"; }
        return accept(fields,"QUERY",canonical);
    }
    private String accept(Map<String,String> fields,String source,String canonical) {
        if(!settings.merchant().equals(fields.get("vnp_TmnCode"))) { return "97"; }
        if(!fields.getOrDefault("vnp_TxnRef","").matches("P[0-9a-f]{32}")
                || !fields.getOrDefault("vnp_Amount","").matches("[0-9]{1,12}")
                || !fields.getOrDefault("vnp_ResponseCode","").matches("[0-9]{2}")
                || !fields.getOrDefault("vnp_TransactionStatus","").matches("[0-9]{2}")) { return "99"; }
        String code=fields.get("vnp_ResponseCode"), status=fields.get("vnp_TransactionStatus");
        String result="RECONCILE";
        boolean special="07".equals(code) || java.util.Set.of("04","05","06","07","09").contains(status)
                || ("QUERY".equals(source) && !"01".equals(fields.get("vnp_TransactionType")));
        if(special) { result="RECONCILE"; }
        else if("00".equals(code) && "00".equals(status)) {
            settings.require("success");
            if(!fields.getOrDefault("vnp_TransactionNo","").matches("[0-9]{1,15}")
                    || fields.get("vnp_TransactionNo").matches("0+")) { return "99"; }
            result="SUCCESS";
        } else if("01".equals(status)) { result="PENDING"; }
        else if(settings.confirmed("terminal")) {
            // Exact externally confirmed pairs, never a generic non-zero fallback.
            String pair=source+":"+code+":"+status;
            if(containsPair(settings.value("cancelled-pairs",""),pair)) { result="CANCELLED"; }
            else if(containsPair(settings.value("failed-pairs",""),pair)) { result="FAILED"; }
        }
        return system.record(fields,source,VnpayProtocol.digest(canonical),result);
    }
    private boolean containsPair(String configured,String pair) {
        return java.util.Arrays.stream(configured.split(",")).map(String::trim).anyMatch(pair::equals);
    }
}
