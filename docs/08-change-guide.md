# 08 — Change Guide

Practical recipes for common maintenance tasks.

---

## Change course offerings or credits

1. Edit `data.json` → programme → `courses` / `offeringsByMonth`
2. Regenerate `data-embed.js`
3. Update `verify.py` mappings if Excel names changed (`EXCEL_NAME_TO_ID`)
4. Run `verify.py` and manual timeline check
5. Bump `?v=` and deploy

---

## Change RIWE or capstone rules

| Change | Where |
|--------|-------|
| Study-year placement (which study indices) | `intakes.*.wfeRiweTrimesters`, `capstoneTrimesters` |
| Year numbers (2 / 3) | `constraints.wfeRiweYear`, `capstoneMinYear` |
| Prerequisite text/counts | `prerequisites.wfeRiwe`, `prerequisites.capstone` |
| Credits per RIWE trimester | `riweCreditsPerTrimester`, `riweCredits` |
| Deferral behaviour | `planner.js` study-index functions (usually no change if only data moves) |

After intake index changes, test with a leave trimester to confirm calendar mapping.

---

## Change RPL rules

| Change | Where |
|--------|-------|
| Max credits / steps | `rplMaxCreditsPerTrimester`, `rplCreditSteps` |
| Full MC threshold | Uses `mcCredits` (18) |
| Enable/disable row | `features.rpl` |
| Validation | `analyze()` RPL section in `planner.js` |
| UI | `buildRplCell`, `openRplMcPicker` in `index.html` |

**Future: module-level RPL** would need:

- Sub-module structure under each course in `data.json`
- Partial credit attribution per module
- UI beyond single trimester cell (likely MC detail panel)

Not implemented in v1.

---

## Add a new micro-credential (AC)

1. Add course object to `courses[]` with unique `id`
2. Add id to appropriate `offeringsByMonth` month array
3. Increment `mcCount` / `stackableCount` (or foundation) and verify `totalCredits` still 180
4. Update Excel verification mappings if using `verify.py`
5. Regenerate embed, deploy

---

## Re-enable multi-programme selector

Currently dormant. Steps:

1. In `index.html` `init()`:
   - Remove or parameterize `LOCKED_PROGRAM_ID`
   - Assign `programSelectEl = document.getElementById('programSelect')`
   - Populate options from `CSMPlanner.listPrograms()`
   - Wire `change` → existing `setProgram(programId)` (grep in file)
2. Unhide `#programSelect` or wire `#programSelectDisplay`
3. Ensure each programme in `data.json` has complete `intakes`, `features`, banners
4. Test engineering 240-cr credit math and feature flags (no RPL)
5. Update `planHelp` / `timelineLead` per programme or generic copy

`setProgram()` already calls `applyProgram`, resets plan, updates header — logic exists.

---

## Add a new degree programme

1. Add entry under `programs` in `data.json` (copy structure from EEE/ISE)
2. Set `order`, `features`, `courses`, `intakes`, `components`, `prerequisites`
3. Add banner under `assets/banners/`
4. Regenerate `data-embed.js`
5. Re-enable programme selector (above) or temporarily swap `LOCKED_PROGRAM_ID`

---

## Update cohort year range

Set on programme object:

```json
"minCohortYear": 2023,
"defaultCohortYear": 2023
```

UI reads via `CSMPlanner.getMinCohortYear()` / `getDefaultCohortYear()`.

---

## Update help text

Edit `planHelp` and `timelineLead` in `data.json` for AC — rendered in help dialog and `#timelineLead` via `updateProgramCopy()`.

---

## Fix stale live site

1. Confirm push to `main` succeeded
2. Confirm GitHub Actions deploy workflow green
3. Increment `?v=` on scripts
4. Hard refresh or private window
5. Check GitHub Pages source branch/settings if still stale

---

## Documentation maintenance

When behaviour changes:

1. Update relevant file in `docs/`
2. Update version note in `docs/README.md` (commit hash / date)
3. Keep [04-planner-logic.md](./04-planner-logic.md) in sync with `analyze()` and deferral helpers

---

## Abandoned / irrelevant ideas (do not revive without explicit request)

| Idea | Status |
|------|--------|
| Merging catalog + plan into one timeline card | Replaced by separate `.timeline-wrap--catalog` / `--plan` panels |
| Fixed calendar RIWE at T4–5 regardless of delays | Replaced by study-index deferral model |
| 8 MC stat card in credit summary | Removed as misleading |
| RIWE as 10 cr in one trimester | Replaced by 5 cr × 2 trimesters |
| Programme selector for all degrees | Data kept; UI locked to AC |
| `defaultPlan()` in UI | Unused; UI uses `suggestPlan()` |
| Plan persistence in localStorage | Never implemented |
| Civil / robotics / building-services programmes | Banner assets only; not in `data.json` |

---

## File edit cheat sheet

| Task | Primary files |
|------|----------------|
| Business rules | `planner.js` |
| Programme constants | `data.json` |
| Labels, layout, export | `index.html` |
| Offline data | `data-embed.js` |
| Excel cross-check | `verify.py` |
| Deploy | `.github/workflows/deploy-pages.yml` |
| Handover docs | `docs/*.md` |
