---
name: ui-workflow
description: >
  Unified UI/UX workflow orchestrator for this project. Read this skill FIRST on any
  task that involves building, designing, styling, laying out, reviewing, redesigning,
  or auditing a user interface — including the extension popup UI, server web UI, components,
  forms, modals, dashboards, accessibility, typography, color, spacing, animation, or
  any other frontend concern. Routes to the correct specialist skill(s) and enforces
  project-level design standards. Trigger words: build UI, design, component, style,
  layout, redesign, popup, extension UI, server UI, accessibility, frontend, color,
  typography, spacing, button, card, modal, form, icon, animation, responsive.
---

# UI/UX Workflow — Unified Entry Point

You are working on **InstaVault** (mass-downloader-for-instagram): a Chrome extension with a
popup UI (`extension/popup.html`, `extension/popup.css`) and a companion Go server with its
own web UI (`server/ui/index.html`, `server/ui/style.css`).

**Read this skill first on every UI task. Do not skip it.**

---

## Execution Policy (Always)

> Use the **minimum relevant skills** for the task type.
> Do **NOT** run all 7 skills automatically.
> Run the final review pair (`web-design-guidelines` + `anti-ui-slop`) **only after implementation is complete** — never mid-build.
> Read `DESIGN.md` at the project root before generating any colors, fonts, spacing, or components.

---

## Step 0 — Classify the Task

Before touching any code, identify which task type applies. Pick exactly one:

| # | Task type | Signal words |
|---|---|---|
| **A** | Normal UI work | "build", "add", "fix", "update", component/section/bug |
| **B** | UX / design direction | "choose a style", "color system", "typography", "layout pattern", "which design" |
| **C** | New interface from scratch | "new page", "new screen", "create from scratch", "new dashboard" |
| **D** | Premium polish / DESIGN.md update | "polish", "improve quality", "update DESIGN.md", "design tokens" |
| **E** | Existing project redesign | "redesign", "overhaul", "audit the current UI", "upgrade the popup" |
| **F** | Accessibility / standards review | "check a11y", "audit for accessibility", "check against guidelines" |
| **G** | Anti-generic pre-ship review | "pre-ship check", "anti-slop review", "review before shipping", "is this generic?" |

---

## Step 1 — Read DESIGN.md

Before generating anything visual, read `DESIGN.md` (project root) and extract:
- Current accent color (`#635BFF`)
- Current font (`Outfit`)
- Current motion curves
- Component rules (buttons, cards, tooltips, modals)
- The banned anti-patterns list

This is the project's single source of truth. Do not invent new tokens that conflict with it.

---

## Step 2 — Invoke the Correct Skills (by Task Type)

### Task A — Normal UI work
**Skills to use (in order):**
1. **`frontend-design`** — implementation authority; use its Design Mode Router and Universal Quality Rules
2. *(after implementation is complete)* **`web-design-guidelines`** + **`anti-ui-slop`** — final review

### Task B — UX / design direction
**Skills to use (in order):**
1. **`ui-ux-pro-max`** — consult its style catalog and UX guidelines as a reference library
   - ⚠️ Subject to Project Style Overrides below — its glassmorphism/neumorphism options are suppressed
2. **`design-taste-frontend`** — output a one-line "Design Read" before proceeding; set VARIANCE / MOTION / DENSITY dials
3. **`frontend-design`** — implement the chosen direction
4. *(after implementation)* **`web-design-guidelines`** + **`anti-ui-slop`**

### Task C — New interface from scratch
**Skills to use (in order):**
1. **`ui-ux-pro-max`** — catalog possible directions (filtered by overrides)
2. **`design-taste-frontend`** — infer design read, reject LLM defaults, set dials
3. **`frontend-design`** — build (choose Design Mode, apply Universal Quality Rules, verify rendered result)
4. *(after implementation)* **`web-design-guidelines`** + **`anti-ui-slop`**

### Task D — Premium polish / DESIGN.md update
**Skills to use:**
- **`high-end-visual-design`** — generates or updates `DESIGN.md` with atmosphere, color, typography, component, and motion specs

### Task E — Existing project redesign
**Skills to use (in order):**
1. **`redesign-existing-projects`** — Scan → Diagnose → Fix. Do NOT rewrite from scratch. List every generic pattern found.
2. **`design-taste-frontend`** — set aesthetic direction post-audit using Design Read
3. **`frontend-design`** — implement targeted upgrades only (not a full rewrite)
4. *(after implementation)* **`web-design-guidelines`** + **`anti-ui-slop`**

