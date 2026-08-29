# Skill Hunter MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Skill Hunter learning topics to VS Code, Cursor, and other MCP hosts. It implements the 2026-07-28 protocol revision.

Hosts connect the same way they add Azure DevOps or Figma: paste a URL (and an optional PAT-style token). The Angular app does not talk to MCP directly.

## Connect from VS Code

After this branch is deployed to Netlify, anyone can add Skill Hunter without cloning the repo.

1. Open **Command Palette** → **MCP: Add Server** → **HTTP**.
2. URL: `https://YOUR-SITE.netlify.app/mcp`
3. Or paste this into `.vscode/mcp.json`:

```json
{
  "servers": {
    "skill-hunter": {
      "type": "http",
      "url": "https://YOUR-SITE.netlify.app/mcp"
    }
  }
}
```

A copy of that snippet lives in `vscode.mcp.json`. Opening the `/mcp` URL in a browser also prints the same config.

### Optional PAT-style token

If the host set `MCP_SHARED_TOKEN` on Netlify, send it like an Azure DevOps PAT:

```json
{
  "servers": {
    "skill-hunter": {
      "type": "http",
      "url": "https://YOUR-SITE.netlify.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

`Authorization: Basic` with an empty username and the token as the password also works.

## Connect from Cursor

```json
{
  "mcpServers": {
    "skill-hunter": {
      "url": "https://YOUR-SITE.netlify.app/mcp"
    }
  }
}
```

## Primitives

| Primitive | Name                                         | Purpose                                              |
| --------- | -------------------------------------------- | ---------------------------------------------------- |
| Tool      | `search_topics`                              | Search curated topics by title, subject, and summary |
| Resource  | `skill-hunter://guides/angular-architecture` | Readable Angular architecture context                |
| Prompt    | `prepare-interview-question`                 | User-selected interview-question template            |

`search_topics` validates input with Zod: query length 2–200, an allowlisted experience level, and a result cap of 10. Handlers call a `TopicRepository` rather than storage directly.

## Local stdio (this repo)

Requires Node.js 20 or later. The official MCP Inspector needs Node.js 22.19 or later.

```bash
cd skill-hunter-mcp
npm install
npm start
```

`npm start` serves JSON-RPC over stdio. Application logs go to stderr so they cannot corrupt protocol messages on stdout. `.vscode/mcp.json` launches this local server from the workspace root.

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
npx @modelcontextprotocol/inspector@latest --cli npm start \
  --method tools/call \
  --tool-name search_topics \
  --tool-arg 'query=lazy loading'
```

Against a deployed Netlify URL:

```bash
npx @modelcontextprotocol/inspector@latest --cli \
  --transport http \
  https://YOUR-SITE.netlify.app/mcp \
  --method tools/call \
  --tool-name search_topics \
  --tool-arg 'query=lazy loading'
```

## Tests

```bash
npm test
```

The suite drives `buildServer()` through an in-process MCP client, including the HTTP wrapper used on Netlify.
