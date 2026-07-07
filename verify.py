#!/usr/bin/env python3
"""Independent verification of data.json against Excel v2, SIT, and scheduling rules."""
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Run: python3 -m venv .venv && .venv/bin/pip install openpyxl")
    sys.exit(1)

ROOT = Path(__file__).parent
RAW = json.loads((ROOT / "data.json").read_text())
DATA = RAW["programs"]["applied-computing"] if "programs" in RAW else RAW
WB = openpyxl.load_workbook(ROOT / "Candidature Plan_30 Jun 26 v2.xlsx", data_only=True)

SIT_INTAKE = {
    "Digital Logic and Computing": "Sep",
    "Ethical Computing and Data Analysis": "Jan",
    "Information Security Risk Management and Audit": "Sep",
    "Modern Software Engineering Practices": "Jan",
    "Cloud Architecting and Security": "May",
    "Machine Learning": "Jan",
    "Computer Networking and Network Security": "May",
    "Cybersecurity": "May",
    "Advanced Generative Text Artificial Intelligence": "Sep",
    "Deep Learning Forecasting with Time Series Analysis": "May",
}

EXCEL_NAME_TO_ID = {
    "Digital Logic & Computing": "dlc",
    "Ethical Computing & Data Analytics": "ethical",
    "Information Security Management & Audit": "isma",
    "Modern Software Engineering Practices": "mse",
    "Cloud Architecting & Security": "cloud",
    "Machine Learning": "ml",
    "Computer Networking & Network Security": "netsec",
    "Cybersecurity": "cyber",
    "Advanced Generative Text Artificial Intelligence": "genai",
    "Deep Learning Forecasting with Time Series Analysis": "dlts",
}

errors = []
warnings = []

# Credit arithmetic
mc_total = DATA["mcCount"] * DATA["mcCredits"]
expected = mc_total + DATA["wfeCcCredits"] + DATA["capstoneCredits"]
if expected != DATA["totalCredits"]:
    errors.append(f"144+20+16 should be 180, got {expected}")

# offeringsByMonth vs Excel Sep sheet cols C-E
ws = WB["I started in Sep"]
excel_by_month = {"Sep": [], "Jan": [], "May": []}
for col, month in [(3, "Sep"), (4, "Jan"), (5, "May")]:
    for r in range(27, 32):
        v = ws.cell(r, col).value
        if not v:
            continue
        s = str(v).strip()
        for ename, cid in EXCEL_NAME_TO_ID.items():
            if s.startswith(ename[:28]) or ename.startswith(s[:28]):
                if cid not in excel_by_month[month]:
                    excel_by_month[month].append(cid)
                break

for month, ids in DATA["offeringsByMonth"].items():
    if set(ids) != set(excel_by_month.get(month, [])):
        errors.append(
            f"offeringsByMonth[{month}]: json={ids} excel={excel_by_month.get(month)}"
        )

# Per-intake trimester offerings (month rotation)
cycle = DATA["monthCycle"]
for intake_key, info in DATA["intakes"].items():
    start = cycle.index(info["startMonth"])
    for t in range(1, 10):
        month = cycle[(start + t - 1) % 3]
        start_col = {"sep": 3, "jan": 4, "may": 5}[intake_key]
        col = start_col + t - 1
        excel_ids = []
        for r in range(27, 32):
            v = ws.cell(r, col).value if intake_key == "sep" else WB[
                f"I started in {intake_key.capitalize()}"
            ].cell(r, col).value
            if not v:
                continue
            s = str(v).strip()
            for ename, cid in EXCEL_NAME_TO_ID.items():
                if s.startswith(ename[:28]) or ename.startswith(s[:28]):
                    if cid not in excel_ids:
                        excel_ids.append(cid)
                    break
        json_ids = [c for c in DATA["offeringsByMonth"][month]]
        if set(excel_ids) != set(json_ids):
            errors.append(
                f"Tri {t} {intake_key} ({month}): excel={excel_ids} json={json_ids}"
            )

# Constraints
if DATA["constraints"].get("wfeRiweYear") != 2:
    errors.append("RIWE must be Year 2 only")
if DATA["constraints"]["capstoneMinYear"] != 3:
    errors.append("Capstone min year should be 3")

for key, info in DATA["intakes"].items():
    for t in info["wfeRiweTrimesters"]:
        year = (t + 2) // 3
        if year != 2:
            errors.append(f"RIWE trimester {t} for {key} is not Year 2 (year {year})")
    for t in info["capstoneTrimesters"]:
        year = (t + 2) // 3
        if year < 3:
            errors.append(f"Capstone trimester {t} for {key} is not Year 3")

# Ideal paths match Excel
INTAKE_COL = {"sep": 3, "jan": 4, "may": 5}
for key, start_col in INTAKE_COL.items():
    ws = WB[f"I started in {key.capitalize()}"]
    for i in range(9):
        excel_val = ws.cell(18, start_col + i).value
        json_val = DATA["intakes"][key]["idealFirstAttempt"][i]
        if excel_val != json_val:
            errors.append(f"Ideal path {key} tri{i+1}: excel={excel_val!r} json={json_val!r}")

print("=== CSM Planner Verification ===\n")
print(f"Credit check: {DATA['mcCount']}×{DATA['mcCredits']} + {DATA['wfeCcCredits']} + {DATA['capstoneCredits']} = {expected}\n")
print("Offerings by month:", DATA["offeringsByMonth"])
print()

if errors:
    print(f"ERRORS ({len(errors)}):")
    for e in errors:
        print("  ✗", e)
else:
    print("✓ All checks passed.\n")

warnings.append("Excel: 'Management & Audit' vs SIT: 'Risk Management and Audit'.")
warnings.append("Career Catalyst: every trimester. RIWE: Year 2 only (trimesters 4–5).")
print("NOTES:")
for w in warnings:
    print("  ·", w)

sys.exit(1 if errors else 0)
