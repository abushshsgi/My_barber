# V3 polish — before / after index

Captured: 2026-11-27 (Playwright + review archive). Viewports align with the verification spec unless noted.

| Issue | Before | After | Viewport | Status |
| --- | --- | --- | --- | --- |
| Scanner permission denied | [before-scanner-permission.png](./before-scanner-permission.png) | [after-scanner-permission-denied.png](./after-scanner-permission-denied.png) | 390px (simulated, no camera grant) | FIXED AND VERIFIED (simulated) |
| Scan history empty | [before-history-empty.png](./before-history-empty.png) | *pending* — mock JWT does not pass API auth on scanner route | 390px | FIXED BUT UNVERIFIED |
| Advisor mobile | [before-advisor-mobile.png](./before-advisor-mobile.png) | [after-advisor-mobile.png](./after-advisor-mobile.png) | 390px | FIXED AND VERIFIED |
| Advisor desktop | — | [after-advisor-desktop.png](./after-advisor-desktop.png) | 1280px | FIXED AND VERIFIED |
| Morf gallery icon | [before-morf-gallery.png](./before-morf-gallery.png) | [after-morf-gallery.png](./after-morf-gallery.png) | 390px | FIXED AND VERIFIED |
| Guides RU | [before-guides-ru.png](./before-guides-ru.png) | [after-guides-ru.png](./after-guides-ru.png) | 1280px | FIXED AND VERIFIED |
| Guides EN | — | [after-guides-en.png](./after-guides-en.png) | 1280px | FIXED AND VERIFIED |
| Explore dock overlap | [before-explore-836.png](./before-explore-836.png) | [after-explore-836.png](./after-explore-836.png) | 836px | FIXED AND VERIFIED |
| Detail try-on CTA | [before-detail-tryon-390.png](./before-detail-tryon-390.png) | [after-detail-390.png](./after-detail-390.png) | 390px | FIXED AND VERIFIED |
| Article desktop measure | [before-article-desktop.png](./before-article-desktop.png) | [after-article-desktop.png](./after-article-desktop.png) | 1280px | FIXED AND VERIFIED |

Physical-device camera and signed-in scanner history flows were **not** re-verified in this pass.