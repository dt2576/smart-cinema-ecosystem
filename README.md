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
[frontend/.env.example](frontend/.env.example). Spring Boot imports the optional
backend `.env` file; no terminal export or extra dependency is required.
Next.js continues to load `frontend/.env.local` normally. Do not commit secrets.
Backend startup runs the existing Flyway migrations against the configured database.

For Neon, create the local file once (PowerShell also supports `cp`):

```sh
cd backend
cp .env.example .env
```

Paste your Neon connection values into `backend/.env`:

```properties
DB_URL=jdbc:postgresql://<NEON_HOST>/neondb?sslmode=require
DB_USERNAME=neondb_owner
DB_PASSWORD=<NEON_PASSWORD>
```

Use the actual host, database and role supplied by Neon, and preserve all supplied
JDBC SSL parameters. Enter raw `KEY=value` lines without quotes or `export`.
This file uses Java properties syntax: a literal backslash must be written as
`\\`; do not use shell variable expansion. Save as UTF-8 without BOM. The file is
Git-ignored and not packaged in the application JAR. Never paste secrets into logs.

Then run `mvn spring-boot:run` from `backend/`, or return to the repository root
and run `pnpm dev`. IDE/JAR launches should use `backend/` or the repository root
as working directory. Spring imports `./backend/.env` and then `./.env`; use only
`backend/.env` for this workflow. OS environment variables/system properties still
override file values. Without the file or overrides, the original localhost
database, `postgres` username and `123456` password defaults remain available.

Flyway remains enabled and Hibernate uses `ddl-auto=validate`. On an empty database,
startup applies V1 through V10 before validation. The migration login must be able
to install `btree_gist`, create the existing NOLOGIN roles, and perform ownership
and grants required by those migrations. Confirm those permissions on Neon before
expecting first startup to succeed; this workflow does not alter migrations or
bypass database guards. No real Neon connection is implied by configuration alone.

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

## Development demo catalog

After configuring `backend/.env` for a **development database**, run from root:

```sh
pnpm seed:demo
pnpm dev
```

The first command uses the existing Maven/Spring PostgreSQL configuration, applies
Flyway, validates Hibernate, seeds in one transaction and exits. The second starts
the normal applications. Open <http://localhost:3000/> or
<http://localhost:3000/movies>. No terminal credential export is needed for Neon;
local PostgreSQL uses the same file or the documented fallback values.

This is an explicit demo command, never part of normal startup/migrations.
Never point it at production. See [demo seed setup](docs/development/demo-seed.md)
for dataset, safe reruns, privileges, date behavior and verification limitations.

## Admin Movie management

The first Admin area is available at <http://localhost:3000/admin>. An existing
active ADMIN can use the normal login to create Movie drafts, edit supported
content/Genres, and publish/unpublish. Changes persist through authorized backend
APIs and the same catalog consumed by Customer Home/Movies. No Delete or other
Admin module is exposed.

Provision a dedicated development Admin with **`pnpm admin:dev`** after setting
local `DEV_ADMIN_*` inputs in ignored `backend/.env`. Registration and demo seed
do not create an Admin. See [development Admin provisioning](docs/development/development-admin-provisioning.md)
for safeguards and [Admin developer guide](docs/development/admin-movie-management.md)
for routes and verification, and the
[Admin Movie contract](docs/api/admin-movie-contract-v1.0.md) for API behavior.
