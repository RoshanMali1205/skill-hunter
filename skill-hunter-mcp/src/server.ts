import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

import type { TopicRepository } from './topic-repository.js';
import { InMemoryTopicRepository } from './topic-repository.js';
import { skillLevels } from './topics.js';

const skillLevelSchema = z.enum(skillLevels);

const topicSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  level: skillLevelSchema,
  summary: z.string(),
});

const angularArchitectureGuideUri = 'skill-hunter://guides/angular-architecture';

export function buildServer(
  repository: TopicRepository = new InMemoryTopicRepository(),
): McpServer {
  const server = new McpServer({
    name: 'skill-hunter',
    title: 'Skill Hunter',
    version: '1.0.0',
  });

  server.registerTool(
    'search_topics',
    {
      title: 'Search Skill Hunter topics',
      description: 'Search curated frontend learning topics by title and summary.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: z.object({
        query: z.string().trim().min(2).max(200),
        level: skillLevelSchema.optional(),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      outputSchema: z.object({
        results: z.array(topicSchema),
      }),
    },
    async ({ query, level, limit }) => {
      const results = await repository.search({ query, level, limit });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
        structuredContent: {
          results,
        },
      };
    },
  );

  server.registerResource(
    'angular-architecture-guide',
    angularArchitectureGuideUri,
    {
      title: 'Angular Architecture Guide',
      description: 'Curated Angular architecture topics from Skill Hunter.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await repository.findBySubject('Angular'), null, 2),
        },
      ],
    }),
  );

  server.registerPrompt(
    'prepare-interview-question',
    {
      title: 'Prepare architect interview question',
      description: 'Generate an architect-level question from a Skill Hunter topic.',
      argsSchema: z.object({
        topic: z.string().trim().min(2).max(100),
      }),
    },
    ({ topic }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Create one Frontend Architect interview question about ${topic}.`,
              'Include a practical Angular scenario.',
              'Ask about trade-offs, security, performance and testing.',
              'Do not provide the answer until I attempt it.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && fileURLToPath(import.meta.url) === resolve(entry);
}

if (isExecutedDirectly()) {
  // stdout is the JSON-RPC channel. Application logs must go to stderr.
  console.error('Skill Hunter MCP server running on stdio');
  void serveStdio(() => buildServer());
}
