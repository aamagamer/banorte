import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn, type ChatTurn } from "@/lib/agent";

export const runtime = "nodejs"; // needs to spawn the MCP server child process
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message ?? "";
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await runAgentTurn(message, history);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/chat] error", err);
    return NextResponse.json({ error: err?.message ?? "internal error" }, { status: 500 });
  }
}