### Task F — Accessibility / standards review
**Skills to use:**
- **`web-design-guidelines`** — fetches live Vercel UI guidelines; checks specified files against all rules
- Note: accessibility is a **hard gate** (per `frontend-design`) — it cannot be traded off against visual quality

### Task G — Anti-generic pre-ship review
**Skills to use:**
- **`anti-ui-slop`** — checks implementation against UIZZE's 800k+ real screen database; outputs pass/fail on the finish gate

---

## Step 3 — Project Style Overrides (Always Enforced)

These rules override any conflicting recommendation from any of the 7 skills:

| Pattern | Status |
|---|---|
| AI-purple / neon-blue gradient aesthetics | ❌ BANNED |
| Glassmorphism as **decoration** | ❌ BANNED |
| Glassmorphism as **function** (modal backdrop, tooltip blur) | ✅ ALLOWED |
| Neumorphism / claymorphism / clay UI | ❌ BANNED |
| 3-equal-column card feature rows | ❌ BANNED |
| Arbitrary purple/blue "AI aesthetic" | ❌ BANNED |
| Neon glows on buttons or text | ❌ BANNED |
| Excessive shadows without hierarchy purpose | ❌ BANNED |
| Decorative elements without information/affordance/hierarchy purpose | ❌ BANNED |
| Custom mouse cursors | ❌ BANNED |
| Redesigning **working functionality** without a specific reason | ❌ BANNED |
| Pure `#000000` black background | ❌ BANNED — use off-black (`#13162C`, `#0a0a0a`) |
| Mixing warm and cool grays in the same palette | ❌ BANNED |
| `Inter` font in premium/creative contexts | ❌ BANNED — project uses `Outfit` |

---

## Step 4 — Final Review (Run After Implementation)

After implementation is complete (not before, not during), if the task was A, B, C, or E:

1. **`web-design-guidelines`** — check the implemented files against live Vercel UI standards
2. **`anti-ui-slop`** — run the finish gate against UIZZE screen database

Report findings and fix any failures before declaring the task done.

---

## Conflict Precedence

When two skills give contradictory guidance:

| Topic | Authority |
|---|---|
| Accessibility (hard gate) | `frontend-design` |
| Style reference / catalog | `ui-ux-pro-max` (filtered by Step 3 overrides) |
| Anti-generic enforcement | `anti-ui-slop` > `design-taste-frontend` |
| Design direction / "Design Read" | `design-taste-frontend` |
| DESIGN.md generation | `high-end-visual-design` |
| Redesign audit | `redesign-existing-projects` |
| Standards / a11y review | `web-design-guidelines` |
| Implementation authority | `frontend-design` |
| Project Style Overrides | This skill (overrides everything) |

---

## Quick-Reference Invocation Examples

```
# Task A — Normal UI work
"Build the download progress bar."
→ Read DESIGN.md → frontend-design → final review

# Task B — Design direction
"What color system should we use for the dark mode?"
→ ui-ux-pro-max (reference) → design-taste-frontend (Design Read) → frontend-design

# Task C — New interface
"Build the server web UI dashboard from scratch."
→ ui-ux-pro-max → design-taste-frontend → frontend-design → final review

# Task D — Premium polish
"Update DESIGN.md with better typography and motion specs."
→ high-end-visual-design

# Task E — Redesign
"Redesign the extension popup."
→ redesign-existing-projects → design-taste-frontend → frontend-design → final review

# Task F — Accessibility
"Check extension/popup.html for accessibility issues."
→ web-design-guidelines

# Task G — Pre-ship review
"Run a pre-ship anti-slop check on the popup."
→ anti-ui-slop
```

---

## Skill Locations

All skills are at `.agent/skills/<name>/SKILL.md`:

- [`frontend-design`](.agent/skills/frontend-design/SKILL.md) — PracticalSwan
- [`web-design-guidelines`](.agent/skills/web-design-guidelines/SKILL.md) — vercel-labs
- [`design-taste-frontend`](.agent/skills/design-taste-frontend/SKILL.md) — Leonxlnx/taste-skill
- [`anti-ui-slop`](.agent/skills/anti-ui-slop/SKILL.md) — github/awesome-copilot
- [`ui-ux-pro-max`](.agent/skills/ui-ux-pro-max/SKILL.md) — ninehills
- [`high-end-visual-design`](.agent/skills/high-end-visual-design/SKILL.md) — Leonxlnx/taste-skill (stitch-skill)
- [`redesign-existing-projects`](.agent/skills/redesign-existing-projects/SKILL.md) — Leonxlnx/taste-skill

Design system: [`DESIGN.md`](DESIGN.md) — project root
Detailed routing reference: [`.agent/skills/ORCHESTRATION.md`](.agent/skills/ORCHESTRATION.md)
