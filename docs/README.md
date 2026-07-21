# CSM Candidature Planner — Documentation Index

Handover documentation for the **SIT CSM Candidature Planner** (`AC-CSM_Tool`). Written for future developers and AI assistants who need to understand, extend, or maintain the application without relying on chat history.

**Live site:** https://melvincsit.github.io/ac-csm_planner/  
**Repository:** https://github.com/melvincSIT/ac-csm_planner

---

## What this app does

A static, client-side web app that lets students and advisors **plan a CSM (Competency-based Stackable Micro-credential) candidature** on a trimester timeline: micro-credentials, Career Catalyst, RIWE, Capstone, leave/reattempt/remodule delays, and RPL (Applied Computing only). It validates prerequisites, counts credits toward 180, and exports a printable plan.

**Current product scope:** Four SIT CSM degree programmes are selectable from the header dropdown; rules and catalogue switch per programme.

**Rollback (Jul 2026 UI):** tag `pre-path-viz-clean-ui` — see [09-path-visualization-and-clean-ui.md](./09-path-visualization-and-clean-ui.md).

---

## Document map

| Doc | Contents |
|-----|----------|
| [01-overview.md](./01-overview.md) | Purpose, tech stack, terminology, credit model |
| [02-architecture.md](./02-architecture.md) | Files, load order, runtime data flow, module boundaries |
| [03-data-schema.md](./03-data-schema.md) | `data.json` structure, Applied Computing fields, intakes, courses |
| [04-planner-logic.md](./04-planner-logic.md) | `planner.js` algorithms: deferral, credits, validation, suggest, RPL |
| [05-ui-and-interactions.md](./05-ui-and-interactions.md) | `index.html` UI, render pipeline, timeline rows, export |
| [06-deployment-and-operations.md](./06-deployment-and-operations.md) | GitHub Pages, cache busting, rollback, local dev |
| [07-verification-and-sources.md](./07-verification-and-sources.md) | Excel source, `verify.py`, authoritative inputs |
| [08-change-guide.md](./08-change-guide.md) | Common tasks, extension points, dormant features |
| [09-path-visualization-and-clean-ui.md](./09-path-visualization-and-clean-ui.md) | Path journey strip, progressive disclosure, rollback |

---

## Quick start (local)

```sh
./start-planner.sh          # http://localhost:8080
# or: python3 -m http.server 8080
```

Scripts load in this order:

```html
<script src="data-embed.js?v=5"></script>
<script src="planner.js?v=5"></script>
```

With a local HTTP server, `CSMPlanner.loadData()` fetches `data.json`. On `file://` or fetch failure, it falls back to `global.__CSM_PROGRAMME_DATA__` from `data-embed.js`.

---

## Key concepts (30-second version)

1. **Calendar trimester** — column on the timeline (1…14). May include delay trimesters (leave / reattempt / remodule).
2. **Study trimester** — progression index counting only non-delay trimesters. RIWE and Capstone slots in `data.json` use **study indices**, mapped to calendar columns via deferral logic.
3. **Plan state** — in-memory JavaScript object (`plan`); not persisted to `localStorage` (only theme/fullscreen/program id are).
4. **`CSMPlanner`** — all business logic in `planner.js`; UI in `index.html` calls this API only.

---

## Version note

Documentation reflects commit **`bb3ef28`** (concurrent MC/reattempt/remodule rows, RPL v2, RIWE catalog fix). Prior: `690d865` / `dcd1615`.
