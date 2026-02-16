import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient, type ApiClientConfig } from './api-client.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';

/**
 * Creates and configures a fully-wired MCP server for Tokamak Pilot.
 *
 * The server wraps the Tokamak Pilot Public API and exposes it via
 * the Model Context Protocol so any compatible AI assistant can use
 * Tokamak knowledge as a tool.
 */
export function createServer(config: ApiClientConfig): McpServer {
  const client = new ApiClient(config);

  const server = new McpServer({
    name: 'tokamak-pilot',
    version: '0.1.0',
  });

  registerTools(server, client);
  registerResources(server, client);
  registerPrompts(server, client);

  return server;
}
