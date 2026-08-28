import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function bundle(count: number) {
  const now = Date.now();
  return {
    format: 'kind-recall', version: 1, exportedAt: new Date(now).toISOString(), reviews: [],
    words: Array.from({ length: count }, (_, index) => ({
      id: `import-${count}-${index}`, term: `word ${index + 1}`, meaning: `meaning ${index + 1}`,
      context: `I used ___ in sentence ${index + 1}.`, createdAt: now + index, updatedAt: now,
      dueAt: now, intervalDays: 0, reviewCount: 0
    }))
  };
}

async function openSettings(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
}

async function importWords(page: Page, count: number): Promise<void> {
  await page.locator('#import-file').setInputFiles({
    name: `kind-recall-${count}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle(count)))
  });
}

test('adds a contextual word, recalls it, and persists the schedule', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Make a word/);
  await page.getByRole('button', { name: /Add your first word/ }).click();
  await page.getByLabel('Word or phrase required').fill('sobremesa');
  await page.getByLabel('Meaning in your own words required').fill('time spent talking after a meal');
  await page.getByLabel('A personal sentence with ___ required').fill('We stayed for ___ after Sunday lunch.');
  await page.getByRole('button', { name: 'Add to my sheet' }).click();
  await expect(page.getByRole('heading', { name: 'sobremesa' })).toBeVisible();
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: /Begin recall/ }).click();
  await page.getByLabel('Type what belongs here, or say it aloud').fill('sobremesa');
  await page.getByRole('button', { name: 'Reveal the word' }).click();
  await expect(page.getByText('Your typed answer matches.')).toBeVisible();
  await page.getByText('Steady').click();
  await page.getByRole('button', { name: 'I recalled it' }).click();
  await expect(page.getByRole('heading', { name: 'Enough for today.' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your words are resting.')).toBeVisible();
});

test('has no serious accessibility findings on the empty dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('has no serious accessibility findings on populated and legal screens', async ({ page }) => {
  for (const path of ['/demo/', '/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || '')), path).toEqual([]);
  }
});

test('supports keyboard entry, visible focus, and a 390px layout without overflow', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const outline = await page.getByRole('link', { name: 'Skip to main content' }).evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(Number.parseFloat(outline)).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Add your first word' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Word or phrase required')).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
    const sizes = await page.locator('.main-nav button').evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height };
    }));
    expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  }
});

test('study progress is semantic and has no serious accessibility findings', async ({ page }) => {
  await openSettings(page);
  await importWords(page, 1);
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: /Begin recall/ }).click();
  const progress = page.getByRole('progressbar', { name: 'Recall session progress' });
  await expect(progress).toHaveAttribute('max', '1');
  await expect(progress).toHaveAttribute('value', '0');
  await expect(progress).toHaveAttribute('aria-valuetext', '0 of 1 complete');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('@claim:capacity-limits accepts 20/100 word imports and rejects 21/101 atomically', async ({ browser }) => {
  const run = async (count: number, plus: boolean, accepted: boolean) => {
    const context = await browser.newContext();
    if (plus) await context.addInitScript(() => {
      localStorage.setItem('sb_license:kind-recall', 'cached-test-license');
      localStorage.setItem('sb_license_verdict:kind-recall', JSON.stringify({ valid: true, checkedAt: Date.now() }));
    });
    const page = await context.newPage();
    await openSettings(page);
    await importWords(page, count);
    if (accepted) {
      await expect(page.getByRole('status')).toContainText(`Imported ${count} words`);
      await page.getByRole('button', { name: 'Words' }).click();
      await expect(page.getByText(`Working set · ${count}/${plus ? 100 : 20}`)).toBeVisible();
      await page.locator('.main-nav').getByRole('button', { name: 'Add word' }).click();
      await expect(page.getByRole('heading', { name: `Your ${plus ? 'Plus' : 'free'} sheet holds ${plus ? 100 : 20} words.` })).toBeVisible();
    } else {
      await expect(page.getByRole('status')).toContainText(`This import would make ${count} words`);
      await page.getByRole('button', { name: 'Words' }).click();
      await expect(page.getByText(`Working set · 0/${plus ? 100 : 20}`)).toBeVisible();
    }
    await context.close();
  };
  await run(20, false, true);
  await run(21, false, false);
  await run(100, true, true);
  await run(101, true, false);
});

test('@claim:csv-export exports one row for each sample word', async ({ page }) => {
  await page.goto('/demo/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv.split('\n')).toHaveLength(7);
  expect(csv).toContain('word,meaning,context,next_review,reviews');
  expect(csv).toContain('sobremesa');
});

test('@claim:json-portability exports data that imports into a clean sheet', async ({ page }) => {
  await page.goto('/demo/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#import-file').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('Imported 6 words');
});

test('@claim:demo-isolation keeps sample changes separate from the real sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Add your first word/ }).click();
  await page.getByLabel('Word or phrase required').fill('real-only');
  await page.getByLabel('Meaning in your own words required').fill('belongs to my real sheet');
  await page.getByLabel('A personal sentence with ___ required').fill('This is my ___ entry.');
  await page.getByRole('button', { name: 'Add to my sheet' }).click();
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved to your real sheet.')).toBeVisible();
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.getByRole('heading', { name: 'sobremesa' })).toBeVisible();
  await expect(page.getByText('real-only')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByRole('button', { name: 'Words' }).click();
  await expect(page.getByRole('heading', { name: 'real-only' })).toBeVisible();
  await expect(page.getByText('sobremesa')).toHaveCount(0);
});

test('@claim:local-private makes only same-origin requests through a sample recall', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/demo/');
  await page.getByRole('button', { name: /Begin recall/ }).click();
  await page.getByLabel('Type what belongs here, or say it aloud').fill('sobremesa');
  await page.getByRole('button', { name: 'Reveal the word' }).click();
  await page.getByText('Steady').click();
  await page.getByRole('button', { name: 'I recalled it' }).click();
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('opens legal pages directly', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your practice stays yours.' })).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1, name: 'A simple agreement.' })).toBeVisible();
});

test('@claim:offline-reload reloads the sample app while offline after first visit', async ({ page, context }) => {
  await page.goto('/demo/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Offline — your words and recall still work/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
