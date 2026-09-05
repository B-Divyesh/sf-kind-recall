# Practice vocabulary recall — independent verification 3

**Verdict: FAIL**

- Live URL: <https://kind-recall.sociobot.in/>
- Implementation candidate: `7e0eb6ef165761bab9d5803335f2f7985eaced69`
- Documentation reviewed: `757589be55c299d129fd15bb007cef5b829f39cc`
- Verified: 2026-09-05
- Findings: **7** — 1 high, 4 medium, 2 low
- Untested public claims: **13**

The main vocabulary-recall job works on desktop and phone. The release does not meet the full factory contract. A PASS requires no findings and no untested claims.

## Job, audience, and first action

- Job: practise recalling a word inside the learner's own sentence, then record confidence separately from correctness.
- Audience: adult language learners who want usable vocabulary without streak pressure.
- First action: **Try it with sample data**.

The live headline and first action state the job before scrolling at 390×844 and 1366×900. The intended audience is present in the brief but is not stated on the live first screen. This is part of VFY3-002.

## Candidate and live artifact

`757589b` changes only `.factory/handoff.md` relative to `7e0eb6e`; there is no product change between them. A fresh build from the documentation commit therefore represents implementation candidate `7e0eb6e`.

The live files match that fresh build exactly:

| File | Local and live SHA-256 |
| --- | --- |
| `/index.html` | `f3f3b6075fb35edf6f70bec44310b10830829829a5179f10a4329ef381fc1188` |
| `/demo/index.html` | `5d34b757597b509b228efaa57eec467596a49cba1f7389ebefe8cd3ff2a10766` |
| `/privacy/index.html` | `477eb5a1d18069bc31966d19c1e486b3ed6f21351da636d2a5fa17b03f23c13c` |
| `/terms/index.html` | `988d53833862c40b38deb098420154fc6999d081ca10245a4ce05799e61c4e5d` |
| `/_app/main-C-Pxn0Lv.js` | `a2d9f86763347c89cab4b08d0f9204d58499fc689f23651c5d5d024317c3fe27` |
| `/_app/main-DoJPQJWa.css` | `67abfe23794e730b66ddf87cdae2801e78a3dbad7a4021a9bd56085cf07d6989` |
| `/sw.js` | `f5a464d72c500f17cc2db8387dfa6951559dd2f1ad21b8a0a44c984c84bcc1e8` |
| `/manifest.webmanifest` | `cae997cd8b3bccac88e68113761a45d209ff89d117424de766b4b29ac0e6602c` |

## Clean-checkout commands

A separate clone at `757589b` used Node 22.23.2 and npm 10.9.8.

| Command | Result |
| --- | --- |
| `npm ci` | Pass; 65 packages, 0 vulnerabilities |
| `npm test` | Pass; 10/10 |
| `npm run check` | Pass |
| `npm run build` | Pass; `dist/` created |
| `npm run test:e2e` | Pass; 24/24 across desktop Chromium and 390×844 Chromium |
| `npm audit --omit=dev` | Pass; 0 vulnerabilities |

Every command in `.factory/claims.json` was then run separately and passed:

| Claim | Exact command | Result |
| --- | --- | --- |
| `offline-reload` | `npm run test:e2e -- --grep @claim:offline-reload` | 2/2 pass |
| `local-private` | `npm run test:e2e -- --grep @claim:local-private` | 2/2 pass |
| `capacity-limits` | `npm run test:e2e -- --grep @claim:capacity-limits` | 2/2 pass |
| `csv-export` | `npm run test:e2e -- --grep @claim:csv-export` | 2/2 pass |
| `json-portability` | `npm run test:e2e -- --grep @claim:json-portability` | 2/2 pass |
| `demo-isolation` | `npm run test:e2e -- --grep @claim:demo-isolation` | 2/2 pass |
| `return-set` | `npm test -- -t @claim:return-set` | 1/1 pass |
| `separate-evaluation` | `npm test -- -t @claim:separate-evaluation` | 1/1 pass |

