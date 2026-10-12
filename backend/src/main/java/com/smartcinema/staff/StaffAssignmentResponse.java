package com.smartcinema.staff;

import java.time.Instant;
import java.util.List;

public record StaffAssignmentResponse(Instant serverTime,List<Assignment> assignments) {
    public record Assignment(String id,String cinemaId,String cinemaName,Instant effectiveAt) { }
}
