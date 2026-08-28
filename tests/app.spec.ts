import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('opens legal pages directly', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your practice stays yours.' })).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1, name: 'A simple agreement.' })).toBeVisible();
});

test('reloads the app shell while offline after first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Offline — your words and recall still work/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
