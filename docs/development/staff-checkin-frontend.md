# Staff Check-in frontend

Phase 4C, 2026-10-13. Route: `/staff/check-in`. Wire authority: [Staff operational contract v1.0](../api/staff-qr-checkin-contract-v1.0.md); [backend integration guide](staff-qr-checkin-backend-apis.md); [implementation report](../reports/2026-10-13_staff-checkin-frontend_report.md).

## Access and current scope

Reuse the existing AuthProvider/session/login/logout infrastructure. Only STAFF receives the operational navigation and narrow login return destination. Client role presentation is insufficient: authenticated assignment/resolution/recovery/command APIs independently enforce current ACTIVE/STAFF and effective assigned Cinema. ADMIN and MANAGER do not inherit admission. One returned assignment selects automatically; multiple assignments require explicit choice. No assignment exposes no scanner or Booking data.

| Operation | Exact request | Frontend use |
|---|---|---|
| GET `/api/v1/staff/cinema-assignments` | No body/query | Initial authorization, explicit assignment refresh, bounded foreground recheck |
| POST `/api/v1/staff/booking-qr-resolutions` | `{cinemaId,bookingQr}` | Explicit manual resolution or one successful camera decode; logical read only |
| GET `/api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` | Known canonical string IDs | Explicit recovery/current status; never replays a command |
| POST `/api/v1/staff/bookings/{bookingId}/check-ins` | `{cinemaId,ticketIds}` | Only an explicit selection followed by dialog confirmation |

`staff-api.ts` checks typed complete responses, string bigint range, requested identity/context, UTC instants, aggregate uniqueness/order, purchased-unit identity/capacity, eligibility consistency, exact successful selection and stale/terminal regressions. Unexpected fields are dropped. Names may change; frozen identity/capacity may not. This validates the backend projection, rather than computing an admission window or granting eligibility from the client clock.

## Scanner and manual input

Pinned `@zxing/browser` 0.2.1 and its `@zxing/library` 0.23.0 peer decode real browser MediaStreams. Dynamic imports remain client-only. Explicit “Mở camera” precedes permission; rear camera is preferred where supported. Available device switching is optional. Denied/unavailable/unsupported contexts use fixed Vietnamese guidance and retain manual entry. No camera is opened on mount.

QR text remains opaque UTF-8, including spaces, case, normalization and punctuation. The accessible textarea preserves paste contents and applies only the existing nonblank/128-code-point/no-control/no-unpaired-surrogate contract checks. Nonblank matches the actual Java isBlank boundary, including its exclusion of NBSP, figure/narrow space and BOM from blank characters. It never follows token URLs, URL-decodes, trims the submitted token or regenerates it. Text is removed before resolution. A successful decode stops decoder controls and every acquired media track before one resolution. Delayed permission/decoder results also release their resources after cancellation.

## Selection, outcome and recovery

Display only contracted Booking/screening/Seat Unit/Ticket/purchased Concession fields. No Customer PII, Payment details, QR echo, audit actor or Concession pickup state. Times are explicitly labeled UTC. Admission reasons are server response explanations; `canCheckIn` is advisory, and the backend command revalidates current policy.

VALID plus backend `canCheckIn=true` permits selection. CHECKED_IN, EXPIRED and CANCELLED remain disabled. One COUPLE unit is one Ticket and two guests together. Selected Ticket count and guest capacity are distinct. Independent batches each require a fresh confirmation. No optimistic Ticket mutation, automatic Check-in, command replay or inferred success.

Only HTTP 200 with a coherent committed `checkedInTicketIds` and Booking projection produces success. Conflict, malformed response, timeout or lost response locks selection and offers current GET recovery. A successful GET reports current Ticket status without claiming this browser caused the transition. 404 removes inaccessible data; current 401 clears the matching session; 403 clears scope/data/camera. 429 honors bounded Retry-After and disables new requests until cooldown; the timer performs no API call. 400/409/503 and transport errors use fixed safe messages, never backend diagnostics.

Controller state lives only in memory. Owner/token/context keys, AbortController and generations reject late results. Cinema change, QR edit, logout, route cleanup and hidden/pagehide clear operational state and stop media. Navigation cancellation does not undo a server command already sent. After reload/direct entry or returning from a hidden tab, rescan/re-enter the QR to recover; no confidential token/selection or Booking identity is persisted. Known in-memory Booking recovery uses the scoped GET.

Foreground refresh is event-driven, coalesced and separated by at least 15 seconds, suppressed during active requests/scanning and Retry-After. No polling loop or background POST exists. Reauthorization after assignment revocation occurs on foreground, explicit assignment recheck or the next server operation, rather than through a push subscription.

## Privacy and UI

Sensitive fetches use bearer authentication, no-store, omitted cookies, no-referrer and rejected redirects, with a 15-second abort deadline. The dynamic route sends no-store and no-referrer/noindex metadata. Incoming query/fragment values are discarded and never interpreted as a Booking/QR. No new storage or analytics, confidential logging, backend changes or financial authority.

Reuse Phase 1 SurfaceCard, Button, StatusBadge, StatusFeedback, Skeleton and established palette/fonts/focus/reduced-motion tokens. Scanner/detail split at desktop; stacked mobile/tablet. Native labels/buttons/checkboxes/dialog, announced statuses, focus restoration/trap, Escape cancellation before submission and practical 44px controls support keyboard access. See the report for actual 390/768/1440 fixture-backed browser evidence and external limitations.

## Separate activation dependency

The [invitation contract](../api/staff-invitation-administration-contract-v1.0.md) requires a separately implemented public page at the HTTPS path configured by `STAFF_ACTIVATION_BASE_URL` (example `/staff/activate`, not a verified deployment value). It must immediately isolate `#token=...` in memory and remove the fragment with history.replaceState; no storage, analytics, third-party assets, referrer or automatic consumption.

Explicit POST `/api/v1/staff/password-setups` sends only `{token,password}`; there is no GET validation endpoint. Canonical token is 43-character base64url without padding; minimum 8 password characters and maximum 72 UTF-8 bytes. Server purpose/expiry/single-use/reissue rules remain authoritative. A 204 means password configured and account still BLOCKED awaiting ADMIN activation, never automatic ACTIVE/login. Once activated, existing login can reach the Staff workspace. The current architecture supports a separate public route without replacing authentication; that page and actual HTTPS/Gmail click-through remain unimplemented and unverified in this phase.
