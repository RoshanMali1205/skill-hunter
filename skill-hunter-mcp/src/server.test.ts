import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';

import { buildServer } from './server.js';

async function connectClient(): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const handler = createMcpHandler(() => buildServer());
  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: 'skill-hunter-test', version: '1.0.0' },
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

describe('Skill Hunter MCP server', () => {
  let client: Client;
  let close: () => Promise<void>;

  before(async () => {
    ({ client, close } = await connectClient());
  });

  after(async () => {
    await close();
  });

  it('advertises search_topics, the architecture resource, and the interview prompt', async () => {
    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    assert.ok(tools.tools.some((tool) => tool.name === 'search_topics'));
    assert.ok(
      resources.resources.some(
        (resource) => resource.uri === 'skill-hunter://guides/angular-architecture',
      ),
    );
    assert.ok(prompts.prompts.some((prompt) => prompt.name === 'prepare-interview-question'));
  });

  it('returns matching Angular topics for a lazy-loading search', async () => {
    const result = await client.callTool({
      name: 'search_topics',
      arguments: { query: 'lazy loading' },
    });

    assert.equal(result.isError, undefined);
    const structured = result.structuredContent as {
      results: Array<{ id: string; title: string }>;
    };

    assert.equal(structured.results.length, 1);
    assert.equal(structured.results[0]?.id, 'standalone-lazy-loading');
    assert.match(
      String(result.content[0] && 'text' in result.content[0] ? result.content[0].text : ''),
      /Standalone Lazy Loading/,
    );
  });

  it('rejects a result limit above 10 before searching', async () => {
    const result = await client.callTool({
      name: 'search_topics',
      arguments: { query: 'angular', limit: 100 },
    });

    assert.equal(result.isError, true);
    const text = result.content[0] && 'text' in result.content[0] ? result.content[0].text : '';
    assert.match(text, /limit/i);
  });

  it('reads the Angular architecture resource', async () => {
    const resource = await client.readResource({
      uri: 'skill-hunter://guides/angular-architecture',
    });

    assert.equal(resource.contents.length, 1);
    const body = resource.contents[0];
    assert.ok(body && 'text' in body);
    const payload = JSON.parse(body.text) as Array<{
      subject: string;
    }>;
    assert.ok(payload.length >= 2);
    assert.ok(payload.every((topic) => topic.subject === 'Angular'));
  });

  it('fills the interview prompt with the requested topic', async () => {
    const prompt = await client.getPrompt({
      name: 'prepare-interview-question',
      arguments: { topic: 'OnPush change detection' },
    });

    assert.equal(prompt.messages.length, 1);
    const content = prompt.messages[0]?.content;
    assert.equal(content?.type, 'text');
    if (content?.type === 'text') {
      assert.match(content.text, /OnPush change detection/);
      assert.match(content.text, /Do not provide the answer/);
    }
  });
});
