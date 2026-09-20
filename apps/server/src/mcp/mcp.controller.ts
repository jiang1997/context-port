import { All, Controller, Req, Res } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Request, Response } from 'express';
import { ContextService } from '../context/context.service.js';
import { createMcpServer } from './mcp.server.js';

@Controller('mcp')
export class McpController {
  constructor(private readonly contexts: ContextService) {}

  @All()
  async handle(@Req() request: Request, @Res() response: Response) {
    if (request.method !== 'POST') {
      response.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      });
      return;
    }

    const server = createMcpServer(this.contexts);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });

    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      // SDK 1.x transport declarations are not exactOptionalPropertyTypes-compatible.
      await server.connect(transport as unknown as Transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error.',
          },
          id: null,
        });
      }
    }
  }
}
