import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const log = createWriteStream(new URL('../e2e-artifacts/services.log', import.meta.url), { flags: 'a' });
let stopping = false;
const server = spawn('pnpm', ['dev'], {
  cwd: new URL('../', import.meta.url),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const [stream, output] of [[server.stdout, process.stdout], [server.stderr, process.stderr]]) {
  stream.on('data', chunk => {
    log.write(chunk);
    if (!stopping) output.write(chunk);
  });
}
server.once('error', error => {
  log.end(`${error.stack}\n`);
  console.error(error);
  process.exitCode = 1;
});
server.once('close', code => {
  log.end();
  process.exitCode = stopping ? 0 : code ?? 1;
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    stopping = true;
    server.kill(signal);
  });
}
