package com.smartcinema.admin;

public final class AdminPromotionFailure extends RuntimeException {
    private final int status;
    private final String field;
    public AdminPromotionFailure(int status) { this(status,null); }
    public AdminPromotionFailure(int status,String field) { super("Promotion management request unavailable"); this.status=status; this.field=field; }
    public int status() { return status; }
    public String field() { return field; }
}
