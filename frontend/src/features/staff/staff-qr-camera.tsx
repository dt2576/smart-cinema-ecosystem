"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { StaffCameraSession, type CameraStage } from "@/features/staff/staff-camera-session";

type Props = { disabled: boolean; onStart: () => boolean; onDecoded: (text: string) => void; onActive: (active: boolean) => void };
export function StaffQrCamera({ disabled, onStart, onDecoded, onActive }: Props) {
  const video = useRef<HTMLVideoElement>(null), owner = useRef<StaffCameraSession | null>(null);
  const callbacks = useRef({ onDecoded, onActive });
  const [stage, setStage] = useState<CameraStage>("stopped"), [message, setMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]), [device, setDevice] = useState("");
  useEffect(() => { callbacks.current = { onDecoded, onActive }; }, [onDecoded, onActive]);
  useEffect(() => {
    let mounted = true;
    const session = new StaffCameraSession(video.current!, {
      async media(constraints) {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: "NotSupportedError" });
        return navigator.mediaDevices.getUserMedia(constraints);
      },
      async decoder() {
        const [{ BrowserQRCodeReader }, { DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const reader = new BrowserQRCodeReader(new Map([[DecodeHintType.CHARACTER_SET, "UTF-8"]]), { delayBetweenScanAttempts: 350, delayBetweenScanSuccess: 500, tryPlayVideoTimeout: 5000 });
        return { start: (stream, preview, decoded) => reader.decodeFromStream(stream, preview, (result, _error, controls) => { if (result) { controls.stop(); decoded(result.getText()); } }) };
      },
      stage(value, error) { if (mounted) { setStage(value); setMessage(error ?? ""); callbacks.current.onActive(value === "scanning" || value === "requesting"); } },
      decoded(text) { if (mounted) callbacks.current.onDecoded(text); },
      devices: () => navigator.mediaDevices.enumerateDevices(),
      availableDevices(value) { if (mounted) setDevices(value); },
    });
    owner.current = session;
    return () => { mounted = false; session.stop(); owner.current = null; };
  }, []);
  const running = stage === "scanning" || stage === "requesting";
  function start(id = device) { if (onStart()) void owner.current?.start(id || undefined); }
  return <div className="space-y-4">
    <div className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-card border border-outline/40 bg-canvas">
      <video ref={video} muted playsInline aria-label="Camera quét mã QR" className="h-full w-full object-contain" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-dashed border-action/70" />
      {!running && <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-accent"><Icon name="scan" width={64} height={64} /></div>}
      <p role="status" className="absolute inset-x-3 bottom-3 rounded-control bg-canvas/95 px-3 py-2 text-center text-body-sm text-foreground">{stage === "requesting" ? "Đang xin quyền và mở camera…" : stage === "scanning" ? "Hướng camera vào mã QR đặt vé" : "Camera đang tắt"}</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button disabled={disabled || running} onClick={() => start()} className="min-w-0 flex-1"><Icon name="camera" />Mở camera</Button>
      <Button variant="secondary" disabled={!running} onClick={() => owner.current?.stop()}>Dừng quét</Button>
    </div>
    {devices.length > 1 && <div><label htmlFor="staff-camera" className="mb-2 block text-body-sm text-muted">Camera</label><select id="staff-camera" className="form-input" disabled={disabled || stage === "requesting"} value={device} onChange={event => { const id = event.target.value; setDevice(id); if (running) start(id); }}><option value="">Ưu tiên camera sau</option>{devices.map((camera, i) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${i + 1}`}</option>)}</select></div>}
    {message && <StatusFeedback compact role="alert" tone="error" message={message} />}
    <p className="text-body-sm leading-6 text-muted">Camera chỉ mở khi bạn cho phép. Sau khi đọc được mã, camera dừng để kiểm tra đặt vé; việc quét mã chưa soát vé.</p>
  </div>;
}
