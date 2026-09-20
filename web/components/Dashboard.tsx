"use client";

import { MatrixEditor } from "@/components/MatrixEditor";
import { ResultView } from "@/components/ResultView";
import { N_MAX, N_MIN } from "@/lib/modelos";
import type { EstresResult, Metodo, ResolucionRow, ResolverResult } from "@/lib/types";

const METODOS: { id: Metodo; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "gauss", label: "Gauss" },
  { id: "gauss-jordan", label: "Gauss-Jordan" },
  { id: "inversa", label: "Inversa" },
];

type Props = {
  n: number;
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
  method: Metodo;
  pending: boolean;
  error: string | null;
  resultado: ResolverResult | null;
  historial: ResolucionRow[];
  estres: EstresResult | null;
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
  onChangeVariables: (variables: string[]) => void;
  onChangeRecursos: (recursos: string[]) => void;
  onMethod: (m: Metodo) => void;
  onOrden: (n: number) => void;
  onBase: () => void;
  on8: () => void;
  onResolver: () => void;
  onEstres: () => void;
};

export function Dashboard({
  n,
  A,
  B,
  variables,
  recursos,
  method,
  pending,
  error,
  resultado,
  historial,
  estres,
  onChangeA,
  onChangeB,
  onChangeVariables,
  onChangeRecursos,
  onMethod,
  onOrden,
  onBase,
  on8,
  onResolver,
  onEstres,
}: Props) {
  const diag = resultado?.diagnostico;
  const factible = resultado?.semantica?.factible;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Escritorio
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Balance AX = B</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Orden {n}×{n}. Gauss, Gauss-Jordan e inversa a mano. El modelo 6×6 sigue siendo la
            Prueba Base del parcial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
            n
            <select
              value={n}
              onChange={(e) => onOrden(Number(e.target.value))}
              className="bg-transparent outline-none"
            >
              {Array.from({ length: N_MAX - N_MIN + 1 }, (_, i) => N_MIN + i).map((orden) => (
                <option key={orden} value={orden}>
                  {orden}×{orden}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onBase}
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-foreground"
          >
            Modelo 6×6
          </button>
          <button
            type="button"
            onClick={on8}
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-foreground"
          >
            Planta 8×8
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Orden" value={`${n}×${n}`} />
        <Kpi label="det(A)" value={diag?.determinante?.toPrecision(4) ?? "—"} />
        <Kpi label="Clasificación" value={diag?.clasificacion ?? "—"} />
        <Kpi
          label="Factible"
          value={factible === undefined ? "—" : factible ? "Sí" : "No"}
        />
      </div>

      <MatrixEditor
        A={A}
        B={B}
        variables={variables}
        recursos={recursos}
        onChangeA={onChangeA}
        onChangeB={onChangeB}
        onChangeVariables={onChangeVariables}
        onChangeRecursos={onChangeRecursos}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={method}
          onChange={(e) => onMethod(e.target.value as Metodo)}
          className="rounded-full border border-line bg-card px-3 py-2 text-sm"
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
          onClick={onResolver}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Resolviendo…" : "Resolver y guardar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onEstres}
          className="rounded-full border border-line px-4 py-2 text-sm hover:border-foreground disabled:opacity-50"
        >
          Suite de estrés
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {resultado ? <ResultView resultado={resultado} /> : null}

      {estres ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Estrés
          </h2>
          <p className={`mt-2 text-sm ${estres.exitoso ? "text-foreground" : "text-danger"}`}>
            {estres.aprobadas}/{estres.total} pruebas satisfactorias
          </p>
          <ul className="mt-3 space-y-2">
            {estres.resultados.map((prueba) => (
              <li key={prueba.nombre} className="rounded-xl border border-line px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{prueba.nombre}</span>
                  <span className={prueba.ok ? "" : "text-danger"}>{prueba.estado}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{prueba.detalle}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Historial reciente
        </h2>
        {!historial.length ? (
          <p className="mt-2 text-sm text-muted">Aún no hay corridas guardadas.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {historial.slice(0, 8).map((fila) => (
              <li key={fila.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {fila.tipo} · {fila.metodo}
                  </span>
                  <time className="text-xs text-muted">
                    {new Date(fila.created_at).toLocaleString()}
                  </time>
                </div>
                {fila.x ? (
                  <p className="mt-1 font-mono text-xs text-muted">
                    X = [{fila.x.map((v) => v.toFixed(2)).join(", ")}]
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate font-mono text-lg">{value}</p>
    </div>
  );
}
