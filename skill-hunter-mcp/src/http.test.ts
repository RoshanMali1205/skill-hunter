import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

import { handleSkillHunterMcpRequest } from './http.js';

const mcpUrl = new URL('https://skill-hunter.example/mcp');

async function connectClient(headers?: Record<string, string>): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: headers ? { headers } : undefined,
    fetch: (url, init) => handleSkillHunterMcpRequest(new Request(url, init)),
  });
  const client = new Client(
    { name: 'skill-hunter-http-test', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );

  await client.connect(transport);

  return {
    client,
    close: async () => {
      await client.close();
    },
  };
}

describe('Skill Hunter MCP HTTP endpoint', () => {
  const previousToken = process.env.MCP_SHARED_TOKEN;

  afterEach(() => {
    if (previousToken === undefined) {
      delete process.env.MCP_SHARED_TOKEN;
    } else {
      process.env.MCP_SHARED_TOKEN = previousToken;
    }
  });

  it('answers CORS preflight without authentication', async () => {
    delete process.env.MCP_SHARED_TOKEN;
    const response = await handleSkillHunterMcpRequest(
      new Request(mcpUrl, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://vscode.dev',
          'Access-Control-Request-Method': 'POST',
        },
      }),
    );

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('access-control-allow-headers') ?? '', /Authorization/i);
  });

  it('lets anyone search topics when no shared token is configured', async () => {
    delete process.env.MCP_SHARED_TOKEN;
    const { client, close } = await connectClient();

    try {
      const result = await client.callTool({
        name: 'search_topics',
        arguments: { query: 'lazy loading' },
      });
      const structured = result.structuredContent as { results: Array<{ id: string }> };
      assert.equal(structured.results[0]?.id, 'standalone-lazy-loading');
    } finally {
      await close();
    }
  });

  it('rejects requests without a PAT when MCP_SHARED_TOKEN is set', async () => {
    process.env.MCP_SHARED_TOKEN = 'test-pat';
    const response = await handleSkillHunterMcpRequest(
      new Request(mcpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      }),
    );

    assert.equal(response.status, 401);
  });

  it('accepts Azure DevOps-style Basic PAT and Bearer tokens', async () => {
    process.env.MCP_SHARED_TOKEN = 'test-pat';
    const basic = `Basic ${Buffer.from(':test-pat').toString('base64')}`;
    const { client, close } = await connectClient({ Authorization: basic });

    try {
      const tools = await client.listTools();
      assert.ok(tools.tools.some((tool) => tool.name === 'search_topics'));
    } finally {
      await close();
    }

    const { client: bearerClient, close: closeBearer } = await connectClient({
      Authorization: 'Bearer test-pat',
    });

    try {
      const tools = await bearerClient.listTools();
      assert.ok(tools.tools.some((tool) => tool.name === 'search_topics'));
    } finally {
      await closeBearer();
    }
  });

  it('returns VS Code connection instructions to a browser GET', async () => {
    delete process.env.MCP_SHARED_TOKEN;
    const response = await handleSkillHunterMcpRequest(
      new Request(mcpUrl, {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /&quot;type&quot;: &quot;http&quot;/);
    assert.match(body, /skill-hunter\.example\/mcp/);
  });
});
