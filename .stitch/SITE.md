# Smart Cinema screen inventory

Live project: **Smart Cinema Ecosystem**, ID `1208499799798658711`.
Snapshot: **2026-09-25**. Project updateTime: `2026-09-25T12:11:23.023327Z`.
Exact metadata: [metadata.json](metadata.json). Visual guidance: [DESIGN.md](DESIGN.md).
Refresh evidence: [workflow report](../docs/reports/2026-09-25_stitch-reference-refresh_report.md).

## Inventory policy and totals

- **44 current resources**: 25 UI screens, 18 image assets and 1 audit reference. All 26 previous source screen IDs remain; **18 references added** (6 UI screens and 12 image assets).
- Stitch list_screens returned 35 resources. get_project exposed nine additional hidden screen references; get_screen successfully verified all 44 individually. Hidden/favourite flags describe canvas metadata, never approval.
- One DESIGN_SYSTEM_INSTANCE is recorded separately in metadata and excluded from screen totals. Its asset ID is not a screen ID.
- All 26 available HTML references (25 UI screens plus audit) were read for text/content matching. Image resources were inspected through live metadata, not treated as UI pages. This is not pixel-level or interactive QA.
- “New” means absent from the 2026-09-14 local snapshot, not proof of generation date. No screens were generated or changed in this task.
- Customer classification below is an inference from titles and HTML against [SRS v1.2](../docs/srs/srs-v1.2.md) section 6.1 and relevant FRs. Existing references never override BRD/SRS or the adopted Movie contract.
- Source screen IDs, instance IDs, resource dimensions and canvas dimensions are distinct. For example the audit screen ID is `10765353845882543715`, while its canvas instance ID is `1c742dc4-8202-436f-b309-23d4a99423e2`.

## All current screen names and IDs

