"use client";

import { useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import type { EstresResult } from "@/lib/types";

export default function EstresClient() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EstresResult | null>(null);

  async function ejecutar() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClientOrNull();
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
      const data = await apiFetch<EstresResult>("/api/estres", token, {
        method: "POST",
        body: JSON.stringify({ persistir: true }),
      });
      setResultado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar la suite.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pruebas de estrés</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Cuatro escenarios de la guía: vector exacto X*, residual ||AX−B|| &lt; 10⁻⁶,
          escasez de resina (B₃ = 100 kg) y fila degenerada F₆ = 2 F₁.
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void ejecutar()}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? "Ejecutando…" : "Ejecutar suite y guardar"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {resultado ? (
        <div className="rounded-xl border border-line bg-card p-4">
          <p className={resultado.exitoso ? "text-accent" : "text-danger"}>
            {resultado.aprobadas}/{resultado.total} pruebas satisfactorias
          </p>
          <ul className="mt-4 space-y-3">
            {resultado.resultados.map((prueba) => (
              <li key={prueba.nombre} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{prueba.nombre}</span>
                  <span className={prueba.ok ? "text-accent" : "text-danger"}>
                    {prueba.estado}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{prueba.detalle}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
