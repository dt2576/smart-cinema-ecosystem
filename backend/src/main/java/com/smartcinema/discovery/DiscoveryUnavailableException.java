package com.smartcinema.discovery;

public class DiscoveryUnavailableException extends RuntimeException {
    public DiscoveryUnavailableException(String resource) { super(resource + " is unavailable."); }
}
