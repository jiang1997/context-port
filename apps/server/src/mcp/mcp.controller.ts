import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ContextService } from '../context/context.service.js';
import { createMcpServer } from './mcp.server.js';

@Controller('mcp')
export class McpController {
  constructor(@Inject(ContextService) private readonly service: ContextService) {}
  @All()
  async handle(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Method not allowed.' } });
      return;
    }
    const server = createMcpServer(this.service);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    res.on('close', () => { void server.close(); });
    try {
      // SDK optional callback declarations predate exactOptionalPropertyTypes.
      await server.connect(transport as Transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await server.close();
      throw error;
    }
  }
}
