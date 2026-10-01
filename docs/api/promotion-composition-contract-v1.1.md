# Customer Promotion Composition Contract v1.1

Date: 2026-09-30. Delta to [v1.0](promotion-composition-contract-v1.0.md).

The previously deferred first-attempt freeze now exists through [Payment initiation](payment-initiation-contract-v1.0.md).
Immediately before first initiation, current Promotion eligibility and calculated
terms are checked under the Promotion lock. Changed terms/discount return 409
`Composition review required`; invalid eligibility returns `Promotion unavailable`.
Neither freezes or changes the old accepted snapshot. Reapply/remove and review
before trying again.

After first initiation, Promotion apply/remove and all composition edits reject.
Frozen retries retain the accepted terms and amount even after master changes or
Promotion expiry. They recover an existing internal attempt, not authorize a charge.

Applying, initiation, pre-Payment cancellation and Booking expiry consume no usage.
Only future backend-verified SUCCESS may consume usage through the PAID transition.
Existing discount/minimum/rounding/cap policy is unchanged. No provider currency
or amount-conversion rule is inferred from percentage rounding to whole VND.

Provider integration and paid finalization remain deferred. See [Booking v1.3](booking-contract-v1.3.md)
and the [implementation report](../reports/2026-09-30_payment-initiation-backend_report.md).
