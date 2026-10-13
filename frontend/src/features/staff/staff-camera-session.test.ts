import { test } from "node:test";
import assert from "node:assert/strict";
import { StaffCameraSession, cameraErrorMessage, type CameraDependencies } from "@/features/staff/staff-camera-session";

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup() {
  let stopped = 0, decoderStopped = 0, mediaCalls = 0, decoded: (text: string) => void = () => undefined;
  const values: string[] = [], stages: string[] = [], constraints: MediaStreamConstraints[] = [];
  const track = { stop() { stopped++; }, addEventListener() {} }, stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const video = { srcObject: null, removeAttribute() {}, load() {} } as unknown as HTMLVideoElement;
  const dependencies: CameraDependencies = { async media(value) { mediaCalls++; constraints.push(value); return stream; }, async decoder() { return { async start(_stream, _video, callback) { decoded = callback; return { stop() { decoderStopped++; } }; } }; }, stage(value) { stages.push(value); }, decoded(value) { values.push(value); }, async devices() { return []; }, availableDevices() {} };
  const owner = new StaffCameraSession(video, dependencies);
  return { owner, dependencies, values, stages, constraints, stream, decode: (text: string) => decoded(text), stopped: () => stopped, decoderStopped: () => decoderStopped, mediaCalls: () => mediaCalls };
}
test("Staff camera acquires only after start, rear preference and no audio", async () => {
  const s = setup(); assert.equal(s.mediaCalls(), 0); await s.owner.start(); assert.equal(s.mediaCalls(), 1); assert.deepEqual(s.constraints[0], { audio: false, video: { facingMode: { ideal: "environment" } } }); s.owner.stop(); assert.ok(s.stopped() > 0); assert.ok(s.decoderStopped() > 0);
});
test("Staff camera decodes opaque text exactly once and stops all tracks", async () => {
  const s = setup(); await s.owner.start(); const token = "  Vé e\u0301 😀  "; s.decode(token); s.decode(token); assert.deepEqual(s.values, [token]); assert.ok(s.stopped() > 0); assert.equal(s.stages.at(-1), "stopped");
});
test("Staff stopped/unmounted camera disposes a late permission stream", async () => {
  const s = setup(), pending = deferred<MediaStream>(); s.dependencies.media = () => pending.promise; const start = s.owner.start(); await Promise.resolve(); s.owner.stop(); pending.resolve(s.stream); await start; assert.ok(s.stopped() > 0); assert.deepEqual(s.values, []);
});
test("Staff device switch disposes first stream before requesting exact new device", async () => {
  const s = setup(); await s.owner.start(); const before = s.stopped(); await s.owner.start("second-camera"); assert.ok(s.stopped() > before); assert.deepEqual(s.constraints[1], { audio: false, video: { deviceId: { exact: "second-camera" } } }); s.owner.stop();
});
test("Staff permission denial remains safe and preserves manual fallback", async () => {
  const s = setup(); s.dependencies.media = async () => { throw { name: "NotAllowedError", message: "private camera internals" }; }; await s.owner.start(); assert.equal(s.stages.at(-1), "error"); assert.match(cameraErrorMessage({ name: "NotAllowedError" }), /nhập mã/); assert.equal(cameraErrorMessage({ message: "private camera internals" }).includes("private"), false);
});
test("Staff unavailable/unsupported/busy camera errors are localized and fixed", () => {
  for (const name of ["NotFoundError", "OverconstrainedError", "NotSupportedError", "NotReadableError", "AbortError"]) assert.match(cameraErrorMessage({ name, message: "private" }), /camera|Camera|nhập mã/);
});
test("Staff pending decoder completion after cleanup cannot restart scanning", async () => {
  const s = setup(), pending = deferred<{ stop: () => void }>(); s.dependencies.decoder = async () => ({ start: () => pending.promise });
  const start = s.owner.start(); await Promise.resolve(); await Promise.resolve(); s.owner.stop(); let lateStop = 0; pending.resolve({ stop() { lateStop++; } }); await start; assert.equal(lateStop, 1); assert.notEqual(s.stages.at(-1), "scanning");
});
test("Staff enumeration failure does not fail an acquired camera", async () => {
  const s = setup(); s.dependencies.devices = async () => { throw new Error("private"); }; await s.owner.start(); assert.equal(s.stages.at(-1), "scanning"); s.owner.stop();
});
