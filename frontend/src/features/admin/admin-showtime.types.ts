export const SHOWTIME_STATUSES = ["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING", "STARTED", "ENDED", "CANCELLED"] as const;
export type ShowtimeStatus = typeof SHOWTIME_STATUSES[number];
export type AdminShowtime = {
  id: string; movieId: string; movieTitle: string; cinemaId: string; cinemaName: string; hallId: string; hallName: string;
  startsAt: string; endsAt: string; occupiedUntil: string; bookingCutOff: string; basePrice: string;
  status: ShowtimeStatus; editable: boolean; transitions: ShowtimeStatus[];
};
export type AdminShowtimeSchedule = { timeZone: string; items: AdminShowtime[] };
export type AdminShowtimeDetail = { timeZone: string; showtime: AdminShowtime };
export type ShowtimeContent = { movieId: string; hallId: string; startsAt: string; basePrice: string; status: ShowtimeStatus };

function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const value = (name: string) => parts.find(part => part.type === name)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
export function showtimeLocalInput(instant: string, timeZone: string) { return localParts(new Date(instant), timeZone); }
export function showtimeLocalInstant(value: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid date and time.");
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== value) throw new Error("Enter a valid date and time.");
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = wall + hours * 3600000;
    offsets.add(Date.parse(`${localParts(new Date(sample), timeZone)}:00Z`) - sample);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(candidate => localParts(new Date(candidate), timeZone) === value);
  if (matches.length !== 1) throw new Error("This local time is missing or ambiguous in the configured timezone. Choose another time.");
  return new Date(matches[0]).toISOString();
}
export function validShowtimePrice(value: string) { return /^[0-9]+(\.[0-9]{1,4})?$/.test(value) && BigInt(value.split(".")[0]) < BigInt("1000000000000000"); }
