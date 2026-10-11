import QRCode from "qrcode";

// An explicit byte segment preserves the exact UTF-8 token, without wrappers.
export function renderBookingQr(token: string): Promise<string> {
  return QRCode.toDataURL([{ data: new TextEncoder().encode(token), mode: "byte" }], {
    errorCorrectionLevel: "M", margin: 4, width: 320,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
