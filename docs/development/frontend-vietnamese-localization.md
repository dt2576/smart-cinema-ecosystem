# Frontend Vietnamese localization

Primary frontend language: **Vietnamese**. This applies to the implemented Customer, Auth, Admin and shared UI, including preview screens, validation, recovery messages and accessible names. Technical documentation and contracts remain in their existing language.

## Terminology and display labels

Use Phim, Rạp chiếu phim, Phòng chiếu, Suất chiếu, Ghế, Giữ ghế, Đặt vé, Thông tin đặt vé, Bắp nước, Khuyến mãi, Thanh toán and Vé consistently. Admin home is Tổng quan. A COUPLE unit is Ghế đôi: one indivisible unit for two guests.

`frontend/src/lib/display-labels.ts` maps existing status, role and seat-type values to Vietnamese presentation. Select controls submit explicit original values. Unknown labels use Chưa xác định instead of exposing an enum. Do not translate routes, JSON keys, identifiers, persisted statuses or environment variables.

Brand and provider names, film titles, server-authored descriptions, genre names, language metadata, addresses, codes and IDs retain their supplied content. No automatic translation of catalog data is performed.

## Dates and amounts

Presentation formatters use `vi-VN` while preserving each screen's configured timezone. Movie release dates are formatted as DD/MM/YYYY without timezone conversion. Technical date keys and native date/datetime input values retain their existing formats. The real Booking response supplies no currency or display timezone: its Summary retains explicit UTC and exact decimal-string formatting, including zero and all four fractional digits. It does not infer VND or round through floating-point arithmetic. Preview VND prices use Vietnamese separators and the ₫ suffix; they remain illustrative.

## Errors and validation

`frontend/src/lib/presentation-errors.ts` translates allowlisted contract errors and supplies safe Vietnamese fallbacks. Unknown backend details and field messages are not rendered. Field keys remain unchanged. Existing typed Seat/Hold and Booking errors retain their status semantics.

Auth validation is Vietnamese. Admin forms localize native constraint messages with `frontend/src/components/ui/native-validation.ts`; required, range, length, type and pattern constraints retain their existing values. Browser-native date pickers may use the browser/OS language.

The document language is `vi`; navigation, dialogs, buttons, fields, images, status regions and recovery controls have Vietnamese accessible names. Plus Jakarta Sans includes the Vietnamese subset.

## Boundaries and verification

Public discovery, authoritative Holds and real Booking creation/read behavior remain unchanged. Preview Concession, Promotion, Payment and Ticket/QR screens remain explicit demonstrations. Localization does not integrate them with a real Booking, call providers, issue tickets or add Admin modules. Flyway head remains V12.

Run from `frontend/`: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm test:e2e`. Where the installed browser is Edge, set `PLAYWRIGHT_CHANNEL=msedge`. Run backend `mvn verify` with the existing database-test configuration. Preserve behavioral assertions when updating Vietnamese selectors; no retry masking or skipped scenarios.

See the [localization report](../reports/2026-10-03_frontend-vietnamese-localization_report.md) for final evidence and the [current handoff](../ai/current-handoff.md) for the next authorized milestone.
