// Contratos del MCP (Model Context Protocol) para Banorte One.
// En este prototipo las tools se ejecutan in-process (mismo runtime de Next.js)
// para maximizar velocidad de desarrollo en el hackathon, pero respetan la
// misma forma {name, description, permission, inputSchema, run} que tendrian
// como servidor MCP real via @modelcontextprotocol/sdk (ver docs/MCP.md).

export type ToolPermission = 'read' | 'write_simulation' | 'requires_human_authorization'

export interface McpToolDefinition<Input = any, Output = any> {
  name: string
  description: string
  permission: ToolPermission
  run: (input: Input) => Output | Promise<Output>
}

export interface McpActivityEntry {
  tool: string
  input: unknown
  output: unknown
  permission: ToolPermission
  timestamp: string
}
