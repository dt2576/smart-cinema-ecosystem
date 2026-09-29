package com.smartcinema.concession;

public record ConcessionItemResponse(String id, String name, String description, String category,
        String sellingPrice, String imageUrl) { }
