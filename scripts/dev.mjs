#!/usr/bin/env node
/**
 * Local development entrypoint: starts the AI Mentor API stand-in on :9999
 * and Angular (`ng serve`) on :4200 with proxy.conf.json forwarding /api/**.
 *
 * Usage: npm start
 * (netlify.toml uses `npm run start:app` so `netlify dev` does not double-start.)
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const isWin = process.platform === 'win32';

const children = [];

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  child.on('error', (err) => {
    console.error(`[dev] failed to start ${label}:`, err.message);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.error(`[dev] ${label} exited via signal ${signal}`);
      shutdown(1);
      return;
    }
    if (code !== 0 && code != null) {
      console.error(`[dev] ${label} exited with code ${code}`);
      shutdown(code);
      return;
    }
    shutdown(0);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  // Force-exit if children hang after SIGTERM.
  setTimeout(() => process.exit(code), 2000).unref();
  process.exitCode = code;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

start(process.execPath, [resolve(root, 'scripts/local-ai-api.mjs')], 'local-ai-api');
start(isWin ? 'npx.cmd' : 'npx', ['ng', 'serve'], 'ng serve');
