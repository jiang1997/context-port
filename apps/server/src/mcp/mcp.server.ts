import { HttpException } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateContextSchema, ListContextsSchema, UUIDSchema } from '@contextport/contracts';
import type { ContextService } from '../context/context.service.js';

export function createMcpServer(service: ContextService, userId: string | undefined) {
  const server = new McpServer({ name: 'context-port', version: '0.1.0' });
  async function result(run: () => Promise<unknown>) {
    try {
      return { content: [{ type: 'text' as const, text: JSON.stringify(await run()) }] };
    } catch (error) {
      const payload = error instanceof HttpException ? error.getResponse()
        : { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
    }
  }
  server.registerTool('list_contexts', { description: 'List Context summaries without bodies. Supports limit/offset pagination.',
    inputSchema: ListContextsSchema, annotations: { readOnlyHint: true } },
    input => result(() => service.list(userId, input)));
  server.registerTool('get_context', { description: 'Read a Context and its Thread index. Read Thread bodies separately.',
    inputSchema: { contextId: UUIDSchema }, annotations: { readOnlyHint: true } },
    ({ contextId }) => result(() => service.get(userId, contextId)));
  server.registerTool('create_context', { description: 'Create a Context and its initial revision.',
    inputSchema: CreateContextSchema, annotations: { destructiveHint: false, idempotentHint: false } },
    input => result(() => service.create(userId, input, 'mcp')));
  server.registerTool('create_thread', { description: 'Create a document Thread under an existing Context.',
    inputSchema: CreateContextSchema.extend({ contextId: UUIDSchema }),
    annotations: { destructiveHint: false, idempotentHint: false } },
    ({ contextId, ...input }) => result(() => service.createThread(userId, contextId, input, 'mcp')));
  server.registerTool('get_thread', { description: 'Read one Thread body within a Context.',
    inputSchema: { contextId: UUIDSchema, threadId: UUIDSchema }, annotations: { readOnlyHint: true } },
    ({ contextId, threadId }) => result(() => service.getThread(userId, contextId, threadId)));
  return server;
}
