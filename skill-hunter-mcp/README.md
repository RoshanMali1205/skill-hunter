# Skill Hunter MCP server

A local [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Skill Hunter learning content to compatible AI applications. It implements the 2026-07-28 protocol revision through the TypeScript SDK v2.

MCP standardizes discovery and invocation. It does not replace the LLM, RAG, application APIs, or Skill Hunter permissions.

## Primitives

| Primitive | Name                                         | Purpose                                              |
| --------- | -------------------------------------------- | ---------------------------------------------------- |
| Tool      | `search_topics`                              | Search curated topics by title, subject, and summary |
| Resource  | `skill-hunter://guides/angular-architecture` | Readable Angular architecture context                |
| Prompt    | `prepare-interview-question`                 | User-selected interview-question template            |

`search_topics` validates input with Zod: query length 2–200, an allowlisted experience level, and a result cap of 10. Handlers call a `TopicRepository` rather than storage directly.

## Run

Requires Node.js 20 or later. The official MCP Inspector needs Node.js 22.19 or later.

```bash
cd skill-hunter-mcp
npm install
npm start
```

`npm start` serves JSON-RPC over stdio. Application logs go to stderr so they cannot corrupt protocol messages on stdout.

## Inspect

```bash
npm run inspect
```

That launches the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) against `npm start`. Confirm:

1. `search_topics` appears under Tools.
2. An Angular query such as `lazy loading` returns matching topics.
3. `limit: 100` is rejected.
4. The architecture resource can be read.
5. The interview prompt accepts a topic.
6. No application logging is written to stdout.

CLI equivalent for a successful search:

```bash
npx @modelcontextprotocol/inspector --cli npm start \
  --method tools/call \
  --tool-name search_topics \
  --tool-arg 'query=lazy loading'
```

## Tests

```bash
npm test
```

The suite drives the same `buildServer()` factory through an in-process MCP client.

## Cursor / VS Code

This repository includes `.vscode/mcp.json` so the host can launch the stdio server from the workspace root.
