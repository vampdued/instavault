# DESIGN.md — InstaVault Design System

> **How to use this file:**
> - Keep this as the single source of truth for all UI decisions in this project.
> - To regenerate or update this file with richer specs, say:
>   *"Use high-end-visual-design to update DESIGN.md for this project."*
> - Tokens marked `[CURRENT]` are derived from the existing CSS. Tokens marked `[TEMPLATE]` are placeholders to fill in.
> - See `.agent/skills/ORCHESTRATION.md` for the full skill workflow.

---

## Visual Atmosphere

| Dimension | Value | Description |
|---|---|---|
| Density | **4** | Daily App Balanced — comfortable information density, not sparse or packed |
| Variance | **8** | Offset Asymmetric — deliberate asymmetry, non-templated layouts |
| Motion | **6** | Fluid CSS — spring-physics transitions, purposeful micro-interactions |

---

## Colors

### Current tokens (Personal Archival Vault)

| Token name | Hex / Value | Role |
|---|---|---|
| Accent Primary | `#635BFF` | Interactive elements, active nav items, tab pills, primary action buttons — **[CURRENT]** |
| Accent Secondary | `#8B5CF6` | Gradient endpoint, highlights, and secondary accents — **[CURRENT]** |
| Dark Card Surface | `#13162C` | Dark mode card/panel background — **[CURRENT]** |
| Tooltip BG Dark | `rgba(15, 23, 42, 0.95)` | Dark tooltip background — **[CURRENT]** |
| Text Primary (dark bg) | `#f8fafc` | Light text on dark — **[CURRENT]** |
| Text Primary (light bg) | `#0f172a` | Dark text on light — **[CURRENT]** |
| Vault Ring Gradient | `#635BFF → #8B5CF6` | Signature archival vault avatar ring gradient — **[CURRENT]** |

### Constraints (always enforced)

- **Max 1 primary accent color** — `#635BFF` (Vault Indigo) is the primary accent.
- **Saturation below 85%** — keep accent tones calibrated.
- ❌ Never use pure `#000000` — use off-black (`#0a0a0a`, `#090A14`) or tinted dark (`#13162C`).
- ❌ Do not mix warm and cool grays — stick to one gray family with consistent hue tinting.
- ❌ No AI-purple neon gradients, no glowing buttons (subtle focus rings with `rgba(99, 91, 255, 0.25)` are acceptable; neon glows are not).

> ✅ **Brand alignment:** `#635BFF` is InstaVault's personal archival vault signature tone. It anchors InstaVault as a sovereign, private archive repository rather than an Instagram clone. Focus rings and tab pills use restrained opacity scales.

### Shadow rules

- Tint shadows to match background hue — not raw `rgba(0,0,0,X)` on colored surfaces.
- Dark mode: heavier shadows (`0 20px 40px -5px rgba(0,0,0,0.5)`) — **[CURRENT]** ✅
- Light mode: lighter shadows (`0 15px 35px -5px rgba(17,20,57,0.12)`) — **[CURRENT]** ✅

---

## Typography

### Current tokens (derived from `extension/popup.css`)

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| UI Body / Primary | `Outfit` | 16px min | 400 | **[CURRENT]** ✅ Non-generic, approved |
| Tooltip labels | `Outfit` | 0.7rem | 600 | **[CURRENT]** |
| Monospace / numbers | `[not set]` | — | — | **[TEMPLATE]** — add for data columns |

### Rules

- **Min body size:** 16px (mobile — prevents iOS auto-zoom)
- **Line-height:** 1.5–1.75 for body text
- **Max line length:** ~65 characters per line
- **Heading tracking:** Tight (`-0.02em` to `-0.04em`) for display text
- **Label tracking:** Slightly positive for small-caps/ALL-CAPS labels
- ❌ `Inter` is banned for premium/creative contexts — project uses `Outfit` ✅
- ❌ Generic serifs banned (Times New Roman, Georgia, Garamond)
- ✅ If a serif is needed: use only `Fraunces`, `Editorial New`, or `Instrument Serif`
- ❌ `text-wrap: balance` or `text-wrap: pretty` should be added to prevent orphaned words

### Recommended font additions (if needed)

| Use case | Font |
|---|---|
| Monospace / data | `Geist Mono` or `JetBrains Mono` |
| Serif accent (editorial) | `Fraunces` or `Instrument Serif` |

---

## Spacing

- **Base unit:** 4px
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
- **Touch targets:** minimum 44×44px (Apple HIG) / 48×48dp (Material)
- **Touch spacing:** minimum 8px between adjacent targets
- Use `margin-bottom` slightly larger than `margin-top` for optical vertical rhythm

---

## Layout

- **Max-width container:** 1200–1440px with auto margins
- **Breakpoints:** 375 / 768 / 1024 / 1440
- **Viewport height:** `min-height: 100dvh` — not `100vh` (iOS Safari bug) — **[CURRENT]** ✅
- **Grid:** CSS Grid for multi-column; Flexbox for single-axis alignment
- ❌ No horizontal scroll on mobile
- ❌ No 3-equal-column card feature rows — use zig-zag, asymmetric grid, or masonry
- ❌ Dashboard: avoid mandatory left-sidebar — try top nav or collapsible panel

---

## Components

