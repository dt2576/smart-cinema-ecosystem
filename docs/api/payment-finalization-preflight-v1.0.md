# Payment SUCCESS and atomic sale finalization preflight v1.0

Date: 2026-09-30. Status: analysis complete; **not ready for implementation or external charge until the required decisions below are resolved**. No provider selected, implementation authorized by this document, or new business policy approved.

## 1. Sources and authority

Read together: [Payment initiation v1.0](payment-initiation-contract-v1.0.md) and
[report](../reports/2026-09-30_payment-initiation-backend_report.md), [Booking v1.3](booking-contract-v1.3.md),
[Promotion v1.1](promotion-composition-contract-v1.1.md) with [v1.0](promotion-composition-contract-v1.0.md),
[Concession composition](concession-composition-contract-v1.0.md), [Seat/Hold v1.1](seat-hold-contract-v1.1.md),
[SRS v1.2](../srs/srs-v1.2.md) §§3.7–3.10/5/8.2–8.3,
[database decisions §6](../db/database-design-decisions-v1.0.md),
[physical dictionary](../db/physical-data-dictionary-v1.0.md) §§2/3.18–3.20,
[integrity design §6](../db/integrity-enforcement-design-v1.0.md).

Evidence includes current Java Payment/Booking/Promotion/Hold paths and V1–V9
guards, not only reports. Read-only inspection of the dedicated Payment test
database confirmed V9 checksum 48634441, all V1–V8 checksums, active stage checks,
assert_payment_freeze definition and absence of tickets/audit_records. This is
local evidence, not a claim about a production deployment.

The user's explicit 2026-09-30 decision preserves exact numeric(19,4), including
fractional/zero totals, and defers currency/provider conversion. The earlier
dictionary HALF_UP/minor-unit convention and positive-whole-VND preflight proposal
do not authorize rounding or changing a frozen amount now.

## 2. What exists, and what SUCCESS would require

| Current source | Current behavior | Required later change |
|---|---|---|
| PaymentController/Service/Repository | Owned POST with `{}`; READ COMMITTED; internal initiation only | Separate provider submission, trusted verification and result-handling paths; never accept Customer SUCCESS as proof |
| V9 payment stage CHECK and guard_payment_transaction | INITIATED only; provider/currency/external_reference/completed_at null, metadata empty; insert only, no update/delete | Controlled one-time binding and verified result transitions; immutable identity/amount retained |
| V9 assert_payment_freeze | Exactly one total attempt per frozen Booking; amount/time match marker | Allow historical terminal attempts, one unresolved attempt; first attempt pins marker, all later amounts/currency match frozen terms |
| V9 initiate_payment retry branch | Returns existing INITIATED for PENDING/unexpired Booking; no renewed charge eligibility check | Do not use recovery response as permission to submit; submission must recheck payable state/deadline |
| V7 booking_composition_eligible / V9 validate_payment_composition | Requires payment_started_at null | Cannot authorize already-frozen settlement; use dedicated frozen-aggregate eligibility without reopening composition |
| V8 Promotion calculator | Current master policy, whole subtotal, paid Booking usage count | SUCCESS usage check must preserve accepted discount, not run current-price recalculation blindly |
| V6/V8/V9 Booking guard and assertions | No PAID; terminal cancel/expiry only; no sold line; PENDING origin Holds ACTIVE | Coordinated paid transition and deferred complete-sale assertions |
| V6 Seat/Hold guards | Booking Seat insert only; sold_at null; no CONSUMED | Protected sold marker and exact-origin consumption in same finalization transaction |
| V6 partial sold-pair unique index | Already prepared for sold_at not null | Retain as double-sale backstop, not sole eligibility/ownership proof |
| Existing grants | Runtime SELECT and narrow command EXECUTE; no direct domain DML | Preserve separation; trusted result routine must not become a public Customer mutation |
| Ticket / Booking QR / audit | No Ticket/audit tables; Booking QR remains null | Approved Ticket/audit persistence, exactly one reusable Booking QR and atomic issuance |

V1/V2 Auth, V3 Movie, V4 Discovery and V5 Hold persistence remain foundations;
their history must not be edited. A forward migration must evolve all dependent
guards/assertions together, not merely drop the PAID or INITIATED stage checks.

## 3. Required decisions before implementation

