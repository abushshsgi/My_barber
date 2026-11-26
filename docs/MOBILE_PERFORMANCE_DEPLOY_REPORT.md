# Mobile performance deploy report

## Deploy scope

| App | Target |
|-----|--------|
| `apps/user` | VPS `www.mysaloon.uz` (port 3000) |
| `apps/backend` | No change in this pass |

## Pre-deploy checklist

- [x] Git status reviewed (no secrets)
- [x] Production build ok
- [x] Unit test for morph LCP injection
- [ ] VPS backup (operator: snapshot or `deploy/vps` backup procedure)
- [ ] `sudo bash deploy/vps/deploy-frontends.sh user` after push

## Deployment action

Commit on `main` → auto push → VPS workflow or manual `deploy-frontends.sh user`.

## Smoke test after deploy

```bash
curl -sS https://mysaloon.uz/ | grep -c morph-lcp-static   # expect 0
curl -sS https://mysaloon.uz/ai-style | grep -c morph-lcp-static   # expect 1
```

## Post-deploy PageSpeed (fill in after release)

| Run | Mobile Perf | FCP | LCP | TBT | CLS |
|-----|-------------|-----|-----|-----|-----|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Rollback

1. `git revert <commit-sha>`
2. Push and redeploy user frontend only.
3. No database rollback required.

## Status

- **Commit:** `3cc9ba1f` on `main` (pushed 2026-11-26).
- **Production `buildId`:** still `1a401c7` after 3+ min — VPS auto-deploy not observed from this workstation.
- **Next step:** on server run `sudo bash deploy/vps/deploy-frontends.sh user`, then re-run PageSpeed ×3.

Relevant paths after release: `version.json` should change from `1a401c7`; homepage HTML must omit try-on hero.