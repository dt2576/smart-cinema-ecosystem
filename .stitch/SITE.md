# Smart Cinema screen inventory

Visual source of truth: Stitch project **Smart Cinema Ecosystem**, ID `1208499799798658711`.
Snapshot: 2026-09-14. Exact IDs, dimensions and metadata: [metadata.json](metadata.json). Visual direction: [DESIGN.md](DESIGN.md).

## Inventory policy

- All 26 entries below are verified existing Stitch screen resources, including 9 hidden canvas references retrieved individually through get_screen.
- Existing means the resource exists, not that its business behavior or implementation is approved. Hidden and favourite flags are metadata, not approval.
- Duplicate names are retained with distinct IDs. No missing screen is represented as Existing or Approved.
- Role assignment is conservative and based only on names. Ambiguous authentication, booking, payment and ticket screens remain unassigned.
- Dimensions are width × height in pixels from the screen resource, not the canvas display dimensions.

## Customer

| Exact screen name | Screen ID | Dimensions | Status | Metadata |
|---|---|---|---|---|
| Smart Cinema - Customer Homepage | `85a6a5848b1c499594bc3e3faeecf9b8` | 2560 × 7108 | Existing | DESKTOP; Hidden |
| Smart Cinema - Customer Homepage | `c667635786b940938d6071bb335830f9` | 2560 × 6972 | Existing | DESKTOP |
| Smart Cinema - My Tickets | `ca1c28a605b64d4ebeb59d4c00c23d42` | 2560 × 2544 | Existing | DESKTOP; Hidden |
| Smart Cinema - My Tickets & Passes | `b35a7c6b366d4c2a90d8e04b76c4b99b` | 2560 × 2700 | Existing | DESKTOP; Hidden |

## Staff

No existing screens can be identified for this area from the returned names. No missing screens are approved by this inventory.

## Manager

No existing screens can be identified for this area from the returned names. No missing screens are approved by this inventory.

## Admin

No existing screens can be identified for this area from the returned names. No missing screens are approved by this inventory.

## Unassigned

| Exact screen name | Screen ID | Dimensions | Status | Metadata |
|---|---|---|---|---|
| Accessibility Audit.md | `10765353845882543715` | 780 × 1768 | Existing | Device type not supplied; Hidden |
| Chilled fountain cola soda in a sleek black matte cinema cup with condensation droplets and a straw, ice cubes, dark mood studio lighting | `d194632f74d04fb3b8b46e0631b8c0f7` | 1200 × 896 | Existing | Device type not supplied |
| Cinema Seat Selection | `019a53e2bbc242ca98a84fa1a10192a6` | 2560 × 2368 | Existing | DESKTOP; Hidden |
| Crisp lemon lime soda with fresh lime slice, fizzing bubbles in sleek dark cinema cup, ice cubes, dark studio lighting, movie snack commercial photography | `98e0897836c840a09132c20bc2023d3a` | 1200 × 896 | Existing | Device type not supplied |
| Fresh hot buttery golden movie cinema popcorn overflowing in a sleek black premium paper bucket with warm cinema spotlighting on a dark sleek background, professional commercial food photography, crisp focus, appetizing | `cd77377730824fbcba1b9f12e4e4c784` | 1200 × 896 | Existing | Device type not supplied |
| Premium branded pure still mineral water in sleek glass or premium dark bottle on dark cinema bar counter, condensation droplets, luxury studio lighting | `081f444b338947afad9e66d06a8d8f12` | 1200 × 896 | Existing | Device type not supplied |
| Premium cinema movie combo set featuring a large tub of popcorn, two fountain soda drinks with straws, and chocolate candies, arranged beautifully on dark reflective surface, high-end cinema food photography | `f145e703600c491bb9fc5b2d9cbafbf4` | 1200 × 896 | Existing | Device type not supplied |
| Smart Cinema - Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | 2560 × 3410 | Existing | DESKTOP |
| Smart Cinema - Booking Summary / Review Order | `52aa55f16d2640d68efb6c399d5fb990` | 2560 × 3444 | Existing | DESKTOP; Favourite |
| Smart Cinema - Booking Summary / Review Order | `5e46faa89712407ca07bf131aaae1316` | 2560 × 3928 | Existing | DESKTOP; Hidden |
| Smart Cinema - Create Account | `82c296db655348e2a3f14776f936989e` | 2560 × 2864 | Existing | DESKTOP |
| Smart Cinema - Food & Drinks | `602baa042d22404d8b31d461351aa42d` | 2560 × 3760 | Existing | DESKTOP; Favourite |
| Smart Cinema - Food & Drinks (Hold Expired) | `91a9d638f6694887a3299111e6026a52` | 2560 × 3560 | Existing | DESKTOP; Hidden |
| Smart Cinema - Food & Drinks (Seat Hold Expired) | `1017f7c1f77943579d9bb1bee37f7718` | 2560 × 3500 | Existing | DESKTOP; Favourite |
| Smart Cinema - Individual QR Ticket | `8c85de5a42c34780915d8661021246ab` | 2560 × 2764 | Existing | DESKTOP; Hidden |
| Smart Cinema - Payment Method Selection | `0cc11f6226c74b6291ef49660e63f748` | 2560 × 2500 | Existing | DESKTOP |
| Smart Cinema - Payment Processing & Verification | `777b204432ad4fba84065c10697951e9` | 2560 × 2432 | Existing | DESKTOP |
| Smart Cinema - Payment Result & Order Confirmation | `b023e6ffbd0c424d9244aaa8393c442c` | 2560 × 2386 | Existing | DESKTOP |
| Smart Cinema - Seat Selection | `fdea388b4b24406799ab087b31239835` | 2560 × 2262 | Existing | DESKTOP; Favourite |
| Smart Cinema - Sign In | `f5904cd07f924d25a0ca844636e93060` | 2560 × 2244 | Existing | DESKTOP |
| Smart Cinema - Ticket Detail | `422f032569974172b8217983f7738b41` | 2560 × 3042 | Existing | DESKTOP; Hidden |
| Sweet golden glazed caramel popcorn in a stylish dark matte cinema snack tub with glistening caramel coating, warm studio lighting, gourmet movie snack photography | `82d34150a46a467a90ea4f0933b1e249` | 1200 × 896 | Existing | Device type not supplied |

## Reference reconciliation

The hidden `Smart Cinema - Individual QR Ticket` resource exists, but its name suggests a potential conflict with the current one-Booking-QR model. Preserve it as historical visual reference; do not infer approval for per-Ticket QR behavior. Screen content has not been audited for business compliance. See [DESIGN.md](DESIGN.md) for the controlling model.