The following are decisions to obtain or provider-contract facts to verify, not
approved defaults. Product/business owner settles currency/amount/fulfillment;
integration owner supplies provider contract details; operations/security own
credentials, endpoint configuration and reconciliation procedures.

| Area | Exact decision/evidence required | Why it blocks implementation |
|---|---|---|
| Provider and model | Named sandbox provider; hosted redirect/session versus server-created payment; immediate capture versus authorization/capture; supported payment methods | Creation, settlement and definitive success semantics differ; no generic fake adapter can establish trust |
| Account namespace | Sandbox environment and merchant/account identity; uniqueness scope for external transaction IDs | `(provider,external_reference)` is only safe if provider namespace also fixes account/environment scope |
| Currency | Single approved catalog/pricing currency and provider-supported currency; treatment of existing currency-null V9 attempts | Neither numeric storage nor percentage rounding establishes currency; an arbitrary default would reinterpret historical value |
| Conversion | Provider amount representation, scale/factor, limits, exact decimal/integer mapping, inbound reverse validation | Use decimal arithmetic; never binary floating point or silent rounding of frozen totals |
| Fractional amounts | Exact representability or rejection at provider boundary; approved Customer recovery for an unpayable frozen Booking | Domain continues to accept numeric(19,4); provider limits do not retroactively authorize price edits/unfreeze |
| Zero amount | Provider supports zero, explicit unpaid/free-order fulfillment policy, or blocked submission/cancel-and-restart | Do not synthesize Payment SUCCESS for zero or introduce free Ticket issuance without approved policy |
| Existing V9 binding | Whether unbound eligible attempts can be bound once, or must remain unsubmitted historical attempts; atomic binding/currency pinning rules | Current row guard disallows any update; do not send first and guess binding afterward |
| Internal/provider mapping | Which merchant reference carries internal_reference; character/length limits; distinct session/order/payment/capture IDs; when external reference is assigned | Callback-before-create-response and conflicting reference claims must resolve exactly one attempt |
| Submission idempotency | Provider-supported idempotency key scope, retention, duplicate semantics and query-by-reference guarantees | Local one-attempt uniqueness does not prevent two external charges from duplicate sends |
| Verified outcomes | Exact provider states qualifying as settled SUCCESS, definitive FAILED, definitive CANCELLED, unresolved processing; amount/currency/account/reference fields | A successful HTTP response, authorized-only state, browser cancel or timeout is not necessarily a terminal payment result |
| Authenticity | Official webhook/callback signature scheme, canonical bytes/fields, algorithm, secret/key identity, rotation, replay controls and environment binding | Verification must follow the selected provider, not an invented common signature algorithm |
| Authority/ordering | Whether verified webhook is sufficient or server query is also required; conflict handling when query/webhook disagree | Avoid downgrading SUCCESS with delayed failure or mistaking stale evidence for finality |
| Timeouts/recovery | Submission/query timeout values, bounded retry/backoff, retry horizon, missing-notification recovery, duplicate callback acknowledgement and operator escalation | Unknown results cannot create replacement attempts or extend Hold/Booking deadlines |
| Usage exhaustion | Handling when a real settled payment arrives but Promotion limit is exhausted; limit changes while attempts are in flight | No usage reservation exists; multiple frozen discounted attempts can settle concurrently |
| Post-freeze policy changes | Whether master deactivation/window/limit changes block fulfillment beyond the required usage check; whether blocked Customer affects an already verified financial result | Immutable accepted discount is established, but changing unrelated eligibility policy silently is not |
| Reconciliation ownership | Operator/process, durable safe evidence, late/duplicate/mismatch treatment and sandbox refund/manual handling boundary | Must have a truthful route for money received without entitlement; automated production refund is not implicitly in scope |

**Suggested minimal direction for review:** one sandbox provider/account, one
currency, exact representability checks, provider-backed idempotent create/query,
and authenticated webhook plus provider-specific query recovery. This is a design
candidate only. Provider selection and business decisions remain open; this preflight
does not rank vendors or claim any provider capability without its official contract.

## 4. Trust boundary: redirect, webhook and query

- Browser redirect is navigation/input to reloading current owned status. It never
  changes Booking/Payment to successful or failed on its own (FR-PAYMENT-004).
- Webhook is externally reachable, but only verified provider evidence may cross
  into a result command. A Customer JWT does not establish provider authenticity.
