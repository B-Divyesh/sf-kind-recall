import './styles.css';
import { addReview, clearAllData, countRecordings, deleteWord, exportBundle, getRecording, getReviews, getSetting, getWords, importBundle, saveRecording, saveWord, setSetting } from './db';
import { buildQueue, isReturnVisit, normalizeAnswer, scheduleWord } from './scheduler';
import { checkoutUrl, loadLicense, removeLicense, restoreLicense, type LicenseState } from './license';
import type { Confidence, Review, Word } from './types';

type Route = 'home' | 'library' | 'add' | 'study' | 'settings';

const DEMO_MODE = location.pathname.replace(/\/+$/, '') === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
const FREE_WORD_LIMIT = 20;
const PLUS_WORD_LIMIT = 100;

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('Kind Recall could not find its page container.');

let words: Word[] = [];
let reviews: Review[] = [];
let license: LicenseState = { unlocked: false };
let route: Route = 'home';
let editingId: string | undefined;
let queue: Word[] = [];
let queueIndex = 0;
let revealed = false;
let statusMessage = '';
let statusTone: 'neutral' | 'error' | 'success' = 'neutral';
let recorder: MediaRecorder | undefined;
let recorderStream: MediaStream | undefined;
let recordingParts: Blob[] = [];

const activeWordLimit = (): number => license.unlocked ? PLUS_WORD_LIMIT : FREE_WORD_LIMIT;

