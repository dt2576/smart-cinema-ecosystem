// Date-only presentation preserves the API calendar date without timezone conversion.
export function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function formatLocalDateTime(value: string): string {
  const [date, time] = value.split("T");
  return `${formatCalendarDate(date)} ${time}`;
}

export function formatUtcInstant(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(new Date(value)) + " UTC";
}