- Verification must check provider environment/account, authenticity, internal and
  external reference association, exact expected amount/currency and qualifying
  status. A valid signature with mismatched amount/reference is still not fulfillment authority.
- Query responses require authenticated server-to-provider transport and matching
  identity/amount/status. Define whether they confirm, supersede or merely reconcile
  notifications using selected-provider guarantees.
- Reference is correlation, not authentication. Never resolve ownership solely from
  browser Booking IDs or attach a provider transaction to a different internal attempt.
- Protect signatures/secrets from logs; keep only approved safe evidence, digest,
  event/reference identifiers and observation timestamps. Exact payload retention,
  redaction, replay window and acknowledgement/retry contract must be specified.
- Fetch provider evidence outside database locks. Under locks, recheck mutable
  entitlement/usage before committing. A local SQL privilege alone cannot verify a signature.

## 5. Idempotency and UNKNOWN/pending outcomes

There are separate layers: Customer initiation recovery; external submission;
provider-event delivery; domain sale finalization. V9 implements only the first.
The next contract must address all four and not reuse a browser retry as proof
that a failed network request never reached the provider.

| Observation | Existing safe design boundary | Required operational detail |
|---|---|---|
| Crash before provider submission | Recover same persisted reference and frozen amount | Single submission coordination and recoverability after binding |
| Timeout after request sent | Outcome unknown; keep attempt unresolved | Query/resubmit only under provider idempotency guarantees |
| Provider processing | No PAID or fulfillment; same unresolved attempt | Decide mapping to existing optional PENDING versus retained INITIATED |
| Browser abandoned/cancelled | Not verified provider cancellation | Query or wait for authenticated definitive result |
| Definitive authenticated FAILED/CANCELLED | No fulfillment; future new attempt may use frozen amount/currency before expiry | Result transition/audit, retry identity and one-unresolved uniqueness |
| Duplicate consistent SUCCESS | Return existing committed sale; no second Tickets/QR/usage | Event/reference deduplication and safe acknowledgement after commit |
| Booking deadline passes while result unknown | Expire/release exact original Holds; never extend deadline | Continue financial reconciliation without reopening entitlement |
| Late SUCCESS for expired/cancelled Booking | Preserve financial evidence; no automatic PAID/sale/Ticket | Operational reconciliation, not borrowed replacement Holds |
| Late correction after terminal failure or a second successful attempt | Reconciliation path, no second fulfillment | Preserve old/new evidence and resolve money separately |

UNKNOWN is an uncertainty description, **not an approved persisted lifecycle token**.
SRS supports INITIATED, SUCCESS, FAILED, CANCELLED and optional asynchronous PENDING;
V9 only permits INITIATED today. Do not add UNKNOWN or REFUNDED as a convenience.
No local timer implies FAILED. HTTP retry/acknowledgement values and provider query
scheduling remain decisions; original Booking expiry continues to govern entitlement.

## 6. Promotion race that must be resolved before charge

Example: usage_limit=1, two Bookings have frozen discounted amounts, both receive
real provider SUCCESS. Application/initiation reserved nothing. A shared Promotion
row lock and authoritative paid-count recheck can allow at most one discounted
Booking to finalize, but cannot undo the other external charge.

The contract must decide the second payment's reconciliation treatment before
external charges are enabled. Do not raise its frozen price, silently consume past
the limit, relabel genuine SUCCESS as FAILED, or introduce usage reservations
contrary to approved policy. Cancellation/expiry before PAID consumes no usage.
Post-freeze Promotion master terms must not reprice accepted discount. Define any
additional fulfillment veto separately from arithmetic and capture safe evidence.

## 7. Required atomic sale bundle

For authentic eligible SUCCESS, under the agreed common locking protocol:

1. Resolve the persisted bound attempt and verified evidence. Detect already
   finalized duplicate without incrementing usage or recreating identities.
2. Validate frozen amount/currency/reference; eligible PENDING Booking, current
   deadline/cutoff, exact ACTIVE unexpired owner-matching Holds, sellable pairs,
   unsold Seat Units and Promotion usage under lock.
3. Capture one accepted finalization instant for paid_at, all sold_at and Ticket
   issued_at. Record financial observation time separately as appropriate; do not
   backdate local eligibility using a provider timestamp to evade expiry.
