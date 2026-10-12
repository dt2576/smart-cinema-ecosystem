package com.smartcinema.staff;

public final class StaffFailure extends RuntimeException {
    private final int status;
    private final int retryAfter;
    public StaffFailure(int status) { this(status,60); }
    public StaffFailure(int status,int retryAfter) { super("Staff request unavailable"); this.status = status; this.retryAfter=retryAfter; }
    public int status() { return status; }
    public int retryAfter() { return retryAfter; }
}
