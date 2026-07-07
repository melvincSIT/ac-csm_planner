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
| Reattempt | `buildReattemptCell` | `reattemptMc[]` — course picker in offering window |
| Remodule | `buildRemoduleCell` | `remoduleMc[]` — course picker in offering window |
| RPL | `buildRplCell` | MC RPL cycle + WFE RPL toggle |

Row labels support hint subtext via `timelineRowLabel(label, componentAvailability hint)`.

### Trimester modes

**Leave** blocks all rows in that trimester and clears assignments when turned on.

**Reattempt** and **remodule** can be enabled on the same trimester as each other and alongside the primary MC row. Each row picks its own course via `reattemptMc[]` / `remoduleMc[]`.

`clearTrimesterAssignments(trimester)` — clears MC, reattempt/remodule courses, CC, RIWE in that column, RPL credits when marking leave.

### Reattempt visual

`addTileSticker(tile, label, 'reattempt')` on timeline and catalog when `isCourseOnReattemptTrimester(courseId)`.

---

## Micro-credential cell behaviour

| State | UI |
|-------|-----|
| Leave | Empty slot message |
| CC same trimester | Empty slot message |
| MC selected | Selected tile (click to remove) + **switch** tiles for other offerings |
| No MC | Offering tiles from `coursesForMcSlot` |

Reattempt and remodule use **separate rows** (`reattemptMc`, `remoduleMc`) and can run concurrently with the primary MC row. Toggling reattempt/remodule shows a picker (no auto-fill). When a course is selected, **switch** tiles offer other valid courses in that window.

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

- **MC RPL** — click to cycle `0→3→6→…→18` cr; Pick MC at 18 cr
- **WFE RPL** — toggle 10 cr (Career Catalyst exemption); mutually exclusive with scheduled CC

---

## Catalog (`renderCatalog`)

Two views via `#catalogViewToggle`:

- **available** — all courses by Sep/Jan/May columns; selected WFE/RIWE/Capstone stay visible
- **selected** — only MCs in plan + full RPL exemptions

Selected state: all `mc`, `reattemptMc`, `remoduleMc` ids + RPL exempted ids. Reattempt courses show corner sticker.

### Catalog “Available” vs “Selected”

- **Available** dims scheduled MC cards; **WFE / RIWE / Capstone** component cards stay fully visible when selected.
- RIWE credits in stat cards require `plan.riweAt != null` (not merely hint slots).

### RIWE after Clear all

`emptyPlan()` sets `riweAt = null`; `isRiweActiveTrimester` is false so RIWE is not counted or shown as selected.

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
