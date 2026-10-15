# ADMIN Staff Management frontend

Phase 4E, 2026-10-14. The authoritative [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md) and backend determine authorization and transitions. This guide describes the frontend, not new requirements.

## Routes and composition

- `/admin/staff`: real paginated Staff list and Create dialog.
- `/admin/staff/[staffId]`: real account/invitation information, Cinema assignments and confirmation dialogs.
- Existing AdminShell verifies the current backend ADMIN identity before rendering children. Existing authentication/logout remain unchanged. The new navigation entry is **Nhân viên**.
- `admin-staff-screen.tsx` composes shared Button, SurfaceCard, FormField, StatusBadge, StatusFeedback, Skeleton and the accessible `Dialog`. Production renders the applicable state; Stitch demonstration state boards are not permanent UI.

## Supported requests

All eight Staff requests are authenticated, no-store, use string IDs and send only contract fields:

| Operation | Request |
|---|---|
| List | GET `/api/v1/admin/staff?page={page}&size=20` |
| Create | POST `/api/v1/admin/staff`, `{fullName,email,phone}` |
| Detail | GET `/api/v1/admin/staff/{staffId}` |
| Reissue | POST `/api/v1/admin/staff/{staffId}/invitations`, `{}` |
| Account status | PUT `/api/v1/admin/staff/{staffId}/status`, `{status}` |
| Assignments | GET `/api/v1/admin/staff/{staffId}/cinema-assignments` |
| Add assignment | POST `/api/v1/admin/staff/{staffId}/cinema-assignments`, `{cinemaId,effectiveAt}` |
| Assignment status | PUT `/api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status`, `{status}` |

The selector reuses existing GET `/api/v1/admin/cinemas`. No additional Staff endpoint, search, global count, email lookup, operation-status endpoint or permission editor is assumed. A full 20-item page offers the next page; that page can be empty. IDs are canonical positive decimal strings within the existing bigint validator's range, never JavaScript Number.

## Validation and authority

- Required fullName/email/phone use existing backend limits 150/254/30. Vietnamese phone validation strips whitespace, parentheses and hyphens, then accepts `0` plus nine digits, nine digits, or `+84` plus nine digits. No organization email-domain restriction.
- Creation confirms BLOCKED with incomplete password setup. ADMIN never sets or receives a Staff password/token. Password setup remains the separate Phase 4D public flow.
- Reissue is offered for BLOCKED/incomplete setup. Activation requires completed setup. Block preserves assignment history. The server rechecks all conditions.
- Delivery labels map all seven serialized states. SENT means SMTP accepted; it proves neither inbox receipt nor password setup. No AWS SES or new mail workflow is introduced.
- Only STAFF assignments can be changed. Returned MANAGER history is read-only. ACTIVE duplicate Cinema membership disables the corresponding new/reactivate action; the backend remains authoritative for races/conflicts.
- Existing inactive/temporarily closed Cinemas can be selected because this assignment contract does not impose an ACTIVE-only grant rule. Their actual operation/access rules remain backend-owned.
- The datetime control explicitly uses Vietnam wall time (GMT+7), validates its calendar round-trip and submits a UTC instant. There is no invented prohibition on past dates. Status changes submit only status and validate that the original effectiveAt remains identical, including nanosecond precision.
- Localized dates explicitly use Asia/Ho_Chi_Minh and four-digit years. Future badges compare effectiveAt with the client read time for presentation only, not admission authorization. Refresh updates this presentation; there is no server-time field or polling assumption.

## Errors and recovery

The API layer validates enums, booleans, timestamps, numeric ordering, identity/parent association, creation/mutation expectations and immutable assignment time. It reconstructs approved DTO fields, dropping extra internal metadata. Fixed Vietnamese errors never echo raw backend responses. Supported errors include 400/401/403/404/409/429/503, malformed JSON, mismatched identity and network failures.

Commands have a synchronous duplicate guard, disabled fields/actions, and a 15-second transport timeout. Timeout, network loss, unexpected successful HTTP responses, malformed responses and 5xx are **uncertain**, not proof of rejection. 409 requires review. No automatic POST/PUT retry or optimistic mutation occurs. 429 honors a valid Retry-After using a UI countdown, without requests in the timer.

Before a command, `smart-cinema.admin-staff-review` stores only a per-tab nonce and optional canonical Staff ID in sessionStorage. It contains no PII, form content, token or account/assignment status. It is an untrusted navigation/review hint. Validated completion clears only the matching nonce, so a late completion cannot clear a newer hint. Mounted/token/resource guards ignore stale view updates.

An uncertain/interrupted result blocks new commands. A known hint navigates to server-validated detail. Unknown Create identity stays on the supported paginated list, with guidance to inspect its pages; no guessed ID or email lookup is used. An explicit successful GET and deliberate **Đã kiểm tra, tiếp tục** acknowledgement allow a new user decision. Reads and acknowledgement never replay the previous command or prove it failed. The backend offers no operation-completion/commit-fence API; a late commit may still occur after a read. If browser storage is unavailable, mounted review still works, but reload persistence cannot be guaranteed. Separate tabs do not share a command lock; backend constraints govern concurrency.

## Accessibility and verification

Dialog uses native modal semantics plus explicit Tab/Shift+Tab containment, title association, Escape/backdrop close, restoration of trigger focus and background scroll locking. Closing is disabled while a command is pending. Forms retain native input/select/button semantics, labels, required state, inline error associations and first-error focus. Shared controls use existing visible focus and at least 44px touch targets. No feature animation was added.

List uses cards below the `lg` breakpoint to keep mobile/tablet labels readable, and a desktop table. Detail cards, wrap-safe identities/text, bounded scrollable dialogs and existing AdminShell are checked at 390/768/1440. Native date-picker chrome follows the browser/OS locale; application labels and copy are Vietnamese.

`admin-staff.test.ts` tests the real typed boundary and service behavior. `test/e2e/admin-staff.spec.ts` uses explicitly labeled HTTP fixtures; it never provisions live accounts, sends mail or changes database data. See the [implementation report](../reports/2026-10-14_admin-staff-management-frontend-implementation_report.md) for exact results and external verification limitations.
