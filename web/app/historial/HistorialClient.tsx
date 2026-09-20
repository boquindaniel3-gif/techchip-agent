"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import type { ResolucionRow } from "@/lib/types";

export default function HistorialClient() {
  const [filas, setFilas] = useState<ResolucionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const supabase = createClientOrNull();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : undefined;
        const data = await apiFetch<ResolucionRow[]>("/api/historial", token);
        if (vivo) setFilas(data);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : "Error al cargar.");
      } finally {
        if (vivo) setPending(false);
      }
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Historial</h1>
        <p className="mt-1 text-sm text-muted">
          Resoluciones y suites de estrés guardadas para tu usuario (RLS de Supabase).
        </p>
      </div>
      {pending ? <p className="text-sm text-muted">Cargando…</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!pending && !filas.length && !error ? (
        <p className="text-sm text-muted">
          Aún no hay corridas. Ve a{" "}
          <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
            Escritorio
          </Link>
          .
        </p>
      ) : null}
      <ul className="space-y-3">
        {filas.map((fila) => (
          <li key={fila.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {fila.tipo} · {fila.metodo}
              </span>
              <time className="text-xs text-muted">
                {new Date(fila.created_at).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 text-sm text-muted">
              {fila.semantica?.mensaje ?? fila.diagnostico?.mensaje ?? "Sin mensaje."}
            </p>
            {fila.x ? (
              <p className="mt-2 font-mono text-xs">
                X = [{fila.x.map((v) => v.toFixed(3)).join(", ")}]
              </p>
            ) : null}
            {fila.abortado ? (
              <p className="mt-2 text-xs text-danger">Sistema abortado / singular.</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