### Buttons
- **Hover:** background shift + subtle scale (`scale(1.01)`) or `translateY(-1px)`
- **Active/pressed:** `scale(0.98)` or `translateY(1px)` — simulates physical click
- **Focus:** visible ring, `box-shadow: 0 0 0 3px rgba(99,91,255,0.25)` — **[CURRENT]** ✅
- ❌ No neon outer glows
- ❌ No custom mouse cursors
- Max 1 primary CTA per screen; secondary actions visually subordinate

### Cards
- Use **ONLY** when elevation communicates hierarchy or containment
- Tint box-shadows to background hue
- Border-radius: vary — tighter on inner elements, softer on containers
- Allow variable heights; don't force uniform heights via flexbox
- ❌ Not for layout-only grouping without semantic reason

### Inputs / Forms
- Label above input (never placeholder-only)
- Helper text: optional, below label
- Error text: below the specific field (not only at the top)
- Standard gap spacing between label and input

### Tooltips (current: functional glassmorphic)
- Current: `backdrop-filter: blur(8px)` with border + shadow — **[CURRENT]** ✅
- Status: **Acceptable** — functional blur indicating dismissable layer, not decorative
- Transitions: `opacity + transform` at `0.15s cubic-bezier(0.4,0,0.2,1)` — **[CURRENT]** ✅

### Gallery Cards
- Border-radius: `1rem` — **[CURRENT]** ✅
- Hover: `scale(1.03)` on image, overlay bloom fade-in — **[CURRENT]** ✅
- Hardware acceleration: `transform: translateZ(0)`, `backface-visibility: hidden` — **[CURRENT]** ✅

### Lightbox / Modals
- Open animation: `scale(0.95) → scale(1)` + opacity, spring curve — **[CURRENT]** ✅
- Spring curve: `cubic-bezier(0.34, 1.56, 0.64, 1)` — **[CURRENT]** ✅
- Backdrop: fade `opacity + visibility` — **[CURRENT]** ✅

### Loading States
- Skeleton screens matching layout dimensions (no generic circular spinners for >1s loads)
- Button: disable + show spinner during async operations

### Empty States
- Composed illustration indicating how to populate data — not blank space

---

## Interaction States

| State | Rule |
|---|---|
| Hover | Background shift or subtle translate — always visible |
| Active/pressed | `scale(0.98)` or `translateY(1px)` |
| Focus | 2–4px ring, non-zero opacity, never removed |
| Disabled | Reduced opacity, `cursor: not-allowed`, no interaction |
| Loading | Button disabled + spinner; skeleton for content areas |
| Error | Inline, near the source, with icon + text (not color-only) |
| Empty | Composed illustration, not blank |

---

## Motion

- **Micro-interactions:** 150–300ms
- **Modal/overlay open:** 300–400ms, spring curve
- **Exit faster than enter:** exit ≈ 60–70% of enter duration
- **Spring curve (modals, cards):** `cubic-bezier(0.34, 1.56, 0.64, 1)` — **[CURRENT]** ✅
- **Standard curve:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) — **[CURRENT]** ✅
- **Property rule:** Animate `transform` and `opacity` only — never `width`, `height`, `top`, `left`
- ❌ No decorative-only animation
- ❌ No blocking animation (UI must stay interactive)
- ✅ `prefers-reduced-motion` must be respected — add `@media (prefers-reduced-motion: reduce)` guards

---

## Responsive Rules

- **Mobile-first:** Design smallest viewport first, scale up
- **No horizontal scroll** on any viewport
- **Readable font size:** min 16px body on mobile
- **Line length:** 35–60 chars on mobile, 60–75 on desktop
- **Orientation:** Layout must remain readable in landscape

---

## Accessibility Rules

| Rule | Standard |
|---|---|
| Color contrast (normal text) | ≥ 4.5:1 (WCAG AA) |
| Color contrast (large text / UI components) | ≥ 3:1 |
| Focus rings | Visible, 2–4px, never `outline: none` without replacement |
| Keyboard navigation | Full tab support, logical order, no keyboard traps |
| Icon-only buttons | Must have `aria-label` |
| Images | `alt` text on all meaningful images |
| Forms | `<label>` with `for` on every input |
| Skip link | "Skip to main content" for keyboard users |
| Heading hierarchy | `h1→h6` sequential, no level skip |
| Color-only meaning | ❌ Always add icon or text alongside color |
| Screen readers | Logical reading order, `aria-live` for dynamic content |

---

## Anti-Patterns (Explicitly Banned)

These patterns are banned project-wide and override any skill recommendation:

- ❌ Unnecessary gradients (decorative linear fades with no purpose)
- ❌ Glassmorphism as decoration (functional backdrop-blur for modals/tooltips is ✅ OK)
- ❌ Neumorphism / claymorphism
- ❌ Arbitrary purple/blue AI gradient aesthetics
- ❌ Neon glows on buttons or text
- ❌ Excessive shadows without hierarchy purpose
- ❌ Repetitive 3-equal-card dashboard layouts
- ❌ Decorative elements without information, affordance, or hierarchy purpose
- ❌ Custom mouse cursors
- ❌ Redesigning working functionality without a specific reason
- ❌ All-caps subheaders used indiscriminately (try lowercase italic or small-caps)
- ❌ Everything centered and perfectly symmetrical (break with intentional asymmetry)
- ❌ Pure `#000000` black backgrounds
- ❌ Mixing warm and cool grays in the same palette
