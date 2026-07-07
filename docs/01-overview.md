# 01 — Overview

## Purpose

The CSM Candidature Planner helps users answer:

- Which micro-credentials can I take in which trimester for my intake month?
- When should Career Catalyst, RIWE, and Capstone fall?
- How do leave, reattempt, or remodule affect my timeline?
- Do I meet credit and prerequisite requirements for graduation (180 credits)?

It is **advisory**, not an official registration system. Rules are encoded from the candidature plan spreadsheet and SIT programme pages.

---

## Technology stack

| Layer | Choice |
|-------|--------|
| Runtime | Browser only — no backend |
| Logic | Vanilla JavaScript IIFE → `global.CSMPlanner` |
| UI | Single `index.html` (~4k lines): inline CSS + inline app script |
| Data | JSON registry in `data.json` (+ embedded copy in `data-embed.js`) |
| Deploy | GitHub Pages — entire repo root uploaded as static site |
| Build | **None** — no bundler, npm, or compile step |

---

## Terminology

| Term | Meaning |
|------|---------|
| **MC / Micro-credential** | 18-credit stackable unit (`mcCredits`) |
| **Foundation MC** | Required foundation category MCs (2 for AC) |
| **Stackable MC** | Elective stackable MCs (6 for AC) |
| **Career Catalyst (WFE-CC)** | 10-credit work-facing component; any trimester |
| **RIWE** | Relevant Industry Work Experience — 5 cr × 2 trimesters in **study Year 2** |
| **Capstone** | 16 credits across **study Year 3** (3 trimesters on UI, credited once) |
| **RPL** | Recognition of Prior Learning — up to 24 cr/trimester; 18+ cr can exempt a full MC |
| **Intake** | Cohort start month: `sep`, `jan`, or `may` |
| **Cohort year** | Calendar year of first trimester (default **2023** for AC) |
| **Extension trimesters** | Trimesters 10–14 beyond standard 9 (`maxExtensionTrimesters`: 5) |
| **Delay trimester** | Leave, reattempt, or remodule — pauses study progression |

---

## Applied Computing credit model

```
180 total =
  8 × 18  (micro-credentials)
+ 10      (Career Catalyst)
+ 10      (RIWE: 5 × 2 trimesters)
+ 16      (Capstone)
+ partial RPL credits (6 or 12 cr blocks that are not full MC exemptions)
```

Full RPL exemption at **≥ 18 cr** with a selected MC counts as that MC (18 cr toward the MC portion, not as extra partial RPL).

---

## Programme scope (current vs dormant)

| Programme ID | In `data.json` | In UI |
|--------------|----------------|-------|
| `applied-computing` | Yes | **Active (locked)** |
| `electrical-electronic-engineering` | Yes (240 cr) | Dormant |
| `infrastructure-systems-engineering` | Yes (240 cr) | Dormant |
| `master-health-sciences` | Yes (60 cr) | Dormant |

Multi-programme selector markup exists in `index.html` but is **hidden** and never populated. See [08-change-guide.md](./08-change-guide.md) to re-enable.

---

## User-facing features (Applied Computing)

- Trimester timeline with academic year grouping and intake-specific month labels
- Micro-credential assignment with offering-month constraints
- Career Catalyst, RIWE, Capstone rows (feature-flagged per programme)
- Leave / Reattempt / Remodule rows with mutual exclusion per trimester
- RPL row (AC only): cycle 0→6→12→18→24 cr; pick MC at 18+
- Credit tracker with foundation/stackable/component stat cards
- Validation panel (`analyze`) with errors, warnings, info
- Auto-extension suggestion when timeline is full but credits incomplete
- Cohort picker (month + year from 2023)
- Export: print / PDF (via browser) / email with HTML attachment
- Dark/light theme and optional fullscreen layout (`localStorage`)

---

## What is intentionally out of scope

- Official enrolment or SIT system integration
- Per-module RPL within a single MC (only MC-level exemption in v1)
- Saving/sharing plans via URL or server (plan is session-only except export)
- Authentication or multi-user state
