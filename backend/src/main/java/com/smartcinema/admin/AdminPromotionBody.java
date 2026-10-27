package com.smartcinema.admin;

/** Avoid logging raw administrative input through MVC argument diagnostics. */
public record AdminPromotionBody(String value) {
    @Override public String toString() { return "AdminPromotionBody[redacted]"; }
}
