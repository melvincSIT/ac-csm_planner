# 05 — UI and Interactions (`index.html`)

Single-file app: CSS in `<style>`, markup in `<body>`, application script at bottom. No framework.

---

## Page regions

| Region | ID / class | Purpose |
|--------|------------|---------|
| Hero | `.hero`, `#programBanner` | Programme title, banner from `data.bannerImage` |
| Toolbar | `.toolbar` | Cohort, duration, clear, suggest, export, help, theme |
| Catalog | `.timeline-wrap--catalog` | Micro-credential reference grid by intake month |
| Credit tracker | `.timeline-credit` | Progress bar + stat cards |
| Timeline | `.timeline-wrap--plan`, `#timelineBody` | Interactive plan grid |
| Issues | `.issues` | Validation messages from `analyze()` |

Catalog and plan timeline are **separate bordered panels** (`.timeline-wrap--catalog` / `--plan`) with spacing via internal padding — not merged into one card.

---

## Init sequence (`init()`)

1. `initTheme()` / `initFullscreen()` from `localStorage`
2. `CSMPlanner.loadData('applied-computing')`
3. `intakeKey` = first available intake (default Sep)
4. `populateYearOptions()` → `defaultStartYear()` from planner
5. `plan = CSMPlanner.emptyPlan()`
6. Cohort wheel pickers, programme header, event listeners
7. `render()`

**Locked programme:** `const LOCKED_PROGRAM_ID = 'applied-computing'`. Hidden `<select id="programSelect">` is never wired; `programSelectEl` stays null.

---

## Cohort picker

- Button `#cohortBtn` opens `#cohortDialog` with month/year wheel pickers
- Mouse wheel on button: left 58% cycles month, right cycles year
- **`setIntakeMonth`:** resets `plan` to `emptyPlan()`, re-renders
- **`setStartYear`:** updates display only; **does not** reset plan

Year range: `getMinCohortYear()` … `currentYear + 4` (2023+ for AC).

---

## Candidature duration

`<select id="programmeDuration">` values `0…maxExtensionTrimesters`.

```
maxTrimestersVisible() = data.maxCoreTrimesters + extension
```

Extension columns use `.ext` styling in timeline headers.

---

## Timeline rows (render order)

| Row | Builder | Notes |
|-----|---------|-------|
| Cumulative credits | inline in `renderTimeline` | `showCumulativeAtTrimester` + `cumulativeCredits` |
| Micro-credential | `buildMcCell` | Offering tiles; reattempt/remodule/leave modes |
| Career Catalyst | `buildCareerCatalystCell` | if `hasFeature('wfeCc')` |
| RIWE | `buildRiweCell` | if `hasFeature('riwe')`; slots from `riweCellTrimesters` |
| Capstone | `buildCapstoneRow` | colspan across `capstoneTrimestersFor(plan,…)` |
| Leave | `buildLeaveCell` | `toggleLeave` |
| Reattempt | `buildReattemptCell` | `toggleReattempt` + sticker on MC tiles |
| Remodule | `buildRemoduleCell` | `toggleRemodule` + MC picker |
| RPL | `buildRplCell` | if `hasFeature('rpl')`; cycle credits + Pick MC |

Row labels support hint subtext via `timelineRowLabel(label, componentAvailability hint)`.

### Trimester mode exclusivity

`clearTrimesterModes(idx, keep)` — only one of leave / reattempt / remodule per trimester.

`clearTrimesterAssignments(trimester)` — clears MC, CC, RIWE in that column, RPL credits when marking leave.

### Reattempt visual

`addTileSticker(tile, label, 'reattempt')` on timeline and catalog when `isCourseOnReattemptTrimester(courseId)`.

---

## Micro-credential cell behaviour

| State | UI |
|-------|-----|
| Leave | Empty slot message |
| Reattempt | Shows repeated MC or empty if no prior MC |
| Remodule | Pick list from `coursesForRemodule` or selected MC |
| Normal | Selected MC tile (click to remove) + optional offering tiles |

Click offering tile: `plan.mc[t-1] = courseId` → `render()`.

---

## RIWE cell behaviour

- Shows tiles only in `riweCellTrimesters(plan, intakeKey)`
- Blocked on delay trimesters (`isTrimesterBlocked`)
- Active span: click removes (`plan.riweAt = null`)
- Start slot: click sets `plan.riweAt = trimester` if `canAssignRiwe`

---

## Capstone row

Single spanning tile across `capTs.length` trimesters (with break columns accounted in colspan).

Toggle `plan.capstone` only if `canShowCapstoneOption(plan, firstCap, intakeKey)`.

---

## RPL cell

- Click empty/active tile: `cycleRplCredits` on `plan.rplCredits[idx]`
- At ≥ 18 cr: **Pick MC** button → `openRplMcPicker` (prompt with numbered list)
- Clearing below 18 cr clears `plan.rplMc[idx]`

---

## Catalog (`renderCatalog`)

Two views via `#catalogViewToggle`:

- **available** — all courses by Sep/Jan/May columns
- **selected** — only MCs in plan + full RPL exemptions

Selected state: `plan.mc` ids + RPL exempted ids. Reattempt courses show corner sticker.

---

## Validation panel (`renderIssues`)

Lists `analysis.issues` with CSS class per type (`error`, `warn`, `info`). Graduation readiness implied by `analysis.ready` (not always shown as single banner — check issues + credit total).

---

## Export

| Action | Function |
|--------|----------|
| Print | `exportPrint` → landscape hint dialog → `openExportWindow(true)` |
| PDF | `exportPdf` → download HTML + print dialog |
| Email | `exportEmail` → download + `mailto:` with cohort/credits summary |

`buildExportHtml()` clones timeline sections and issues with embedded page CSS. Print CSS uses `@page` A3 landscape.

Plan text summary: `buildPlanSummary()` for clipboard-style export content.

---

## localStorage keys

| Key | Values | When written |
|-----|--------|--------------|
| `csm-planner-theme` | `light` / `dark` | Theme toggle |
| `csm-planner-fullscreen` | `true` / removed | Fullscreen toggle |
| `csm-planner-program` | programme id | Init (always AC) |

**Plan is not persisted.**

---

## Help dialog

Bullets from `data.planHelp` rendered in `#planHelpDialog`. Update help text in `data.json` when behaviour changes.

---

## Scroll and layout

- Horizontal scroll for wide timeline with `#timelineScrollHints`
- `data-fullscreen="true"` on `<html>` expands layout (stored preference)
- Dark theme default; light via toggle

---

## Key DOM dependencies

Functions assume elements exist: `#timelineBody`, `#timelineHead`, `#creditStats`, `#programmeDuration`, `#catalogGrid`, `#issuesList`, cohort/export/help dialogs. Grep `getElementById` when adding features.
