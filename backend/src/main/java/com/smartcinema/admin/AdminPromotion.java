package com.smartcinema.admin;

import java.time.Instant;

/** Master terms only. No computed lifecycle, redemption reservation or financial status. */
public record AdminPromotion(String id, String code, String discountType, String discountValue,
    Instant validFrom, Instant validUntil, String minimumOrderAmount, Integer usageLimit,
    String status, String maxDiscountAmount) { }