| Exact screen name | Screen ID | Resource size (px) | Kind / flags | Change |
|---|---|---|---|---|
| Accessibility Audit.md | `10765353845882543715` | 780 x 1768 | AUDIT_REFERENCE; Hidden | Retained |
| Chilled fountain cola soda in a sleek black matte cinema cup with condensation droplets and a straw, ice cubes, dark mood studio lighting | `d194632f74d04fb3b8b46e0631b8c0f7` | 1200 x 896 | IMAGE_ASSET | Retained |
| Cinema Seat Selection | `019a53e2bbc242ca98a84fa1a10192a6` | 2560 x 2368 | UI_SCREEN; Hidden | Retained |
| Cinematic landscape wide shot of vast rolling desert sand dunes on an alien planet under a dusky starry night sky with twin moons, warm atmospheric amber light glowing along dune crests, deep obsidian shadows, high-end widescreen cinematic film backdrop, clean with no text or typography, subtle vignette, perfect for dark UI overlay | `d17964cf5cf34ae5ae8293d927d8a638` | 1376 x 768 | IMAGE_ASSET | New reference |
| Crisp lemon lime soda with fresh lime slice, fizzing bubbles in sleek dark cinema cup, ice cubes, dark studio lighting, movie snack commercial photography | `98e0897836c840a09132c20bc2023d3a` | 1200 x 896 | IMAGE_ASSET | Retained |
| Fresh hot buttery golden movie cinema popcorn overflowing in a sleek black premium paper bucket with warm cinema spotlighting on a dark sleek background, professional commercial food photography, crisp focus, appetizing | `cd77377730824fbcba1b9f12e4e4c784` | 1200 x 896 | IMAGE_ASSET | Retained |
| Official theatrical movie poster style for Civil War, close-up dramatic shot of photojournalist camera lens reflecting burning urban dystopian skyline and military helicopter silhouettes in cloudy smoke, gritty intense atmospheric drama, dark cinematic lighting, vertical composition, premium film key art | `2a5914f8462a444895bd014510ba6282` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Dune Part Two, epic desert planet Arrakis with vast sweeping orange sand dunes, giant sandworm silhouette in distance, twin moons in a dark dusky sky, warm amber cinematic lighting, high-end dramatic movie key art, vertical composition, dramatic atmospheric sci-fi cinema poster | `df50977f707947758394894e7a282864` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Furiosa A Mad Max Saga, fierce female warrior silhouette with mechanical arm standing in front of a heavily armored war rig vehicle, raging apocalyptic desert dust storm with fire and flares, intense warm amber and dusty charcoal palette, vertical composition, gritty cinematic action poster | `33afd83a57494e96bc46d408596fc034` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Gladiator II, ancient Roman gladiator warrior standing inside the colossal shadowy Colosseum arena, golden sunlight breaking through dust and mist onto bloodstained sand, dramatic dust particles, epic historical drama cinema key art, vertical composition | `9b54d3edecd74da0b19c5ab08bafdbd6` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Interstellar 10th Anniversary, lone astronaut in modern space suit standing on an icy alien water planet, gazing up at a colossal glowing gravitational accretion disk and swirling black hole Gargantua dominating the dark starry cosmos, epic cosmic sci-fi cinema key art, vertical composition | `ca8ef62a23414c8b8047b566375cff5d` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Oppenheimer, silhouette of a man wearing a fedora hat and trench coat standing against an immense swirling fiery orange and black atomic firestorm and sparks, intense dramatic contrast, 70mm cinematic film photography aesthetic, vertical composition, high-end cinema key art | `6edaa1ec31154bf0a4b43a03091c0166` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Past Lives, romantic drama key art featuring a man and a woman standing near a ferry railing looking deeply at each other with subtle wistful longing, misty New York City twilight skyline across the water, soft emotional cinematic lighting, 35mm film grain aesthetic, vertical composition | `517d9ab1a5814297af43fefb65e6704f` | 848 x 1264 | IMAGE_ASSET | New reference |
| Premium branded pure still mineral water in sleek glass or premium dark bottle on dark cinema bar counter, condensation droplets, luxury studio lighting | `081f444b338947afad9e66d06a8d8f12` | 1200 x 896 | IMAGE_ASSET | Retained |
| Premium cinema movie combo set featuring a large tub of popcorn, two fountain soda drinks with straws, and chocolate candies, arranged beautifully on dark reflective surface, high-end cinema food photography | `f145e703600c491bb9fc5b2d9cbafbf4` | 1200 x 896 | IMAGE_ASSET | Retained |
| Smart Cinema - Authenticated Account Menu | `14dc6c1445a747b88c866508463e9879` | 2560 x 3012 | UI_SCREEN | New reference |
| Smart Cinema - Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | 2560 x 3410 | UI_SCREEN | Retained |
| Smart Cinema - Booking Summary / Review Order | `52aa55f16d2640d68efb6c399d5fb990` | 2560 x 3444 | UI_SCREEN; Favourite | Retained |
| Smart Cinema - Booking Summary / Review Order | `5e46faa89712407ca07bf131aaae1316` | 2560 x 3928 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - Cinema Selection | `8de77c4d95c141f9947a4f7bf4cad7c9` | 2560 x 3280 | UI_SCREEN | New reference |
| Smart Cinema - Create Account | `82c296db655348e2a3f14776f936989e` | 2560 x 2864 | UI_SCREEN | Retained |
| Smart Cinema - Customer Homepage | `85a6a5848b1c499594bc3e3faeecf9b8` | 2560 x 7108 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - Customer Homepage | `c667635786b940938d6071bb335830f9` | 2560 x 6972 | UI_SCREEN | Retained |
| Smart Cinema - Food & Drinks | `602baa042d22404d8b31d461351aa42d` | 2560 x 3760 | UI_SCREEN; Favourite | Retained |
| Smart Cinema - Food & Drinks (Hold Expired) | `91a9d638f6694887a3299111e6026a52` | 2560 x 3560 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - Food & Drinks (Seat Hold Expired) | `1017f7c1f77943579d9bb1bee37f7718` | 2560 x 3500 | UI_SCREEN; Favourite | Retained |
| Smart Cinema - Individual QR Ticket | `8c85de5a42c34780915d8661021246ab` | 2560 x 2764 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - Movie Detail | `16dbe62e3be744e6ab4123fc004283e3` | 2560 x 3748 | UI_SCREEN | New reference |
| Smart Cinema - Movie Listing | `fe57105a74494ca4807f61ae495f7c29` | 2560 x 2790 | UI_SCREEN | New reference |
| Smart Cinema - My Profile | `85bfbbac541b4455be5bd383218436e6` | 2560 x 3012 | UI_SCREEN | New reference |
| Smart Cinema - My Tickets | `ca1c28a605b64d4ebeb59d4c00c23d42` | 2560 x 2544 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - My Tickets & Passes | `b35a7c6b366d4c2a90d8e04b76c4b99b` | 2560 x 2700 | UI_SCREEN; Hidden | Retained |
| Smart Cinema - Payment Method Selection | `0cc11f6226c74b6291ef49660e63f748` | 2560 x 2500 | UI_SCREEN | Retained |
| Smart Cinema - Payment Processing & Verification | `777b204432ad4fba84065c10697951e9` | 2560 x 2432 | UI_SCREEN | Retained |
| Smart Cinema - Payment Result & Order Confirmation | `b023e6ffbd0c424d9244aaa8393c442c` | 2560 x 2386 | UI_SCREEN | Retained |
| Smart Cinema - Seat Selection | `fdea388b4b24406799ab087b31239835` | 2560 x 2262 | UI_SCREEN; Favourite | Retained |
| Smart Cinema - Showtime Selection | `a808fb16fcad452696636be952ea70b1` | 2560 x 3742 | UI_SCREEN | New reference |
| Smart Cinema - Sign In | `f5904cd07f924d25a0ca844636e93060` | 2560 x 2244 | UI_SCREEN | Retained |
| Smart Cinema - Ticket Detail | `422f032569974172b8217983f7738b41` | 2560 x 3042 | UI_SCREEN; Hidden | Retained |
| Sweet golden glazed caramel popcorn in a stylish dark matte cinema snack tub with glistening caramel coating, warm studio lighting, gourmet movie snack photography | `82d34150a46a467a90ea4f0933b1e249` | 1200 x 896 | IMAGE_ASSET | Retained |
| Theatrical animation movie poster for a multiverse comic book hero. An athletic acrobatic masked hero in a black and red suit leaping forward across glowing neon-lit dimensional portal rings. Deep twilight comic metropolis skyline below, vivid cyan and hot pink portal energy swirls, stylized halftone print texture, dramatic wide-angle perspective, dynamic action pose, clean cinematic 2:3 vertical key art poster. | `385a395694ed4adc86af9a4a86891343` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical film key art poster for an epic alien planet fantasy titled Fire and Ash, featuring an otherworldly volcanic landscape with glowing fiery rivers and dark basalt volcanic peaks under a moonlit alien sky, a winged silhouette gliding through glowing ash clouds and embers, atmospheric fantasy sci-fi poster, vertical 2:3 composition | `817f0a5e5f02438b86a433aebc1ee807` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical movie key art poster for an animated multiverse superhero adventure film, featuring an acrobatic hooded hero diving through vibrant kaleidoscopic portals across neon comic-book skylines, dramatic dark skyline contrast, halftone dot texture, bold graphic novel aesthetic, cinematic 2:3 vertical composition | `896acb2c4d5e42c396d4eba9706a7b3a` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical movie key art poster for an epic alien planet sci-fi adventure titled 'Fire and Ash'. A stunning alien fantasy landscape with bioluminescent blue flora and dramatic flowing glowing volcanic magma rivers, obsidian volcanic mountains under a starry night sky with glowing celestial moons. A majestic winged mythical creature soaring across glowing embers. Dark cinematic atmosphere, vertical 2:3 aspect ratio, cinematic poster typography. | `e443081476ef45b889c07407a37fc00a` | 848 x 1264 | IMAGE_ASSET | New reference |

