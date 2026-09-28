import type { TicketPreview, TicketPreviewService } from "@/features/ticket/ticket-preview.types";

const TICKETS: TicketPreview[] = [
  { id: "9007199254741601", bookingId: "9007199254741101", status: "CHECKED_IN", seatUnit: { id: "9007199254741701", label: "F7", type: "STANDARD", guests: 1 } },
  { id: "9007199254741602", bookingId: "9007199254741101", status: "CHECKED_IN", seatUnit: { id: "9007199254741702", label: "F8", type: "STANDARD", guests: 1 } },
  { id: "9007199254741603", bookingId: "9007199254741101", status: "VALID", seatUnit: { id: "9007199254741703", label: "H9-10", type: "COUPLE", guests: 2 } },
  { id: "9007199254741604", bookingId: "9007199254741102", status: "EXPIRED", seatUnit: { id: "9007199254741704", label: "C3", type: "STANDARD", guests: 1 } },
  { id: "9007199254741605", bookingId: "9007199254741102", status: "CANCELLED", seatUnit: { id: "9007199254741705", label: "C4", type: "STANDARD", guests: 1 } },
];

export function createMockTicketPreviewService(scenario: "default" | "empty" | "error" = "default", delayMs = 350): TicketPreviewService {
  let failed = false;
  return { async listForBooking(bookingId, signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (scenario === "error" && !failed) { failed = true; throw new Error("Sample Tickets could not load. Please try again."); }
    return scenario === "empty" ? [] : structuredClone(TICKETS.filter(ticket => ticket.bookingId === bookingId));
  } };
}

export function summarizeTicketPreview(tickets: TicketPreview[]) {
  return {
    units: tickets.length,
    guests: tickets.reduce((count, ticket) => count + ticket.seatUnit.guests, 0),
    checkedIn: tickets.filter(ticket => ticket.status === "CHECKED_IN").length,
    valid: tickets.filter(ticket => ticket.status === "VALID").length,
  };
}
