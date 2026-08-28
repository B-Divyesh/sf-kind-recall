# Independent verification 2 — FAIL

**Candidate:** `6c731c1df35ca581159a67fe19c9c02d0379d6c1`  
**Live URL:** <https://kind-recall.sociobot.in/>  
**Verified:** 2026-08-28  
**Verdict:** **FAIL**

This is a fresh verification superseding the deployment-specific findings in
`.factory/verification.md`. The live site does serve the exact candidate and
the billing verification endpoint is now rate limited. The candidate still
fails the product contract because an unlicensed user can import an unlimited
word set (including over the paid limit), and axe reports a serious
accessibility violation in the core recall screen.

## Environment and artifact identity

- Created a clean detached Git worktree at exactly
  `6c731c1df35ca581159a67fe19c9c02d0379d6c1`; the repository worktree was not
  used to install or run the candidate.
- Ran `npm ci` successfully: 65 packages installed and 0 audit
  vulnerabilities (`npm audit --omit=dev`). There is no repository lint script.
- The exact `npm run build` succeeded and generated `dist/`.
- Live SHA-256 values exactly match this clean production build for all checked
  shipped entry points:

  | Artifact | SHA-256 |
  | --- | --- |
  | `index.html` | `3f3ddb7318f4057638b2e2d3ab527459bf5a62db1114febc74c313ef8e59e24c` |
  | `assets/main-CtOE-z_A.js` | `7a3ae430fe143194af05fcbf853d6cca8beab1febca3bb0c37c758e9c958a2a1` |
  | `assets/main-E5c6nx3t.css` | `940c5c69949ba6a4b0399fcc40dafe57fe286d48e74264d4241c8d97f23f4d02` |
  | `sw.js` | `5f4e1ad556af80a42ecaeb175d36b675cef148b4051149afe6848fceba4a3742` |
  | `manifest.webmanifest` | `cae997cd8b3bccac88e68113761a45d209ff89d117424de766b4b29ac0e6602c` |
  | `offline.html` | `b9eb22bee54409070a5c55767936517e05c324475c3b7eb7a48c5d8e4d1e8d2a` |
  | `privacy/index.html` | `69f774567da3b2cab1fdc8ed011dab025942def25bb4590ea063524dfffd0ce4` |
  | `terms/index.html` | `5072cce6def646f0ece1340c0948df3aed95ecc2eafb5ef2884c48d6639ee6f0` |

## Automated quality gates

- `npm test`: **6/6** Vitest scheduler tests passed.
- `npm run check`: passed with no TypeScript errors.
- `npm run build`: passed; initial app JS is 30.8 KB raw / 11.2 KB gzip and
  CSS is 19.0 KB raw / 4.9 KB gzip (within the 200 KB / 50 KB static budgets).
  Largest hero asset is 41.8 KB WebP / 30.5 KB AVIF (within the 300 KB budget).
- `npm run test:e2e`: **8/8** supplied Playwright tests passed on desktop
  Chromium and 390×844 Chromium mobile, including a first-load offline reload.
- Fresh axe WCAG 2 A/AA scans had zero serious/critical findings on the empty
  dashboard, populated home, privacy, and terms. The study state has the
  serious finding recorded below; therefore the required zero serious/critical
  result across the product was not achieved.
- A Lighthouse CLI run was attempted twice (v13.0.1 and v12.8.2 against the
  clean local production build, with the installed Chromium executable). Both
  completed collection but the browser closed during Lighthouse's BFCache
  artifact phase, so no report was emitted. This is a verifier-tooling failure,
  not treated as a product score. Bundle sizes, Playwright, axe, and browser
  console checks above are fresh evidence.

## End-to-end product evidence

- Desktop normal path: add `hola` with a personal `___` sentence → begin
  recall → enter a nonmatching answer → reveal → choose confidence and
  correctness separately → schedule persists and session completes.
- Invalid/recovery paths: empty add form shows its required-fields error;
  a context without `___` reports the specific error and returns focus to the
  context field; malformed JSON import reports a supported-export error.
  Required confidence is blocked by native validation and focuses the first
  confidence input.
- Keyboard-only: Tab reaches the visible skip link (3 px solid outline), then
  the Add word control; Enter, typing, Tab, and Enter completed adding a word.
- Lapse boundary: six due words with `lastStudyAt` eight days ago rendered
  “Welcome back. Start small.”, “You have 5 gentle return prompts.” and
  `PROMPT 1 / 5`.
