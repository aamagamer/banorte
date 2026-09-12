"use client";

import React, { useState } from "react";
import type { UIGenerationResult } from "@hackmty/shared";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ui, setUi] = useState<UIGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...nextMessages, { role: "assistant", content: `Ocurrió un error: ${data.error}` }]);
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.narrative, mode: data.mode }]);
      setUi(data.dashboard);
    } catch (e: any) {
      setMessages([...nextMessages, { role: "assistant", content: `No pude conectar con el agente: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function removeComponent(id: string) {
    setUi((prev) => (prev ? { ...prev, components: prev.components.filter((c) => c.id !== id) } : prev));
    fetch("/api/dashboard/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ componentId: id }) }).catch(() => {});
  }

  function switchContext(key: "personal" | "business") {
    send(key === "business" ? "Ahora quiero ver solamente mi negocio" : "Regresa a mi vista personal");
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-banorte-red flex items-center justify-center text-white text-xs font-bold">B</div>
          <span className="font-semibold text-gray-800">Interfaz Financiera Adaptativa</span>
          <span className="text-xs text-gray-400 ml-2">prototipo · HackMTY · modo demo</span>
        </div>
        {ui && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            Contexto activo: <span className="font-medium text-gray-700">{ui.activeContext === "personal" ? "Mi vida" : "Mi negocio"}</span>
          </span>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
        <aside className="border-r border-gray-100 bg-white overflow-hidden">
          <ChatPanel messages={messages} onSend={send} loading={loading} />
        </aside>
        <section className="overflow-y-auto">
          <Dashboard ui={ui} onRemoveComponent={removeComponent} onSwitchContext={switchContext} />
        </section>
      </div>
    </main>
  );
}
