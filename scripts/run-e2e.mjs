import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '-p', 'contextport-e2e', '-f', 'docker-compose.e2e.yml'];
const useDocker = !process.env.E2E_DATABASE_URL;
if (process.env.CI && useDocker) {
  throw new Error('CI must provide E2E_DATABASE_URL pointing to its disposable database.');
}

// Explicit overrides keep the test independent of the developer's .env.
const env = {
  ...process.env,
  DATABASE_URL: process.env.E2E_DATABASE_URL
    ?? 'postgresql://contextport:contextport@127.0.0.1:55432/contextport_e2e',
  NODE_ENV: 'test',
  DEPLOYMENT_MODE: 'local',
  HOST: '127.0.0.1',
  PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  WEB_EXTRA_ORIGINS: '',
  VITE_API_BASE_URL: '/api/v1',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  PUBLIC_BASE_URL: '',
  COOKIE_SECURE: 'false',
  CLIPBOARD_SECRET: 'contextport-e2e-only-secret-not-for-production',
};

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? code}).`));
    });
  });
}

async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => reject(new Error(
      `Cannot use test port ${port}: ${error.message}. Stop existing development servers first.`,
    )));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

await mkdir(new URL('../e2e-artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../e2e-artifacts/services.log', import.meta.url), '');
let dockerStarted = false;
try {
  // Never let the browser accidentally connect to an existing development API.
  await requireFreePort(3000);
  await requireFreePort(5173);
  if (useDocker) {
    await requireFreePort(55432);
    dockerStarted = true;
    await run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '90']);
  }
  await run('pnpm', ['db:migrate']);
  await run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (dockerStarted) {
    try {
      await run('docker', [...compose, 'down']);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
