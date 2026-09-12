import { NextRequest, NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keeps the MCP server's in-memory dashboard state in sync when the user
// removes a component directly from the UI (no agent round-trip needed for
// something this mechanical — see section 6 of the brief: "el usuario
// mantiene el control").
export async function POST(req: NextRequest) {
  try {
    const { componentId } = await req.json();
    if (!componentId) return NextResponse.json({ error: "componentId is required" }, { status: 400 });
    const result = await callMcpTool("remove_component", { componentId });
    return NextResponse.json({ ok: true, result: result.text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "internal error" }, { status: 500 });
  }
}
