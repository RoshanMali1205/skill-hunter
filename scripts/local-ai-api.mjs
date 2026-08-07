#!/usr/bin/env node
/**
 * Local stand-in for the Netlify AI Mentor function so plain `ng serve`
 * can proxy POST /api/ai-chat (see proxy.conf.json).
 *
 * Usage:
 *   1. Copy .env.example → .env and set GEMINI_API_KEY (+ APP_SHARED_TOKEN)
 *   2. Prefer `npm start` (scripts/dev.mjs starts this + ng serve together)
 *      or run this alone: node scripts/local-ai-api.mjs
 *   3. ng serve proxies /api/** → this server on :9999 (Vite needs /**)
 *
 * Or use `netlify dev` instead, which runs Angular + the function together.
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
const PORT = Number(process.env.LOCAL_AI_PORT || 9999);

/**
 * Load KEY=VALUE pairs from a .env file into process.env.
 * Local DX: values from the file always win (including overwriting a previous
 * empty value), so editing .env while the server runs takes effect on the
 * next request — no manual restart required for key changes.
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false;
  // Strip UTF-8 BOM so the first key is not silently renamed.
  const text = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of text.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('export ')) trimmed = trimmed.slice(7).trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function geminiKeyStatus() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === '...' || key.trim() === '') return 'MISSING (requests will 503)';
  return `set (length ${key.trim().length})`;
}

const envFound = loadEnvFile(envPath);

const handlerModule = await import(pathToFileURL(resolve(root, 'netlify/functions/ai-chat.mjs')).href);
const handler = handlerModule.default;

if (typeof handler !== 'function') {
  console.error('netlify/functions/ai-chat.mjs did not export a default handler');
  process.exit(1);
}

function collectBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    // Re-read .env every request so adding/rotating GEMINI_API_KEY does not
    // require killing the process (the classic "I set the key but still 503").
    loadEnvFile(envPath);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-app-token',
      });
      res.end();
      return;
    }

    const body = await collectBody(req);
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else {
        headers.set(key, value);
      }
    }

    const requestInit = {
      method: req.method || 'GET',
      headers,
    };
    if (body.length > 0 && req.method !== 'GET' && req.method !== 'HEAD') {
      requestInit.body = body;
    }

    const request = new Request(url, requestInit);
    const response = await handler(request);
    const responseBody = Buffer.from(await response.arrayBuffer());
    const responseHeaders = Object.fromEntries(response.headers.entries());
    responseHeaders['access-control-allow-origin'] = '*';
    res.writeHead(response.status, responseHeaders);
    res.end(responseBody);
  } catch (err) {
    console.error('[local-ai-api]', err);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Local AI API crashed', detail: String(err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const hasToken = Boolean(process.env.APP_SHARED_TOKEN);
  console.log(`[local-ai-api] listening on http://127.0.0.1:${PORT}`);
  console.log(`[local-ai-api] .env: ${envFound ? envPath : `NOT FOUND at ${envPath}`}`);
  console.log(`[local-ai-api] APP_SHARED_TOKEN: ${hasToken ? 'set' : 'MISSING (requests will 503)'}`);
  console.log(`[local-ai-api] GEMINI_API_KEY: ${geminiKeyStatus()}`);
  console.log('[local-ai-api] Point ng serve at this via proxy.conf.json (/api/** → :9999)');
});