## Newly added references

### Customer UI screens

| Exact screen name | Screen ID | Resource size (px) | Kind / flags | Change |
|---|---|---|---|---|
| Smart Cinema - Authenticated Account Menu | `14dc6c1445a747b88c866508463e9879` | 2560 x 3012 | UI_SCREEN | New reference |
| Smart Cinema - Cinema Selection | `8de77c4d95c141f9947a4f7bf4cad7c9` | 2560 x 3280 | UI_SCREEN | New reference |
| Smart Cinema - Movie Detail | `16dbe62e3be744e6ab4123fc004283e3` | 2560 x 3748 | UI_SCREEN | New reference |
| Smart Cinema - Movie Listing | `fe57105a74494ca4807f61ae495f7c29` | 2560 x 2790 | UI_SCREEN | New reference |
| Smart Cinema - My Profile | `85bfbbac541b4455be5bd383218436e6` | 2560 x 3012 | UI_SCREEN | New reference |
| Smart Cinema - Showtime Selection | `a808fb16fcad452696636be952ea70b1` | 2560 x 3742 | UI_SCREEN | New reference |

### Image assets

| Exact screen name | Screen ID | Resource size (px) | Kind / flags | Change |
|---|---|---|---|---|
| Cinematic landscape wide shot of vast rolling desert sand dunes on an alien planet under a dusky starry night sky with twin moons, warm atmospheric amber light glowing along dune crests, deep obsidian shadows, high-end widescreen cinematic film backdrop, clean with no text or typography, subtle vignette, perfect for dark UI overlay | `d17964cf5cf34ae5ae8293d927d8a638` | 1376 x 768 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Civil War, close-up dramatic shot of photojournalist camera lens reflecting burning urban dystopian skyline and military helicopter silhouettes in cloudy smoke, gritty intense atmospheric drama, dark cinematic lighting, vertical composition, premium film key art | `2a5914f8462a444895bd014510ba6282` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Dune Part Two, epic desert planet Arrakis with vast sweeping orange sand dunes, giant sandworm silhouette in distance, twin moons in a dark dusky sky, warm amber cinematic lighting, high-end dramatic movie key art, vertical composition, dramatic atmospheric sci-fi cinema poster | `df50977f707947758394894e7a282864` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Furiosa A Mad Max Saga, fierce female warrior silhouette with mechanical arm standing in front of a heavily armored war rig vehicle, raging apocalyptic desert dust storm with fire and flares, intense warm amber and dusty charcoal palette, vertical composition, gritty cinematic action poster | `33afd83a57494e96bc46d408596fc034` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Gladiator II, ancient Roman gladiator warrior standing inside the colossal shadowy Colosseum arena, golden sunlight breaking through dust and mist onto bloodstained sand, dramatic dust particles, epic historical drama cinema key art, vertical composition | `9b54d3edecd74da0b19c5ab08bafdbd6` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Interstellar 10th Anniversary, lone astronaut in modern space suit standing on an icy alien water planet, gazing up at a colossal glowing gravitational accretion disk and swirling black hole Gargantua dominating the dark starry cosmos, epic cosmic sci-fi cinema key art, vertical composition | `ca8ef62a23414c8b8047b566375cff5d` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Oppenheimer, silhouette of a man wearing a fedora hat and trench coat standing against an immense swirling fiery orange and black atomic firestorm and sparks, intense dramatic contrast, 70mm cinematic film photography aesthetic, vertical composition, high-end cinema key art | `6edaa1ec31154bf0a4b43a03091c0166` | 848 x 1264 | IMAGE_ASSET | New reference |
| Official theatrical movie poster style for Past Lives, romantic drama key art featuring a man and a woman standing near a ferry railing looking deeply at each other with subtle wistful longing, misty New York City twilight skyline across the water, soft emotional cinematic lighting, 35mm film grain aesthetic, vertical composition | `517d9ab1a5814297af43fefb65e6704f` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical animation movie poster for a multiverse comic book hero. An athletic acrobatic masked hero in a black and red suit leaping forward across glowing neon-lit dimensional portal rings. Deep twilight comic metropolis skyline below, vivid cyan and hot pink portal energy swirls, stylized halftone print texture, dramatic wide-angle perspective, dynamic action pose, clean cinematic 2:3 vertical key art poster. | `385a395694ed4adc86af9a4a86891343` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical film key art poster for an epic alien planet fantasy titled Fire and Ash, featuring an otherworldly volcanic landscape with glowing fiery rivers and dark basalt volcanic peaks under a moonlit alien sky, a winged silhouette gliding through glowing ash clouds and embers, atmospheric fantasy sci-fi poster, vertical 2:3 composition | `817f0a5e5f02438b86a433aebc1ee807` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical movie key art poster for an animated multiverse superhero adventure film, featuring an acrobatic hooded hero diving through vibrant kaleidoscopic portals across neon comic-book skylines, dramatic dark skyline contrast, halftone dot texture, bold graphic novel aesthetic, cinematic 2:3 vertical composition | `896acb2c4d5e42c396d4eba9706a7b3a` | 848 x 1264 | IMAGE_ASSET | New reference |
| Theatrical movie key art poster for an epic alien planet sci-fi adventure titled 'Fire and Ash'. A stunning alien fantasy landscape with bioluminescent blue flora and dramatic flowing glowing volcanic magma rivers, obsidian volcanic mountains under a starry night sky with glowing celestial moons. A majestic winged mythical creature soaring across glowing embers. Dark cinematic atmosphere, vertical 2:3 aspect ratio, cinematic poster typography. | `e443081476ef45b889c07407a37fc00a` | 848 x 1264 | IMAGE_ASSET | New reference |

