import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { createMockBookingHistoryService } from "../src/features/booking/booking-history-service.ts";
import { renderBookingQr } from "../src/features/ticket/booking-qr-renderer.ts";

test("every paid Booking PNG independently decodes to its inert, reusable Booking payload", async () => {
  const service = createMockBookingHistoryService("default", 0);
  const bookings = await service.list(new AbortController().signal);
  for (const booking of bookings.filter(value => value.qr)) {
    const png = PNG.sync.read(await readFile(`public${booking.qr.imageUrl}`));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, booking.qr.payload);
    assert.equal((await service.resolveQr(decoded.data, new AbortController().signal))?.id, booking.id);
  }
});

test("real QR renderer round-trips exact UTF-8 opaque token bytes with quiet zone", async () => {
  for (const token of ["a".repeat(64), "  vé-đặt:á-🎬-fixture  ", "🎬".repeat(128)]) {
    const data = await renderBookingQr(token);
    const png = PNG.sync.read(Buffer.from(data.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, token);
    assert.deepEqual(decoded?.binaryData, [...new TextEncoder().encode(token)]);
    assert.equal(png.width, 320);
    assert.deepEqual([...png.data.subarray(0, 4)], [255, 255, 255, 255]);
  }
});
