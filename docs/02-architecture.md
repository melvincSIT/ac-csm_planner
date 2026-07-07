# 02 — Architecture

## Repository layout

```
AC-CSM_Tool/
├── index.html              # UI, styles, app bootstrap, render/export
├── planner.js              # CSMPlanner — all business logic
├── data.json               # Authoritative programme registry (edit this)
├── data-embed.js           # Mirror of data.json for offline/file:// fallback
├── start-planner.sh        # Local dev server (macOS/Linux)
├── start-planner.bat       # Local dev server (Windows)
├── verify.py               # AC data checks vs Excel v2
├── docs/                   # This documentation set
├── assets/banners/         # Programme banner images (referenced by data.json)
└── .github/workflows/
    └── deploy-pages.yml    # GitHub Pages deploy on push to main
```

**Not in git (local only):** `Candidature Plan_30 Jun 26 v*.xlsx`, `~$*.xlsx`, `assets/banners/_full/`, `.venv/`

---

## Module boundaries

```
┌─────────────────────────────────────────────────────────┐
│  index.html (presentation + interaction)                │
│  - DOM build/update                                     │
│  - Event handlers → mutate plan → render()              │
│  - Export HTML clone                                    │
└───────────────────────┬─────────────────────────────────┘
                        │ calls CSMPlanner.*
┌───────────────────────▼─────────────────────────────────┐
│  planner.js (domain logic)                              │
│  - Plan state shape, validation, credit math            │
│  - Calendar / study trimester mapping                   │
│  - No DOM access                                        │
└───────────────────────┬─────────────────────────────────┘
                        │ reads
┌───────────────────────▼─────────────────────────────────┐
│  data.json / data-embed.js (configuration)              │
│  - Programmes, courses, intakes, rules, feature flags   │
└─────────────────────────────────────────────────────────┘
```

**Rule for changes:** Put schedulable rules in `planner.js`; put programme-specific constants in `data.json`. Keep `index.html` as thin orchestration + DOM as possible (historically some logic leaked into UI builders — prefer `CSMPlanner` for new rules).

---

## Script load order

```html
<script src="data-embed.js?v=5"></script>   <!-- sets global.__CSM_PROGRAMME_DATA__ -->
<script src="planner.js?v=5"></script>      <!-- defines global.CSMPlanner -->
<!-- inline app script in index.html -->
```

Early `<head>` inline script reads `localStorage` for theme/fullscreen before paint to avoid flash.

---

## Data loading (`CSMPlanner.loadData`)

1. If registry not loaded: `fetch('data.json')` → on success parse JSON.
2. On fetch failure (e.g. `file://`): use `global.__CSM_PROGRAMME_DATA__`.
3. `normalizeRegistry(raw)` — accepts either multi-programme `{ programs: {...} }` or legacy single-programme object.
4. `applyProgram(programId)` — sets module-level `DATA` to the active programme object.

`init()` in `index.html` calls `loadData(LOCKED_PROGRAM_ID)` where `LOCKED_PROGRAM_ID = 'applied-computing'`.

---

## Runtime state (`index.html`)

| Variable | Role |
|----------|------|
| `data` | Active programme object from `CSMPlanner.getData()` |
| `plan` | User's candidature plan (see [04-planner-logic.md](./04-planner-logic.md#plan-object)) |
| `intakeKey` | `'sep'` \| `'jan'` \| `'may'` |
| `startYear` | Cohort start year (default from `data.defaultCohortYear`, min `minCohortYear`) |
| `programId` | Always `'applied-computing'` while locked |
| `catalogView` | `'available'` \| `'selected'` |
| `creditsWereComplete` | Animation flag when crossing 180 credits |

**Persistence:** Plan is **not** saved to `localStorage`. Changing intake **month** resets `plan` to `emptyPlan()`. Changing cohort **year** does not reset the plan.

---

## Render pipeline

```
render()
  ├── ensurePlanShape()           // pad mc/leave/reattempt/remodule/rpl arrays
  ├── sanitizePlanSchedule()      // clear invalid riweAt after deferral shifts
  ├── applyAutoExtension()        // bump programmeDuration select if needed
  ├── analyze(plan, intakeKey)    // validation + credit breakdown
  ├── update credit summary DOM
  ├── renderTimeline()
  ├── renderCatalog()
  ├── renderIssues()
  └── updateCohortBtn() + scroll hints
```

Every user action that changes `plan` ends in `render()`.

---

## `CSMPlanner` export surface

`planner.js` exposes ~80+ methods on `global.CSMPlanner`. Grouped list in [04-planner-logic.md](./04-planner-logic.md#public-api-reference). Constants: `CSMPlanner.EMPTY` (`''`) for empty MC slots.

Internal module state (not exported):

- `REGISTRY` — full multi-programme JSON
- `DATA` — active programme
- `ACTIVE_PROGRAM_ID`

---

## Academic year / trimester display

Calendar metadata is computed from `(intakeKey, startYear, trimester)`:

- `trimesterMeta()` — AY label, period months, break labels, extension flag
- `buildAyGroups()` — colspan groups for timeline header (handles partial AYs at extension boundary)
- `monthForTrimester(intakeKey, t)` — which offering month applies to calendar column `t`

These are **display/calendar** helpers. **Scheduling constraints** for RIWE/Capstone use **study trimester** indices (see deferral section in planner logic doc).