Each declared ID occurs once in the test source. Passing these commands does not resolve VFY3-004 because public claims outside this registry remain untested, and one listed offline test does not perform an action after reload.

## Live product checks

- Fresh desktop and phone contexts opened the root before any stored data existed. One click opened `/demo/` with six realistic words.
- The demo banner remained present during study. A real-only word was added in the normal database, the demo was opened and reset, and **Start for real** returned to the real-only word without copying a sample.
- The first sample showed “We stayed for ___ after Sunday lunch” and the meaning for `sobremesa`. Typed recall, reveal, confidence, correctness, and scheduling worked.
- Reset restored all six samples. Reload preserved a real word.
- Blank word entry and a context without `___` showed errors. The context error moved focus to the field. A denied microphone request gave a useful typed-recall recovery path. An invalid license reported that the license was inactive.
- Import boundaries 20/21 and 100/101 passed with atomic rejection in the clean browser suite.
- Keyboard Tab exposed the skip link with a 3 px focus ring; Enter moved focus to main. Mobile nav targets measured 84–86×63 px. There was no 390 px horizontal overflow.
- Reduced motion changed the recall-card animation to `0.01ms`. Axe 4.10 reported no serious or critical findings on the empty page, sample, study, privacy, or terms in fresh desktop and phone contexts.
- The live sample flow requested only `https://kind-recall.sociobot.in`. No analytics, remote fonts, or unrelated network origins were observed.
- Online load followed by offline reload retained the demo, offline label, and controls. A changed local service-worker revision raised the visible “A fresh sheet is ready. Update app” notice.
- Root, demo, privacy, terms, manifest, worker, icons, social image, robots, and sitemap returned successfully. Internal links worked. The checkout endpoint returned the expected 303 to hosted checkout; no purchase was attempted.
- `verify-url.sh` passed with one h1, `lang=en`, main, image alternatives, named controls, and no console or page errors.
- Lighthouse 12.8.2 on the live mobile page: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.4 s, CLS 0, TBT 20 ms.
- Initial app JS is 33.76 KB raw / 12.19 KB gzip; CSS is 20.03 KB raw / 5.12 KB gzip. The largest hero variant is below the stated budget.
- Live headers include CSP without `unsafe-inline`, HSTS, `nosniff`, strict-origin referrer policy, `Permissions-Policy`, and `X-Frame-Options: DENY`.
- Hashed JS/CSS use `max-age=31536000, immutable`; `sw.js` uses `no-cache, no-store, must-revalidate`; the manifest uses `application/manifest+json`.
- License verification returned a baseline invalid result with `Cache-Control: no-store` and product-origin CORS. A 60-request burst returned 20×200 and 40×429. Every 429 had `Retry-After: 3`; CORS stayed limited to `https://kind-recall.sociobot.in`.
- This is a static local-first PWA. There is no product backend, tenant database, server restart path, CLI, library, or desktop artifact to test.

## Earlier finding disposition

| Earlier item | Current evidence | Disposition |
| --- | --- | --- |
| VFY-001 rate limiting | 40/60 burst requests returned 429 with `Retry-After` | Resolved |
| VFY-002 / VFY2-003 immutable assets | Live hashed JS and CSS use one-year immutable caching | Resolved |
| VFY-003 / VFY2-004 manifest MIME | Live type is `application/manifest+json` | Resolved |
| VFY2-001 import capacity | 20/100 accepted; 21/101 rejected without writes | Resolved |
| VFY2-002 study ARIA | Native named progress element; axe clear after entrance motion settles | Resolved |
| Earlier response-policy observations | CSP, permissions policy, frame denial, nosniff, HSTS present | Resolved |
| Earlier Lighthouse tooling gap | Fresh live Lighthouse report completed at 100/100/100/100 | Resolved |
| Earlier malformed-import statement | Raw parser text appears for invalid JSON | Not resolved; see VFY3-007 |

