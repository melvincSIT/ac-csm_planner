# 03 — Data Schema

## Registry top level (`data.json`)

```json
{
  "institution": "Singapore Institute of Technology",
  "defaultProgramId": "applied-computing",
  "programs": {
    "applied-computing": { ... },
    "electrical-electronic-engineering": { ... },
    "infrastructure-systems-engineering": { ... },
    "master-health-sciences": { ... }
  }
}
```

`CSMPlanner.normalizeRegistry()` also accepts a legacy single-programme object (wraps it as one entry in `programs`).

---

## Applied Computing programme object

### Identity and display

| Field | Example | Notes |
|-------|---------|-------|
| `id` | `"applied-computing"` | Programme key |
| `degreeTitle` | `"Bachelor of Science (Honours), Applied Computing"` | Header |
| `title` | `"Applied Computing Degree (via CSM Pathway)"` | Subtitle |
| `source` | spreadsheet + URL note | Provenance |
| `sitUrl` | SIT programme page | External link |
| `bannerImage` | `"assets/banners/applied-computing.jpg"` | Hero image path |
| `bannerPosition` | `"center center"` | CSS background-position |
| `catalogLabels` | foundation, stackable, … | Catalog section labels |
| `timelineLead` | string | Shown above timeline |
| `planHelp` | string[] | Help dialog bullets |
| `candidatureDuration` | `"3–5 years"` | Marketing copy |
| `standardCandidatureYears` | 3 | |
| `maxCandidatureYears` | 5 | |

### Credit and duration scalars

| Field | AC value | Used by |
|-------|----------|---------|
| `totalCredits` | 180 | Validation target |
| `mcCredits` | 18 | Per MC; full RPL threshold |
| `mcCount` | 8 | Required unique MCs |
| `foundationCount` | 2 | Validation |
| `stackableCount` | 6 | Validation |
| `wfeCcCredits` | 10 | Career Catalyst |
| `riweCredits` | 10 | RIWE total (stat display) |
| `riweCreditsPerTrimester` | 5 | Per active RIWE trimester |
| `capstoneCredits` | 16 | Credited at first capstone calendar tri |
| `maxCoreTrimesters` | 9 | Standard timeline length |
| `maxExtensionTrimesters` | 5 | Extension dropdown max |
| `maxTotalTrimesters` | 14 | Plan array length |
| `maxCandidatureDuration` | `"4 years 8 months"` | Shown at max extension |
| `minCohortYear` | 2023 | Year picker floor |
| `defaultCohortYear` | 2023 | Default cohort year |
| `monthCycle` | `["Sep","Jan","May"]` | Offering rotation |

### RPL (Applied Computing)

| Field | Value |
|-------|-------|
| `rplMaxCreditsPerTrimester` | 24 |
| `rplCreditSteps` | `[0, 6, 12, 18, 24]` |

Gated by `features.rpl: true`.

### `constraints`

```json
{
  "wfeRiweYear": 2,
  "capstoneMinYear": 3,
  "wfeCcNote": "...",
  "wfeRiweNote": "...",
  "capstoneNote": "..."
}
```

- `wfeRiweYear` / `capstoneMinYear` apply to **study year** (`studyYearAt`), not raw calendar column ÷ 3.

### `componentAvailability`

Hint text on timeline row labels (e.g. `"Anytime"`, `"Year 2"`, `"Year 3"`). Read via `CSMPlanner.componentAvailability(kind)`.

### `features`

```json
{ "wfeCc": true, "riwe": true, "capstone": true, "rpl": true }
```

`hasFeature(name)` returns `true` if the key is absent; only explicit `false` disables.

Engineering programmes: `rpl` omitted/false. MHSc: typically capstone only.

### `offeringsByMonth`

Maps calendar month → array of **course ids** offered that month:

| Month | Course IDs |
|-------|------------|
| Sep | `dlc`, `isma`, `genai` |
| Jan | `ethical`, `mse`, `ml` |
| May | `cloud`, `netsec`, `cyber`, `dlts` |

Trimester `t` for intake `intakeKey` uses:

```
month = monthCycle[(indexOf(intakes[intakeKey].startMonth) + t - 1) % 3]
offerings = offeringsByMonth[month]
```

### `foundationSlots`

Maps ideal-path slot names to required MC display names:

```json
{
  "Foundation MC 1": "Digital Logic & Computing",
  "Foundation MC 2": "Ethical Computing & Data Analytics"
}
```

Validation warns if scheduled foundation MC **names** don't include both.

### `courses[]`

Each course:

```json
{
  "id": "dlc",
  "name": "Digital Logic & Computing",
  "sitName": "Digital Logic and Computing",
  "category": "foundation",
  "credits": 18,
  "intakeMonth": "Sep"
}
```

| id | category | intakeMonth |
|----|----------|-------------|
| dlc | foundation | Sep |
| ethical | foundation | Jan |
| isma, genai | stackable | Sep |
| mse, ml | stackable | Jan |
| cloud, netsec, cyber, dlts | stackable | May |

### `components[]`

Non-MC degree components:

| id | kind | name | credits |
|----|------|------|---------|
| wfe_cc | wfe_cc | Career Catalyst | 10 |
| wfe_riwe | riwe | Relevant Industry Work Experience | 10 |
| capstone | capstone | Capstone Project | 16 |

Resolved via `componentName(kind)`.

### `prerequisites`

**RIWE (`wfeRiwe`):**

```json
{
  "description": "After 3 micro-credentials OR 2 micro-credentials + Career Catalyst",
  "minMc": 3,
  "altMinMc": 2,
  "durationTrimesters": 2,
  "minDurationTrimesters": 1,
  "latestStartTriInYear": 2
}
```

**Capstone:**

```json
{
  "description": "After 6 micro-credentials OR 5 micro-credentials + Career Catalyst",
  "minMc": 6,
  "altMinMc": 5,
  "durationTrimesters": 3
}
```

Evaluated with `countMcBefore()` (includes full RPL MC exemptions).

### `intakes` (sep, jan, may)

Per intake:

```json
{
  "label": "Sep",
  "startMonth": "Sep",
  "idealFirstAttempt": [ "Foundation MC 1", "Foundation MC 2", "WFE-CC", "MC 3", ... ],
  "wfeRiweTrimesters": [4, 5],
  "capstoneTrimesters": [7, 8, 9]
}
```

| Field | Meaning |
|-------|---------|
| `idealFirstAttempt` | 14 slots for `defaultPlan()`; `"WFE-CC"`, `"Foundation MC n"`, `"MC n"`, or `null` |
| `wfeRiweTrimesters` | **Study trimester indices** for RIWE (not calendar columns when delays exist) |
| `capstoneTrimesters` | **Study trimester indices** for capstone window |

---

## Regenerating `data-embed.js`

There is **no npm script**. After editing `data.json`:

```sh
node -e "
const fs = require('fs');
const d = fs.readFileSync('data.json', 'utf8');
fs.writeFileSync('data-embed.js', 'global.__CSM_PROGRAMME_DATA__ = ' + d + ';');
"
```

Then bump `?v=N` on both script tags in `index.html` when deploying.

---

## Other programmes (dormant data)

| ID | totalCredits | mcCount | features |
|----|--------------|---------|----------|
| electrical-electronic-engineering | 240 | 16 | wfeCc, riwe, capstone |
| infrastructure-systems-engineering | 240 | 16 | wfeCc, riwe, capstone |
| master-health-sciences | 60 | — | capstone only |

Each has its own `courses`, `intakes`, `offeringsByMonth`, and banners. Logic in `planner.js` is programme-agnostic if `DATA` is set correctly.
