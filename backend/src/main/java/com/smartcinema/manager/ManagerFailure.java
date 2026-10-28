package com.smartcinema.manager;

public class ManagerFailure extends RuntimeException {
    private final int status;
    public ManagerFailure(int status) { super("Cinema operation is unavailable.");this.status=status; }
    public int status() { return status; }
}
