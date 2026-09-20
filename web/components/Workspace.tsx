"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Dashboard } from "@/components/Dashboard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { modelo8x8, modeloBase } from "@/lib/modelos";

export function Workspace() {
  const ws = useWorkspace();
  const [vista, setVista] = useState<"chat" | "escritorio">("chat");

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex gap-1 border-b border-line px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setVista("chat")}
          className={`rounded-full px-3 py-1.5 text-sm ${
            vista === "chat" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setVista("escritorio")}
          className={`rounded-full px-3 py-1.5 text-sm ${
            vista === "escritorio" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          Escritorio
        </button>
      </div>

      <aside
        className={`${
          vista === "chat" ? "flex" : "hidden"
        } min-h-0 w-full flex-1 flex-col lg:flex lg:w-[380px] lg:flex-none lg:border-r lg:border-line`}
      >
        <ChatPanel mensajes={ws.mensajes} pending={ws.pending} onEnviar={ws.enviarChat} />
      </aside>

      <section
        className={`${
          vista === "escritorio" ? "block" : "hidden"
        } min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:block lg:px-8`}
      >
        <Dashboard
          n={ws.n}
          A={ws.A}
          B={ws.B}
          variables={ws.variables}
          recursos={ws.recursos}
          method={ws.method}
          pending={ws.pending}
          error={ws.error}
          resultado={ws.resultado}
          historial={ws.historial}
          estres={ws.estres}
          onChangeA={ws.setA}
          onChangeB={ws.setB}
          onMethod={ws.setMethod}
          onOrden={(orden) => {
            ws.cambiarOrden(orden);
          }}
          onBase={() => ws.aplicarModelo(modeloBase())}
          on8={() => ws.aplicarModelo(modelo8x8())}
          onResolver={() => {
            void ws.resolver();
          }}
          onEstres={() => {
            void ws.ejecutarEstres();
          }}
        />
      </section>
    </div>
  );
}
