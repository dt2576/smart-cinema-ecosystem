import { StaffApiError } from "@/features/staff/staff-api";
import type { StaffAssignments, StaffBooking, StaffCheckIn } from "@/features/staff/staff.types";

export type StaffTransport = {
  assignments: (signal: AbortSignal) => Promise<StaffAssignments>;
  resolve: (cinema: string, qr: string, signal: AbortSignal) => Promise<StaffBooking>;
  recover: (booking: string, cinema: string, signal: AbortSignal, previous: StaffBooking) => Promise<StaffBooking>;
  checkIn: (booking: StaffBooking, selected: string[], signal: AbortSignal) => Promise<StaffCheckIn>;
};
export type StaffWorkspaceState = {
  assignments: StaffAssignments | null; assignmentLoading: boolean; cinemaId: string;
  booking: StaffBooking | null; manualToken: string; selected: string[];
  operation: "idle" | "resolving" | "recovering" | "confirming" | "submitting" | "review";
  notice: { message: string; tone: "muted" | "error" | "success" } | null;
  retryAt: number; retrySeconds: number; cameraEpoch: number; cameraActive: boolean; denied: boolean;
};
const EMPTY: StaffWorkspaceState = { assignments: null, assignmentLoading: true, cinemaId: "", booking: null, manualToken: "", selected: [], operation: "idle", notice: null, retryAt: 0, retrySeconds: 0, cameraEpoch: 0, cameraActive: false, denied: false };

