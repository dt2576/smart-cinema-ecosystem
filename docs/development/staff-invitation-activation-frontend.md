# Staff invitation and password setup frontend

Phase 4D, 2026-10-13. Public route: `/staff/activate`, implemented under the existing `(auth)` layout. [Implementation report](../reports/2026-10-13_staff-invitation-activation-frontend_report.md), [authoritative onboarding contract](../api/staff-invitation-administration-contract-v1.0.md), [Staff workspace guide](staff-checkin-frontend.md), [SMTP guide](gmail-smtp-setup.md).

## URL and environment dependency

`StaffDeliveryWorker` constructs `settings.activationBase() + "#token=" + token`. `STAFF_ACTIVATION_BASE_URL` maps to `staff.invitations.activation-base-url`; backend validates HTTPS, host, nonblank path and absence of userinfo/query/fragment. Its application default is empty, and the sanitized `.env.example` uses `/staff/activate` on an example HTTPS origin.

Read-only preflight found no activation-base value in current process/user/machine environment or actual local dotenv files. The example is not a deployed URL. The approved expected path is now implemented; a separately configured HTTPS frontend origin must point to this route. No URL, SMTP credential, AES key, delivery flag or deployment setting was changed. Actual Gmail/HTTPS onboarding remains unverified.

## Fragment and memory boundary

Only exact `#token=<canonical-token>` is accepted. A 32-byte unpadded base64url token has 43 characters and zero final padding bits; no URL decoding, case folding, trimming, duplicate fields or extra fragment fields. This checks encoding only, never existence, expiry or authorization.

The client captures the fragment in a layout effect, replaces the current URL with the fixed canonical path before parsing/rendering the form and stores the token in a private controller field. No token prop, hidden input, public state snapshot, log, cookie, browser persistence or navigation link. Server HTML initially contains preparation guidance only. The server page rejects any query parameters through a fixed same-origin canonical redirect before activation UI rendering; it neither reads parameter values nor uses arbitrary `next`/`returnUrl`. This also prevents Next's rejected-query route tree from remaining in browser history. The supplied fragment remains a browser-only input through that same-origin navigation.

React Strict Mode synchronous effect replay retains the captured credential without rereading the scrubbed URL. Real disposal cancels immediately and erases private memory on the next microtask. Native popstate/hashchange events are handled without double-clearing a newly captured fragment. The existing fixed #auth-content keyboard skip anchor keeps the current invitation/form context. Browser Back/Forward/reload after sanitization cannot recreate a credential. The employee must reopen a still-valid invitation from email.

Passwords are uncontrolled native fields and never enter serialized controller state or persistence. Form values clear when a valid explicit submission begins, on navigation/disposal/pagehide and on authenticated identity changes. Current login session is watched only to cancel stale private context; JWT rotation for the same identity does not grant invitation authority. The public request sends no JWT and creates/modifies no auth session. Browser password-manager behavior remains user-agent controlled; application code does not store passwords.

## Password contract

Validation mirrors actual `StaffOnboardingService.password`:

- Nonblank under Java `String.isBlank` semantics; no silent whitespace trimming.
- Minimum `password.length >= 8` measured as UTF-16 code units, matching Java String length. In particular four astral emoji occupy eight units; no stricter code-point policy is introduced.
- Well-formed UTF-16; reject unpaired surrogates as the backend UTF-8 encoder does.
- At most **72 UTF-8 bytes**, measured with TextEncoder after structural validation.
- Confirmation equals the exact entered string, including spaces and Unicode normalization.

Native inputs have no truncating maxLength, normalization, strength gate, generated password or reset workflow. Vietnamese byte-limit guidance and accessible visibility toggles support both fields. Composed/decomposed Unicode and exact boundary cases are tested.

## Exact transport and result

Explicit confidential **POST `/api/v1/staff/password-setups`**, body exactly `{token,password}`. No query, GET validation, speculative redemption, Authorization header or CSRF token. The exact endpoint is public and CSRF-exempt in the existing backend configuration. Fetch uses `credentials:omit`, `cache:no-store`, `referrerPolicy:no-referrer`, `redirect:error` and a 15-second abort deadline. The dynamic page is no-store with no-referrer/noindex metadata; no third-party assets/scripts were added.

Only **HTTP 204** confirms password setup. No response body is parsed. A 204 presents successful setup **awaiting explicit ADMIN activation**, never ACTIVE/automatic login/Check-in access. Only the fixed existing `/login` link is offered. Backend still enforces account status and Staff scope on later login/operations.

| Result | Presentation and recovery |
|---|---|
| Missing/malformed fragment | No form/request; reopen original invitation or contact administrator |
| Client password/confirmation error | Accessible field error and first-invalid focus; fix before any POST |
| Public 400 and other 4xx except 429 | Generic unavailable invitation/password rejection; no account-existence or precise expired/revoked/used claim |
| 429 | Safe Retry-After guidance; reopen invitation after the wait, no timer request or automatic resend |
| 5xx, network loss, timeout, interrupted/redirected or misleading 2xx | Outcome uncertain; request may have completed; contact administrator before another setup, no replay |
| 204 | Password configured, account still requires ADMIN activation; no status polling or auth mutation |

The token is removed from controller memory when a valid submission begins. One captured context permits one POST; all post-submission outcomes require deliberate reopening/administrative verification rather than a retry button. Client validation errors do not consume the context. This is a frontend privacy/recovery choice; backend single-use/24-hour/reissue/revocation policy is unchanged. There is no supported public redemption-status or resend API.

## Verification and scope

Use existing frontend commands from `frontend/`: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, focused `pnpm exec playwright test staff-activation.spec.ts --workers=1 --retries=0`, then full Playwright. Tests use labeled synthetic HTTP/token/password fixtures, not real mail or account redemption. The report records exact counts, failure history, screenshots and 390/768/1440 keyboard/privacy/layout checks.

Backend, V1–V14, SMTP/environment, Customer/Admin/Manager auth and Phase 4C operational source remain unchanged. No Admin management frontend, resend/reset, account activation writer, Payment/Booking/Ticket/Check-in policy, deployment or commit. Next step requires separate authorization for legitimate HTTPS/Gmail end-to-end onboarding; do not enable configuration or redeem production invitations just to manufacture evidence.
