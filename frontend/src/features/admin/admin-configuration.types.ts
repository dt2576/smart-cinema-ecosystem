export type CinemaStatus = "ACTIVE" | "TEMPORARILY_CLOSED" | "INACTIVE";
export type PhysicalStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export type SeatType = "STANDARD" | "VIP" | "COUPLE";
export type CinemaContent = { name: string; address: string; contact: string | null; operatingInformation: string | null; status: CinemaStatus };
export type AdminCinema = CinemaContent & { id: string };
export type HallContent = { name: string; capacity: number; type: string; status: PhysicalStatus };
export type AdminHall = HallContent & { id: string; cinemaId: string; layoutInitialized: boolean };
export type SeatContent = { row: string; number: string; type: SeatType; physicalStatus: PhysicalStatus };
export type AdminSeat = SeatContent & { id: string; hallId: string; guestCapacity: number; structureEditable: boolean };

export function layoutGuestCapacity(units: ReadonlyArray<Pick<SeatContent, "type">>): number {
  return units.reduce((total, unit) => total + (unit.type === "COUPLE" ? 2 : 1), 0);
}
