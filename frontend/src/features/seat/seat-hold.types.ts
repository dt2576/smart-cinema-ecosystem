export interface SeatHold {
  id: string;
  showtimeId: string;
  seatId: string;
  createdAt: string;
  expiresAt: string;
  status: "ACTIVE";
}

export interface SeatHoldBatch { serverTime: string; holds: SeatHold[] }
export interface SeatHoldClock { serverTimeMs: number; receivedAt: number }

// Future Booking input only; not a Booking, sale, or promise of eligibility later.
export interface BookingHoldHandoff {
  showtimeId: string;
  holdIds: string[];
  holds: SeatHold[];
  serverTime: string;
  expiresAt: string;
}
