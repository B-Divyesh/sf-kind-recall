# Kind Recall

Kind Recall is a private, offline-first vocabulary recall tool for adult language learners. It turns the learner’s own sentences into short free-recall prompts, records confidence separately from correctness, and offers a deliberately small return set after a week away. There are no streaks or public scores.

Live product: <https://kind-recall.sociobot.in>

## What v1 includes

- A local working set of words, meanings, and personal fill-in-the-blank contexts.
- Typed recall and optional on-device voice recordings; pronunciation and accents are never ranked.
- A small due queue with five-item lapse recovery after seven days away.
- Separate self-reported correctness and confidence, with a simple spaced schedule.
- Word editing, deletion with confirmation, 30-day accuracy, and review history.
- JSON backup/import and CSV export.
- Installable PWA behavior and tested offline reloads.
- A useful free tier (20 words and three voice notes) plus a $12 one-time Plus unlock (100 words and unlimited voice notes) through the Sociobot billing API.

All study content lives in browser IndexedDB. There is no account, advertising, or third-party analytics. Voice notes are intentionally excluded from exports; this is stated in the UI and privacy page.

## Develop and verify

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
npm test
npm run check
npm run build
npm run test:e2e
```

`npm run build` is the deployment command. It produces the complete static site at `dist/`, with `dist/index.html` at its root. It also derives optimized hero formats and PWA icons from the original source assets, then writes a versioned precache service worker.

Playwright is pinned to 1.58.2. The E2E suite uses the preinstalled Chromium browser and covers desktop, 390 px mobile, persistence, legal routes, axe accessibility checks, and offline reload.

## Billing configuration

On the production hostname, checkout and verification use `https://api.sociobot.in/api/v1/products/kind-recall/...`. Other hosts default to the pilot API. Override the API origin at build time when needed:

```sh
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

No payment-provider product ID or secret is embedded. The factory registers and switches the product outside this repository.

## Project notes

- Product scope: [.factory/brief.json](.factory/brief.json)
- Visual system and generated-asset provenance: [.factory/design.md](.factory/design.md)
- Verification and handoff: [.factory/handoff.md](.factory/handoff.md)
- Privacy: `/privacy/`
- Terms: `/terms/`

## License

MIT — see [LICENSE](LICENSE).
