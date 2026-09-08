# LeadPilot Design System

LeadPilot is a sales/lead-management SaaS product. No product codebase or Figma file was provided for this design system — it is built entirely from the brand's own specification documents and logo exports, uploaded by the user:

- `uploads/LeadPilot - UI-System.md` — component and layout rulebook
- `uploads/LeadPilot - Color-System.md` — color roles and usage ratios
- `uploads/LeadPilot - Mini-Design.md` — compact visual direction and one-screen example
- `uploads/LeadPilot - Logo(final).png` / `Logo(final2).jpg` / `Logo(final3).png` — the chosen logo lockup
- `uploads/Logovariation1–4.png`, `LeadPilot - Variations(1/2).png` — earlier rocket/orbit logo explorations and brand mockup boards (kept for reference, not used — see Iconography/Brand below)

No GitHub repo or Figma file is connected to this project. If one becomes available, re-run this skill against it to replace the hand-authored UI kits with real screen recreations.

## Content fundamentals

The source docs are short and directive rather than full copywriting samples, so the voice below is inferred from their tone and the one worked example they give ("Lead Pilot drives leads forward" / "A compact system for modern sales workflows" / "Get started" / "New feature").

- **Direct and unembellished.** Short declarative sentences. No hedging, no rhetorical questions.
- **Second-person-light.** Product copy describes what the tool does rather than addressing "you" directly — e.g. "Lead Pilot drives leads forward," not "You'll drive leads forward."
- **Sentence case**, not title case, for headings and buttons ("Get started," not "Get Started"). All caps is reserved for short UI labels/badges only (eyebrows, chips), per the UI-System rule.
- **No emoji.** The docs never use them and the visual system is deliberately unadorned ("very little decoration").
- **Calm confidence over hype.** The explicit design rule — "if you need to choose between adding more elements or making the screen cleaner, make it cleaner" — applies to copy too: one claim per line, no stacked adjectives.

## Visual foundations

- **Dark by default.** The canvas is a dark forest green (`#0B211F`), not a neutral charcoal — LeadPilot has no light-theme surface in its source docs.
- **Color roles, strictly separated.** Cyan (`#00D9C6`) is the only primary action color — links, active states, main CTAs. Orange (`#FF7A3D`) is an accent reserved for one high-priority moment per screen (a single CTA, a "new" badge) — the docs explicitly warn against using cyan and orange as equal-priority actions on the same screen. Usage ratio: dark ~80–85%, cyan ~10–15%, orange ~3–5%.
- **Typography.** Space Grotesk (display/headings) + Inter (body) — see "Font substitution" below. Headlines run tight (`tracking-tight`, `leading-tight`); body text stays open (`leading-open`, 1.65). All-caps only for labels/chips/eyebrows.
- **Spacing.** Strict 8px grid (4/8/12/16/24/32/48/64px). Generous whitespace; one primary action per section.
- **Corner radius.** Small elements (inputs) get 8–12px; cards get 20px; buttons and badges are full pills (999px).
- **Shadow / glow, not drop shadow.** The dark background does most of the depth work — there's no ambient drop-shadow system. The one shadow motif is a soft colored *glow* (cyan or orange, low-opacity blur) reserved for a featured card or a modal, never applied broadly.
- **Borders.** Thin (1–1.5px), low-contrast green-gray (`#2A4A43`), kept subtle — structure, not decoration.
- **Backgrounds.** Flat color only. No gradients, no photography, no textures or patterns in the source docs — the brand is explicitly "minimal, sharp" with "very little decoration."
- **Motion.** Not specified in the source docs. This system uses short, standard-eased transitions (120–200ms) for hover/focus only — nothing bouncy, nothing decorative, consistent with "no large movement" on hover.
- **Hover / active / disabled.** Hover: background/border shifts to the lighter tint (`primary-hover`, `accent-hover`) — "slightly brighter... no large movement." Active: strong cyan fill or border. Disabled: reduced opacity, glow removed.
- **Imagery.** None provided or implied — the brand's own mockups (see `assets/brand/`) are dark product-on-device renders with no photography or illustration style defined. Do not invent a photography direction; ask the user before adding real imagery.

## Iconography