## Customer SRS flow matches

| SRS stage | Screen IDs | Evidence / qualification |
|---|---|---|
| Home | `85a6a5848b1c499594bc3e3faeecf9b8`, `c667635786b940938d6071bb335830f9` | SRS 6.1; two variants, one hidden |
| Movie List / Search | `fe57105a74494ca4807f61ae495f7c29` | FR-MOVIE-001/003; Genre/search controls; extra filters need reconciliation |
| Movie Detail | `16dbe62e3be744e6ab4123fc004283e3` | FR-MOVIE-002/008; metadata/trailer and next-step navigation |
| Cinema Selection | `8de77c4d95c141f9947a4f7bf4cad7c9` | SRS 6.1; FR-MOVIE-008; selection/empty/closed prototype states |
| Showtime Selection | `a808fb16fcad452696636be952ea70b1` | FR-SHOWTIME-006/007/008; date/Hall/time and started/sold-out states |
| Seat Map | `fdea388b4b24406799ab087b31239835` | FR-SEAT-001/004/005; historical alternative also retained |
| Concession Selection / expiry | `602baa042d22404d8b31d461351aa42d`, `1017f7c1f77943579d9bb1bee37f7718`, `91a9d638f6694887a3299111e6026a52` | FR-BOOKING-013/016/017; FR-SEAT-009; normal and expired variants |
| Booking Summary / Promotion | `52aa55f16d2640d68efb6c399d5fb990`, `5e46faa89712407ca07bf131aaae1316` | SRS 6.1; FR-BOOKING-007/008; totals and promotion entry; two variants |
| Payment | `0cc11f6226c74b6291ef49660e63f748`, `777b204432ad4fba84065c10697951e9` | FR-PAYMENT-001/003/006; selection and verification phases |
| Payment Result | `b023e6ffbd0c424d9244aaa8393c442c` | FR-PAYMENT-007; flow match only: per-Ticket QR copy conflicts |
| My Bookings & Tickets / Booking QR | `b850455e65fc482a8ef3332cb672683d` | FR-BOOKING-009/010; FR-TICKET-004/006/007/008; unified QR, individual Ticket states |
| Profile / account navigation | `85bfbbac541b4455be5bd383218436e6`, `14dc6c1445a747b88c866508463e9879` | FR-AUTH-005/003; profile and open account-menu variant |
| Registration / Login | `82c296db655348e2a3f14776f936989e`, `f5904cd07f924d25a0ca844636e93060` | FR-AUTH-001/002; support the Customer journey |

