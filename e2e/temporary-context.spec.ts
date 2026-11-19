import { expect, test, type Dialog, type Page } from '@playwright/test';

async function enterPassphrase(page: Page, passphrase: string) {
  await page.getByRole('textbox', { name: /^Passphrase\b/ }).fill(passphrase);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
}

async function createWithPassphrase(page: Page, passphrase: string) {
  await enterPassphrase(page, passphrase);
  await page.getByRole('button', { name: 'Create with this passphrase', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shared content', exact: true })).toBeVisible();
}

function holdRequest() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}

async function handleDialog(page: Page, action: () => Promise<unknown>, decision: 'accept' | 'dismiss') {
  let listener!: (dialog: Dialog) => void;
  const handled = new Promise<string>((resolve, reject) => {
    listener = dialog => {
      void dialog[decision]().then(() => resolve(dialog.type()), reject);
    };
  });
  page.on('dialog', listener);
  try {
    const [type] = await Promise.all([handled, action()]);
    return type;
  } finally {
    page.off('dialog', listener);
  }
}

test('temporary content survives edits, reloads, and reopening', async ({ page, context }) => {
  await page.goto('/');

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
  await expect(page.getByRole('textbox', { name: /^Passphrase\b/ })).toHaveCount(0);
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

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Leave context', exact: true }).click();
  await expect(page).toHaveURL('/');
  const read = page.waitForResponse(response => response.url().endsWith('/temporary-contexts/read'));
  await enterPassphrase(page, passphrase);
  expect((await read).status()).toBe(200);
  await expect(page).toHaveURL(shareUrl);
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Join an existing context' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(shareUrl);
  await expect(page.getByText('Saved revision', { exact: true })).toBeVisible();

  // A fresh page also verifies persistence independently of React Query's cache.
  const returning = await context.newPage();
  await returning.goto(shareUrl);
  await expect(returning.getByRole('heading', { name: 'Updated background', exact: true })).toBeVisible();
  await expect(returning.getByText('Saved revision', { exact: true })).toBeVisible();
});

test('leaving protects addition and edit drafts across the toolbar, navigation, and browser history', async ({ page }) => {
  await page.goto('/');
  await createWithPassphrase(page, `draft-${Date.now()}`);
  const originalUrl = page.url();
  const addition = page.getByRole('textbox', { name: /^Content to add\b/ });
  const leave = page.getByRole('button', { name: 'Leave context', exact: true });
  await addition.fill('Unsaved addition');
  expect(await handleDialog(page, () => leave.click(), 'dismiss')).toBe('confirm');
  await expect(addition).toHaveValue('Unsaved addition');
  await expect(page).toHaveURL(originalUrl);

  const myContexts = page.getByRole('link', { name: 'My Contexts', exact: true });
  expect(await handleDialog(page, () => myContexts.click(), 'dismiss')).toBe('confirm');
  await expect(page).toHaveURL(originalUrl);
  await expect(addition).toHaveValue('Unsaved addition');

  await addition.fill('');
  await page.getByRole('button', { name: 'Edit content', exact: true }).click();
  const editor = page.getByRole('textbox', { name: /^Edit content\b/ });
  await editor.fill('Unsaved edit');
  expect(await handleDialog(page, () => page.evaluate(() => window.location.reload()), 'dismiss')).toBe('beforeunload');
  await expect(editor).toHaveValue('Unsaved edit');

  expect(await handleDialog(page, () => page.evaluate(() => history.back()), 'dismiss')).toBe('confirm');
  await expect(page).toHaveURL(originalUrl);
  await expect(editor).toHaveValue('Unsaved edit');
  expect(await handleDialog(page, () => leave.click(), 'accept')).toBe('confirm');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Join an existing context' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(originalUrl);
  await expect(addition).toHaveValue('');
});

test('joining a missing context never creates it until the explicit create action', async ({ page }) => {
  await page.goto('/');
  const writes: string[] = [];
  page.on('request', request => {
    if (/\/temporary-contexts\/(open|generate)$/.test(request.url())) writes.push(request.url());
  });
  const create = page.getByRole('button', { name: 'Create with this passphrase', exact: true });
  await enterPassphrase(page, `missing-${Date.now()}`);
  await expect(create).toBeVisible();
  await expect(page).toHaveURL('/');
  expect(writes).toEqual([]);

  await page.route('**/temporary-contexts/open', route => route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } }));
  await create.click();
  await expect(page.getByText('API request failed with status 503', { exact: true })).toBeVisible();
  await expect(page).toHaveURL('/');
  await page.unroute('**/temporary-contexts/open');
  await create.click();
  await expect(page.getByRole('heading', { name: 'Shared content', exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
});

test('pending saves and joins cannot move the user to a different context', async ({ page }) => {
  await page.goto('/');
  const first = `pending-first-${Date.now()}`;
  await createWithPassphrase(page, first);
  const leave = page.getByRole('button', { name: 'Leave context', exact: true });
  await leave.click();
  const second = `pending-second-${Date.now()}`;
  await createWithPassphrase(page, second);
  const secondUrl = page.url();

  const appendGate = holdRequest();
  await page.route('**/temporary-contexts/append', async route => {
    await appendGate.wait;
    await route.continue();
  }, { times: 1 });
  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Saved after the request settles');
  const append = page.waitForRequest(request => request.url().endsWith('/temporary-contexts/append'));
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await append;
  try {
    await expect(leave).toBeDisabled();
    await page.getByRole('link', { name: 'My Contexts', exact: true }).click();
    await expect(page).toHaveURL(secondUrl);
  } finally {
    appendGate.release();
  }
  await expect(page.getByText('Saved after the request settles', { exact: true })).toBeVisible();
  await leave.click();

  const readGate = holdRequest();
  await page.route('**/temporary-contexts/read', async route => {
    if (route.request().postDataJSON().passphrase === first) await readGate.wait;
    await route.continue();
  });
  const read = page.waitForRequest(request =>
    request.url().endsWith('/temporary-contexts/read') && request.postDataJSON().passphrase === first);
  await enterPassphrase(page, first);
  const request = await read;
  try {
    await page.goBack();
    await expect(page).toHaveURL(secondUrl);
  } finally {
    readGate.release();
  }
  const response = await request.response();
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Saved after the request settles', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(secondUrl);
});

test('manual entry preserves special characters in share links and supports the legacy route', async ({ page, context }) => {
  const passphrase = `  中文 & # + / ? = % ${Date.now()}  `;
  await page.goto('/clipboard?lang=en#source=test');
  await createWithPassphrase(page, passphrase);
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('passphrase')).toBe(passphrase);
  expect(new URL(page.url()).pathname).toBe('/clipboard');
  expect(new URL(page.url()).search).toBe('?lang=en');
  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Special phrase content');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByText('Special phrase content', { exact: true })).toBeVisible();
  const recipient = await context.newPage();
  await recipient.goto(page.url());
  await expect(recipient.getByText('Special phrase content', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Leave context', exact: true }).click();
  await expect(page).toHaveURL('/clipboard?lang=en#source=test');
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
  await page.getByRole('button', { name: 'Leave context', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(writes).toEqual([]);
});

test('invalid link credentials show validation without making a context request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/temporary-contexts/')) requests.push(request.url());
  });
  for (const passphrase of ['', 'short', 'a'.repeat(129)]) {
    await page.goto(`/#passphrase=${passphrase}`);
    await expect(page.getByRole('heading', { name: 'Join an existing context', exact: true })).toBeVisible();
    await expect(page.locator('form').getByText(passphrase.length > 128 ? 'Passphrase must be at most 128 characters.' : 'Passphrase must be at least 8 characters.', { exact: true })).toBeVisible();
  }
  await enterPassphrase(page, 'short');
  await expect(page.locator('form').getByText('Passphrase must be at least 8 characters.', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('mobile launch stacks actions and lets users expand the guide with a keyboard', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agent-friendly online clipboard', exact: true })).toBeVisible();
  const create = await page.getByRole('heading', { name: 'Quick start', exact: true }).boundingBox();
  const join = await page.getByRole('heading', { name: 'Join an existing context' }).boundingBox();
  expect(create).not.toBeNull();
  expect(join!.y).toBeGreaterThan(create!.y + create!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  const example = page.getByText('POST /temporary-contexts/generate', { exact: true });
  await expect(example).toBeHidden();
  const guide = page.locator('summary', { hasText: 'Agent quick-start guide' });
  await guide.focus();
  await guide.press('Enter');
  await expect(example).toBeVisible();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('POST');
  await page.getByRole('textbox', { name: /^Passphrase\b/ }).last().fill('a-custom-passphrase');
  await page.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('a-custom-passphrase');
});

test('the Chinese launch and workspace show the document within the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('contextport.locale', 'zh-CN'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agent 友好的在线剪切板' })).toBeVisible();
  await page.getByRole('button', { name: '随机生成口令并创建' }).click();
  const document = page.getByRole('heading', { name: '共享内容' });
  await expect(document).toBeInViewport();
  await expect(page.getByRole('button', { name: '编辑内容', exact: true })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: /^访问口令/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth)).toBe(390);
});
