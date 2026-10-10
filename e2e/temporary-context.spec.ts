import { expect, test, type Page } from '@playwright/test';

async function reopen(page: Page, passphrase: string) {
  await page.getByRole('tab', { name: 'Use manually', exact: true }).click();
  await page.getByRole('textbox', { name: /^Passphrase\b/ }).fill(passphrase);
  await page.getByRole('button', { name: 'Open with passphrase', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shared content', exact: true })).toBeVisible();
}

test('temporary content survives edits, reloads, and reopening', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Use manually', exact: true }).click();

  // Capture only the credential from the real browser request; no API mocking.
  const generated = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/temporary-contexts/generate')
    && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create with a random passphrase', exact: true }).click();
  const response = await generated;
  expect(response.status()).toBe(201);
  const { passphrase } = await response.json() as { passphrase: string };
  expect(passphrase.length).toBeGreaterThanOrEqual(8);
  await expect(page).toHaveURL(new RegExp(`#passphrase=${passphrase}$`));
  const shareUrl = page.url();
  await expect(page.getByRole('textbox', { name: 'Access link', exact: true })).toHaveValue(shareUrl);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shareUrl);
  await expect(page.getByText('No content yet.', { exact: false })).toBeVisible();

  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('# Task background\n\nFirst update');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Task background', exact: true })).toBeVisible();
  await expect(page.getByText('First update', { exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Second update');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByText('First update', { exact: true })).toBeVisible();
  await expect(page.getByText('Second update', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit content', exact: true }).click();
  const editor = page.getByRole('textbox', { name: /^Edit content\b/ });
  await expect(editor).toHaveValue('# Task background\n\nFirst update\n\nSecond update');
  await editor.fill('# Updated background\n\nSaved revision');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();
  await expect(page.getByText('First update', { exact: true })).toHaveCount(0);

  // Reload restores the credential and the manual view from the URL.
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Use manually', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Close this context', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByRole('textbox', { name: /^Passphrase\b/ })).toHaveValue('');

  await page.goBack();
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(shareUrl);
  await page.goForward();
  await expect(page.getByRole('textbox', { name: /^Passphrase\b/ })).toHaveValue('');

  // A fresh page also verifies persistence independently of React Query's cache.
  const returning = await context.newPage();
  await returning.goto(shareUrl);
  await expect(returning.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(returning.getByText('Saved revision', { exact: true })).toBeVisible();
});

test('manual entry preserves special characters in share links and supports the legacy route', async ({ page, context }) => {
  const passphrase = `  中文 & # + / ? = % ${Date.now()}  `;
  await page.goto('/clipboard?lang=en');
  await reopen(page, passphrase);
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('passphrase')).toBe(passphrase);
  expect(new URL(page.url()).pathname).toBe('/clipboard');
  expect(new URL(page.url()).search).toBe('?lang=en');
  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Special phrase content');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByText('Special phrase content', { exact: true })).toBeVisible();
  const recipient = await context.newPage();
  await recipient.goto(page.url());
  await expect(recipient.getByText('Special phrase content', { exact: true })).toBeVisible();
});

test('a missing share link reads without creating a context', async ({ page }) => {
  const passphrase = `missing-${Date.now()}`;
  const writes: string[] = [];
  page.on('request', request => {
    if (/\/temporary-contexts\/(open|generate)$/.test(request.url())) writes.push(request.url());
  });
  const read = page.waitForResponse(response => response.url().endsWith('/temporary-contexts/read'));
  await page.goto(`/#passphrase=${passphrase}`);
  expect((await read).status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Context not found or expired', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shared content', exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
  const retry = page.waitForResponse(response => response.url().endsWith('/temporary-contexts/read'));
  await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
  expect((await retry).status()).toBe(404);
});

test('invalid link credentials show validation without making a context request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/temporary-contexts/')) requests.push(request.url());
  });
  for (const passphrase of ['', 'short', 'a'.repeat(129)]) {
    await page.goto(`/#passphrase=${passphrase}`);
    await expect(page.getByRole('heading', { name: 'Open or Create a Context', exact: true })).toBeVisible();
    await expect(page.locator('form').getByText(passphrase.length > 128 ? 'Passphrase must be at most 128 characters.' : 'Passphrase must be at least 8 characters.', { exact: true })).toBeVisible();
  }
  expect(requests).toEqual([]);
});
