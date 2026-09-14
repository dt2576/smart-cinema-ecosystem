# Smart Cinema visual reference

## Authority and provenance

Stitch is the visual source of truth: **Smart Cinema Ecosystem**, project ID `1208499799798658711`. This summary uses the connected project's **Nocturne Cinema System** design theme retrieved on 2026-09-14, together with the user's approved direction for this task. Screen identities and dimensions are recorded in [metadata.json](metadata.json); the inventory is in [SITE.md](SITE.md).

The approved direction below does not certify every existing or hidden screen as approved. Business behavior remains governed by the current BRD/SRS. Stitch HTML is reference only, not production code. Future implementation must follow repository architecture and conventions; do not copy generated HTML directly into React components.

## Approved visual direction

- Premium dark cinematic UI: immersive charcoal surfaces, clear content hierarchy, restrained luminous accents and subtle depth around booking summaries.
- Warm orange primary CTA: Stitch's amber-orange brand override is `#F59E0B`, with `#D97706` hover in its design narrative. Use this warm accent for primary booking actions.
- Restrained green success state: Stitch's emerald override is `#10B981`. Keep green semantic for success and selected/held states; it is not a competing primary CTA color.
- Dark canvas and layered panels: the theme narrative specifies `#0B0F17`, `#111827`, and `#1F2937`; primary and secondary narrative text colors are `#F9FAFB` and `#9CA3AF`.
- Typography: Space Grotesk for headings, labels, timers and prices; Plus Jakarta Sans for body copy. Use tabular numerals for prices and countdowns.
- Shape and spacing: 8px standard controls, 16px cards, an 8pt spacing rhythm, clear borders and subtle amber glow around primary actions.
- Layout: the Stitch theme describes a desktop seating map with a sticky booking summary, adapting to a bottom summary on smaller screens. This theme guidance does not establish that mobile screens currently exist.
- Accessibility: combine color with labels, icons, borders or patterns for seat and status distinctions; preserve clear focus indicators.

## Token provenance

Stitch exposes both narrative brand colors and generated tonal tokens. Its generated `primary` is `#FFC174`, `primary_container` is `#F59E0B`, `surface` is `#0F131C`, and `on_surface` is `#DFE2EE`. These differ from narrative surface values above. Preserve this distinction rather than inventing a unified production token set. Resolve exact component styling against the current Stitch reference when implementation is authorized.

## Currency and Booking model

Use **VND** for currency displays, as explicitly directed by the user. This is task-approved guidance, not a claim that all existing Stitch screens have been audited for currency compliance.

**ONE BOOKING → ONE BOOKING QR → MULTIPLE TICKETS**

A paid Booking has one Booking QR that retrieves its Tickets; each purchased Seat has its own Ticket. Check-in operates per Ticket, and scanning the Booking QR does not consume all Tickets. A Booking may contain one or multiple Tickets.

Traceability: [BRD v1.2](../docs/brd/brd-v1.2.md), section 4.9, BR-044 and BR-046; [SRS v1.2](../docs/srs/srs-v1.2.md), section 3.10, FR-TICKET-002 and FR-TICKET-004 through FR-TICKET-008, and section 8.4. The user's direction matches this current model.

The older Project Scope v1.0 describes per-Ticket QR, and an existing hidden Stitch screen is named `Smart Cinema - Individual QR Ticket`. Retain these as historical references; they do not override the current Booking QR model. No requirements or Stitch resources were changed during this documentation task.

## Scope boundary

These files are design references only. They add no dependencies, frontend source changes, React components, routes, business rules or authorization for missing screens. They do not make sample content, fees, timer thresholds or optional capabilities in generated Stitch designs into product requirements.

