import { StaffActivationApiError, validateStaffPasswords, type StaffInvitationCapture, type StaffPasswordErrors } from "@/features/staff/staff-activation-service";

export type StaffActivationState = {
  stage: "preparing" | "ready" | "missing" | "malformed" | "submitting" | "awaiting-admin" | "unavailable" | "throttled" | "uncertain" | "interrupted";
  errors: StaffPasswordErrors;
  message: string;
  retryAfter: number;
};
type SetupTransport = (token: string, password: string, signal: AbortSignal) => Promise<void>;
const INITIAL_STATE: StaffActivationState = { stage: "preparing", errors: {}, message: "", retryAfter: 0 };

/** Snapshot contains no credentials; private invitation lives in this instance only. */
export class StaffActivationController {
  #token: string | null = null;
  private state = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private active = false;
  private initialized = false;
  private generation = 0;
  private attachment = 0;
  private request: AbortController | null = null;
  private readonly setup: SetupTransport;
  constructor(setup: SetupTransport) { this.setup = setup; }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.state;
  getServerSnapshot = () => INITIAL_STATE;
  private update(state: StaffActivationState) { this.state = state; this.listeners.forEach(listener => listener()); }
  private cancel() { this.generation++; this.request?.abort(); this.request = null; }

  attach(capture: () => StaffInvitationCapture) {
    this.active = true;
    const attachment = ++this.attachment;
    if (!this.initialized) { this.initialized = true; this.navigate(capture); }
    return () => {
      this.active = false; this.cancel();
      // React Strict Mode reattaches synchronously. Real disposal erases the
      // credential next microtask; cancellation is immediate in either case.
      queueMicrotask(() => {
        if (!this.active && this.attachment === attachment) {
          this.#token = null;
          this.initialized = false;
          this.update({ ...INITIAL_STATE, stage: "interrupted" });
        }
      });
    };
  }

  navigate(capture: () => StaffInvitationCapture) {
    if (!this.active) return;
    this.cancel(); this.#token = null;
    let invitation: StaffInvitationCapture;
    try { invitation = capture(); } catch { invitation = { kind: "malformed" }; }
    if (invitation.kind === "ready") this.#token = invitation.token;
    this.update({ ...INITIAL_STATE, stage: invitation.kind });
  }

  interrupt() {
    const uncertain = this.state.stage === "submitting";
    this.cancel(); this.#token = null;
    this.update({ ...INITIAL_STATE, stage: uncertain ? "uncertain" : "interrupted",
      message: uncertain ? new StaffActivationApiError("uncertain").message : "Thông tin lời mời đã được xóa. Hãy mở lại liên kết trong email để tiếp tục." });
  }

  edit(field: keyof StaffPasswordErrors) {
    if (!this.active || this.state.stage !== "ready") return;
    const errors = { ...this.state.errors }; delete errors[field];
    this.update({ ...this.state, errors, message: "" });
  }

  async submit(password: string, confirmation: string) {
    if (!this.active || this.state.stage !== "ready" || !this.#token) return;
    const errors = validateStaffPasswords(password, confirmation);
    if (Object.keys(errors).length) {
      this.update({ ...this.state, errors, message: "Kiểm tra các trường được đánh dấu trước khi tiếp tục." });
      return;
    }
    const token = this.#token;
    this.#token = null; // One explicit attempt per captured invitation context.
    this.cancel(); const generation = this.generation;
    const request = new AbortController(); this.request = request;
    this.update({ ...INITIAL_STATE, stage: "submitting" });
    try {
      await this.setup(token, password, request.signal);
      if (!this.active || generation !== this.generation) return;
      this.update({ ...INITIAL_STATE, stage: "awaiting-admin" });
    } catch (error) {
      if (!this.active || generation !== this.generation) return;
      const safe = error instanceof StaffActivationApiError ? error : new StaffActivationApiError("uncertain");
      this.update({ ...INITIAL_STATE, stage: safe.outcome, message: safe.message, retryAfter: safe.retryAfter });
    } finally {
      if (generation === this.generation) this.request = null;
    }
  }
}
