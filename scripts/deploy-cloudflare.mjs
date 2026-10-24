import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

// Only these production secrets are uploaded. Local development vars must not
// override the Workers runtime, public URL, or deployment mode.
const names = ['DATABASE_URL', 'CLIPBOARD_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const source = new URL('../.env.cloudflare.local', import.meta.url);
let values;
try {
  values = parseEnv(await readFile(source, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  throw new Error('Create .env.cloudflare.local using .env.cloudflare.example and the existing production secrets.');
}
for (const name of names) {
  if (!values[name]) throw new Error(`Missing production secret: ${name}`);
}
const database = new URL(values.DATABASE_URL);
if (!['postgres:', 'postgresql:'].includes(database.protocol)
  || ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('DATABASE_URL must point to the existing production PostgreSQL database.');
}
if (values.CLIPBOARD_SECRET.length < 32) throw new Error('CLIPBOARD_SECRET must contain at least 32 characters.');

const directory = await mkdtemp(join(tmpdir(), 'contextport-cloudflare-'));
try {
  const secretsFile = join(directory, 'secrets.json');
  await writeFile(secretsFile, JSON.stringify(Object.fromEntries(names.map(name => [name, values[name]]))), { mode: 0o600 });
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'wrangler', 'deploy', '--secrets-file', secretsFile], {
      cwd: new URL('../', import.meta.url), stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Workers deployment failed (${code}).`)));
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}
