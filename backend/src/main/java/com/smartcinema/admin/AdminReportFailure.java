package com.smartcinema.admin;

public class AdminReportFailure extends RuntimeException {
    private final int status;
    private final String field;
    public AdminReportFailure(int status,String field) { super("Reporting request could not be completed."); this.status=status;this.field=field; }
    public int status() { return status; }
    public String field() { return field; }
}