const esc = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
const uid = (): string => crypto.randomUUID();
const dateLabel = (timestamp: number): string => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
const daysAway = (timestamp: number): string => {
  const days = Math.ceil((timestamp - Date.now()) / 86_400_000);
  if (days <= 0) return 'Ready now';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

async function seedDemo(): Promise<void> {
  if ((await getWords()).length) return;
  const now = Date.now();
  const samples = [
    ['sobremesa', 'time spent talking after a meal', 'We stayed for ___ after Sunday lunch.'],
    ['meraki', 'care and creativity put into your work', 'She prepared the welcome table with ___.'],
    ['dépaysement', 'the feeling of being somewhere unfamiliar', 'The night train gave me a welcome sense of ___.'],
    ['saudade', 'a tender longing for someone or somewhere absent', 'That old song brought a sudden feeling of ___.'],
    ['komorebi', 'sunlight filtering through leaves', 'We sat quietly beneath the morning ___.'],
    ['passeggiata', 'a relaxed evening walk', 'After dinner, we joined the town’s ___.']
  ] as const;
  await Promise.all(samples.map(([term, meaning, context], index) => saveWord({
    id: `demo-word-${index + 1}`,
    term,
    meaning,
    context,
    createdAt: now - (samples.length - index) * 60_000,
    updatedAt: now,
    dueAt: now - (samples.length - index) * 1_000,
    intervalDays: 0,
    reviewCount: 0
  })));
}

function setStatus(message: string, tone: 'neutral' | 'error' | 'success' = 'neutral'): void {
  statusMessage = message;
  statusTone = tone;
  const region = document.querySelector<HTMLElement>('#status-region');
  if (region) {
    region.textContent = message;
    region.dataset.tone = tone;
  }
}

function icon(name: 'home' | 'words' | 'add' | 'settings'): string {
  const paths = {
    home: '<path d="M5 12l7-7 7 7v7h-5v-5h-4v5H5z"/>',
    words: '<path d="M5 5h6a3 3 0 013 3v11a3 3 0 00-3-3H5zm14 0h-2a3 3 0 00-3 3v11a3 3 0 013-3h2z"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1A8 8 0 0015 6l-.3-2.5h-4L10.4 6A8 8 0 008.8 7L6.5 6 4.6 9.5l2 1.5a7 7 0 000 2l-2 1.5L6.5 18l2.3-1a8 8 0 001.6 1l.3 2.5h4L15 18a8 8 0 001.6-1l2.3 1 2-3.5-2-1.5a7 7 0 00.1-1z"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function shell(content: string, active?: Route): string {
  return `
    <div class="offline-bar" id="offline-bar" ${navigator.onLine ? 'hidden' : ''}>Offline — your words and recall still work on this device.</div>
    ${DEMO_MODE ? '<aside class="demo-bar" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved to your real sheet.</strong><span><button class="text-button" data-action="reset-demo">Reset demo</button><button class="text-button" data-action="start-real">Start for real</button></span></aside>' : ''}
    <header class="site-header">
      <button class="wordmark" data-route="home" aria-label="Kind Recall home"><img src="/icons/icon.svg" width="36" height="36" alt=""><span>Kind <i>Recall</i></span></button>
      <p class="privacy-mark"><span aria-hidden="true">●</span> On-device by default</p>
    </header>
    <div class="app-frame">
      <nav class="main-nav" aria-label="Main navigation">
        <button data-route="home" ${active === 'home' ? 'aria-current="page"' : ''}>${icon('home')}<span>Today</span></button>
        <button data-route="library" ${active === 'library' ? 'aria-current="page"' : ''}>${icon('words')}<span>Words</span></button>
        <button data-route="add" class="nav-add" ${active === 'add' ? 'aria-current="page"' : ''}>${icon('add')}<span>Add word</span></button>
        <button data-route="settings" ${active === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}<span>Settings</span></button>
      </nav>
      <main id="main" tabindex="-1">${content}</main>
    </div>
    <div id="status-region" class="status-region" data-tone="${statusTone}" role="status" aria-live="polite">${esc(statusMessage)}</div>
    <div class="update-toast" id="update-toast" hidden><span>A fresh sheet is ready.</span><button data-action="update-app">Update app</button></div>
    <footer><span>Private by design. No account, ads, or streaks.</span><span><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a> · Generated illustration disclosed</span></footer>`;
}

function accuracySummary(): { total: number; percent: number } {
  const recent = reviews.filter((review) => review.createdAt >= Date.now() - 30 * 86_400_000);
  return { total: recent.length, percent: recent.length ? Math.round(recent.filter((review) => review.correct).length / recent.length * 100) : 0 };
}

async function renderHome(): Promise<void> {
  const lastStudyAt = await getSetting<number>('lastStudyAt');
  const due = buildQueue(words, lastStudyAt);
  const returning = isReturnVisit(lastStudyAt) && due.length > 0;
  const accuracy = accuracySummary();
  if (!words.length) {
    app.innerHTML = shell(`
      <section class="empty-hero">
        <div class="hero-copy">
          <p class="eyebrow">Project 001 · your working vocabulary</p>
          <h1>Make a word<br><em>ready to use.</em></h1>
          <p class="lede">Recall words inside sentences that matter to you. No streaks. No shame after time away. Just a small, useful return.</p>
          <div class="hero-actions"><a class="primary large" href="/demo/">Try it with sample data <span aria-hidden="true">→</span></a><button class="secondary large" data-route="add">Add your first word</button></div>
          <p class="action-note">The sample opens a ready-to-use recall sheet. Your own sheet stays unchanged.</p>
          <ul class="plain-facts"><li>Works offline after the first visit</li><li>Words stay in this browser</li><li>20 words free; Plus costs $12 once</li></ul>
        </div>
        <figure class="hero-figure">
          <picture><source type="image/avif" srcset="/assets/hero-drafting-720.avif 720w, /assets/hero-drafting-1200.avif 1200w"><img src="/assets/hero-drafting-720.webp" srcset="/assets/hero-drafting-720.webp 720w, /assets/hero-drafting-1200.webp 1200w" sizes="(max-width: 800px) 100vw, 52vw" width="1200" height="800" fetchpriority="high" alt="Two blank index cards connected by a red revision arrow on an architectural drafting sheet"></picture>
          <figcaption><span>A</span> Your context <i></i> <span>B</span> Usable recall</figcaption>
        </figure>
      </section>
      <section class="how-strip" aria-labelledby="how-title"><div><p class="eyebrow">Method note</p><h2 id="how-title">Recognition is only the sketch.</h2></div><ol><li><b>01</b><span>Write a personal sentence</span></li><li><b>02</b><span>Retrieve the missing word</span></li><li><b>03</b><span>Judge accuracy and confidence separately</span></li></ol></section>`, 'home');
    return;
  }

  app.innerHTML = shell(`
    <section class="dashboard-head">
      <div><p class="eyebrow">Today’s drafting sheet</p><h1>${returning ? 'Welcome back. Start small.' : due.length ? 'A few words are ready.' : 'Your words are resting.'}</h1><p class="lede">${returning ? `You have ${due.length} gentle return prompt${due.length === 1 ? '' : 's'}. Five is enough today.` : due.length ? 'Say or type each word before you reveal it.' : 'Nothing is due. Add a word from a recent conversation, or come back later.'}</p></div>
      <div class="due-dial" aria-label="${due.length} words ready"><span>${due.length}</span><small>ready</small></div>
    </section>
    <section class="action-sheet ${returning ? 'return-sheet' : ''}" aria-labelledby="session-title">
      <div class="sheet-number">${returning ? 'RETURN SET' : 'RECALL SET'} / ${String(Math.max(due.length, 1)).padStart(2, '0')}</div>
      <div><h2 id="session-title">${returning ? 'No catching up required' : due.length ? `${due.length} prompt${due.length === 1 ? '' : 's'}, about ${Math.max(1, due.length)} min` : 'The next line is already planned'}</h2><p>${returning ? 'We chose the five oldest prompts. Your other words can wait.' : due.length ? 'Confidence is recorded separately from correctness.' : `Next review: ${dateLabel(Math.min(...words.map((word) => word.dueAt)))}`}</p></div>
      ${due.length ? '<button class="primary" data-action="start-session">Begin recall <span aria-hidden="true">→</span></button>' : '<button class="secondary" data-route="add">Add another word</button>'}
    </section>
    <section class="metrics" aria-label="Your learning record"><div><span>${words.length}</span><small>words on sheet</small></div><div><span>${accuracy.total ? `${accuracy.percent}%` : '—'}</span><small>30-day free recall</small></div><div><span>${reviews.length}</span><small>attempts recorded</small></div></section>`, 'home');
}

function renderLibrary(): void {
  app.innerHTML = shell(`
    <section class="page-title"><div><p class="eyebrow">Working set · ${words.length}/${activeWordLimit()}</p><h1>Your words, in context.</h1><p class="lede">These are your own sentences. The next date changes only when you review.</p></div><button class="primary" data-route="add">Add a word</button></section>
    ${words.length ? `<ul class="word-list">${words.map((word, index) => `<li><div class="word-index">${String(index + 1).padStart(2, '0')}</div><div class="word-body"><h2>${esc(word.term)}</h2><p class="meaning">${esc(word.meaning)}</p><p class="context">“${esc(word.context)}”</p></div><div class="word-plan"><span>${daysAway(word.dueAt)}</span><small>${word.reviewCount} review${word.reviewCount === 1 ? '' : 's'}</small></div><div class="row-actions"><button class="icon-button" data-action="edit-word" data-id="${word.id}" aria-label="Edit ${esc(word.term)}">Edit</button><button class="icon-button danger-text" data-action="delete-word" data-id="${word.id}" aria-label="Delete ${esc(word.term)}">Delete</button></div></li>`).join('')}</ul>` : `<section class="empty-sheet"><div class="registration-mark" aria-hidden="true">+</div><h2>The sheet is clear.</h2><p>Add a word you wished you had in a real conversation.</p><button class="primary" data-route="add">Add your first word</button></section>`}
  `, 'library');
}

function renderWordForm(): void {
  const editing = words.find((word) => word.id === editingId);
  const limit = activeWordLimit();
  const limitReached = words.length >= limit && !editing;
  app.innerHTML = shell(`
    <section class="form-layout">
      <div class="form-intro"><p class="eyebrow">${editing ? 'Revise entry' : 'New entry'}</p><h1>${editing ? `Adjust “${esc(editing.term)}”.` : 'Start with a real moment.'}</h1><p class="lede">Use a sentence from your life. Replace the word with three underscores so recall has somewhere to happen.</p><div class="example-note"><span>EXAMPLE / 01</span><p>Word: <b>sobremesa</b></p><p>Meaning: time spent talking after a meal</p><p>Context: We stayed for ___ after Sunday lunch.</p></div></div>
      <div class="form-sheet">
        ${limitReached ? `<div class="limit-note"><h2>Your ${license.unlocked ? 'Plus' : 'free'} sheet holds ${limit} words.</h2><p>${license.unlocked ? 'Remove a word before adding another.' : 'Keep practising and exporting them for free, or get room for 100 words and unlimited voice notes.'}</p>${license.unlocked ? '' : `<a class="primary" href="${checkoutUrl()}">Get Plus once for $12</a>`}</div>` : `<form id="word-form" novalidate>
          <label for="term">Word or phrase <span>required</span></label><input id="term" name="term" required maxlength="80" autocomplete="off" value="${editing ? esc(editing.term) : ''}">
          <label for="meaning">Meaning in your own words <span>required</span></label><textarea id="meaning" name="meaning" required maxlength="240" rows="3">${editing ? esc(editing.meaning) : ''}</textarea>
          <label for="context">A personal sentence with ___ <span>required</span></label><textarea id="context" name="context" required maxlength="300" rows="4" aria-describedby="context-help">${editing ? esc(editing.context) : ''}</textarea><p id="context-help" class="field-help">Use exactly where the missing word belongs. Your sentence stays on this device.</p>
          <div class="form-error" id="form-error" role="alert"></div>
          <div class="form-actions"><button type="button" class="text-button" data-route="${editing ? 'library' : 'home'}">Cancel</button><button class="primary" type="submit">${editing ? 'Save changes' : 'Add to my sheet'}</button></div>
        </form>`}
      </div>
    </section>`, 'add');
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#term')?.focus());
}

function answerMatch(word: Word, response: string): string {
  if (!response.trim()) return 'You used the spoken path; judge what you said.';
  return normalizeAnswer(response) === normalizeAnswer(word.term) ? 'Your typed answer matches.' : 'Your typed answer differs. You decide whether the meaning was right.';
}

async function renderStudy(): Promise<void> {
  const word = queue[queueIndex];
  if (!word) {
    app.innerHTML = shell(`<section class="finish-sheet"><p class="eyebrow">Sheet complete</p><div class="finish-mark" aria-hidden="true">✓</div><h1>Enough for today.</h1><p class="lede">You returned to ${queue.length} word${queue.length === 1 ? '' : 's'}. The next dates are on your working set—there is no streak to protect.</p><div><button class="primary" data-route="home">Return to today</button><button class="secondary" data-route="library">See word plans</button></div></section>`, 'study');
    return;
  }
  const existingRecording = await getRecording(word.id);
  const recordingCount = await countRecordings();
  const canRecord = license.unlocked || Boolean(existingRecording) || recordingCount < 3;
  app.innerHTML = shell(`
    <section class="study-top"><button class="text-button back" data-route="home">← Leave for now</button><div class="progress-label">PROMPT ${queueIndex + 1} / ${queue.length}</div><div class="progress-track" role="progressbar" aria-label="Recall session progress" aria-valuemin="0" aria-valuemax="${queue.length}" aria-valuenow="${queueIndex}" aria-valuetext="${queueIndex} of ${queue.length} complete"><i style="width:${queueIndex / queue.length * 100}%"></i></div></section>
    <section class="recall-card ${revealed ? 'is-revealed' : ''}">
      <p class="eyebrow">Retrieve the missing word</p>
      <h1>${esc(word.context).replace('___', '<mark>________</mark>')}</h1>
      <p class="meaning-cue"><span>Meaning note</span>${esc(word.meaning)}</p>
      ${!revealed ? `<form id="answer-form"><label for="response">Type what belongs here, or say it aloud</label><input id="response" name="response" maxlength="100" autocomplete="off" autocapitalize="off"><div class="response-tools"><button type="button" class="secondary record-button" data-action="toggle-record" ${canRecord && 'MediaRecorder' in window ? '' : 'disabled'}><span class="record-dot" aria-hidden="true"></span>${canRecord ? 'Record myself' : 'Voice limit reached'}</button>${existingRecording ? '<button type="button" class="text-button" data-action="play-recording">Play saved response</button>' : ''}</div><p class="field-help">Optional. Audio never leaves this device and is not used to rate pronunciation or accent.</p><button class="primary reveal-button" type="submit">Reveal the word</button></form>` : `<div class="reveal-panel"><div><span>THE WORD</span><strong>${esc(word.term)}</strong></div><p>${answerMatch(word, (document.body.dataset.lastResponse || ''))}</p></div>
        <form id="evaluation-form"><fieldset><legend>How certain did recall feel?</legend><div class="confidence-row">${(['Foggy', 'Familiar', 'Steady', 'Ready'] as const).map((label, index) => `<label><input type="radio" name="confidence" value="${index + 1}" required><span><b>${index + 1}</b>${label}</span></label>`).join('')}</div></fieldset><p class="separate-note">Now record correctness separately. Meaning matters more than spelling.</p><div class="correctness-actions"><button class="secondary missed" type="submit" name="correct" value="false">Not this time</button><button class="primary" type="submit" name="correct" value="true">I recalled it</button></div></form>`}
    </section>`, 'study');
  if (!revealed) requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#response')?.focus());
}

function download(name: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

function renderSettings(): void {
  app.innerHTML = shell(`
    <section class="page-title settings-title"><div><p class="eyebrow">Ownership & options</p><h1>Your words belong to you.</h1><p class="lede">Everything is stored locally in this browser. Export a portable copy whenever you like.</p></div></section>
    <div class="settings-grid">
      <section><div class="section-code">DATA / 01</div><h2>Move or back up your sheet</h2><p>JSON preserves words, dates, and review history. CSV is convenient for a spreadsheet. Voice notes stay only on this device.</p><div class="button-row"><button class="secondary" data-action="export-json">Export JSON</button><button class="secondary" data-action="export-csv">Export CSV</button><label class="secondary file-button">Import JSON<input type="file" id="import-file" accept="application/json,.json"></label></div><p class="field-help">Import merges by entry ID and never deletes words already here.</p></section>
      <section class="license-section"><div class="section-code">PLUS / 02</div><h2>${license.unlocked ? 'Kind Recall Plus is unlocked' : 'A larger working set, once'}</h2><p>${license.unlocked ? 'This device can hold up to 100 words and unlimited voice notes.' : 'The free version includes 20 words, typed recall, three saved voice notes, history, and all exports. Plus expands that to 100 words and unlimited voice notes.'}</p>
        ${license.message ? `<p class="quiet-notice">${esc(license.message)}</p>` : ''}
        ${license.unlocked ? '<button class="text-button danger-text" data-action="remove-license">Remove license from this device</button>' : `<p class="price"><strong>$12</strong> <span>one-time purchase</span></p><a class="primary" href="${checkoutUrl()}">Buy Kind Recall Plus</a><details><summary>Have a license? Restore it</summary><form id="license-form"><label for="license-token">License token</label><input id="license-token" name="token" required autocomplete="off"><button class="secondary" type="submit">Verify and restore</button></form></details>`}
        <p class="legal-note">Checkout is hosted by Sociobot. Dodo is the merchant of record; refunds are handled there and revoke the license. See <a href="/privacy/">privacy</a> and <a href="/terms/">terms</a>.</p>
      </section>
    </div>`, 'settings');
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Kind Recall`;
  app.innerHTML = `
    <header class="site-header legal-header"><a class="wordmark" href="/"><img src="/icons/icon.svg" width="36" height="36" alt=""><span>Kind <i>Recall</i></span></a><a href="/">Open the app →</a></header>
    <main id="main" class="legal-page"><p class="eyebrow">${privacy ? 'Privacy note' : 'Terms of use'} · effective August 28, 2026</p><h1>${privacy ? 'Your practice stays yours.' : 'A simple agreement.'}</h1>
    ${privacy ? `<p class="lede">Kind Recall is local-first. Your vocabulary, sentences, review history, confidence, and voice recordings are stored in this browser’s IndexedDB and are not sent to us.</p><h2>What stays on your device</h2><p>Your word set, recall responses, review dates, confidence ratings, and optional recordings. Deleting site data in your browser removes them. Use Export JSON first if you want a backup; audio is not included in exports.</p><h2>What reaches the network</h2><p>The app shell is downloaded from kind-recall.sociobot.in. If you buy or verify Plus, your browser connects to the Sociobot billing API and sends the license token. Hosted checkout is operated by Sociobot with Dodo as merchant of record. Payment details never enter this app.</p><h2>Tracking and accounts</h2><p>Kind Recall has no advertising trackers, third-party analytics, or user account. The hosting layer may retain short-lived security logs such as IP address and requested path.</p><h2>Your controls</h2><p>Export JSON or CSV from Settings. Remove a saved license there. Remove all other data through your browser’s site-storage controls. Questions can be sent to <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>` : `<p class="lede">You may use Kind Recall to privately practise vocabulary. It is a learning utility, not a language course, medical tool, or guarantee of fluency.</p><h2>Using the app</h2><p>You are responsible for the words, sentences, and recordings you add. Do not use the app to store unlawful content or content you do not have a right to keep. The software is provided “as is” under the MIT License.</p><h2>Kind Recall Plus</h2><p>Plus is a one-time $12 purchase that raises the local limit to 100 words and enables unlimited saved voice notes on licensed devices. Sociobot’s hosted checkout processes the purchase, and Dodo is merchant of record. Refunds are handled by the merchant of record; a refund revokes the license.</p><h2>Availability and data</h2><p>The app is designed to work offline after its first successful load, but uninterrupted availability is not guaranteed. Browser storage can be cleared by you, your browser, or your device. Keep exports if the data matters to you. Voice recordings are intentionally excluded from exports.</p><h2>Fair limits</h2><p>Do not attempt to disrupt the service or bypass the Plus license check. We may update these terms when the product changes, with the effective date shown above.</p><p>Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>`}
    </main><footer><span>Kind Recall</span><span><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></span></footer>`;
}

async function navigate(next: Route): Promise<void> {
  stopRecorder();
  route = next;
  editingId = next === 'add' ? editingId : undefined;
  revealed = false;
  statusMessage = '';
  if (next === 'home') await renderHome();
  if (next === 'library') renderLibrary();
  if (next === 'add') renderWordForm();
  if (next === 'study') await renderStudy();
  if (next === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

async function startSession(): Promise<void> {
  queue = buildQueue(words, await getSetting<number>('lastStudyAt'));
  queueIndex = 0;
  document.body.dataset.lastResponse = '';
  if (!queue.length) { setStatus('No words are due just now.'); return; }
  await navigate('study');
}

async function handleWordForm(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const term = String(data.get('term') || '').trim();
  const meaning = String(data.get('meaning') || '').trim();
  const context = String(data.get('context') || '').trim();
  const error = document.querySelector<HTMLElement>('#form-error');
  if (!term || !meaning || !context) { if (error) error.textContent = 'Complete all three fields before adding the word.'; return; }
  if (!context.includes('___')) { if (error) error.textContent = 'Put three underscores (___) where the word belongs in your sentence.'; document.querySelector<HTMLTextAreaElement>('#context')?.focus(); return; }
  const existing = words.find((word) => word.id === editingId);
  if (!existing && words.length >= activeWordLimit()) { if (error) error.textContent = `Your ${license.unlocked ? 'Plus' : 'free'} sheet already holds ${activeWordLimit()} words. Remove one before adding another.`; return; }
  const now = Date.now();
  await saveWord(existing ? { ...existing, term, meaning, context, updatedAt: now } : { id: uid(), term, meaning, context, createdAt: now, updatedAt: now, dueAt: now, intervalDays: 0, reviewCount: 0 });
  words = await getWords();
  editingId = undefined;
  await navigate('library');
  setStatus(existing ? `Saved changes to ${term}.` : `${term} is ready for its first recall.`, 'success');
}

function stopRecorder(): void {
  if (recorder?.state === 'recording') recorder.stop();
  recorderStream?.getTracks().forEach((track) => track.stop());
  recorder = undefined; recorderStream = undefined;
}

async function toggleRecorder(button: HTMLButtonElement): Promise<void> {
  if (recorder?.state === 'recording') {
    recorder.stop(); recorderStream?.getTracks().forEach((track) => track.stop()); button.innerHTML = '<span class="record-dot" aria-hidden="true"></span>Record myself'; return;
  }
  try {
    recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingParts = [];
    recorder = new MediaRecorder(recorderStream);
    recorder.ondataavailable = (event) => { if (event.data.size) recordingParts.push(event.data); };
    recorder.onstop = async () => {
      const word = queue[queueIndex];
      if (word && recordingParts.length) { await saveRecording(word.id, new Blob(recordingParts, { type: recorder?.mimeType || 'audio/webm' })); setStatus('Voice response saved on this device.', 'success'); }
      recorderStream?.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    button.innerHTML = '<span class="record-dot active" aria-hidden="true"></span>Stop and save';
    setStatus('Recording. Speak your answer, then choose Stop and save.');
  } catch {
    setStatus('Microphone access was not available. You can type your answer or change browser permission.', 'error');
  }
}

async function playRecording(): Promise<void> {
  const word = queue[queueIndex];
  if (!word) return;
  const blob = await getRecording(word.id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

async function recordEvaluation(form: HTMLFormElement, submitter: HTMLElement | null): Promise<void> {
  const confidenceValue = new FormData(form).get('confidence');
  if (!confidenceValue) { setStatus('Choose how certain recall felt, then record correctness.', 'error'); document.querySelector<HTMLElement>('fieldset')?.focus(); return; }
  const word = queue[queueIndex];
  const correct = (submitter as HTMLButtonElement | null)?.value === 'true';
  const confidence = Number(confidenceValue) as Confidence;
  const now = Date.now();
  const updated = scheduleWord(word, correct, confidence, now);
  const review: Review = { id: uid(), wordId: word.id, createdAt: now, response: document.body.dataset.lastResponse || '', correct, confidence, previousIntervalDays: word.intervalDays, nextIntervalDays: updated.intervalDays };
  await Promise.all([saveWord(updated), addReview(review), setSetting('lastStudyAt', now)]);
  words = await getWords(); reviews.push(review);
  queueIndex += 1; revealed = false; document.body.dataset.lastResponse = '';
  await renderStudy();
  setStatus(`${word.term} recorded. Next review ${daysAway(updated.dueAt).toLowerCase()}.`, 'success');
}

app.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-route], [data-action]');
  if (!target) return;
  const next = target.dataset.route as Route | undefined;
  if (next) { event.preventDefault(); if (next === 'add') editingId = undefined; await navigate(next); return; }
  const action = target.dataset.action;
  if (action === 'start-session') await startSession();
  if (action === 'edit-word') { editingId = target.dataset.id; await navigate('add'); }
  if (action === 'delete-word') {
    const word = words.find((item) => item.id === target.dataset.id);
    if (word && confirm(`Delete “${word.term}” and its review history? This cannot be undone.`)) { await deleteWord(word.id); words = await getWords(); reviews = await getReviews(); renderLibrary(); setStatus(`${word.term} was deleted.`); }
  }
  if (action === 'toggle-record') await toggleRecorder(target as HTMLButtonElement);
  if (action === 'play-recording') await playRecording();
  if (action === 'export-json') { const data = await exportBundle(); download(`kind-recall-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json'); setStatus('JSON backup exported.', 'success'); }
  if (action === 'export-csv') {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = ['word,meaning,context,next_review,reviews', ...words.map((word) => [word.term, word.meaning, word.context, new Date(word.dueAt).toISOString(), word.reviewCount].map(quote).join(','))].join('\n');
    download(`kind-recall-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv'); setStatus('CSV exported.', 'success');
  }
  if (action === 'remove-license') { if (confirm('Remove the Plus license from this device? Your words will stay.')) { removeLicense(); license = { unlocked: false }; renderSettings(); setStatus('License removed. Your data is unchanged.'); } }
  if (action === 'reset-demo' && DEMO_MODE) { await clearAllData(); removeLicense(); license = { unlocked: false }; await seedDemo(); [words, reviews] = await Promise.all([getWords(), getReviews()]); await renderHome(); setStatus('Demo reset to its original sample.', 'success'); }
  if (action === 'start-real' && DEMO_MODE) { await clearAllData(); removeLicense(); location.assign('/'); }
  if (action === 'reload-app') location.reload();
  if (action === 'update-app') { navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' }); location.reload(); }
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id === 'word-form') await handleWordForm(form);
  if (form.id === 'answer-form') {
    const response = String(new FormData(form).get('response') || '');
    document.body.dataset.lastResponse = response;
    stopRecorder(); revealed = true; await renderStudy();
  }
  if (form.id === 'evaluation-form') await recordEvaluation(form, (event as SubmitEvent).submitter);
  if (form.id === 'license-form') {
    const token = String(new FormData(form).get('token') || '').trim();
    if (token) { restoreLicense(token); setStatus('Checking this license…'); license = await loadLicense(); renderSettings(); setStatus(license.unlocked ? 'Plus restored on this device.' : (license.message || 'That license could not be verified.'), license.unlocked ? 'success' : 'error'); }
  }
});

app.addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id !== 'import-file' || !input.files?.[0]) return;
  try {
    const count = await importBundle(JSON.parse(await input.files[0].text()), activeWordLimit());
    words = await getWords(); reviews = await getReviews(); renderSettings(); setStatus(`Imported ${count} word${count === 1 ? '' : 's'}. Existing words were kept.`, 'success');
  } catch (error) { setStatus(error instanceof Error ? error.message : 'The import could not be read.', 'error'); }
});

window.addEventListener('online', () => { document.querySelector<HTMLElement>('#offline-bar')?.setAttribute('hidden', ''); setStatus('Back online. Your local work was available throughout.'); });
window.addEventListener('offline', () => { document.querySelector<HTMLElement>('#offline-bar')?.removeAttribute('hidden'); setStatus('You are offline. Recall and editing still work.'); });

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) document.querySelector<HTMLElement>('#update-toast')?.removeAttribute('hidden'); });
  });
}

async function init(): Promise<void> {
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') { renderLegal('privacy'); app.classList.add('ready'); document.body.classList.remove('booting'); await registerServiceWorker(); return; }
  if (path === '/terms') { renderLegal('terms'); app.classList.add('ready'); document.body.classList.remove('booting'); await registerServiceWorker(); return; }
  try {
    if (DEMO_MODE) { document.title = 'Demo — Kind Recall'; await seedDemo(); }
    [words, reviews, license] = await Promise.all([getWords(), getReviews(), loadLicense()]);
    await renderHome();
    app.classList.add('ready');
    document.body.classList.remove('booting');
    await registerServiceWorker();
  } catch (error) {
    app.innerHTML = `<main id="main" class="fatal-error"><h1>The drafting sheet could not open.</h1><p>${esc(error instanceof Error ? error.message : 'On-device storage is unavailable.')}</p><p>Check that private browsing has not blocked site storage, then reload.</p><button class="primary" data-action="reload-app">Try again</button></main>`;
    app.classList.add('ready');
    document.body.classList.remove('booting');
  }
}

void init();
