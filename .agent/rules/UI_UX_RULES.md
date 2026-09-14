# UI/UX Rules

Before implementing a screen:

1. Identify the actor.
2. Identify the related Use Case and actual ID where available.
3. Identify the related FR from the relevant SRS version.
4. Inspect the current approved Smart Cinema UI/UX references.
5. Identify loading, error, and empty states when relevant.

UI must not invent business rules. For example:

- If SRS does not define a service fee, UI must not add one.
- If inventory is out of MVP scope, UI must not introduce stock management.
- If the approved model uses one Booking QR per Booking, UI must not silently return to one QR per Ticket.
- Currency must be consistent with Smart Cinema requirements.

These examples are safeguards, not new requirements; consult the actual project documents.

For pure visual UI tasks, avoid unnecessary analysis of backend internals. Focus on layout, navigation, components, interactions, responsive design, accessibility, user states, and the approved visual language. Report missing or conflicting references before introducing business behavior.
