# Independent verification — FAIL

**Candidate:** `6c731c1df35ca581159a67fe19c9c02d0379d6c1`  
**Live URL:** <https://kind-recall.sociobot.in/>  
**Verified:** 2026-08-28  
**Verdict:** **FAIL**

The candidate is a functional, small local-first vocabulary-recall PWA, and the
live deployment serves the exact candidate artifact. It does not meet the
factory release contract because the production product-unlock verification API
does not rate limit a request burst, and the deployment does not provide the
required immutable caching for hashed static assets.

## Exact artifact and environment

- Made a separate clean clone at the candidate SHA, ran `npm ci`, and tested
  from that clone. The source worktree was not used for execution.
- `https://kind-recall.sociobot.in/` HTML SHA-256 was
  `3f3ddb7318f4057638b2e2d3ab527459bf5a62db1114febc74c313ef8e59e24c`,
  exactly matching the clean production build's `dist/index.html`.
- The live and local SHA-256 values also matched for `main-CtOE-z_A.js`
  (`7a3ae430…958a2a1`), `main-E5c6nx3t.css`
  (`940c5c69…f23f4d02`), and `sw.js` (`5f4e1ad5…ba4a3742`).

## Checks that passed

- Clean install: `npm ci` completed with 0 audit vulnerabilities.
- Unit tests: `npm test` — 6/6 passed.
- Static type check: `npm run check` — passed. No lint script exists.
- Exact production build: `npm run build` — passed and produced `dist/`.
- Repository E2E suite: `npm run test:e2e` — 8/8 passed in desktop Chromium
  and the configured 390×844 mobile project.
- Independent desktop/mobile browser checks: no page errors or console errors;
  no horizontal overflow at 390 px; Tab order reaches skip link, wordmark and
  all main navigation; the focused control has a visible 3 px vermilion
  outline; Enter activates the focused Add word control.
- Browser accessibility: axe WCAG 2 A/AA serious/critical findings: 0 on the
  empty desktop dashboard, Settings after error handling, and the 390 px live
  dashboard. The document has `lang`, title, a single page `h1`, main landmark,
  labels, alt text, and a skip link.
- Representative product flows: valid word → typed recall → separate
  confidence/correctness → persisted schedule; blank form and missing `___`
  errors recover in place; malformed JSON import reports an error; named native
  delete confirmation works; JSON and CSV downloads were produced; free limit
  correctly blocks a 21st word after importing 20 words.
- Lapse boundary: six persisted due words and `lastStudyAt` eight days ago
  rendered `RETURN SET / 05`, "No catching up required", began with the oldest
  word, and displayed `PROMPT 1 / 5`.
- Privacy/network: content is held in IndexedDB; the normal fresh experience
  made no third-party requests, has no account/sign-in, analytics, remote font,
  or speech-rating request. Optional audio uses local `MediaRecorder`. There is
  therefore no Entra tenant to validate.
- PWA: after a successful online load, a mobile live page remained usable after
  `context.setOffline(true)` and reload, with service-worker control and the
  offline banner. A locally served changed worker revision made the in-app
  "A fresh sheet is ready" update toast visible. The built initial JS is 30.8
  KB raw / 11.2 KB gzip and CSS is 19.0 KB raw / 4.9 KB gzip, both inside budget;
  largest shipped hero is 41.8 KB WebP.
- Live response basics: HTTPS, HSTS, `nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin` are present. Root and legal
  routes returned 200. No browser response or console errors occurred.

## Defects

### High — VFY-001: product license-verification endpoint has no observed rate limit

The app's production unlock path is
`GET https://api.sociobot.in/api/v1/products/kind-recall/verify?license=…`.
A baseline invalid token returned `200`, `{"valid":false,"reason":"invalid"}`
and `Cache-Control: no-store`. A burst of **120** unique invalid-token requests
at **24 concurrent requests** returned **120 × 200** over 6.8 seconds. No
response was `429` and no `Retry-After` value was observed. Thus no threshold
was observed through 120 rapid requests.

This directly fails the work-order requirement that every server endpoint,
including product-unlock calls, begin returning `429` with `Retry-After` under
a burst. Add rate limiting at the billing API/gateway and retest until the
threshold and header can be recorded.

### Medium — VFY-002: production hashed assets are not immutable or long-lived cached

Live `main-CtOE-z_A.js`, `main-E5c6nx3t.css`, and `sw.js` all return
`Cache-Control: public, must-revalidate, max-age=30`. The PWA contract requires
long-lived immutable caching for hashed assets. Configure deployed hashed
assets with a long `max-age` and `immutable`; keep the HTML/service-worker
update path short-lived as appropriate.

### Low — VFY-003: manifest is sent as generic binary

`/manifest.webmanifest` returns `Content-Type: application/octet-stream`, not
`application/manifest+json`. Chromium accepted it in this check, but the
generic MIME type is an avoidable PWA interoperability risk. Correct the
deployment MIME mapping.

## Response-policy observations

No `Content-Security-Policy`, `Permissions-Policy`, or `X-Frame-Options` header
was returned by the live site. These were not the basis of the FAIL, but a
restrictive CSP and an explicit microphone permissions policy are recommended
before launch.

## Required disposition

Do not release this candidate as PASS. Remediate VFY-001 and VFY-002 (and
preferably VFY-003), deploy, then perform a fresh live verification.
