# Hair Advisor — Persistent Execution Checklist

Last updated: 2026-11-19

- [x] Reconcile REQ-01–REQ-35 → `MYSALOON_HAIR_ADVISOR_FINAL_ACCEPTANCE.md`
- [x] Web compare / routine / feedback + submissions list
- [x] Mobile submission status in history modal
- [x] Admin link-existing, request-info, aggregation failed jobs UI
- [x] Missing products admin filters (q, sort, status)
- [x] Backend tests: aggregation jobs, ingredient import, permissions (29 total)
- [x] User + admin production builds
- [x] Aggregation worker systemd template (`backend/deploy/mysaloon-hair-aggregation-worker.service`)
- [x] PostgreSQL validation on VPS (`mysaloon_hair_staging`, 29 tests)
- [ ] Live Gemini controlled smoke (staging key)
- [ ] Playwright / browser E2E A–H
- [ ] Mobile device QA (camera, barcode)
- [ ] Enable aggregation worker on staging VPS (ops authorization)
- [ ] Full monorepo regression (Try-On, payments, auth)