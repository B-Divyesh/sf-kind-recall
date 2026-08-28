# Kind Recall repair handoff

## Status

Release-blocking findings from independent verification commit `16a12ed4d4a0b6f5c6abae52e74a35444e5044d9` have been repaired. Local release gates pass. Live deployment evidence is recorded below after deployment.

## Repairs

- **VFY2-001 — import capacity:** `importBundle()` now calculates the resulting unique word count before opening its write transaction. It rejects an over-limit import without writing words or reviews. The UI passes the active 20-word free or 100-word Plus limit. Normal word creation now enforces both limits too.
- **VFY2-002 — study ARIA:** the visual session track is now a named `progressbar` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and readable `aria-valuetext`.
- **VFY2-003 — immutable hashed assets:** Vite now emits hashed JavaScript and CSS under `/_app/`. `staticwebapp.config.json` gives that path `public, max-age=31536000, immutable`; HTML and `sw.js` remain on the update path, and the worker is explicitly `no-cache, no-store, must-revalidate`.
- **VFY2-004 — manifest MIME:** the deployment maps `.webmanifest` to `application/manifest+json`.
- Response hardening now includes CSP, `Permissions-Policy`, `X-Frame-Options: DENY`, `nosniff`, and strict-origin referrer policy. Inline event/style dependencies were removed so CSP does not need `unsafe-inline`.

## Demo and claims

`/demo/` seeds six realistic due words in the separate `kind-recall-demo` IndexedDB database. Its persistent banner provides **Reset demo** and **Start for real**. Leaving clears the demo data and returns to the untouched `kind-recall` database. Demo license keys also use a separate `demo:` localStorage prefix.

Every visitor-facing product claim is listed with an executable sandbox test in `.factory/claims.json`. Demo mechanics are documented in `.factory/demo.md`; landing copy and terminology are audited in `.factory/copy-audit.md`.

## Verification — 2026-08-28

- Clean install: `npm ci` — 65 packages installed; 0 vulnerabilities.
- Unit/config: `npm test` — 9/9 passed. This includes the return-set, confidence/correctness, immutable-cache, manifest MIME, and response-policy assertions.
- Type check: `npm run check` — passed with no TypeScript errors. The project has no separate lint stack.
- Production build: `npm run build` — passed; `dist/index.html` and all static routes exist.
- Browser matrix: `npm run test:e2e` — 24/24 passed across desktop Chromium and Chromium at 390×844. Coverage includes 20/21/100/101 import boundaries, atomic rejection, normal add caps, study-screen axe, all primary routes, keyboard focus/Enter, ≥44 px mobile nav targets, no 390 px overflow, persistence, demo isolation, same-origin privacy, downloads, and offline reload.
- Axe 4.10 via Playwright: zero serious/critical findings on empty, populated demo, study, privacy, and terms screens in both browser projects.
- Factory URL smoke test against the production build: HTTP 200, title, `lang`, one h1, main landmark, image alt, button names, and zero console/page errors.
- Service-worker update simulation: a changed worker revision displayed “A fresh sheet is ready.” — passed.
- Lighthouse 12.8.2 mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.7 s, CLS 0, TBT 0 ms.
- Budgets: initial JS 33.8 KB raw / 12.2 KB gzip; CSS 19.9 KB raw / 5.1 KB gzip; largest hero 41.8 KB WebP / 30.5 KB AVIF. All are below the 200/50/300 KB limits.
- `npm audit --omit=dev` — 0 vulnerabilities.

## Run and deploy

```sh
npm ci
npm test
npm run check
npm run build
npm run test:e2e
/opt/fleet/lib/deploy-static.sh kind-recall dist
```

Deploy `dist/` as the unchanged `pwa-offline` static artifact. Production billing remains `https://api.sociobot.in/api/v1/products/kind-recall/...`; other hosts use the pilot API unless `VITE_BILLING_BASE` is set.

## Live verification

Pending deployment in this work order.

## Known constraints

- Browser storage can be evicted or cleared. JSON backup is available; audio remains intentionally excluded from portable exports.
- Microphone recording depends on browser support and permission. Typed recall remains available without it.
- The private post-launch success measure still requires separate aggregate research; no behavioral tracking was added.
