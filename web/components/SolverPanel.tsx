"use client";

import { useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { A_BASE, B_BASE, RECURSOS, VARIABLES, type Metodo, type ResolverResult } from "@/lib/types";
import { MatrixEditor } from "@/components/MatrixEditor";
import { ResultView } from "@/components/ResultView";

const METODOS: { id: Metodo; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "gauss", label: "Gauss" },
  { id: "gauss-jordan", label: "Gauss-Jordan" },
  { id: "inversa", label: "Inversa" },
];

export function SolverPanel() {
  const [A, setA] = useState(A_BASE.map((fila) => fila.slice()));
  const [B, setB] = useState(B_BASE.slice());
  const [method, setMethod] = useState<Metodo>("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResolverResult | null>(null);
  const [jsonText, setJsonText] = useState("");

  function cargarJson() {
    setError(null);
    try {
      const datos = JSON.parse(jsonText) as { A?: number[][]; B?: number[] };
      if (!datos.A || !datos.B) throw new Error("El JSON debe incluir A y B.");
      setA(datos.A);
      setB(datos.B);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON inválido.");
    }
  }

  function restaurarBase() {
    setA(A_BASE.map((fila) => fila.slice()));
    setB(B_BASE.slice());
    setResultado(null);
    setError(null);
  }

  function escasez() {
    const siguiente = B.slice();
    siguiente[2] = 100;
    setB(siguiente);
  }

  function degenerado() {
    const siguiente = A.map((fila) => fila.slice());
    siguiente[5] = siguiente[0].map((c) => 2 * c);
    setA(siguiente);
  }

  async function resolver() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClientOrNull();
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
      const data = await apiFetch<ResolverResult>("/api/resolver", token, {
        method: "POST",
        body: JSON.stringify({
          A,
          B,
          method,
          variables: VARIABLES,
          recursos: RECURSOS,
          persistir: true,
        }),
      });
      setResultado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Balance de planta AX = B</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Seis líneas de módulos frente a seis recursos críticos. El agente resuelve
            con Gauss, Gauss-Jordan e inversa, sin `np.linalg.solve`.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={restaurarBase}
            className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
          >
            Modelo base
          </button>
          <button
            type="button"
            onClick={escasez}
            className="rounded-md border border-warn/40 px-3 py-2 text-sm text-warn"
          >
            Escasez B₃=100
          </button>
          <button
            type="button"
            onClick={degenerado}
            className="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger"
          >
            Degenerado F₆=2F₁
          </button>
        </div>
      </div>

      <MatrixEditor A={A} B={B} onChangeA={setA} onChangeB={setB} />

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <label className="block text-sm">
          Cargar JSON
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"A":[[...]],"B":[...]}'
            className="mt-1 h-28 w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-xs"
          />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <button
            type="button"
            onClick={cargarJson}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            Aplicar JSON
          </button>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Metodo)}
            className="rounded-md border border-line bg-card px-3 py-2 text-sm"
          >
            {METODOS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => void resolver()}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {pending ? "Resolviendo…" : "Resolver y guardar"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {resultado ? <ResultView resultado={resultado} /> : null}
    </div>
  );
}
