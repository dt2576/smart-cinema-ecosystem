# Gmail SMTP for Smart Cinema development/demo

Date: 2026-10-12. Gmail is the approved development/demo default; Spring Mail remains provider-independent. Real Gmail transport is **NOT VERIFIED** by implementation tests. Do not use a primary Google password or send an unsolicited live invitation.

1. Use a dedicated Smart Cinema sender account. Enable Google 2-Step Verification and create an App Password if eligible. Availability depends on account/organization security policy; security-key-only/Advanced Protection/organization restrictions can prevent it. [Google App Password guidance](https://support.google.com/accounts/answer/185833).
2. Store the App Password only in ignored local environment or a secret manager. Configure `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `MAIL_FROM_ADDRESS` (matching account or authorized alias), `MAIL_FROM_NAME=Smart Cinema`. Never paste credentials into source/reports/chat/commands that log arguments.
3. Gmail defaults: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, auth true, STARTTLS enabled and required, implicit SSL false. The [Google SMTP setup guidance](https://support.google.com/a/answer/176600) documents this transport; other providers can replace host/port/credentials/TLS through configuration.
4. Configure explicit HTTPS `STAFF_ACTIVATION_BASE_URL`, active AES key ID and key ring; see [Staff onboarding](staff-onboarding-and-checkin-foundation.md). No Host-header URL construction. The full Staff activation frontend is not installed in this backend phase, so real click-through setup is not end-to-end verified yet.
5. Keep `STAFF_INVITATION_DELIVERY_ENABLED=false` until sender, external encryption secret, URL and environment are verified. Enable only for an authorized environment/recipient. Missing credentials/configuration never produce fake SENT. Use one separately authorized test email to check actual transport, inspect safe delivery status and obtain recipient confirmation; this implementation did **not** perform that live step.
6. Never commit/share the App Password. Revoke/rotate it on compromise; update only the secret store. Google also revokes App Passwords when the primary password changes. [Google guidance](https://support.google.com/accounts/answer/185833).

Gmail imposes sending/recipient limits and can temporarily block sending; it is not unlimited production transactional infrastructure. [Google sending limits](https://support.google.com/mail/answer/22839). Retry is bounded and does not extend invitation lifetime. Production throughput/SLAs, mail reputation and recipient-inbox delivery are not certified. No Gmail API, OAuth login or Workspace administration is introduced.

## Local capture and automated tests

Never copy real Gmail credentials into test configuration. Tests override host to **127.0.0.1**, auth/TLS off only for explicitly allowed local capture, scheduler off and fixture `@example.test` recipients; they cannot fall back to Gmail. [Mailpit releases](https://github.com/axllent/mailpit/releases/tag/v1.31.5) provide Docker and portable binaries. No relay must be configured.

Local Mailpit example (installed binary, independent of normal application startup):

```text
mailpit --listen 127.0.0.1:8027 --smtp 127.0.0.1:1027 --disable-version-check
```

For a local development application use SMTP port 1027, blank test-only SMTP credentials, SMTP_AUTH/STARTTLS flags false, `STAFF_INVITATION_ALLOW_LOCAL_SMTP=true`, a local capture sender such as `sender@example.test`, externally supplied throwaway encryption key and the separately configured HTTPS activation target. This is distinct from real Gmail settings; never expose Mailpit interfaces externally or enable relay.

Database test suites use an embedded loopback SMTP capture for repeat/failure cases and actual Mailpit on 1027/8027 for its dedicated capture case. `STAFF_DB_TESTS=true` requires the dedicated authorized local database and Mailpit; see the foundation guide. Missing local capture fails the test rather than skipping or using Gmail. Captured MIME contains a sensitive test invitation link; never commit it or publish capture screenshots/log dumps.
