import assert from "node:assert/strict";
import test from "node:test";

const { createMockShowtimeService, canSelectShowtime, createSeatSelectionHandoff, showtimeDate, formatShowtimeTime, parseShowtimePreviewState } = await import("./showtime-service" + ".ts") as typeof import("./showtime-service");
const NOW = Date.parse("2030-01-01T09:00:00+07:00");
const signal = () => new AbortController().signal;

test("Showtime mock preserves string context, dates, Hall grouping and has no network dependency", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  try {
    const service = createMockShowtimeService("default", 0, () => NOW);
    const schedule = await service.list("9223372036854775807", "9007199254740993", signal());
    assert.equal(schedule.dates.length, 7);
    assert.equal(schedule.dates[0], "2030-01-01");
    assert.equal(new Set(schedule.items.map(item => item.id)).size, schedule.items.length);
    assert.equal(new Set(schedule.items.map(item => item.hall.id)).size, 2);
    assert.ok(schedule.items.every(item => item.movieId === "9223372036854775807" && item.cinemaId === "9007199254740993"));
    schedule.items[0].hall.name = "Changed";
    assert.equal((await service.list("1", "2", signal())).items[0].hall.name, "Hall 1");
  } finally { globalThis.fetch = original; }
});

test("eligibility rejects sold-out, exact start, past, mismatched context/date and invalid time", async () => {
  const { items } = await createMockShowtimeService("default", 0, () => NOW).list("1", "2", signal());
  const future = items[1];
  assert.equal(canSelectShowtime(future, "1", "2", "2030-01-01", NOW), true);
  for (const item of [items[0], items[2], { ...future, startsAt: "bad" }, { ...future, movieId: "9" }, { ...future, cinemaId: "9" }]) {
    assert.equal(createSeatSelectionHandoff(item, "1", "2", "2030-01-01", NOW), null);
  }
  assert.equal(canSelectShowtime(future, "1", "2", "2030-01-02", NOW), false);
  assert.equal(createSeatSelectionHandoff(future, "1", "2", "2030-01-01", Date.parse(future.startsAt)), null);
  assert.deepEqual(createSeatSelectionHandoff(future, "1", "2", "2030-01-01", NOW), { movieId: "1", cinemaId: "2", showtimeId: future.id, seatPath: `/showtimes/${future.id}/seats` });
});

test("Vietnam date/time formatting remains stable across UTC midnight and year boundary", () => {
  assert.equal(showtimeDate("2029-12-31T18:00:00Z"), "2030-01-01");
  assert.equal(formatShowtimeTime("2029-12-31T18:00:00Z"), "01:00");
});

test("empty, sold-out, past and retry fixtures are explicit; aborted requests do not consume failure", async () => {
  assert.equal(parseShowtimePreviewState("unexpected"), "default");
  assert.deepEqual((await createMockShowtimeService("empty", 0, () => NOW).list("1", "2", signal())).items, []);
  const soldOut = await createMockShowtimeService("sold-out", 0, () => NOW).list("1", "2", signal());
  assert.ok(soldOut.items.every(item => !item.hasAvailableSeats));
  const past = await createMockShowtimeService("past", 0, () => NOW).list("1", "2", signal());
  assert.ok(past.items.every(item => Date.parse(item.startsAt) <= NOW));
  const service = createMockShowtimeService("error", 5, () => NOW);
  const controller = new AbortController();
  const request = service.list("1", "2", controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await assert.rejects(service.list("1", "2", signal()), /couldn’t load/);
  assert.ok((await service.list("1", "2", signal())).items.length > 0);
});
