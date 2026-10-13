export const STAFF_ACTIVATION_PATH = "/staff/activate";

export type StaffInvitationCapture =
  | { kind: "ready"; token: string }
  | { kind: "missing" | "malformed" };
export type StaffPasswordErrors = { password?: string; confirmation?: string };

// 32 bytes, canonical unpadded base64url: the final two padding bits are zero.
export function isStaffInvitationToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value);
}

export function parseStaffInvitationFragment(fragment: string): StaffInvitationCapture {
  if (!fragment) return { kind: "missing" };
  const match = /^#token=([A-Za-z0-9_-]+)$/.exec(fragment);
  return match && isStaffInvitationToken(match[1])
    ? { kind: "ready", token: match[1] }
    : { kind: "malformed" };
}

export function captureStaffInvitation(location: Pick<Location, "hash">, history: Pick<History, "state" | "replaceState">): StaffInvitationCapture {
  const fragment = location.hash;
  // No query is read/forwarded, and no credential goes into history state.
  history.replaceState(history.state, "", STAFF_ACTIVATION_PATH);
  return parseStaffInvitationFragment(fragment);
}

export function staffPasswordError(password: string): string | undefined {
  if (!password.length) return "Nhập mật khẩu mới của bạn.";
  // Match Java String.isBlank, rather than JavaScript trim. Never modify input.
  if (!/[^\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028-\u2029\u205f\u3000]/u.test(password)) return "Mật khẩu không được chỉ gồm khoảng trắng.";
  if (password.length < 8) return "Sử dụng ít nhất 8 ký tự."; // Same UTF-16 length as Java.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(password)) return "Mật khẩu có ký tự chưa hợp lệ. Vui lòng nhập lại.";
  if (new TextEncoder().encode(password).length > 72) return "Mật khẩu vượt quá 72 byte UTF-8. Hãy dùng mật khẩu ngắn hơn.";
}

export function validateStaffPasswords(password: string, confirmation: string): StaffPasswordErrors {
  const error = staffPasswordError(password);
  return {
    ...(error ? { password: error } : {}),
    ...(!confirmation.length ? { confirmation: "Nhập lại mật khẩu mới để xác nhận." }
      : password !== confirmation ? { confirmation: "Mật khẩu xác nhận không khớp." } : {}),
  };
}

export class StaffActivationApiError extends Error {
  readonly outcome: "unavailable" | "throttled" | "uncertain";
  readonly retryAfter: number;
  constructor(outcome: StaffActivationApiError["outcome"], retryAfter = 0) {
    super(outcome === "unavailable"
      ? "Lời mời không thể sử dụng hoặc mật khẩu bị từ chối. Liên kết có thể đã hết hạn, đã dùng hoặc đã được thay thế. Liên hệ quản trị viên để được hỗ trợ."
      : outcome === "throttled"
        ? "Có quá nhiều yêu cầu thiết lập mật khẩu. Vui lòng chờ trước khi mở lại lời mời."
        : "Chưa thể xác nhận kết quả thiết lập mật khẩu. Yêu cầu có thể đã được xử lý. Liên hệ quản trị viên để kiểm tra trước khi thiết lập lại; không gửi lại yêu cầu này.");
    this.name = "StaffActivationApiError";
    this.outcome = outcome;
    this.retryAfter = retryAfter;
  }
}

export function staffActivationRetryAfter(value: string | null, now = Date.now()): number {
  const seconds = value && /^\d{1,6}$/.test(value) ? Number(value)
    : value ? Math.ceil((Date.parse(value) - now) / 1000) : 60;
  return Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400 ? seconds : 60;
}

/** Public confidential POST only. No auth header/cookies, parsing, or retry. */
export async function setupStaffPassword(token: string, password: string, signal: AbortSignal): Promise<void> {
  if (!isStaffInvitationToken(token) || staffPasswordError(password)) throw new StaffActivationApiError("unavailable");
  const request = new AbortController(), abort = () => request.abort();
  if (signal.aborted) request.abort(); else signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15_000);
  try {
    if (request.signal.aborted) throw new StaffActivationApiError("uncertain");
    const response = await fetch("/api/v1/staff/password-setups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }), signal: request.signal,
      credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", redirect: "error",
    });
    if (request.signal.aborted) throw new StaffActivationApiError("uncertain");
    if (response.status === 204) return;
    if (response.status === 429) throw new StaffActivationApiError("throttled", staffActivationRetryAfter(response.headers.get("Retry-After")));
    if (response.status >= 400 && response.status < 500) throw new StaffActivationApiError("unavailable");
    // Neither a different 2xx nor a 5xx establishes a committed setup result.
    throw new StaffActivationApiError("uncertain");
  } catch (error) {
    if (error instanceof StaffActivationApiError) throw error;
    throw new StaffActivationApiError("uncertain");
  } finally {
    clearTimeout(timeout); signal.removeEventListener("abort", abort);
  }
}
