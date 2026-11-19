import { expect, test, type Dialog, type Page } from '@playwright/test';
import jsQR from 'jsqr';

async function enterPassphrase(page: Page, passphrase: string) {
  await page.getByRole('textbox', { name: 'Passphrase Required', exact: true }).fill(passphrase);
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
  await page.getByRole('button', { name: 'Copy share link', exact: true }).click();
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
  await page.getByRole('button', { name: 'Copy setup prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('POST');
  await page.getByRole('textbox', { name: /^Passphrase\b/ }).last().fill('a-custom-passphrase');
  await page.getByRole('button', { name: 'Copy setup prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('a-custom-passphrase');
});

test('the Chinese launch and workspace show the document within the mobile viewport', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('contextport.locale', 'zh-CN'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agent 友好的在线剪切板' })).toBeVisible();
  await page.getByRole('button', { name: '随机生成口令并创建' }).click();
  const document = page.getByRole('heading', { name: '共享内容' });
  await expect(document).toBeInViewport();
  await expect(page.getByRole('button', { name: '编辑内容', exact: true })).toBeInViewport();
  await expect(page.getByText('当前口令', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^访问口令/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth)).toBe(390);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制 Agent 提示词', exact: true }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain('你可以通过口令访问这份临时上下文。');
  expect(prompt).toContain(`${new URL(page.url()).origin}/api/v1/temporary-contexts/read`);
});

test('the QR code and copied link open the same document in a separate browser session', async ({ page, context, browser }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/clipboard#source=qr');
  const passphrase = `  中文 & # + / ? = % ${Date.now()}  `;
  await createWithPassphrase(page, passphrase);
  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Shared using a QR code');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByText('Shared using a QR code', { exact: true })).toBeVisible();
  const shareUrl = page.url();
  await expect(page.getByRole('button', { name: 'Copy passphrase', exact: true })).toHaveCount(0);
  await expect(page.locator('.temporary-share-qr canvas')).toHaveCount(0);

  await page.getByRole('button', { name: 'Copy agent prompt', exact: true }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain('You have access to a shared Temporary Context.');
  expect(prompt).toContain(`${new URL(shareUrl).origin}/api/v1/temporary-contexts/append`);
  await page.getByRole('button', { name: 'Copy share link', exact: true }).click();
  const clipboardLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardLink).toBe(shareUrl);

  const options = page.getByRole('button', { name: 'Share options', exact: true });
  await options.focus();
  await options.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Share this context' });
  const qr = panel.getByRole('img', { name: 'QR code for the share link' });
  await expect(qr).toBeVisible();
  await expect(panel.getByRole('textbox', { name: 'Access link' })).toHaveValue(shareUrl);
  await expect(panel.getByRole('textbox', { name: 'Current passphrase' })).toHaveValue(passphrase);
  await panel.getByRole('button', { name: 'Copy passphrase', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Copied passphrase', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(passphrase);
  const pixels = await qr.evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const { width, height } = canvas;
    const image = canvas.getContext('2d')!.getImageData(0, 0, width, height);
    return { data: Array.from(image.data), width, height };
  });
  const scannedLink = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data;
  expect(scannedLink).toBe(clipboardLink);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(options).toBeFocused();

  const recipient = await browser.newContext();
  try {
    const otherPage = await recipient.newPage();
    await otherPage.goto(scannedLink!);
    await expect(otherPage.getByText('Shared using a QR code', { exact: true })).toBeVisible();
  } finally {
    await recipient.close();
  }
});

test('clipboard failures expose the original share values and setup prompt for manual copying', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Permission denied'); } } });
    Document.prototype.execCommand = () => false;
  });
  await page.goto('/');
  await page.locator('summary', { hasText: 'Agent quick-start guide' }).click();
  await page.getByRole('button', { name: 'Copy setup prompt', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Agent setup prompt' })).toHaveValue(/\/temporary-contexts\/generate/);
  const passphrase = `manual-copy-${Date.now()}`;
  await createWithPassphrase(page, passphrase);

  const panel = page.getByRole('dialog', { name: 'Share this context' });
  const link = page.getByRole('button', { name: 'Copy share link', exact: true });
  const agent = page.getByRole('button', { name: 'Copy agent prompt', exact: true });
  const error = panel.getByRole('alert');
  await link.click();
  await expect(error).toHaveText('Could not copy automatically. Select the text and copy it manually.');
  const linkInput = panel.getByRole('textbox', { name: 'Access link' });
  await expect(linkInput).toHaveValue(page.url());
  await expect(linkInput).toBeFocused();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(link).toBeFocused();

  await agent.click();
  const prompt = panel.getByRole('textbox', { name: 'Agent prompt for this context' });
  await expect(error).toBeVisible();
  await expect(prompt).toBeFocused();
  await expect(prompt).toHaveValue(/\/temporary-contexts\/read/);
  await panel.getByRole('button', { name: 'Copy passphrase', exact: true }).click();
  await expect(error).toBeVisible();
  const passphraseInput = panel.getByRole('textbox', { name: 'Current passphrase' });
  await expect(passphraseInput).toHaveValue(passphrase);
  await expect(passphraseInput).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(agent).toBeFocused();
});

test('the expiry badge and version follow the latest read and write responses', async ({ page }) => {
  const generated = await page.request.post('/api/v1/temporary-contexts/generate');
  expect(generated.ok()).toBeTruthy();
  const { passphrase } = await generated.json() as { passphrase: string };
  const expiresAt = new Date(Date.now() + 90 * 60_000).toISOString();
  await page.route('**/temporary-contexts/read', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), expiresAt } });
  });
  await page.goto(`/#passphrase=${passphrase}`);
  const badge = page.locator('summary', { hasText: 'Expires in 2 hours' });
  await expect(badge).toBeVisible();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await badge.click();
  await expect(page.locator('time')).toHaveAttribute('datetime', expiresAt);
  await expect(page.getByText(/Automatic reads while this page is open also renew it/)).toBeVisible();
  await badge.click();
  await page.unroute('**/temporary-contexts/read');

  await page.getByRole('textbox', { name: /^Content to add\b/ }).fill('Renewed the deadline');
  await page.getByRole('button', { name: 'Add content', exact: true }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(page.locator('summary', { hasText: 'Expires in 7 days' })).toBeVisible();
});

test('the account hint appears after sign-in and its link protects temporary drafts', async ({ page }) => {
  await page.goto('/');
  const accountLink = page.getByRole('link', { name: 'Go to My Contexts' });
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(accountLink).toHaveCount(0);
  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com', avatarUrl: null }, csrfToken: null },
  }));
  await page.route('**/api/v1/contexts', route => route.fulfill({ json: [] }));
  await page.reload();
  await expect(accountLink).toBeVisible();
  await createWithPassphrase(page, `signed-in-${Date.now()}`);
  await expect(accountLink).toBeVisible();
  const workspace = page.url();
  const addition = page.getByRole('textbox', { name: /^Content to add\b/ });
  await addition.fill('Draft on a temporary context');
  expect(await handleDialog(page, () => accountLink.click(), 'dismiss')).toBe('confirm');
  await expect(addition).toHaveValue('Draft on a temporary context');
  await expect(page).toHaveURL(workspace);
  expect(await handleDialog(page, () => accountLink.click(), 'accept')).toBe('confirm');
  await expect(page).toHaveURL('/contexts');
});
