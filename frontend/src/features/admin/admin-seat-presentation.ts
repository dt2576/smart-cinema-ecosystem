/** Display order only. Never infer positions, split ranges or mutate API data. */
export function orderSeatRowForDisplay<T extends { number: string }>(seats: readonly T[]): T[] {
  const parsed = seats.map(seat => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(seat.number);
    if (!match) return null;
    const start = BigInt(match[1]);
    const end = BigInt(match[2] ?? match[1]);
    return start <= end ? { seat, start, end } : null;
  });
  // A row with opaque, descending or overlapping labels has no unambiguous
  // numeric order. Keep the entire row in server order in that case.
  if (parsed.some(item => item === null)) return [...seats];
  const ordered = parsed.filter(item => item !== null).sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  if (ordered.some((item, index) => index > 0 && ordered[index - 1].end >= item.start)) return [...seats];
  return ordered.map(item => item.seat);
}
