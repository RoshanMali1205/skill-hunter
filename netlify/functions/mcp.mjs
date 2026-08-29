// Remote Skill Hunter MCP endpoint.
// VS Code / Cursor connect with Streamable HTTP, the same way they add
// Azure DevOps or Figma: a URL, plus an optional PAT-style token.
//
// Public by default (read-only curated topics). Set MCP_SHARED_TOKEN in
// Netlify env vars if you want Authorization: Bearer <token> like a PAT.

import { handleSkillHunterMcpRequest } from '../../skill-hunter-mcp/src/http.ts';

export default async (req) => handleSkillHunterMcpRequest(req);

export const config = {
  path: '/mcp',
};
