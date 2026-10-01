package com.smartcinema.payment;

public class VnpayUnavailableException extends RuntimeException {
    public VnpayUnavailableException() { super("VNPAY Sandbox is not configured or confirmed for this operation."); }
}
