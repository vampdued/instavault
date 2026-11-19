# UI/UX Skill Orchestration
# mass-downloader-for-instagram

This document is the **single source of truth** for which skill to activate for each UI task.
Do NOT run all 7 skills automatically — use the minimum relevant set, then run a final review.

---

## Project Style Overrides (Always Enforced)

These overrides apply project-wide regardless of which skill is active.
They supersede any conflicting recommendation from any skill, including `ui-ux-pro-max`.

| Rule | Status |
|---|---|
| AI-purple / neon-blue gradient aesthetics | ❌ BANNED |
| Glassmorphism as **decoration** | ❌ BANNED (functional blur for modals/tooltips is ✅ OK) |
| Neumorphism / claymorphism / clay UI | ❌ BANNED |
| Excessive rounded-card dashboard layouts | ❌ BANNED |
| Repetitive 3-equal-column card feature rows | ❌ BANNED |
| Arbitrary purple/blue "AI aesthetic" | ❌ BANNED |
| Decorative elements without purpose | ❌ BANNED |
| Excessive shadows with no hierarchy function | ❌ BANNED |
| Redesigning working functionality without reason | ❌ BANNED |

---

## Task → Skill Map

### 1. Normal UI work (component, small page section, bug fix)
**Minimum useful set:**
1. **`frontend-design`** — implementation authority and quality rubric
2. Final review: **`web-design-guidelines`** + **`anti-ui-slop`**

### 2. UX / design direction (new pattern, color, typography, layout decision)
**Use in sequence:**
1. **`ui-ux-pro-max`** — style reference library (filtered by Project Style Overrides)
2. **`design-taste-frontend`** — aesthetic fit and direction ("Design Read")
3. **`frontend-design`** — implementation

### 3. New interface from scratch
**Full new-interface pipeline:**
1. **`ui-ux-pro-max`** — catalog possible directions
2. **`design-taste-frontend`** — infer design read, set VARIANCE/MOTION/DENSITY dials
3. **`frontend-design`** — build (Design Mode Router → Universal Quality Rules)
4. Final review: **`web-design-guidelines`** + **`anti-ui-slop`**

### 4. Premium visual polish / generate or update DESIGN.md
**Single skill:**
- **`high-end-visual-design`** — generates or updates `DESIGN.md` with atmosphere, color, type, component, and motion specs

### 5. Existing project redesign
**Full redesign pipeline:**
1. **`redesign-existing-projects`** — audit (Scan → Diagnose → Fix). Do NOT rewrite from scratch.
2. **`design-taste-frontend`** — set aesthetic direction post-audit
3. **`frontend-design`** — implement targeted upgrades
4. Final review: **`web-design-guidelines`** + **`anti-ui-slop`**

### 6. Accessibility / standards review only
- **`web-design-guidelines`** — fetches live Vercel UI guidelines, checks files against them
- Note: accessibility is a **hard gate** per `frontend-design` — it cannot be overridden by visual quality scores

### 7. Anti-generic UI check (pre-ship review)
- **`anti-ui-slop`** — checks implementation against UIZZE's 800k+ real screen database

---

## Conflict Precedence

When two skills give contradictory guidance, follow this table:

| Topic | Authority Skill | Rationale |
|---|---|---|
| Accessibility (hard gate) | `frontend-design` | Hard gate: overrides all aesthetic weights |
| Style reference library | `ui-ux-pro-max` (filtered by Overrides above) | Most comprehensive catalog |
| Anti-generic enforcement | `anti-ui-slop` > `design-taste-frontend` | `anti-ui-slop` has empirical screen data |
| Design direction / aesthetic read | `design-taste-frontend` | Reads context before generating |
| DESIGN.md generation | `high-end-visual-design` | Purpose-built for this |
| Redesign audit | `redesign-existing-projects` | Audit-first model |
| Standards / a11y review | `web-design-guidelines` | Live Vercel rules |
| Implementation authority | `frontend-design` | Hard gates + decision rubric |

### Specific conflict resolutions

**Glassmorphism:**
- `ui-ux-pro-max` lists it as a valid style.
- `design-taste-frontend`, `high-end-visual-design`, `anti-ui-slop`, and Project Overrides ban it as decoration.
- **Resolution: Project Override wins. Only functional blur is permitted.**

**Duplicate WCAG / keyboard-nav rules (frontend-design + ui-ux-pro-max):**
- Both mandate WCAG 4.5:1 contrast and full keyboard navigation.
- **Resolution: `frontend-design` is authoritative (hard-gate model). `ui-ux-pro-max` is reference-only for these topics.**

**`Inter` font (ui-ux-pro-max uses it implicitly; taste skills ban it for premium contexts):**
- This project uses `Outfit` — no active conflict.
- **Resolution: `Outfit` remains the project font. `Inter` remains banned per taste skills.**

---

## Skill Locations

| Skill | Path | Source |
|---|---|---|
| `frontend-design` | `.agent/skills/frontend-design/SKILL.md` | [PracticalSwan/agent-skills](https://github.com/PracticalSwan/agent-skills/blob/main/frontend-design/SKILL.md) |
| `web-design-guidelines` | `.agent/skills/web-design-guidelines/SKILL.md` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) |
| `design-taste-frontend` | `.agent/skills/design-taste-frontend/SKILL.md` | [Leonxlnx/taste-skill → skills/taste-skill/](https://github.com/Leonxlnx/taste-skill) |
| `anti-ui-slop` | `.agent/skills/anti-ui-slop/SKILL.md` | [github/awesome-copilot → skills/anti-ui-slop/](https://github.com/github/awesome-copilot/blob/main/skills/anti-ui-slop/SKILL.md) |
| `ui-ux-pro-max` | `.agent/skills/ui-ux-pro-max/SKILL.md` | [ninehills/skills](https://github.com/ninehills/skills/blob/main/ui-ux-pro-max/SKILL.md) |
| `high-end-visual-design` | `.agent/skills/high-end-visual-design/SKILL.md` | [Leonxlnx/taste-skill → skills/stitch-skill/](https://github.com/Leonxlnx/taste-skill) (mapped) |
| `redesign-existing-projects` | `.agent/skills/redesign-existing-projects/SKILL.md` | [Leonxlnx/taste-skill → skills/redesign-skill/](https://github.com/Leonxlnx/taste-skill) |

---

## How to Invoke Each Skill

Say the skill name and task in natural language. Examples:

```
# Normal UI work
"Use frontend-design to build the download progress bar component."

# UX direction
"Use ui-ux-pro-max then design-taste-frontend to decide on a color system for the dark mode."

# New interface from scratch
"Build the server UI dashboard from scratch using ui-ux-pro-max → design-taste-frontend → frontend-design."

# Premium polish / DESIGN.md
"Use high-end-visual-design to update DESIGN.md for the current project state."

# Redesign
"Use redesign-existing-projects to audit and improve the popup UI."

# Accessibility review
"Use web-design-guidelines to review extension/popup.html."

# Pre-ship check
"Run anti-ui-slop on the popup and server UI before shipping."
```