## Findings

### High — VFY3-004: thirteen public claims lack complete claim tests

`.factory/claims.json` has eight entries, but the live UI, legal pages, and README make additional testable statements. The registry and its tests do not cover:

1. Optional voice recording works.
2. Recorded audio stays local and is never used to rank pronunciation or accent.
3. Free saves three voice notes and Plus saves unlimited notes.
4. Word editing works.
5. Deletion uses a named confirmation and removes related history/audio.
6. The 30-day recall percentage is calculated correctly.
7. Review history is stored and preserved.
8. The PWA is installable.
9. JSON import merges by entry ID and never deletes existing words.
10. Voice notes are excluded from JSON and CSV exports.
11. There is no account, advertising, third-party analytics, public score, or streak state.
12. The complete Plus lifecycle works: $12 one-time checkout, returned-token capture and URL removal, live verification/cache, restore, removal, and refund revocation.
13. The listed offline test proves an offline shell reload but does not perform recall or editing after reload, despite its sandbox saying the sample remains usable.

Some of these behaviors passed manual inspection, but the claims contract requires one executable sandbox test for every public claim. Manual evidence cannot replace the missing release tests.

### Medium — VFY3-001: unknown URLs do not provide the required 404

`/does-not-exist-verification-3` and `/404.html` both return HTTP 200 and the ordinary home page. The repository has no designed 404 page or 404 response override. This is a missing required route, not a finding against an intentional HTTP 404.

### Medium — VFY3-002: first-screen and section copy does not meet the plain-words contract

The first screen never names adult language learners. It also uses metaphor or decorative labels that the attached contract forbids, including “Project 001,” “Recognition is only the sketch,” “Today’s drafting sheet,” “The next line is already planned,” “Your practice stays yours,” and “A simple agreement.” The privacy and terms h1 text does not name each page's job. `.factory/copy-audit.md` marks the landing copy as clear but does not flag these violations.

### Medium — VFY3-003: app sections have no URL, history, title, or focus transition

Choosing Settings and Words leaves the URL at `/`, leaves the title as `Kind Recall — Make words usable`, leaves `history.length` unchanged, and moves focus to `body`. There is no `pushState`, back/forward restoration, new route title, h1 focus, or route announcement. The wordmark on app screens is also a button rather than a home link. This fails the stated routing and screen-reader contract.

### Medium — VFY3-005: required landing and shared site structure is incomplete

The landing page has no separate “what it does not do / privacy” section and no paid-tier section explaining the exact price and included features. App and legal headers are different and omit the required Demo/Privacy navigation pattern. App footers omit “Built by Param Factory” and a version/build ID; legal footers also omit the product one-line description. These are required parts of the standard skeleton.

### Low — VFY3-006: route metadata is incomplete

The root has Open Graph and Twitter metadata, but `/demo/`, `/privacy/`, and `/terms/` do not. All four route titles, descriptions, canonicals, theme colors, and root social image passed.

### Low — VFY3-007: malformed JSON exposes a parser error instead of a recovery instruction

Importing a file containing `not-json` reports `Unexpected token 'o', "not-json" is not valid JSON`. It does not tell the learner to choose a JSON file created by Kind Recall. A syntactically valid but unsupported bundle has the better recovery text; malformed input should use the same plain instruction.

## Evidence

- `/work/.evidence/verify-3/verify.json`
- `/work/.evidence/verify-3/fresh-desktop.png`
- `/work/.evidence/verify-3/fresh-mobile.png`
- `/work/.evidence/verify-3/sample-desktop.png`
- `/work/.evidence/verify-3/offline-mobile.png`
- `/work/.evidence/verify-3/lighthouse.json`

## Required disposition

**FAIL. Do not declare this release accepted.** Repair all seven findings, add complete claim tests for all thirteen items, deploy the changed product artifact, and run a fresh independent verification.
