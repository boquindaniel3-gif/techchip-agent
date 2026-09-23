"use client";

import type { ResolucionRow } from "@/lib/types";

type Props = {
  filas: ResolucionRow[];
  seleccionId: string | null;
  onSelect: (fila: ResolucionRow) => void;
  onNueva: () => void;
};

export function HistorialSidebar({ filas, seleccionId, onSelect, onNueva }: Props) {
  return (
    <aside className="flex max-h-44 shrink-0 flex-col border-b border-line bg-card lg:max-h-none lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="px-3 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Historial</p>
        <button
          type="button"
          onClick={onNueva}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Nueva
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {!filas.length ? (
          <li className="px-2 py-3 text-xs text-muted">Aún no hay corridas guardadas.</li>
        ) : null}
        {filas.map((fila) => {
          const activa = fila.id === seleccionId;
          const n = fila.a?.length ?? fila.x?.length ?? fila.b?.length;
          return (
            <li key={fila.id}>
              <button
                type="button"
                onClick={() => onSelect(fila)}
                className={`w-full rounded-xl px-3 py-2 text-left ${
                  activa ? "bg-accent text-background" : "hover:bg-background"
                }`}
              >
                <span className="block truncate text-[13px] font-medium">
                  {fila.tipo} · {fila.metodo}
                  {n ? ` · ${n}×${n}` : ""}
                </span>
                <span className={`mt-0.5 block text-[11px] ${activa ? "text-background/80" : "text-muted"}`}>
                  {new Date(fila.created_at).toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
