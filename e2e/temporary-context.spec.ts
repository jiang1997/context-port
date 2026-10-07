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

  // Reload loses the in-memory passphrase; reopen through the UI.
  await page.reload();
  await reopen(page, passphrase);
  await expect(page.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Close this context', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Passphrase\b/ })).toHaveValue('');

  // A fresh page also verifies persistence independently of React Query's cache.
  const returning = await context.newPage();
  await returning.goto('/');
  await reopen(returning, passphrase);
  await expect(returning.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(returning.getByText('Saved revision', { exact: true })).toBeVisible();
});
