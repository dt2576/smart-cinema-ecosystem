package com.smartcinema.admin;

public final class AdminConcessionFailure extends RuntimeException {
    private final int status;
    private final String field;
    public AdminConcessionFailure(int status) { this(status,null); }
    public AdminConcessionFailure(int status,String field) { super("Concession management request unavailable"); this.status=status; this.field=field; }
    public int status() { return status; }
    public String field() { return field; }
}
