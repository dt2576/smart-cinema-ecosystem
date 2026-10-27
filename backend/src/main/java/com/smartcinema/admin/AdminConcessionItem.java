package com.smartcinema.admin;

import java.time.Instant;

public record AdminConcessionItem(String id,String name,String description,String category,String sellingPrice,
    String imageUrl,String status,Instant createdAt,Instant updatedAt) {
    @Override public String toString() { return "AdminConcessionItem[id="+id+", status="+status+"]"; }
}
