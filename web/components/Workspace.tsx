"use client";

import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { Dashboard } from "@/components/Dashboard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { modelo8x8, modeloBase } from "@/lib/modelos";

export function Workspace() {
  const ws = useWorkspace();
  const search = useSearchParams();
  const vista = search.get("vista") === "escritorio" ? "escritorio" : "chat";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {vista === "chat" ? (
        <aside className="flex min-h-0 w-full flex-1 flex-col">
          <ChatPanel mensajes={ws.mensajes} pending={ws.pending} onEnviar={ws.enviarChat} />
        </aside>
      ) : (
        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
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
            onChangeVariables={ws.setVariables}
            onChangeRecursos={ws.setRecursos}
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
      )}
    </div>
  );
}
