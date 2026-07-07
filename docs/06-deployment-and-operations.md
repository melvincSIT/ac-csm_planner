# 06 — Deployment and Operations

## GitHub Pages

Workflow: `.github/workflows/deploy-pages.yml`

| Setting | Value |
|---------|-------|
| Trigger | Push to `main`, manual `workflow_dispatch` |
| Artifact | Entire repository root (no build) |
| URL | https://melvincsit.github.io/ac-csm_planner/ |

Requirements: GitHub Pages enabled for the repo; `github-pages` environment configured.

---

## Release checklist

1. Edit `data.json` and/or `planner.js` and/or `index.html`
2. If `data.json` changed → regenerate `data-embed.js` (see [03-data-schema.md](./03-data-schema.md))
3. Bump cache-bust query on script tags in `index.html`:
   ```html
   <script src="data-embed.js?v=N"></script>
   <script src="planner.js?v=N"></script>
   ```
4. Run `verify.py` if AC data changed (requires Excel + venv)
5. Commit, push to `main`
6. Confirm Actions workflow succeeds
7. Hard-refresh live site (CDN/browser cache)

---

## Cache busting history

Stale GitHub Pages builds were served in Jul 2026 until:

- `.github/workflows/deploy-pages.yml` added
- `.nojekyll` present (if applicable)
- `?v=N` on scripts incremented on each logic/data deploy

Always increment `?v=` when changing `planner.js` or embedded data.

---

## Rollback references

Created at deploy of deferral/RPL/cohort-2023 release:

| Ref | Commit | Description |
|-----|--------|-------------|
| Tag `pre-cohort-rpl-deferral` | `289d791` | Before Sep 2023 / deferral / RPL |
| Branch `backup/pre-cohort-rpl-deferral` | `289d791` | Same — branch for checkout |

### Safe revert (recommended)

```sh
git checkout main && git pull
git revert <commit-sha> --no-edit
git push origin main
```

Pages redeploys automatically.

### File-level restore

```sh
git checkout pre-cohort-rpl-deferral -- data.json planner.js index.html data-embed.js
# commit + push
```

### Hard reset (destructive)

Only if coordinating with team:

```sh
git reset --hard pre-cohort-rpl-deferral
git push --force origin main
```

---

## Local development

**macOS/Linux:**

```sh
./start-planner.sh        # port 8080
./start-planner.sh 3000   # custom port
```

**Windows:** `start-planner.bat`

Uses `python3 -m http.server`. Open `http://localhost:PORT/`.

With HTTP server, `fetch('data.json')` wins over embed — good for editing JSON without regenerating embed during dev. Regenerate embed before commit/deploy.

---

## What gets deployed

Everything in repo root including:

- `docs/` (this documentation)
- `verify.py`, Excel files if committed
- Untracked assets are **not** deployed unless committed

Banner paths in `data.json` must exist in repo for production images (check `assets/banners/`).

---

## Monitoring deploy

```sh
# GitHub CLI (if installed)
gh run list --workflow=deploy-pages.yml --limit 1

# Or GitHub API
curl -s "https://api.github.com/repos/melvincSIT/ac-csm_planner/actions/workflows/deploy-pages.yml/runs?per_page=1"
```

---

## Environment assumptions

- Static hosting only — no secrets in repo
- No server-side API keys
- Users may open exported HTML offline; export is self-contained clone of visible plan
