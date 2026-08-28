# Kind Recall visual thesis

## Direction: a forgiving blueprint drafting sheet

Kind Recall is a working surface, not a scoreboard. The interface borrows the calm precision of a well-used drafting sheet: fine blue construction lines organize each thought, small vermilion revision marks show what changed, and warm paper makes returning feel human. Vocabulary is framed as something the learner is *building into use*, not a quota they failed to meet.

The treatment is deliberately single-mode. A blueprint can be blue paper with white lines, but that would reduce reading comfort; this product uses the daylight drafting-table variant and paints every surface explicitly. This supports longer typed-recall sessions and remains recognizable in installed-app chrome.

## Tokens

- `paper #F5F0E3`: warm drafting stock; page background.
- `paper-raised #FFFDF7`: answer areas and independent sheets.
- `ink #14283A`: primary navy text, 13.4:1 on paper.
- `ink-soft #4D6070`: annotations and secondary copy, 5.6:1 on paper.
- `rule #8FA9B8`: construction lines; never carries meaning alone.
- `blue #175D7A`: primary actions and strong diagram strokes; white contrast 6.8:1.
- `redline #A33A2B`: revision/accent marks; white contrast 6.7:1.
- `success #27623F`, `warning #80520A`, `danger #942F2F`: always paired with labels or icons.

No gradients. A CSS-drawn 24 px grid and sparse registration marks are explanatory texture: they make all screens read as parts of the same learning plan.

## Type and spacing

- Headings and labels: `Arial Narrow`, `Aptos Narrow`, `Roboto Condensed`, system sans fallback. Condensed capitals echo drawing titles without requiring a downloaded font.
- Body and input: `Georgia`, `Charter`, serif fallback. It makes personal sentences feel like authored notes rather than interface data.
- Scale: 14 annotation, 16 body minimum, 19 lead, 24 section, 32 page, 44 display. Body leading is 1.55 and readable measures stay below 70 characters.
- Spacing follows a 4/8 px rhythm: 4, 8, 12, 16, 24, 32, 48, 64. Touch targets are at least 44 px and adjacent targets have at least 8 px clearance.

## Interaction grammar

- The primary task is always the darkest filled button; secondary controls are ink outlines on paper.
- Recall unfolds like lifting tracing paper: prompt, response, then evaluation in the same spatial position.
- Confidence and correctness are separate visible controls. Feedback says “recorded,” never “won” or “failed.”
- After seven idle days, due items become the gentle “return set”: five oldest prompts first, with explicit permission to stop.
- Deletions require a named confirmation. Import validates before replacement and never silently merges malformed data.
- Mobile drops the decorative hero illustration during study and stacks controls into a single work column. Desktop retains a narrow project index beside the active sheet.

## Motion policy

State changes use 180–240 ms opacity and 8 px vertical translation, like a sheet settling on a table. Buttons compress by 1 px while pressed. Nothing loops. With `prefers-reduced-motion: reduce`, translations and smooth scrolling are removed and state changes are instant; depth remains through borders, shadows, and scale.

## Original asset plan and provenance

- Hero illustration: an AI-generated still-life of a drafting table where sentence fragments are represented only by abstract index-card marks, blue technical geometry, and one vermilion revision pencil. No legible text, logos, people, or brands. It clarifies the product metaphor rather than depicting a capability.
- App icons: hand-authored SVG drafting compass/recall loop mark, rasterized locally to required sizes. Original MIT-licensed work in this repository.
- Grid, registration marks, confidence gauge, and UI icons: hand-authored CSS/SVG.

### Hero prompt sheet

Subject: an overhead editorial still life of a language learner’s drafting table, one small blank index card connected to a second card by precise blueprint construction lines, a vermilion red pencil making a gentle curved revision mark, brass compass and translucent tracing paper. World/materials: warm ivory drafting paper, navy ink, aged brass, graphite, subtle paper grain. Light/lens: calm diffuse morning window light, orthographic top-down composition, crisp edges, generous empty space, tactile but restrained. Palette words: warm paper, architectural navy, faded cyan rule, vermilion revision. Negative list: no people, no hands, no faces, no readable text, no letters, no numbers, no watermark, no logo, no brands, no neon, no gradient, no glossy 3D UI, no phone mockup.

Generated with the factory Azure image model (`factory-image`) on 2026-08-28. Source prompt and generation metadata live beside the source image in `assets/src/hero-drafting.json`. Generated imagery is original to Kind Recall and is disclosed in the footer.
