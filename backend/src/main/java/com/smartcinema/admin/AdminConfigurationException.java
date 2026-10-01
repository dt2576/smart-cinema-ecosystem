package com.smartcinema.admin;

public class AdminConfigurationException extends RuntimeException {
    private AdminConfigurationException() { super("Configuration resource is unavailable."); }
    public static AdminConfigurationException missing() { return new AdminConfigurationException(); }
}
