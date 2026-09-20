import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const MCP_SERVER = Symbol('MCP_SERVER');

export function createMcpServer() {
  return new McpServer({
    name: 'context-port',
    version: '0.0.0',
  });
}
