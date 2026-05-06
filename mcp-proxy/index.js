import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { initClients, getToolRegistry } from './mcp-client.js'
import { routeRequest } from './router.js'

const server = new Server(
  { name: 'mcp-proxy', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const registry = getToolRegistry()
  const tools = Object.entries(registry).map(([prefixedName, { tool }]) => ({
    ...tool,
    name: prefixedName,
  }))
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const separatorIndex = name.indexOf('__')

  if (separatorIndex === -1) {
    throw new Error(`Invalid tool name format: ${name}`)
  }

  const serverName = name.slice(0, separatorIndex)
  const toolName = name.slice(separatorIndex + 2)

  const result = await routeRequest({ serverName, toolName, args })

  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return { content: [{ type: 'text', text }] }
})

async function main() {
  await initClients()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  process.stderr.write(`MCP proxy fatal error: ${err.message}\n`)
  process.exit(1)
})
