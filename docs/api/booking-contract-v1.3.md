# Customer Booking Contract v1.3

Date: 2026-09-30. Additive delta to [v1.2](booking-contract-v1.2.md),
[v1.1](booking-contract-v1.1.md) and [v1.0](booking-contract-v1.0.md).

BookingResponse adds nullable `paymentStartedAt`, the permanent composition-freeze
instant. Null means no Payment attempt has started. Non-null means a real persisted
internal INITIATED attempt exists; it does not imply gateway submission or success.

[Payment initiation](payment-initiation-contract-v1.0.md) atomically creates that
attempt and marker with the authoritative final_amount. Zero/fractional totals are
retained. Applied Promotion must still be eligible and match reviewed terms before
first initiation, otherwise conflict requires reapplication/removal and review.

After marker is set, Seat/Concession/Promotion composition, terms and amounts cannot
change. All existing composition commands reject. Retry returns the same unresolved
attempt without repricing. Master updates never rewrite frozen snapshots.

PENDING Booking still supports existing cancellation/expiry, which retains frozen
amounts/marker/attempt, releases only attached origin Holds and consumes no Promotion
usage. Attempt remains INITIATED because no provider cancellation/failure is known.
Retry initiation after terminal state/expiry returns conflict. No Payment result,
PAID/paid_at, CONSUMED, sold_at, Ticket or QR path is enabled.

V9 preserves V1–V8 and all historical contracts. [Implementation evidence](../reports/2026-09-30_payment-initiation-backend_report.md).
