import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const clients = {}
const toolRegistry = {}

export async function initClients() {
  await connectClient('filesystem', {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  })

  if (process.env.GITHUB_TOKEN) {
    await connectClient('github', {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { ...process.env },
    })
  }
}

async function connectClient(name, transportOpts) {
  const transport = new StdioClientTransport(transportOpts)
  const client = new Client({ name: `proxy-${name}-client`, version: '1.0.0' }, { capabilities: {} })
  await client.connect(transport)
  clients[name] = client

  const { tools } = await client.listTools()
  for (const tool of tools) {
    toolRegistry[`${name}__${tool.name}`] = { serverName: name, tool }
  }
}

export function getMCPClients() {
  return clients
}

export function getToolRegistry() {
  return toolRegistry
}

export async function callMCPTool(serverName, toolName, args) {
  const client = clients[serverName]
  if (!client) throw new Error(`Unknown server: ${serverName}`)
  return client.callTool({ name: toolName, arguments: args ?? {} })
}
