import { createHash, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, baseURL }) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !baseURL) throw new Error('The E2E runner must provide a disposable database and a base URL.');
  // The dev server builds the DB package before Playwright starts the test.
  const { createDatabase, sessions, users } = await import('@contextport/db');
  const { db, pool } = createDatabase(databaseUrl);
  const token = randomUUID();
  const csrf = randomUUID();
  try {
    await db.transaction(async tx => {
      const [user] = await tx.insert(users).values({ googleSub: token, email: `${token}@example.test` }).returning();
      await tx.insert(sessions).values({
        userId: user!.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    });
    await context.addCookies([
      { url: baseURL, name: 'cp_session', value: token, httpOnly: true, sameSite: 'Lax' },
      { url: baseURL, name: 'cp_csrf', value: csrf, sameSite: 'Lax' },
    ]);
  } finally {
    await pool.end();
  }
});

test('a signed-in user creates a Context and opens its Thread', async ({ page }) => {
  await page.goto('/contexts');
  await expect(page.getByRole('heading', { name: 'My Contexts' })).toBeVisible();
  await page.getByRole('link', { name: 'New Context' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Browser project');
  await page.getByRole('textbox', { name: 'Body (Markdown)' }).fill('Project background');
  await page.getByRole('button', { name: 'Create Context' }).click();
  await expect(page.getByRole('heading', { name: 'Browser project' })).toBeVisible();
  await expect(page.getByText('Project background', { exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Title' }).fill('Browser Thread');
  await page.getByRole('textbox', { name: 'Body (Markdown)' }).fill('Thread notes');
  await page.getByRole('button', { name: 'Create Thread' }).click();
  await expect(page).toHaveURL(/\/contexts\/[^/]+\/threads\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Browser Thread' })).toBeVisible();
  await expect(page.getByText('Thread notes', { exact: true })).toBeVisible();
});

test('API key creation submits once and revocation requires confirmation', async ({ page }) => {
  let creations = 0;
  let revocations = 0;
  page.on('request', request => {
    if (request.method() !== 'POST') return;
    if (request.url().endsWith('/auth/keys')) creations++;
    if (request.url().endsWith('/revoke')) revocations++;
  });
  await page.goto('/keys');
  const name = page.getByRole('textbox', { name: 'Key name' });
  await name.fill('Browser key');
  await name.evaluate(input => {
    const form = (input as HTMLInputElement).form!;
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByText('This key is only shown once. Copy it and keep it safe.', { exact: false })).toBeVisible();
  expect(creations).toBe(1);
  await expect(page.getByRole('heading', { name: 'Browser key', exact: true })).toHaveCount(1);

  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm revocation' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(revocations).toBe(0);
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm revocation' }).click();
  await expect(page.getByRole('button', { name: 'Revoke', exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Revoked /)).toBeVisible();
  expect(revocations).toBe(1);
});
