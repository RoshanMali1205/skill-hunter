import { createMcpHandler } from '@modelcontextprotocol/server';

import { buildServer } from './server.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>();

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID, X-MCP-Token',
  'Access-Control-Expose-Headers': 'MCP-Session-Id, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

const mcpHandler = createMcpHandler(() => buildServer(), {
  legacy: 'stateless',
  responseMode: 'json',
});

export function getRequiredMcpToken(): string | undefined {
  const token = process.env.MCP_SHARED_TOKEN?.trim();
  return token || undefined;
}

export function extractProvidedToken(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || undefined;
  }

  if (header?.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = atob(header.slice(6).trim());
      const separator = decoded.indexOf(':');
      const secret = separator >= 0 ? decoded.slice(separator + 1) : decoded;
      return secret.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  return request.headers.get('x-mcp-token')?.trim() || undefined;
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  let bucket = rateLimitBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateLimitBuckets.set(ip, bucket);
  }

  bucket.count += 1;

  if (rateLimitBuckets.size > 500) {
    for (const [key, value] of rateLimitBuckets) {
      if (now - value.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rateLimitBuckets.delete(key);
      }
    }
  }

  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function isBrowserGet(request: Request): boolean {
  if (request.method !== 'GET') {
    return false;
  }

  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') && !accept.includes('text/event-stream');
}

function connectionGuide(request: Request): Response {
  const url = new URL(request.url);
  const mcpUrl = `${url.origin}/mcp`;
  const vscodeConfig = {
    servers: {
      'skill-hunter': {
        type: 'http',
        url: mcpUrl,
      },
    },
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Skill Hunter MCP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; max-width: 52rem; line-height: 1.5; }
      pre { background: #111; color: #f5f5f5; padding: 1rem; overflow: auto; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>Skill Hunter MCP</h1>
    <p>This is a remote Model Context Protocol endpoint. Paste the URL into VS Code or Cursor MCP settings — the same way you add Azure DevOps or Figma.</p>
    <h2>VS Code</h2>
    <pre>${escapeHtml(JSON.stringify(vscodeConfig, null, 2))}</pre>
    <p>If this deployment set <code>MCP_SHARED_TOKEN</code>, add a header like Azure DevOps PAT:</p>
    <pre>${escapeHtml(
      JSON.stringify(
        {
          servers: {
            'skill-hunter': {
              type: 'http',
              url: mcpUrl,
              headers: {
                Authorization: 'Bearer YOUR_TOKEN',
              },
            },
          },
        },
        null,
        2,
      ),
    )}</pre>
  </body>
</html>`;

  return withCors(
    new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function handleSkillHunterMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (isBrowserGet(request)) {
    return connectionGuide(request);
  }

  const requiredToken = getRequiredMcpToken();
  if (requiredToken && extractProvidedToken(request) !== requiredToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (isRateLimited(clientIp(request))) {
    return jsonResponse(
      { error: 'Too many MCP requests from this network. Please wait a minute and try again.' },
      429,
    );
  }

  return withCors(await mcpHandler.fetch(request));
}
