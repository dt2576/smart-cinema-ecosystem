package com.smartcinema.staff;

import java.util.List;

public record StaffCheckInResponse(List<String> checkedInTicketIds,StaffBookingResponse booking) { }
