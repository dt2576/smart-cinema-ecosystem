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
- `backend/`: Reserved for the backend application; no implementation exists yet.
- `.agent/`: AI rules and development workflows. Start with [.agent/workflows/DEVELOPMENT_WORKFLOW.md](.agent/workflows/DEVELOPMENT_WORKFLOW.md).
- `test/`: Cross-module testing and acceptance artifacts; framework-specific tests stay in their conventional locations.

System analysis documentation is in [docs/system-analysis/](docs/system-analysis/). Implementation evidence belongs in [docs/reports/](docs/reports/), separate from requirements.
