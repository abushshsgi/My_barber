# Hair Advisor Scanner — real-device QA checklist

**Status:** Template only — not executed in CI. Check boxes during manual sessions.

## Platforms

- [ ] Android Chrome (rear camera)
- [ ] iOS Safari
- [ ] Embedded WebView (if used)

## Camera

- [ ] Rear camera selected by default
- [ ] Autofocus stable on label / barcode
- [ ] Low-light indoor
- [ ] Permission denied → clear message + recovery
- [ ] Permission granted → preview resumes
- [ ] Leave page → camera tracks stopped (no stuck LED)
- [ ] Screen rotation does not crash scanner

## Barcode mode

- [ ] Valid catalog barcode → exact match flow
- [ ] Unknown barcode → not-found panel (not fake success)
- [ ] Duplicate scan within 8s ignored
- [ ] Leading-zero EAN representation (if device adds zeros)
- [ ] Torch on / off (Android)

## Image mode

- [ ] Blurry capture → quality / retry messaging
- [ ] Ambiguous catalog → pick screen with real rows only
- [ ] Reject all → back to scan
- [ ] Confirmed pick → analysis continues

## Network

- [ ] Airplane mode during lookup → error, not false not-found
- [ ] 503 / timeout → service message, camera restarts

## Evidence to attach per session

Device model, OS version, browser, build ID, 3–5 screen recordings, backend log snippet (no PII).