4. Atomically store SUCCESS/evidence, PAID, sold markers, origin Hold consumption,
   one Ticket per Booking Seat, one Booking QR and required audit. PAID count
   consumes usage; duplicate completion consumes nothing extra.
5. Deferred assertions require the complete aggregate. Roll back all sale changes
   together on failure. Notify only after commit; replay verified evidence safely
   if commit fails. No separate asynchronous issuance gap is selected.

COUPLE remains one indivisible sold Seat Unit, one Ticket for two guests. QR belongs
to Booking; independent Ticket check-in is preserved. No Staff scanner UI is needed
for this slice. Ticket/QR/audit persistence belongs to the already approved model,
but identifier generation, collision retry, QR access protections and minimal
result/detail exposure must be specified before implementation.

Financial outcome and entitlement differ: a genuine SUCCESS on an ineligible or
already terminal Booking must remain recordable without forcing PAID/Tickets.
Deferred assertions must not require every SUCCESS attempt to have a paid Booking.
Do not add a unique one-SUCCESS-per-Booking constraint that discards real duplicate
financial evidence; at most one sale and one unresolved attempt are different invariants.

## 8. Guard changes and design conflicts to reconcile

- Replace V9's exactly-one-total-attempt assertion with first-attempt/immutable
  freeze plus historical retry consistency; retain at most one unresolved attempt.
- Replace insertion-only Payment guard/stage check with narrowly authorized binding,
  result transitions and reference-once rules. Do not grant broad runtime UPDATE.
- Add frozen-result eligibility; do not weaken booking_composition_eligible so
  ordinary Concession/Promotion edits become possible after freeze.
- Evolve Booking status and Seat/Hold guards with paid aggregate assertions,
  Ticket/audit tables and sold unique index in one reviewed migration bundle.
- Actual lock_booking_resources takes Holds before Promotion; integrity design's
  numbered order places Promotion before Holds. Current writers consistently use
  the former. Resolve/document a single order for new settlement and all affected
  writers; never mix the two. Movie SHARE lock is also part of the actual gate.
- System result processing cannot assume a Customer JWT. Decide account-blocked
  settlement semantics and use the system gate safely; never spoof Customer identity.
- Current metadata is constrained empty; verified evidence/audit needs an approved
  safe schema and result writer, not arbitrary raw provider payload acceptance.
- Existing paid_at constraint requires paid_at before expires_at. Late financial
  evidence must be handled separately, not by relaxing entitlement expiry globally.

## 9. Verification plan and readiness gate

Before coding, publish an approved provider/result contract resolving §3, including
example amount conversion and signed/query evidence vectors from official provider
documentation. No secrets in repository or chat. Specify existing-V9 migration and
recovery behavior, callback endpoints/authentication, status mappings and response
semantics. Define reconciliation for charge-without-fulfillment cases.

Required later checks:

- Fresh/upgrade migration and unchanged historical checksums; runtime grants and
  paired guards; reject partial paid/sold/consumed/issued aggregates at commit.
- Provider contract tests: altered signatures/body, wrong merchant/environment,
  replay, unknown/mismatched reference, amount/currency mismatch and status mapping.
- Crash/timeout before/after provider creation; duplicate sends/events; lost response;
  query/webhook disagreement; definitive failure/retry with frozen terms.
- Concurrent identical SUCCESS; different attempts for one Booking; same sold pair;
  SUCCESS versus cancel/expiry/Seat blocking and cross-Showtime Promotion limit race.
- Late SUCCESS, duplicate after PAID, correction after FAILED/CANCELLED; no second
  entitlement/usage/QR, no reclamation of another Customer's Hold.
- Whole COUPLE Ticket semantics, exactly one Booking QR, Ticket statuses independent,
  identifier collision rollback, safe audit, string IDs and no client-authoritative result.
- Exact provider amount representation, fractional/zero policy and binding of
  old currency-null attempts; frozen snapshots unchanged by master/catalog edits.

Current readiness: **requirements/implementation preflight complete; implementation
blocked on provider/business decisions, not on permission to edit files**.
Exact next task is to resolve and publish the provider/result/finalization contract;
then authorize **backend-verified Payment SUCCESS + atomic sale finalization**.
Current V9 stays unchanged. Historical 194-test success is not verification of
these unimplemented provider/finalization behaviors.
