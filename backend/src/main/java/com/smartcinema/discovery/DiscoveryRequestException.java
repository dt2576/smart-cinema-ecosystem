package com.smartcinema.discovery;

public class DiscoveryRequestException extends RuntimeException {
    private final String parameter;
    public DiscoveryRequestException(String parameter, String message) {
        super(message);
        this.parameter = parameter;
    }
    public String getParameter() { return parameter; }
}
