#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const apiUrl =
  process.env.TOKAMAK_PILOT_API_URL ?? 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY ?? '';

if (!apiKey) {
  process.stderr.write(
    'Error: TOKAMAK_PILOT_API_KEY environment variable is required.\n\n' +
      'Set it in your MCP client configuration:\n' +
      '  "env": { "TOKAMAK_PILOT_API_KEY": "tkp_your_key_here" }\n\n' +
      'You can create an API key at your Tokamak Forest dashboard.\n',
  );
  process.exit(1);
}

const server = createServer({ apiUrl, apiKey });
const transport = new StdioServerTransport();
await server.connect(transport);
