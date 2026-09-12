"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: "live" | "fallback";
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading: boolean;
}

const SUGGESTIONS = [
  "Quiero saber si estoy ahorrando suficiente para comprar un auto",
  "¿Cómo va mi ahorro comparado con la inflación?",
  "Ahora quiero ver solamente mi negocio",
  "¿Qué me recomiendas hacer?",
];

export function ChatPanel({ messages, onSend, loading }: ChatPanelProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = (value: string) => {
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-800 text-sm">Asistente financiero</p>
        <p className="text-xs text-gray-400">Agente + MCP · genera tu interfaz en tiempo real</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">Prueba preguntando:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 text-gray-600 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-banorte-red text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.content}
              {m.role === "assistant" && m.mode === "fallback" && (
                <p className="mt-1 text-[10px] opacity-60">modo offline (sin ANTHROPIC_API_KEY) — reglas deterministas, mismo MCP</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 rounded-2xl px-3.5 py-2.5 text-sm">Pensando y consultando MCP…</div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
          placeholder="Escribe tu pregunta financiera…"
          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-banorte-red"
        />
        <button
          onClick={() => send(text)}
          disabled={loading}
          className="rounded-full bg-banorte-red text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
