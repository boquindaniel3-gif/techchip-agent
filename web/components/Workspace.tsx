"use client";

import { ChatPanel } from "@/components/ChatPanel";
import { HistorialSidebar } from "@/components/HistorialSidebar";
import { useWorkspace } from "@/hooks/useWorkspace";

export function Workspace() {
  const ws = useWorkspace();

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <HistorialSidebar
        filas={ws.historial}
        seleccionId={ws.seleccionId}
        onSelect={ws.seleccionar}
        onNueva={ws.nuevaConversacion}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatPanel
          mensajes={ws.mensajes}
          pending={ws.pending}
          resultado={ws.resultado}
          A={ws.A}
          B={ws.B}
          variables={ws.variables}
          recursos={ws.recursos}
          onChangeA={ws.setA}
          onChangeB={ws.setB}
          onChangeVariables={ws.setVariables}
          onChangeRecursos={ws.setRecursos}
          onOrden={(orden) => {
            ws.cambiarOrden(orden);
          }}
          onResolverJson={ws.resolverJson}
          onResolverMatriz={ws.resolverMatriz}
          onOrdenTexto={ws.enviarChat}
          onLlenarEnunciado={ws.llenarDesdeEnunciado}
        />
      </div>
    </div>
  );
}
