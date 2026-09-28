import { mkdir } from "node:fs/promises";
import QRCode from "qrcode";
import { createMockBookingHistoryService } from "../src/features/booking/booking-history-service.ts";

// Offline, reproducible demo assets. Never encode a credential, provider reference or admission token.
await mkdir("public/images/booking-preview", { recursive: true });
for (const booking of await createMockBookingHistoryService("default", 0).list(new AbortController().signal)) {
  if (booking.qr) await QRCode.toFile(`public${booking.qr.imageUrl}`, booking.qr.payload, { type: "png", errorCorrectionLevel: "M", margin: 4, scale: 10 });
}