No icon system, icon font, or icon SVG set was included in the source files. Icons in this system are a **substitute set** (`components/utility/Icon.jsx`) — ~25 simple outline glyphs (chevrons, check, close, search, bell, settings, etc.), Heroicons-style: 24×24 viewbox, 1.75px stroke, `currentColor`. Flagging this substitution — if the real product has its own icon set, swap `Icon.jsx`'s path data and everything downstream (Button, NavItem, Alert, Badge, ui_kits) inherits it automatically. Emoji are not used anywhere in the brand docs or mockups.

## Fonts — substitution flag

The source files specify only a generic "simple, modern sans-serif" — no font files or family names were provided. This system uses **Space Grotesk** (display/headings) and **Inter** (body), loaded from Google Fonts, plus **JetBrains Mono** for metrics/IDs in data-dense views. If LeadPilot has committed brand fonts, please share the font files (or family names) and this will be updated.

## Logo

The chosen lockup (`assets/logo/leadpilot-logo-full.png`) pairs an orange "Lead" / cyan "Pilot" wordmark with a teal network-node mark, where the network's first node doubles as the wordmark's "o." Because that node is fused into the letterform, a clean icon-only crop isn't possible without redrawing — `assets/logo/leadpilot-mark.png` is a practical crop of the standalone node cluster for favicon/app-icon use, but treat the full lockup as the primary asset. `leadpilot-logo-dark-bg.jpg` is a baked dark-tile export for social/profile use; `leadpilot-logo-square.png` is a square-canvas transparent version. Four earlier "rocket + orbit + tagline" concepts (`assets/logo/explorations/`) were superseded by the network mark and are kept only for historical reference — do not use them in new work.

## Components

Built from the UI-System doc's two component lists (§6 "Core components" + §9 "Recommended set for v1") — this is the full inventory the source defines, nothing added beyond one utility:

- **Forms** — `Button` (primary/secondary/accent, pill), `Input`
- **Content** — `Link`, `Divider`
- **Surfaces** — `Card` (optional featured glow), `Modal`
- **Feedback** — `Badge`, `Alert` (info/success/warning/error)
- **Navigation** — `Tabs`, `NavItem`, `SectionHeader`
- **Data** — `Table`
- **Utility** — `Icon` — *intentional addition*: every other component needs a glyph set to render icons/chevrons/status marks, and none existed in the source.

## UI kits

- **`ui_kits/marketing/`** — Landing page: header, hero, three-card feature grid, CTA band, footer.
- **`ui_kits/dashboard/`** — App shell: sidebar nav + Overview / Leads / Sequences / Settings views, with a working "add lead" modal and lead-status tabs.

Both are hand-built from the brand docs' described use cases (landing hero, simple dashboard) — no real product screens existed to recreate from.

## Index

```
styles.css              — root stylesheet (imports all tokens)
tokens/                 — colors, fonts, typography, spacing, radius, shadows
assets/logo/            — primary lockup, mark crop, dark-tile export, explorations
assets/brand/           — brand mockup boards (reference only)
components/forms/       — Button, Input
components/content/     — Link, Divider
components/surfaces/    — Card, Modal
components/feedback/    — Badge, Alert
components/navigation/  — Tabs, NavItem, SectionHeader
components/data/        — Table
components/utility/     — Icon
guidelines/             — foundation specimen cards (colors, type, spacing, radius/shadow, brand)
ui_kits/marketing/      — landing page recreation
ui_kits/dashboard/      — dashboard app recreation
thumbnail.html          — project tile
SKILL.md                — Claude Code-compatible skill wrapper
```

## Caveats & ask

- **No codebase or Figma was connected** — everything here is inferred from three markdown spec docs and logo files. If LeadPilot has a real product or marketing site, connect it and this system should be rebuilt against the real screens rather than the hand-built UI kits above.
- **Fonts are a substitution** (Space Grotesk + Inter) — flagged above. Send real brand font files if they exist.
- **Icons are a substitution set** — flagged above. Send a real icon library/export if the product uses one.
- **Error/success colors (`#FF5A5F` red, `#3DDC97` mint) are my own additions**, tuned in the cyan/orange hue family since the source docs mention only "a separate red tone" for errors without specifying it.

Please review the two UI kits and the component set against how you'd actually want LeadPilot to look — I'd rather iterate now than have this drift from the real product later.
