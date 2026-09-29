# 🎬 Cinema Smart Ecosystem

Cinema Smart Ecosystem is a smart cinema platform designed to create a seamless experience across movie discovery, booking, ticketing, payments, and customer engagement.

> Current stage: MVP Development

---

## 🎯 Vision

Build a unified cinema ecosystem that connects customers, cinema operations, and digital services through a simple, scalable, and intelligent platform.

---

## 🚀 MVP Goals

The first version focuses on validating the core cinema experience:

1. Movie discovery
2. Movie details and showtimes
3. Cinema and screening selection
4. Seat selection
5. Ticket booking
6. Payment flow
7. Digital ticket / QR code
8. Basic user account
9. Basic cinema administration

The MVP should prioritize a complete booking journey before advanced ecosystem features.

---

## 👤 Customer Journey

```text
Discover Movie
      ↓
Movie Details
      ↓
Choose Cinema
      ↓
Choose Showtime
      ↓
Select Seats
      ↓
Checkout
      ↓
Payment
      ↓
Digital Ticket / QR
```

## Repository Structure

- `docs/`: Project requirements, analysis, design, reports, and planning. Historical document versions are preserved; the latest version is the current baseline unless an explicit approval record states otherwise.
- `frontend/`: Next.js frontend application.
- `backend/`: Spring Boot backend application.
- `.agent/`: AI rules and development workflows. Start with [.agent/workflows/DEVELOPMENT_WORKFLOW.md](.agent/workflows/DEVELOPMENT_WORKFLOW.md).
- `test/`: Cross-module testing and acceptance artifacts; framework-specific tests stay in their conventional locations.

System analysis documentation is in [docs/system-analysis/](docs/system-analysis/). Implementation evidence belongs in [docs/reports/](docs/reports/), separate from requirements.

## Local development

Prerequisites: Java 21, Maven (`mvn` on PATH), Node.js 22 or newer
(required by the development runner), pnpm 12.4.1, and a running PostgreSQL database configured for
the backend. Use the existing backend environment variables documented in
[backend/.env.example](backend/.env.example) and frontend configuration in
[frontend/.env.example](frontend/.env.example). Export backend variables into
your terminal environment; the root command does not load `.env` files.
Next.js continues to load `frontend/.env.local` normally. Do not commit secrets.
Backend startup runs the existing Flyway migrations against the configured database.

Install development dependencies once from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
```

Start both applications from the repository root:

```sh
pnpm dev
```

This runs `mvn spring-boot:run` inside `backend/` and the existing frontend
`pnpm dev` script. Open <http://localhost:3000>; the backend defaults to
<http://localhost:8080>. Existing environment overrides and application defaults
are preserved. PostgreSQL is a prerequisite, not started by this command.

Logs share the terminal with `[backend]` and `[frontend]` labels. Wait for both
Spring Boot's startup message and Next.js's ready message. If either process
exits, the other is stopped; startup errors and exit codes remain visible.
Press **Ctrl+C** to stop both. Windows batch wrappers may additionally ask
`Terminate batch job (Y/N)?`; answer `Y` to return to the prompt.

The root package only supplies development process supervision using
[concurrently](https://github.com/open-cli-tools/concurrently). Frontend dependencies
and its lockfile remain separate; there is no new pnpm workspace. For separate
operation, the original commands inside `backend/` and `frontend/` still work.