The matching primary path is Home → Movie List → Movie Detail → Cinema Selection → Showtime Selection → Seat Map → Concessions → Booking Summary/Promotion → Payment/Verification → Payment Result → Booking QR & Tickets. Profile and authentication support this journey. Mapping does not certify interactions, loading/error states or requirements compliance.

## Duplicates, variants and ambiguities

- Exact duplicate titles: Customer Homepage (`85a6a5848b1c499594bc3e3faeecf9b8`, `c667635786b940938d6071bb335830f9`); Booking Summary / Review Order (`52aa55f16d2640d68efb6c399d5fb990`, `5e46faa89712407ca07bf131aaae1316`). Keep both IDs; hidden/favourite does not establish approval.
- Seat selection alternatives: `019a53e2bbc242ca98a84fa1a10192a6` (hidden, older CINEPLEX branding in HTML) and `fdea388b4b24406799ab087b31239835` (visible Smart Cinema). Do not merge.
- Hold-expiry variants: `91a9d638f6694887a3299111e6026a52` (hidden) and `1017f7c1f77943579d9bb1bee37f7718` (visible). Both remain, alongside normal Food & Drinks `602baa042d22404d8b31d461351aa42d`.
- My Profile `85bfbbac541b4455be5bd383218436e6` and Authenticated Account Menu `14dc6c1445a747b88c866508463e9879` share profile content; the latter includes the expanded account menu, not an unrelated flow.
- Legacy Ticket family: `ca1c28a605b64d4ebeb59d4c00c23d42`, `b35a7c6b366d4c2a90d8e04b76c4b99b`, `422f032569974172b8217983f7738b41`, `8c85de5a42c34780915d8661021246ab` describe individual QR passes. These conflict with one Booking QR plus Ticket-level check-in. Prefer `b850455e65fc482a8ef3332cb672683d` as the matching Booking-QR reference, without certifying all its copy.
- Payment Result `b023e6ffbd0c424d9244aaa8393c442c` also explicitly describes a QR for each Ticket. Its current visibility does not resolve that conflict.
- Poster variants: Fire and Ash `817f0a5e5f02438b86a433aebc1ee807` / `e443081476ef45b889c07407a37fc00a`; multiverse hero `896acb2c4d5e42c396d4eba9706a7b3a` / `385a395694ed4adc86af9a4a86891343`. These are related assets, not proven exact image duplicates. Canvas labels Avatar and Spidermen are retained separately from exact resource titles.
- Movie Listing includes rating filtering, popularity sorting and Now Showing/Coming Soon groupings. These are not approved backend inputs or Movie lifecycle states in the [finalized Movie contract](../docs/api/movie-service-contract-v1.0.md). Movie Detail includes cast/crew, prices and screening availability beyond the current Movie read DTO; absence of screenings is not the same as an unpublished Movie.
- Profile variants include biometric, SMS and lounge claims; historical Ticket variants include transfers, wallets/NFC and dollar amounts. Treat them as unapproved sample content, not requirements. Payment Method's five-minute lock copy is not evidence of an approved TTL configuration (SRS default is ten minutes, configurable).
- No distinct current screen title is My Bookings, My Bookings & Tickets or Promotion. The Booking QR & Passes body provides a combined booking/ticket view; Promotion is embedded in Booking Summary. This is functional correspondence, not proof of complete coverage.
- No dedicated Staff, Manager or Admin screens were identified. Authentication screens can support more than one actor.

## Preservation

No prior screen ID was removed, substituted or deduplicated. Live titles and current reference availability replace stale local facts; in particular an empty htmlCode object on image assets no longer counts as an HTML reference. No frontend code, Stitch design or DESIGN.md was changed.
