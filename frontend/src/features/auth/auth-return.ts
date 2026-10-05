// Only the authorized Seat route may resume; reject external/unrelated redirects.
export function seatLoginReturn(value: string | null): string | null {
  if (!value || !/^\/showtimes\/[1-9][0-9]{0,18}\/seats\?/.test(value) || value.includes("\\")) return null;
  const url = new URL(value, "https://smart-cinema.local");
  if (url.origin !== "https://smart-cinema.local" || url.hash) return null;
  if (!["movieId", "cinemaId"].every(key => url.searchParams.getAll(key).length === 1 && /^[1-9][0-9]{0,18}$/.test(url.searchParams.get(key) ?? ""))
    || url.searchParams.getAll("date").length !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("date") ?? "")) return null;
  return url.pathname + url.search;
}

export function customerLoginReturn(value: string | null): string | null {
  const match = value?.match(/^\/bookings\/([1-9][0-9]{0,18})\/(?:summary|concessions)$/);
  if (match && (match[1].length < 19 || match[1] <= "9223372036854775807")) return value;
  return seatLoginReturn(value);
}