- Mobile: at 390×844 there was no horizontal overflow (`scrollWidth = 390`)
  and all four bottom-nav controls measured at least 84×63 px. Under reduced
  motion the recall-card animation computed to `1e-05s` (effectively disabled).
- Console and page errors: none in clean desktop, mobile, or live-browser
  sessions.

## PWA, privacy, and outbound-network evidence

- The manifest has standalone display, root scope, versioned start URL, and
  192/512/maskable icons. The live page registered and was controlled by its
  service worker; after a successful online visit, `context.setOffline(true)`
  and reload left the app usable with its offline banner.
- In an isolated local static server, a changed `sw.js` response on explicit
  service-worker update produced the in-app “A fresh sheet is ready. Update
  app” toast. The service-worker update path works.
- A fresh normal landing made only same-origin requests (HTML, local JS/CSS,
  icon, and local AVIF/WebP image). No analytics, third-party scripts, remote
  fonts, account/sign-in calls, or speech-rating requests were observed.
  Content uses IndexedDB; optional recording uses local MediaRecorder. The
  only application outbound endpoint is the stated Sociobot billing endpoint
  when a license is supplied. No sign-in is present, so Entra validation is
  not applicable.
- Checkout points to the required
  `https://api.sociobot.in/api/v1/products/kind-recall/checkout`. A production
  invalid-token verification response was `200`, `valid:false`,
  `Cache-Control: no-store`; CORS explicitly allowed
  `https://kind-recall.sociobot.in`.
- Rate limiting is now present: following a single baseline request, a burst
  of 60 concurrent invalid-token GETs to the production `/verify` endpoint
  first observed `429` at burst request **15**, with `Retry-After: 4` seconds.
  This passes the work-order rate-limit requirement and supersedes VFY-001 in
  the earlier report.

## Live response policy and caching

- Root, privacy, terms, manifest, service worker, and offline routes all
  returned 200 over HTTPS. Live first-use PWA check at 390 px passed with no
  console/page errors.
- HSTS, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin` are present.
- Hashed JS/CSS assets still return `Cache-Control: public, must-revalidate,
  max-age=30`, rather than a long-lived immutable policy; `sw.js` and HTML
  should remain short-lived, but hashed assets should not. The manifest is
  still served as `application/octet-stream`, not `application/manifest+json`.
- No `Content-Security-Policy`, `Permissions-Policy`, or `X-Frame-Options` was
  returned. These are hardening recommendations, not the principal FAIL.

## Defects

### High — VFY2-001: import bypasses both the free and Plus working-set caps

The brief and product UI promise 20 free words and 100 Plus words. On a fresh,
unlicensed browser profile, Settings → Import JSON accepted a syntactically
valid Kind Recall bundle containing 101 words. The library then displayed
exactly:

```text
WORKING SET · 101/20
```

`importBundle()` validates the bundle format but does not apply either the
20-word free or 100-word Plus limit. This lets an unlicensed learner bypass the
paid capacity and lets any learner exceed the advertised maximum. Enforce the
active limit during import (with a clear choice/error), and test imports at 20,
21, 100, and 101 words.

### High — VFY2-002: core recall screen has a serious axe ARIA violation

On the populated study screen, fresh axe 4.10 WCAG A/AA analysis reports
`aria-prohibited-attr` at serious impact:

```html
<div class="progress-track" aria-label="0 of 1 complete"><i style="width:0%"></i></div>
```

The failure says `aria-label` cannot be used on a `div` without a valid role.
Use a semantic progress indicator or add an appropriate ARIA progressbar role
and value attributes. This violates the explicit release gate of zero
serious/critical axe findings.

### Medium — VFY2-003: deployed hashed assets are not long-lived immutable

The live `main-CtOE-z_A.js` and `main-E5c6nx3t.css` use only a 30-second,
must-revalidate cache policy. Configure long `max-age` plus `immutable` for
hashed assets; preserve short revalidation for HTML and worker update checks.

### Low — VFY2-004: deployed manifest has a generic binary MIME type

`/manifest.webmanifest` returns `application/octet-stream`. Chromium accepted
it in this verification, but deployment should map it to
`application/manifest+json` for PWA interoperability.

## Required disposition

**Do not mark this candidate PASS or release it.** Fix VFY2-001 and VFY2-002,
then redeploy and independently rerun import-cap, study-screen axe, offline,
and live artifact/caching checks. Address VFY2-003 and VFY2-004 in the same
deployment configuration pass.
