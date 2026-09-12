// ============================================================================
// MCP CLIENT SINGLETON
// ============================================================================
// The web app never touches financial data directly — it spawns the MCP
// server as a real child process and talks to it exclusively over the MCP
// stdio protocol. This is the architectural boundary the whole project is
// built around: USER -> AGENT -> MCP -> DATA, never AGENT -> DATA.
//
// Kept as a module-level singleton so the same MCP server process (and its
// in-memory demo session state — goals, current dashboard, preferences)
// survives across chat turns within one `next dev` process.

import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let clientPromise: Promise<Client> | null = null;

function resolveMcpServerEntry() {
  if (process.env.MCP_SERVER_ENTRY) return process.env.MCP_SERVER_ENTRY;
  // web/ and mcp-server/ are sibling workspaces
  return path.resolve(process.cwd(), "..", "mcp-server", "src", "index.ts");
}

async function createClient(): Promise<Client> {
  const entry = resolveMcpServerEntry();
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", entry],
    stderr: "inherit", // surface [mcp-server] logs in the Next.js console
  });
  const client = new Client({ name: "banorte-adaptive-finance-web", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

export async function getMcpClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = createClient().catch((e) => {
      clientPromise = null; // allow retry on next call
      throw e;
    });
  }
  return clientPromise;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export async function listMcpToolsForAnthropic(): Promise<McpToolDescriptor[]> {
  const client = await getMcpClient();
  const { tools } = await client.listTools();
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
  }));
}

export async function callMcpTool(name: string, args: Record<string, unknown>) {
  const client = await getMcpClient();
  const result = await client.callTool({ name, arguments: args });
  const content = (result.content as any[]) ?? [];
  const text = content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  return { text, isError: Boolean((result as any).isError) };
}
