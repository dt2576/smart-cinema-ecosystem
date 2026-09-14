# Smart Cinema Project Conventions

## 1. Purpose

This document is the single source of truth for project-wide conventions across frontend, backend, API, database, tests, documentation, and AI-generated work. Other instruction files must reference it rather than maintain an independent full convention standard.

This is a project standard, not a business requirement. It governs HOW things are named and organized, not WHAT the business system must do. If a convention conflicts with BRD/SRS business meaning, BRD/SRS requirements take precedence for business behavior; report the conflict before changing a convention or implementation.

Examples below illustrate naming, not approval to implement routes, entities, statuses, infrastructure, or features. Consult the relevant requirements and design documents for actual behavior.

## 2. General Principles

- Consistency over personal preference.
- Preserve existing approved project terminology.
- Do not introduce multiple naming styles for the same category.
- Avoid unnecessary abbreviations; prefer clear domain-oriented names.
- Do not rename stable domain concepts without a project decision.
- Do not create new synonyms for existing business concepts.
- Do not change conventions silently during implementation.

## 3. Repository Conventions

| Location | Purpose |
|---|---|
| `docs/` | Project documentation, including requirements, design, development standards, planning, and reports |
| `frontend/` | Frontend application, directly at repository root |
| `backend/` | Backend application, directly at repository root |
| `test/` | Cross-module, manual, and acceptance artifacts |
| `.agent/` | AI operating rules and workflows, not business requirements |

Do not add a `code/` wrapper. Framework-specific tests may remain near source code in conventional locations. Do not commit generated directories such as `node_modules/`, `.next/`, `build/`, `dist/`, or `target/`.

## 4. Folder Naming

Use lowercase kebab-case for new general-purpose folders: `project-scope`, `business-analysis`, `system-analysis`, `ui-ux`, `style-guide`, `screen-spec`, `database-design`, and `test-cases`.

Avoid `ProjectScope`, `project_scope`, `Project Scope`, and `PROJECT-SCOPE`. Do not create folders with spaces.

Category-specific exceptions defined here take precedence over this general rule: Next.js route groups and dynamic segments, Java package paths, and required framework/tool directories such as `.agent/` and `__tests__/`. Do not rename framework-required paths to force kebab-case.

## 5. Document File Naming

Use lowercase kebab-case where practical. Versioned examples:

- `brd-v1.2.md`
- `srs-v1.2.md`
- `business-analysis-v2.1.md`
- `project-scope-v1.0.md`
- `system-analysis-design-v1.1.docx`

Preserve version history and do not rename historical files unnecessarily. Never overwrite historical requirement revisions; use a new version number for an approved revision.

Explicit established exceptions are `README.md`, `AGENTS.md`, `CLAUDE.md`, uppercase snake-case `.agent/rules/*.md` and `.agent/workflows/*.md` instruction files, and `docs/reports/templates/TASK_REPORT_TEMPLATE.md`. Reports use section 19. These are intentional categories, not permission to add arbitrary naming styles.

## 6. Frontend File and Identifier Naming

For Next.js, React, and TypeScript:

| Category | Style | Examples |
|---|---|---|
| Source filenames | kebab-case; purpose suffixes allowed | `movie-card.tsx`, `booking-summary.tsx`, `seat-map.tsx`, `payment-method-card.tsx`, `use-seat-selection.ts`, `booking.types.ts` |
| React component names | PascalCase | `MovieCard`, `BookingSummary`, `SeatMap`, `PaymentMethodCard` |
| Functions and variables | camelCase | `getMovies`, `createBooking`, `selectedSeats`, `bookingTotal`, `showtimeId` |
| Shared constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `MAX_RETRY_COUNT` |
| Types and interfaces | PascalCase | `Movie`, `Booking`, `TicketStatus`, `PaymentMethod` |

Preserve framework-required filenames such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and tool configuration/generated filenames. Do not rename or manually edit generated files to enforce naming.

## 7. Next.js Route Conventions

Use lowercase kebab-case static URL segments, with plural nouns for collection resources where appropriate. Examples: `/movies`, `/cinemas`, `/my-bookings`, `/bookings/[bookingId]`, `/movies/[movieId]`.

