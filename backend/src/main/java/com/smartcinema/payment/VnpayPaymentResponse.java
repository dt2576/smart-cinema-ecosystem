package com.smartcinema.payment;

import java.util.List;
import java.util.Map;

public record VnpayPaymentResponse(String paymentId,String bookingId,String status,String amount,String bookingStatus,
        boolean reconciliationRequired,String bookingQr,List<Map<String,Object>> tickets) {
    @Override public String toString() { return "VnpayPaymentResponse[redacted]"; }
}
