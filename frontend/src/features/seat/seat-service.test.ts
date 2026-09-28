import assert from "node:assert/strict";
import test from "node:test";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";

const { createMockSeatService, toggleSeatUnit, createConcessionPreviewHandoff, SEAT_PREVIEW_DURATION_MS, parseSeatPreviewScenario } = await import("./seat-service" + ".ts") as typeof import("./seat-service");
const NOW = Date.parse("2030-01-01T09:00:00+07:00");
const showtime: ShowtimeOption = { id: "900719925474099301", movieId: "9223372036854775807", cinemaId: "9007199254740993", hall: { id: "90071992547409931", name: "Hall 1" }, startsAt: "2030-01-01T10:00:00+07:00", hasAvailableSeats: true };
const signal = () => new AbortController().signal;

test("Seat mock has isolated fixtures and whole couple units without a network dependency", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network call"); };
  try {
    const service = createMockSeatService("default", 0);
    const map = await service.load(showtime, signal());
    assert.equal(map.units.length, 36);
    assert.equal(new Set(map.units.map(unit => unit.id)).size, 36);
    assert.deepEqual(map.units.filter(unit => unit.type === "COUPLE").map(unit => unit.number), ["1-2", "3-4", "5-6", "7-8"]);
    assert.ok(map.units.every(unit => unit.showtimeId === showtime.id && unit.hallId === showtime.hall.id));
    map.units[0].availability = "BOOKED";
    assert.equal((await service.load(showtime, signal())).units[0].availability, "AVAILABLE");
  } finally { globalThis.fetch = original; }
});

test("couple selection toggles one identity, counts two guests and never extends the preview deadline", async () => {
  const map = await createMockSeatService("default", 0).load(showtime, signal());
  const couple = map.units.find(unit => unit.type === "COUPLE" && unit.availability === "AVAILABLE")!;
  const selection = toggleSeatUnit({ unitIds: [], expiresAt: null }, couple.id, map, NOW);
  assert.deepEqual(selection, { unitIds: [couple.id], expiresAt: NOW + SEAT_PREVIEW_DURATION_MS });
  assert.equal(createConcessionPreviewHandoff(selection, map, showtime, NOW)?.guestCount, 2);
  const both = toggleSeatUnit(selection, map.units[0].id, map, NOW + 5000);
  assert.equal(both.expiresAt, selection.expiresAt);
  assert.deepEqual(createConcessionPreviewHandoff(both, map, showtime, NOW + 5000), { movieId: showtime.movieId, cinemaId: showtime.cinemaId, showtimeId: showtime.id, hallId: showtime.hall.id, seatUnitIds: [couple.id, map.units[0].id], guestCount: 3 });
  assert.deepEqual(toggleSeatUnit(selection, couple.id, map, NOW + 5000), { unitIds: [], expiresAt: null });
  assert.equal(toggleSeatUnit(selection, "E1", map, NOW), selection);
});

test("blocked, stale, foreign, duplicate and expired selections cannot continue", async () => {
  const map = await createMockSeatService("default", 0).load(showtime, signal());
  const selected = toggleSeatUnit({ unitIds: [], expiresAt: null }, map.units[0].id, map, NOW);
  for (const id of [map.units[2].id, map.units.find(unit => unit.availability === "UNAVAILABLE")!.id, "unknown"]) {
    assert.equal(toggleSeatUnit(selected, id, map, NOW), selected);
    assert.equal(createConcessionPreviewHandoff({ ...selected, unitIds: [id] }, map, showtime, NOW), null);
  }
  assert.equal(createConcessionPreviewHandoff({ ...selected, unitIds: [...selected.unitIds, ...selected.unitIds] }, map, showtime, NOW), null);
  assert.equal(createConcessionPreviewHandoff(selected, { ...map, hallId: "other" }, showtime, NOW), null);
  assert.equal(createConcessionPreviewHandoff(selected, { ...map, showtimeId: "other" }, showtime, NOW), null);
  assert.equal(createConcessionPreviewHandoff(selected, map, { ...showtime, startsAt: new Date(NOW).toISOString() }, NOW), null);
  assert.equal(createConcessionPreviewHandoff(selected, map, showtime, selected.expiresAt!), null);
  assert.equal(toggleSeatUnit(selected, map.units[1].id, map, selected.expiresAt!), selected);
  map.units[0].availability = "BOOKED";
  assert.equal(createConcessionPreviewHandoff(selected, map, showtime, NOW), null);
});

test("empty, unavailable and retry scenarios honor request cancellation", async () => {
  assert.equal(parseSeatPreviewScenario("unexpected"), "default");
  assert.equal((await createMockSeatService("empty", 0).load(showtime, signal())).units.length, 0);
  assert.ok((await createMockSeatService("unavailable", 0).load(showtime, signal())).units.every(unit => unit.availability !== "AVAILABLE"));
  const service = createMockSeatService("error", 5);
  const controller = new AbortController();
  const request = service.load(showtime, controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await assert.rejects(service.load(showtime, signal()), /couldn’t load/);
  assert.equal((await service.load(showtime, signal())).units.length, 36);
});
