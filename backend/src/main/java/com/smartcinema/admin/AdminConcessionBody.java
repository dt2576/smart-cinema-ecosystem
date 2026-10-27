package com.smartcinema.admin;

/** Avoid logging raw administrative input through MVC argument diagnostics. */
public record AdminConcessionBody(String value) {
    @Override public String toString() { return "AdminConcessionBody[redacted]"; }
}