Avoid `/getMovies`, `/movieList`, and `/CreateBooking`. Dynamic parameter identifiers use camelCase inside framework brackets. Organizational route groups such as `(public)`, `(auth)`, and `(customer)` must not alter public URLs. These examples do not require renaming existing routes or exposing new pages.

## 8. Frontend Component Conventions

- Shared generic UI belongs in `frontend/src/components/ui/`, for example `button.tsx`, `input.tsx`, `badge.tsx`, and `card.tsx`.
- Shared layouts belong in `frontend/src/components/layout/`.
- Business-specific UI belongs in `frontend/src/features/<feature>/`, for example `movie/`, `booking/`, `payment/`, and `ticket/`.

Generic components must not depend directly on Smart Cinema business logic. Preserve separation between UI, business logic, API, and infrastructure. Use shared semantic design tokens instead of repeating arbitrary hex colors throughout frontend code.

## 9. Import Conventions

Use the project alias when configured. In frontend, `@/` resolves to `frontend/src/`:

```tsx
import { Button } from "@/components/ui/button";
```

Avoid deep relative imports such as `../../../../components/ui/button`. Prefer grouped, readable imports and do not introduce inconsistent aliases. Keep external package imports unchanged; do not assume the frontend alias exists in other tooling or backend code.

## 10. Domain Terminology

Code terminology must match approved Smart Cinema terminology as closely as possible. Canonical terms include:

Customer, Staff, Manager, Admin, Cinema, Hall, Seat, Showtime, Seat Hold, Booking, Booking Seat, Concession, Promotion, Payment, Ticket, Booking QR, and Check-in.

Use actual BRD/SRS terminology in code, DTOs, APIs, documentation, and UI specifications when practical, applying the naming style for that category (for example `BookingSeat` or `booking_seats`). Preserve other approved terms as well; this list is not an exhaustive entity model.

Do not introduce unapproved synonyms such as Theater, ReservationOrder, SnackOrder, or Session when an official term already exists. This does not prohibit legitimate technical concepts such as an authentication session. Check approved meaning before replacing terminology.

## 11. Domain Status / Enum Conventions

Serialized business status values use UPPER_SNAKE_CASE. Naming examples: `PENDING`, `PAID`, `CANCELLED`, `EXPIRED`, `VALID`, `CHECKED_IN`, `AVAILABLE`, `HELD`, `BOOKED`, and `UNAVAILABLE`.

Do not mix `CheckedIn`, `checked_in`, and `checkedIn` for serialized domain status values. These examples do not define which statuses exist for an entity or their transitions; follow the approved requirements and contracts. Do not silently change an existing serialized contract.

## 12. Java Backend Conventions

Use standard Java naming when implementing Java backend code:

| Category | Style | Examples |
|---|---|---|
| Packages | lowercase dot-separated names | `com.smartcinema.booking` |
| Classes and class filenames | PascalCase | `BookingController`, `BookingService`, `BookingRepository`, `CreateBookingRequest`, `BookingResponse` (with `.java` filenames) |
| Methods and variables | camelCase | `createBooking()`, `getBookingById()`, `validateBooking()` |

Avoid unnecessary abstractions. Do not create `BookingService` plus `BookingServiceImpl` unless an interface serves a real architectural purpose. These naming rules do not initialize a backend or select additional frameworks.

## 13. REST API Conventions

Use `/api/v1/` and resource-oriented APIs. Prefer nouns over actions and HTTP methods to express actions where appropriate. Static URL segments use lowercase kebab-case; parameter names use clear domain identifiers.

```text
GET  /api/v1/movies
GET  /api/v1/movies/{movieId}
POST /api/v1/bookings
GET  /api/v1/bookings/{bookingId}
```

Avoid `/api/getMovies`, `/api/createBooking`, and `/api/doPayment`. Action-based endpoints require documented justification rather than an unannounced naming exception. Actual endpoints and behavior require approved requirements/API design.

## 14. Database Conventions

Use snake_case for database objects. Tables use plural nouns, for example `users`, `movies`, `cinemas`, `halls`, `seats`, `showtimes`, `bookings`, `booking_seats`, `booking_concessions`, `payment_transactions`, and `tickets`.

Columns use snake_case, for example `booking_id`, `showtime_id`, `created_at`, `updated_at`, and `checked_in_at`. The default primary-key column name is `id`; foreign-key columns use `<entity>_id`, such as `booking_id` and `cinema_id`.

