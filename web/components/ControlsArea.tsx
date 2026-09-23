"use client";

import { useState } from "react";
import { MatrixEditor } from "@/components/MatrixEditor";
import { PrimaryActionBtn } from "@/components/PrimaryActionBtn";
import { N_MAX, N_MIN } from "@/lib/modelos";
import type { Metodo } from "@/lib/types";

const METODOS: { id: Metodo; label: string }[] = [
  { id: "gauss", label: "Gauss" },
  { id: "gauss-jordan", label: "Gauss-Jordan" },
  { id: "inversa", label: "Inversa" },
  { id: "all", label: "Todos" },
];

type Props = {
  pending: boolean;
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
  onChangeVariables: (variables: string[]) => void;
  onChangeRecursos: (recursos: string[]) => void;
  onOrden: (n: number) => void;
  onResolverJson: (texto: string, metodo: Metodo) => Promise<void>;
  onResolverMatriz: (metodo: Metodo) => Promise<void>;
  onLlenarEnunciado: (texto: string) => Promise<void>;
  onOrdenTexto: (texto: string) => Promise<void>;
};

const PRUEBAS = [
  { etiqueta: "Modelo base", texto: "modelo base" },
  { etiqueta: "Escasez", texto: "escasez" },
  { etiqueta: "Degenerado", texto: "degenerado" },
  { etiqueta: "Estrés", texto: "estrés" },
];

function BotonesMetodo({
  disabled,
  onMetodo,
}: {
  disabled: boolean;
  onMetodo: (metodo: Metodo) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {METODOS.map((metodo) =>
        metodo.id === "all" ? (
          <button
            key={metodo.id}
            type="button"
            disabled={disabled}
            onClick={() => onMetodo(metodo.id)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
          >
            {metodo.label}
          </button>
        ) : (
          <PrimaryActionBtn key={metodo.id} disabled={disabled} onClick={() => onMetodo(metodo.id)}>
            {metodo.label}
          </PrimaryActionBtn>
        )
      )}
    </div>
  );
}

function Resolucion({
  disabled,
  onMetodo,
}: {
  disabled: boolean;
  onMetodo: (metodo: Metodo) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3 dark:border-indigo-900 dark:bg-neutral-950">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Resolución
      </p>
      <BotonesMetodo disabled={disabled} onMetodo={onMetodo} />
    </div>
  );
}

export function ControlsArea({
  pending,
  A,
  B,
  variables,
  recursos,
  onChangeA,
  onChangeB,
  onChangeVariables,
  onChangeRecursos,
  onOrden,
  onResolverJson,
  onResolverMatriz,
  onLlenarEnunciado,
  onOrdenTexto,
}: Props) {
  const [jsonTexto, setJsonTexto] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [avisoEnunciado, setAvisoEnunciado] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"json" | "matriz">("json");

  return (
    <div className="border-t border-line bg-card p-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Pruebas
        </p>
        <div className="mb-3 flex flex-wrap gap-1">
          {PRUEBAS.map((prueba) => (
            <button
              key={prueba.texto}
              type="button"
              disabled={pending}
              onClick={() => void onOrdenTexto(prueba.texto)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-40 dark:border-neutral-600 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              {prueba.etiqueta}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Entrada
        </p>
        <div className="mb-3 flex gap-1">
          <button
            type="button"
            onClick={() => setPestana("json")}
            className={`rounded-lg px-3 py-1 text-xs ${
              pestana === "json" ? "bg-accent text-background" : "text-muted"
            }`}
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => setPestana("matriz")}
            className={`rounded-lg px-3 py-1 text-xs ${
              pestana === "matriz" ? "bg-accent text-background" : "text-muted"
            }`}
          >
            Matriz
          </button>
        </div>
        {pestana === "json" ? (
          <div className="space-y-2">
            <textarea
              value={jsonTexto}
              onChange={(e) => setJsonTexto(e.target.value)}
              rows={4}
              placeholder='{"A":[[2,1],[1,3]],"B":[8,13]}'
              className="max-h-40 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-100"
            />
            <button
              type="button"
              disabled={pending || !jsonTexto.trim()}
              onClick={() => void onResolverJson(jsonTexto, "all")}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-40 dark:border-neutral-600 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              Enviar JSON
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950">
              n
              <select
                value={A.length}
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
            <BotonesMetodo disabled={pending} onMetodo={(metodo) => void onResolverMatriz(metodo)} />
            <textarea
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              rows={3}
              placeholder="Pega el enunciado. Llena A y B del orden que traiga, de 2×2 a 12×12, y no resuelve."
              className="max-h-32 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-100"
            />
            <button
              type="button"
              disabled={pending || !enunciado.trim()}
              onClick={() => {
                setAvisoEnunciado(null);
                void onLlenarEnunciado(enunciado).catch((err: unknown) => {
                  setAvisoEnunciado(
                    err instanceof Error ? err.message : "No se pudo leer el enunciado."
                  );
                });
              }}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-40 dark:border-neutral-600 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              Llenar matriz
            </button>
            {avisoEnunciado ? <p className="text-xs text-danger">{avisoEnunciado}</p> : null}
            <div className="max-h-64 overflow-auto">
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
            </div>
          </div>
        )}
      </div>
      <Resolucion
        disabled={pending || (pestana === "json" && !jsonTexto.trim())}
        onMetodo={(metodo) =>
          void (pestana === "json" ? onResolverJson(jsonTexto, metodo) : onResolverMatriz(metodo))
        }
      />
    </div>
  );
}
