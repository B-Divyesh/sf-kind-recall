# Kind Recall build handoff

## Independent verification status — FAIL (2026-08-28)

Candidate `6c731c1df35ca581159a67fe19c9c02d0379d6c1` was independently verified
against <https://kind-recall.sociobot.in/>. The live HTML, JS, CSS, and service
worker exactly match the clean candidate build, and the core app/PWA flow
passes. **This handoff is nevertheless a FAIL.**

- **High:** the production Sociobot license verification endpoint returned 200
  for every request in a 120-request, 24-concurrent invalid-token burst; it
  never returned 429 or `Retry-After`.
- **Medium:** deployed hashed JS/CSS/SW assets have only
  `Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived
  immutable caching required for this PWA.
- **Low:** the live manifest is served as `application/octet-stream`, not
  `application/manifest+json`.

See `.factory/verification.md` for commands, artifact hashes, exhaustive
passing checks, response-policy observations, and remediation criteria. Do not
ship until the high- and medium-severity issues are fixed and independently
retested.

## Shipped

Kind Recall is a complete local-first vocabulary practice PWA built with Vite and TypeScript. Learners can add up to 20 words free (100 with Plus), write personal blanked contexts, complete typed or optional spoken recall prompts, reveal answers, and record confidence separately from correctness. Reviews are rescheduled locally. After seven days away, the session becomes a forgiving return set capped at five of the oldest due words.

The library supports editing and confirmed deletion. Settings provides portable JSON backup/import, CSV export, voice-note disclosure, and the $12 one-time Sociobot license purchase/restore flow. Returned licenses are stored under `sb_license:kind-recall`; verification is cached for at most one day and never blocks the free experience.

User content, history, and recordings are stored in IndexedDB. Voice recordings never leave the device, are never automatically judged, and are excluded from exports. There is no account, advertising, third-party runtime script, font CDN, or analytics.

The visual implementation follows `.factory/design.md`: warm drafting stock, architectural navy rules, vermilion revisions, condensed technical headings, serif personal notes, CSS construction grid, and a generated drafting-table hero. Original source, prompt, and provenance are in `assets/src/`; the build produces AVIF/WebP derivatives and hand-authored app icons.

## Run and deploy

```sh
npm install
npm test
npm run check
npm run build
npm run test:e2e
```

Deploy `dist/`. The required build command is exactly `npm run build`; `dist/index.html` is at the root. `/privacy/` and `/terms/` are physical static entry points. Production uses the live Sociobot billing API; non-production hosts use the pilot API unless `VITE_BILLING_BASE` is provided.

## Verification — 2026-08-28

- `npm test`: 6/6 scheduler tests passed.
- `npm run check`: TypeScript passed with no errors.
- `npm run build`: passed; reproducible static output in `dist/`.
- `npm run test:e2e`: 8/8 passed across desktop Chromium and 390×844 mobile. Covers add → recall → reschedule → reload, direct legal routes, axe WCAG A/AA scan, and `context.setOffline(true)` reload.
- Factory `verify-url.sh`: HTTP 200, title and `lang`, exactly one h1, main landmark, image alt, button labels, and zero console/page errors all passed.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 0.9 s, LCP 1.8 s, CLS 0, total blocking time 0 ms.
- Initial app JS: 30.8 KB / 11.2 KB gzip (budget 200 KB). CSS: 19.0 KB / 4.9 KB gzip (budget 50 KB). Largest hero file: 41.8 KB WebP / 30.5 KB AVIF (budget 300 KB). No web fonts.
- `npm audit`: 0 vulnerabilities.
- Original generated hero was visually reviewed: blank cards, coherent objects, no stray text, logos, brands, anatomy, or seams.

## Known gaps and next steps

- Browser storage can be evicted by the browser or cleared by the learner; the product clearly recommends JSON backups. Audio is not exported because a portable recording archive would need a separate, carefully versioned format.
- Microphone recording depends on browser support and permission. Typed recall remains fully functional without it.
- The factory still needs to register the live `kind-recall` paid product and set its return URL before launch; there are no provider IDs or secrets in this repository.
- The 30-day return/accuracy success measure requires post-launch, privacy-respecting aggregate research; this build intentionally does not add behavioral tracking.
