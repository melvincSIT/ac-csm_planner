# 07 — Verification and Sources

## Authoritative sources

| Source | Role |
|--------|------|
| `Candidature Plan_30 Jun 26 v2.xlsx` | Primary AC trimester layout, ideal paths, offerings |
| SIT programme page | Course naming, intake alignment (`data.source`, `sitUrl`) |
| `data.json` | Runtime source of truth for the app |

Excel v1 exists but **v2** is referenced in `data.json` source note and `verify.py`.

Sheets used:

- `I started in Sep` / `Jan` / `May` — per-intake grids
- Row 18: ideal first attempt labels
- Rows 27–31: course offerings by column (trimester)

---

## `verify.py`

Independent Python checker — does **not** import `planner.js`.

**Setup:**

```sh
python3 -m venv .venv
.venv/bin/pip install openpyxl
.venv/bin/python verify.py
```

**Checks performed:**

1. Credit arithmetic: `mcCount × mcCredits + wfeCcCredits + capstoneCredits` vs `totalCredits`
2. `offeringsByMonth` vs Excel Sep sheet columns C–E
3. Per-intake trimester offerings (month rotation for trimesters 1–9)
4. Constraint sanity: RIWE year 2, capstone min year 3; intake RIWE/capstone indices in year 2/3
5. `idealFirstAttempt` vs Excel row 18 per intake

Exit code **1** if any errors.

### Known gap

The credit check at line 49–51 **does not include `riweCredits`**. For Applied Computing (180 = 144 + 10 + 10 + 16), this formula yields **170 ≠ 180** and will report an error unless the script is updated. When maintaining AC data, either:

- Update verify.py to add `+ DATA["riweCredits"]`, or
- Use `analyze()` / manual credit breakdown as the runtime truth

Also: verify uses **calendar** trimester year `(t + 2) // 3` for indices — valid for undelayed plans; deferral logic in the app uses **study trimesters** instead.

---

## Manual QA scenarios

Use these when changing planner logic:

| Scenario | Expected |
|----------|----------|
| Default Sep 2023 cohort | Year picker shows 2023+ |
| Leave in T2 | RIWE slots shift right; capstone shifts |
| Reattempt T5 | Previous MC copied; delay defers RIWE/capstone |
| RIWE before 3 MCs | Error unless 2 MCs + CC |
| Capstone before RIWE done | `canShowCapstoneOption` false |
| RPL 18 cr + pick DLC | Counts as foundation MC; 18 cr toward total |
| RPL 6 cr only | +6 partial credits |
| 3rd attempt same MC | Error in analyze |
| Suggest plan | Fills MCs, CC, RIWE, capstone heuristically |
| Change intake month | Plan clears |
| Extension when grid full &lt; 180 cr | Duration select auto-increments |

---

## Git history (high-signal commits)

| Commit | Summary |
|--------|---------|
| `7f5a4cd` | AC refinements: RIWE 5×2, reattempt/remodule, auto-extend, lock AC |
| `289d791` | Single catalog title |
| `34ae07e` / `a651d39` | GitHub Pages workflow, cache bust |
| `6221be7` | Multi-programme data + engineering MCs |
| `dcd1615` | Sep 2023 cohort, deferral RIWE/capstone, RPL row |

Use `git log --oneline` for full history.

---

## External references

- Live app: https://melvincsit.github.io/ac-csm_planner/
- Repo: https://github.com/melvincSIT/ac-csm_planner
- AC programme: https://www.singaporetech.edu.sg/undergraduate-programmes/applied-computing-csm
