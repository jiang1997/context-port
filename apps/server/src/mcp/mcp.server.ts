import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ContextService } from '../context/context.service.js';

function toolResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

export function createMcpServer(contexts: ContextService) {
  const server = new McpServer({
    name: 'context-port',
    version: '0.1.0-experience',
  });

  server.registerTool(
    'list_contexts',
    {
      description: 'List all shared contexts, ordered by most recently updated.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => toolResult(await contexts.list()),
  );

  server.registerTool(
    'get_context',
    {
      description: 'Read a shared context by ID.',
      inputSchema: { contextId: z.string().uuid().describe('The context UUID') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ contextId }) => toolResult(await contexts.get(contextId)),
  );

  server.registerTool(
    'create_context',
    {
      description: 'Create a shared context that is immediately visible in the web app.',
      inputSchema: {
        title: z.string().trim().min(1).max(200),
        content: z.string().trim().min(1).max(100_000),
      },
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    async (input) => toolResult(await contexts.create(input)),
  );

  server.registerTool(
    'update_context',
    {
      description: 'Update the title or content of an existing shared context.',
      inputSchema: {
        contextId: z.string().uuid().describe('The context UUID'),
        title: z.string().trim().min(1).max(200).optional(),
        content: z.string().trim().min(1).max(100_000).optional(),
      },
      annotations: { destructiveHint: true, openWorldHint: false },
    },
    async ({ contextId, title, content }) => {
      if (title === undefined && content === undefined) {
        throw new Error('At least one of title or content must be provided.');
      }
      return toolResult(await contexts.update(contextId, { title, content }));
    },
  );

  return server;
}
