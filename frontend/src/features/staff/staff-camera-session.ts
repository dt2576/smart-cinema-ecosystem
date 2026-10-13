export type CameraStage = "stopped" | "requesting" | "scanning" | "error";
export type CameraDecoder = { start: (stream: MediaStream, video: HTMLVideoElement, decoded: (text: string) => void) => Promise<{ stop: () => void }> };
export type CameraDependencies = {
  media: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  decoder: () => Promise<CameraDecoder>;
  stage: (stage: CameraStage, message?: string) => void;
  decoded: (text: string) => void;
  devices: () => Promise<MediaDeviceInfo[]>;
  availableDevices: (devices: MediaDeviceInfo[]) => void;
};
export function cameraErrorMessage(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  return ["NotAllowedError", "SecurityError"].includes(name) ? "Chưa có quyền dùng camera. Cho phép camera trong trình duyệt hoặc nhập mã bên dưới."
    : ["NotFoundError", "OverconstrainedError"].includes(name) ? "Không tìm thấy camera phù hợp. Chọn camera khác hoặc nhập mã bên dưới."
    : name === "NotSupportedError" ? "Trình duyệt chưa hỗ trợ camera tại đây. Dùng HTTPS hoặc localhost và thử lại, hoặc nhập mã bên dưới."
    : "Chưa thể mở camera. Camera có thể đang được ứng dụng khác sử dụng; hãy thử lại hoặc nhập mã bên dưới.";
}
/** Own every acquired stream, including one delivered after stop/unmount. */
export class StaffCameraSession {
  private dependencies: CameraDependencies;
  private video: HTMLVideoElement;
  private generation = 0;
  private stream: MediaStream | null = null;
  private controls: { stop: () => void } | null = null;
  constructor(video: HTMLVideoElement, dependencies: CameraDependencies) { this.video = video; this.dependencies = dependencies; }
  private dispose() {
    try { this.controls?.stop(); } catch { /* No camera internals in diagnostics. */ }
    this.controls = null;
    for (const track of this.stream?.getTracks() ?? []) { try { track.stop(); } catch { /* Stop other tracks too. */ } }
    this.stream = null; this.video.srcObject = null;
    this.video.removeAttribute("src"); this.video.load();
  }
  stop() { this.generation++; this.dispose(); this.dependencies.stage("stopped"); }
  async start(deviceId?: string) {
    this.stop(); const generation = this.generation; this.dependencies.stage("requesting");
    try {
      const decoder = await this.dependencies.decoder(); if (generation !== this.generation) return;
      const stream = await this.dependencies.media({ audio: false, video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      for (const track of stream.getVideoTracks()) track.addEventListener?.("ended", () => {
        if (generation !== this.generation) return;
        this.stop(); this.dependencies.stage("error", cameraErrorMessage({ name: "NotReadableError" }));
      }, { once: true });
      const controls = await decoder.start(stream, this.video, text => {
        if (generation !== this.generation) return;
        this.stop(); this.dependencies.decoded(text); // One decode, tracks stopped before resolution.
      });
      if (generation !== this.generation) { controls.stop(); return; }
      this.controls = controls; this.dependencies.stage("scanning");
      try { const devices = await this.dependencies.devices(); if (generation === this.generation) this.dependencies.availableDevices(devices.filter(d => d.kind === "videoinput")); }
      catch { /* Enumeration is optional; default camera and manual entry remain usable. */ }
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop(); this.dependencies.stage("error", cameraErrorMessage(error));
    }
  }
}
