import type { McpActivityEntry, McpToolDefinition } from './types'
import { TOOLS } from './tools'

const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]))

export function listTools() {
  return TOOLS.map(({ name, description, permission }) => ({ name, description, permission }))
}

// callTool ejecuta una herramienta MCP y registra la llamada en un log de
// actividad. Este log es lo que alimenta el panel "MCP ACTIVITY" en la UI
// (ver components/financial/mcp-activity-panel.tsx) para que el jurado vea
// que el MCP realmente participa en cada respuesta, no solo el LLM.
export async function callTool<Output = any>(
  name: string,
  input: unknown,
  activityLog: McpActivityEntry[],
): Promise<Output> {
  const tool = TOOL_MAP.get(name) as McpToolDefinition<unknown, Output> | undefined
  if (!tool) {
    throw new Error(`MCP tool desconocida: ${name}`)
  }
  const output = await tool.run(input)
  activityLog.push({
    tool: name,
    input,
    output,
    permission: tool.permission,
    timestamp: new Date().toISOString(),
  })
  return output
}
