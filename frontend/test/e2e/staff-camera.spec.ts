import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import QRCode from "qrcode";
import { mockStaffCheckIn } from "./helpers/staff-checkin";
import { STAFF_QR_FIXTURE } from "../fixtures/staff-checkin";

const { PNG } = createRequire(resolve("package.json"))("pngjs");
const VIDEO = resolve("target/staff-checkin-2026-10-13/fake-camera.y4m"), ROUTE = "/staff/check-in";
type QaWindow = Window & { qaStaffTracks: MediaStreamTrack[]; qaStaffMediaCalls: number; qaStaffLateMedia?: () => void };
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${VIDEO}`] } });
test.beforeAll(async () => {
  // Explicit generated QR/video fixture. Actual production decoder, fake camera hardware.
  const png = PNG.sync.read(await QRCode.toBuffer(STAFF_QR_FIXTURE, { type: "png", width: 320, margin: 4, errorCorrectionLevel: "M" }));
  const width = 640, height = 480, y = Buffer.alloc(width * height, 235), uv = Buffer.alloc(width * height / 2, 128);
  for (let row = 0; row < png.height; row++) for (let col = 0; col < png.width; col++) y[(row + 80) * width + col + 160] = Math.round(16 + png.data[(row * png.width + col) * 4] * 219 / 255);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), y, uv]); await mkdir(resolve("target/staff-checkin-2026-10-13"), { recursive: true });
  await writeFile(VIDEO, Buffer.concat([Buffer.from("YUV4MPEG2 W640 H480 F10:1 Ip A1:1 C420jpeg\n"), ...Array.from({ length: 30 }, () => frame)]));
});
async function trackNativeCamera(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const qa = window as unknown as QaWindow; qa.qaStaffTracks = []; qa.qaStaffMediaCalls = 0;
    const media = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { qa.qaStaffMediaCalls++; const stream = await media(constraints); qa.qaStaffTracks.push(...stream.getTracks()); return stream; };
  });
}
async function blankCamera(page: import("@playwright/test").Page, mode: "blank" | "switch-failure" | "late" = "blank") {
  await page.addInitScript(({ mode }) => {
    const qa = window as unknown as QaWindow; qa.qaStaffTracks = []; qa.qaStaffMediaCalls = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      qa.qaStaffMediaCalls++;
      if (mode === "switch-failure" && qa.qaStaffMediaCalls > 1) throw new DOMException("fixture hardware unavailable", "NotReadableError");
      const create = () => { const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480; const ctx = canvas.getContext("2d")!; ctx.fillStyle = "white"; ctx.fillRect(0, 0, 640, 480); const stream = canvas.captureStream(5); qa.qaStaffTracks.push(...stream.getTracks()); return stream; };
      if (mode === "late") return new Promise<MediaStream>(resolve => { qa.qaStaffLateMedia = () => resolve(create()); });
      return create();
    };
    navigator.mediaDevices.enumerateDevices = async () => [
      { deviceId: "fixture-first", groupId: "fixture", kind: "videoinput", label: "Camera thứ nhất", toJSON() {} },
      { deviceId: "fixture-second", groupId: "fixture", kind: "videoinput", label: "Camera thứ hai", toJSON() {} },
    ] as MediaDeviceInfo[];
  }, { mode });
}
async function tracksEnded(page: import("@playwright/test").Page) { await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).qaStaffTracks.length > 0 && (window as unknown as QaWindow).qaStaffTracks.every(t => t.readyState === "ended"))).toBe(true); }

test("Staff actual ZXing decoder consumes fake-video opaque QR once, with explicit permission and no Check-in", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await trackNativeCamera(page); const logs: string[] = []; page.on("console", message => logs.push(message.text())); await page.goto(ROUTE);
  await expect(page.getByRole("button", { name: "Mở camera", exact: true })).toBeEnabled(); expect(await page.evaluate(() => (window as unknown as QaWindow).qaStaffMediaCalls)).toBe(0);
  await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("region", { name: "Thông tin đặt vé và vé" })).toBeVisible();
  const resolutions = state.requests.filter(r => r.path.endsWith("booking-qr-resolutions")); expect(resolutions).toHaveLength(1); expect(resolutions[0].body?.bookingQr).toBe(STAFF_QR_FIXTURE); expect(state.requests.some(r => r.path.endsWith("check-ins"))).toBe(false); await tracksEnded(page);
  expect(logs.some(message => message.includes(STAFF_QR_FIXTURE) || message.includes("qa-staff-access"))).toBe(false);
});
test("Staff camera permission denial keeps accessible manual fallback", async ({ page }) => {
  await mockStaffCheckIn(page); await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("private camera fixture", "NotAllowedError"); }; }); await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa có quyền dùng camera"); await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toBeEnabled(); expect(await page.locator("body").innerText()).not.toContain("private camera fixture");
});
test("Staff unsupported camera browser explains secure-context/manual alternative", async ({ page }) => {
  await mockStaffCheckIn(page); await page.addInitScript(() => Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined })); await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("HTTPS hoặc localhost"); await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toBeEnabled();
});
test("Staff explicit scanner stop releases every acquired track", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await blankCamera(page); await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Hướng camera" })).toBeVisible(); await page.getByRole("button", { name: "Dừng quét", exact: true }).click(); await tracksEnded(page); expect(state.requests.filter(r => r.method === "POST")).toHaveLength(0);
});
test("Staff device switching failure closes prior camera and permits manual entry", async ({ page }) => {
  await mockStaffCheckIn(page); await blankCamera(page, "switch-failure"); await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByLabel("Camera", { exact: true })).toBeVisible(); await page.getByLabel("Camera", { exact: true }).selectOption("fixture-second"); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể mở camera"); await tracksEnded(page); await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toBeEnabled();
});
test("Staff stopped pending permission cleans a late media stream", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await blankCamera(page, "late"); await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect.poll(() => page.evaluate(() => typeof (window as unknown as QaWindow).qaStaffLateMedia)).toBe("function"); await page.getByRole("button", { name: "Dừng quét", exact: true }).click(); await page.evaluate(() => (window as unknown as QaWindow).qaStaffLateMedia?.()); await tracksEnded(page); expect(state.requests.filter(r => r.method === "POST")).toHaveLength(0);
});
test("Staff Cinema change/visibility cleanup closes media and erases operational state", async ({ page }) => {
  await mockStaffCheckIn(page, { multiple: true }); await blankCamera(page); await page.goto(ROUTE); await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("71"); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Hướng camera" })).toBeVisible(); await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("72"); await tracksEnded(page);
  await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Hướng camera" })).toBeVisible(); await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); }); await tracksEnded(page); await expect(page.locator("video")).toHaveCount(0);
});
test("Staff SPA navigation away stops the scanner before leaving workspace", async ({ page }) => {
  let stopped = 0; await page.exposeFunction("qaTrackStopped", () => { stopped++; }); await mockStaffCheckIn(page); await blankCamera(page);
  await page.addInitScript(() => { const native = MediaStreamTrack.prototype.stop; MediaStreamTrack.prototype.stop = function () { void (window as unknown as { qaTrackStopped: () => Promise<void> }).qaTrackStopped(); native.call(this); }; });
  await page.goto(ROUTE); await page.getByRole("button", { name: "Mở camera", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Hướng camera" })).toBeVisible(); await page.getByRole("link", { name: "Phim", exact: true }).click(); await expect(page).toHaveURL(/\/movies$/); await expect.poll(() => stopped).toBeGreaterThan(0);
});
