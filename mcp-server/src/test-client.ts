// Quick smoke test: spawn the MCP server via stdio and call a few tools.
// Not part of the product — dev-only sanity check. Run with `npm run test:smoke`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/index.ts"],
  });
  const client = new Client({ name: "smoke-test", version: "0.1" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("TOOL COUNT:", tools.tools.length);
  console.log(tools.tools.map((t) => t.name).join(", "));

  const accounts = await client.callTool({ name: "get_accounts", arguments: {} });
  console.log("\n--- get_accounts ---");
  console.log((accounts.content as any[])[0].text.slice(0, 400));

  const cashflow = await client.callTool({ name: "calculate_cash_flow", arguments: { context: "business", months: 3 } });
  console.log("\n--- calculate_cash_flow (business, 3mo) ---");
  console.log((cashflow.content as any[])[0].text);

  const rec = await client.callTool({ name: "recommend_components", arguments: { intent: "save_for_goal", activeContext: "personal", goal: "Comprar un automóvil" } });
  console.log("\n--- recommend_components ---");
  console.log((rec.content as any[])[0].text);

  const goals = await client.callTool({ name: "list_goals", arguments: {} });
  console.log("\n--- list_goals ---");
  console.log((goals.content as any[])[0].text);

  await client.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
