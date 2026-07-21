# 09 — Path Visualization & Clean UI

Design and implementation notes for the programme completion journey and progressive disclosure of advanced timeline rows.

**Rollback point before this work:** tag `pre-path-viz-clean-ui` (commit `57e5608`).

---

## Problem

The timeline showed every row at once (MC, WFE, RIWE, Capstone, Leave, Reattempt, Remodule, RPL, cumulative credits). Most students never use leave, RPL, or remodule, so the grid felt cluttered. Credit stats alone did not show **where you are on the path** to finishing the degree.

---

## Design goals

1. **Path visualization** — show milestone progression toward degree completion at a glance.
2. **Progressive disclosure** — hide rarely used rows until needed.
3. **Clean default** — primary planning rows only; advanced options on demand.
4. **No logic changes** — deferral, validation, and credit rules unchanged; UI-only reorganization.

---

## Path journey (milestone strip)

Horizontal stepper above the timeline, driven by `CSMPlanner.programmePathMilestones(plan, intakeKey)`.

| Programme | Typical steps |
|-----------|----------------|
| Applied Computing | Foundation → Stackable → Career Catalyst → RIWE → Capstone → Complete |
| Engineering (EEE/ISE) | Engineering → Programme & Elective → Workforce Essentials → Engineering Experience → Capstone → Complete |
| MHSc | Specialisation → Core & Elective → Research Capstone → Complete |

Each step has:

- `label` — from `catalogLabels` / component names
- `progress` — e.g. `2/2`, `5/8`, `144/180 cr`
- `status` — `done` | `active` | `pending` (first incomplete step is **active**)
- `trimester` — optional calendar trimester when scheduled

Visual: connected nodes with checkmark (done), highlight ring (active), muted (pending).

---

## Progressive disclosure

### Default visible timeline rows

- Micro-credential
- WFE / Career Catalyst (if feature)
- RIWE / Engineering Experience (if feature)
- Capstone (if feature)

### Advanced section (collapsed by default)

- Cumulative credits
- Leave of absence
- Reattempt (Applied Computing only)
- Remodule (Applied Computing only)
- RPL (Applied Computing only)

### When advanced rows appear

1. User clicks **Advanced options** — toggles section; preference stored in `localStorage` (`csm-planner-advanced-rows`).
2. **Auto-expand** when the plan uses any advanced row (leave, reattempt, remodule, or RPL credits). Cannot hide while in use; hint shows *Leave, re-attempt, or RPL in use*.

---

## Rollback

```sh
# Restore files from tag
git checkout pre-path-viz-clean-ui -- index.html planner.js docs/

# Or reset branch (coordinate with team)
git checkout backup/pre-path-viz-clean-ui
```

Push tag for remote backup: `git push origin pre-path-viz-clean-ui`

---

## Future ideas (not implemented)

- Collapsible validation panel (errors only when present)
- Suggested next action chip (“Schedule RIWE in Year 2”)
- Print layout: optional include/exclude advanced rows