/** Memory-only store. All async results belong to one owner/context/generation. */
export class StaffWorkspaceController {
  private state: StaffWorkspaceState = EMPTY;
  private listeners = new Set<() => void>();
  private api: StaffTransport;
  private currentOwner: () => boolean;
  private unauthorized: () => void;
  private active = false;
  private generation = 0;
  private request: AbortController | null = null;
  private cooldown: ReturnType<typeof setTimeout> | undefined;
  private lastForegroundCheck = 0;
  constructor(api: StaffTransport, currentOwner: () => boolean, unauthorized: () => void) {
    this.api = api; this.currentOwner = currentOwner; this.unauthorized = unauthorized;
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;
  private update(update: Partial<StaffWorkspaceState>) {
    this.state = { ...this.state, ...update }; this.listeners.forEach(listener => listener());
  }
  private cancel() { this.generation++; this.request?.abort(); this.request = null; }
  private job() { this.cancel(); this.request = new AbortController(); return { generation: this.generation, signal: this.request.signal }; }
  private current(generation: number) { return this.active && this.currentOwner() && generation === this.generation; }
  private canRead() { return this.active && this.currentOwner() && Date.now() >= this.state.retryAt; }
  private busy() { return this.state.assignmentLoading || ["resolving", "recovering", "submitting"].includes(this.state.operation); }
  start() {
    this.active = true; this.update({ ...EMPTY, cameraEpoch: this.state.cameraEpoch + 1 }); void this.loadAssignments();
  }
  destroy() {
    this.active = false; this.cancel(); clearTimeout(this.cooldown);
    this.update({ ...EMPTY, assignmentLoading: false, cameraEpoch: this.state.cameraEpoch + 1 });
  }
  suspend() {
    this.cancel(); this.lastForegroundCheck = 0;
    this.update({ ...EMPTY, assignmentLoading: false, cameraEpoch: this.state.cameraEpoch + 1, retryAt: this.state.retryAt, retrySeconds: this.state.retrySeconds,
      notice: this.state.retryAt > Date.now() ? this.state.notice : null });
  }
  foreground() {
    if (this.busy() || this.state.cameraActive || !this.canRead() || Date.now() - this.lastForegroundCheck < 15_000) return;
    this.lastForegroundCheck = Date.now(); void this.loadAssignments();
  }
  private clearOperational() {
    return { booking: null, manualToken: "", selected: [], operation: "idle" as const, cameraActive: false, cameraEpoch: this.state.cameraEpoch + 1 };
  }
  private failure(error: unknown, review = false) {
    const safe = error instanceof StaffApiError ? error : new StaffApiError(0);
    if (safe.status === 401 || safe.status === 403) {
      this.cancel(); this.update({ ...this.clearOperational(), assignments: null, assignmentLoading: false, cinemaId: "", denied: true, notice: { tone: "error", message: safe.message } });
      if (safe.status === 401 && this.currentOwner()) this.unauthorized();
      return;
    }
    if (safe.status === 429) {
      clearTimeout(this.cooldown); const retryAt = Date.now() + safe.retryAfter * 1000;
      this.update({ retryAt, retrySeconds: safe.retryAfter }); this.cooldown = setTimeout(() => { if (this.active) this.update({ retryAt: 0, retrySeconds: 0 }); }, Math.max(0, retryAt - Date.now()));
    }
    const inaccessible = safe.status === 404;
    this.update({ ...(inaccessible ? this.clearOperational() : {}), selected: [], operation: review && !inaccessible ? "review" : "idle",
      notice: { tone: "error", message: review && !inaccessible ? `${safe.message} Chưa thể xác định kết quả soát vé; không gửi lại lệnh. Kiểm tra trạng thái hiện tại trước.` : safe.message } });
  }
  async loadAssignments() {
    if (!this.canRead() || this.state.operation === "submitting") return;
    this.lastForegroundCheck = Date.now();
    const previousCinema = this.state.cinemaId, previousBooking = this.state.booking;
    const job = this.job(); this.update({ assignmentLoading: true, selected: [], manualToken: "", cameraActive: false, cameraEpoch: this.state.cameraEpoch + 1, operation: previousBooking ? "review" : "idle", notice: null });
    try {
      const assignments = await this.api.assignments(job.signal); if (!this.current(job.generation)) return;
      const current = assignments.assignments.some(a => a.cinemaId === previousCinema) ? previousCinema : assignments.assignments.length === 1 ? assignments.assignments[0].cinemaId : "";
      const changed = current !== previousCinema;
      this.update({ assignments, assignmentLoading: false, denied: false, cinemaId: current, ...(changed ? this.clearOperational() : {}) });
      if (!changed && previousBooking && current) await this.recover();
    } catch (error) {
      if (!this.current(job.generation)) return;
      this.update({ assignmentLoading: false, assignments: null, cinemaId: "", ...this.clearOperational() }); this.failure(error);
    }
  }
  selectCinema(cinemaId: string) {
    if (!this.active || !this.currentOwner() || (cinemaId && !this.state.assignments?.assignments.some(a => a.cinemaId === cinemaId))) return;
    this.cancel(); this.update({ ...this.clearOperational(), cinemaId, notice: null });
  }
  editManualToken(value: string) {
    if (!this.active || !this.currentOwner()) return;
    this.cancel(); this.update({ ...this.clearOperational(), manualToken: value, notice: null });
  }
  prepareScan() {
    if (!this.canRead() || this.busy() || !this.state.cinemaId || !this.state.assignments || this.state.denied) return false;
    this.cancel(); this.update({ booking: null, manualToken: "", selected: [], notice: null, operation: "idle", cameraActive: true }); return true;
  }
  cameraActive(value: boolean) { if (this.active) this.update({ cameraActive: value }); }
  resolveCamera(qr: string, cinema: string, cameraEpoch: number) {
    if (cinema !== this.state.cinemaId || cameraEpoch !== this.state.cameraEpoch) return;
    void this.resolve(qr);
  }
  async resolve(qr = this.state.manualToken) {
    if (!this.canRead() || this.busy() || !this.state.cinemaId || !this.state.assignments || this.state.denied) return;
    const cinema = this.state.cinemaId, job = this.job();
    this.update({ ...this.clearOperational(), operation: "resolving", notice: null });
    try {
      const booking = await this.api.resolve(cinema, qr, job.signal); if (!this.current(job.generation)) return;
      this.update({ booking, operation: "idle", notice: { tone: "muted", message: "Đã tải thông tin đặt vé. Chọn từng vé đủ điều kiện để soát vé." } });
    } catch (error) { if (this.current(job.generation)) this.failure(error); }
  }
  toggleTicket(id: string) {
    if (!this.canRead() || this.busy() || this.state.operation !== "idle" || !this.state.booking?.tickets.find(t => t.id === id)?.canCheckIn) return;
    this.update({ selected: this.state.selected.includes(id) ? this.state.selected.filter(value => value !== id) : [...this.state.selected, id], notice: null });
  }
  prepareConfirmation() {
    if (!this.canRead() || this.state.operation !== "idle" || !this.state.selected.length || !this.state.booking
      || this.state.selected.some(id => !this.state.booking?.tickets.find(t => t.id === id)?.canCheckIn)) return;
    this.update({ operation: "confirming" });
  }
  cancelConfirmation() { if (this.state.operation === "confirming") this.update({ operation: "idle" }); }
  async confirmCheckIn() {
    if (!this.canRead() || this.state.operation !== "confirming" || !this.state.booking || !this.state.selected.length) return;
    const booking = this.state.booking, selected = [...this.state.selected], job = this.job();
    this.update({ operation: "submitting", notice: null, cameraActive: false, cameraEpoch: this.state.cameraEpoch + 1 });
    try {
      const result = await this.api.checkIn(booking, selected, job.signal); if (!this.current(job.generation)) return;
      this.update({ booking: result.booking, selected: [], operation: "idle", notice: { tone: "success", message: `Soát vé thành công: ${result.checkedInTicketIds.length} vé đã được xác nhận.` } });
    } catch (error) { if (this.current(job.generation)) this.failure(error, true); }
  }
  async recover() {
    if (!this.canRead() || this.busy() || !this.state.booking || !this.state.cinemaId || !this.state.assignments) return;
    const previous = this.state.booking, cinema = this.state.cinemaId, job = this.job();
    this.update({ operation: "recovering", selected: [], manualToken: "", cameraActive: false, cameraEpoch: this.state.cameraEpoch + 1, notice: null });
    try {
      const booking = await this.api.recover(previous.bookingId, cinema, job.signal, previous); if (!this.current(job.generation)) return;
      this.update({ booking, operation: "idle", notice: { tone: "muted", message: "Đã cập nhật trạng thái từ máy chủ. Vé đã soát không thể chọn lại." } });
    } catch (error) { if (this.current(job.generation)) this.failure(error, true); }
  }
}