Do not mix camelCase and snake_case in database naming. These examples do not mandate tables, relationships, key types, or migrations; consult approved database design.

## 15. Environment Variable Conventions

Use UPPER_SNAKE_CASE: `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `REDIS_HOST`, `PAYMENT_GATEWAY_URL`.

Never commit secrets or place real credentials in documentation. Use `.env.example` with non-secret placeholders when needed. Only intentionally public frontend values may use `NEXT_PUBLIC_`; it must not contain secrets. Examples do not select infrastructure or require new environment files.

## 16. Git Branch Conventions

Use prefixes `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, or `chore/`, followed by lowercase kebab-case English names.

Examples: `feat/auth-ui`, `feat/booking-flow`, `fix/payment-summary`, `refactor/frontend-structure`, `docs/update-srs`, and `test/seat-hold`.

Read these conventions before creating or suggesting branch names.

## 17. Commit Message Conventions

Use Conventional Commits with a clear English description. Format: `type: description` or `type(scope): description` when a scope helps.

```text
feat: implement customer login UI
fix: correct booking summary total
docs: update booking QR documentation
refactor: reorganize frontend structure
test: add booking validation tests
chore: configure linting
```

Avoid vague messages such as `update`, `fix stuff`, `changes`, and `done`. Read the convention before creating or suggesting commits; a convention does not authorize committing work.

## 18. Documentation Conventions

Documentation may be written in Vietnamese. Canonical identifiers, code terms, API terms, domain entity names, and technical names remain in English. Use Booking, Showtime, and Cinema consistently rather than translating the same domain concept into varying technical labels.

Project requirements remain under `docs/`; AI operating instructions remain under `.agent/`. Reports and backlog artifacts do not replace BRD/SRS or silently redefine requirements. Other documents may link to this convention and provide task checklists, but must not maintain another independent full standard.

## 19. Report Naming

Reports belong under `docs/reports/` and use `YYYY-MM-DD_<task-name>_report.md`, with lowercase kebab-case for `<task-name>`. Example: `2026-09-14_login-register-ui_report.md`.

Do not overwrite previous reports. Use a distinct task-name suffix if another report for the same task/date is needed. Use the [task report template](../reports/templates/TASK_REPORT_TEMPLATE.md), including convention compliance and actual verification evidence.

## 20. Language Convention

| Area | Language |
|---|---|
| Code and identifiers | English |
| API and database | English |
| Git branches and commit messages | English |
| Technical documentation | Vietnamese allowed; preserve canonical English terms |
| User-facing UI | Follow approved product language |

Do not write Vietnamese source identifiers such as `gheDaChon` or `taoBooking()`. Prefer `selectedSeats` and `createBooking()`.

## 21. Prohibited Patterns

- Mixed naming styles within the same category.
- New folders with spaces or uncontrolled abbreviations.
- Inconsistent business synonyms or domain terminology renamed without approval.
- Hardcoded business rules that belong in backend/configuration, or duplicate constants.
- Arbitrary hex colors repeated throughout the frontend instead of shared tokens.
- Deep relative imports when the alias is available.
- Action-based REST endpoint naming without justification.
- Undocumented convention changes.
- Creating files or folders without checking naming conventions first.

## 22. Convention Change Policy

Conventions must not change implicitly during feature work. If a task appears to require a change:

1. Identify the conflict.
2. Do not silently introduce a new convention.
3. Report the issue.
4. Update this document first, only after approval of the convention change.
5. Then apply the approved convention.

If requested naming conflicts with the standard, explain the conflict and use the canonical convention unless the user explicitly approves changing it. Document any explicitly approved exception and its scope in the task report.

Historical code and documents may temporarily contain legacy naming. New work must follow this standard unless a migration or exception is explicitly approved. Do not mass-rename existing files, stable routes, domain concepts, or historical documentation as part of adopting this standard.

Before planning or creating/modifying files, check applicable naming and placement. After implementation, review all created/modified files and classify each applicable area as PASS, PARTIAL, FAIL, or NOT APPLICABLE. Fix every FAIL before marking a task complete unless the deviation is explicitly approved and documented. Legacy names left untouched are reported as existing conflicts, not silently migrated.
