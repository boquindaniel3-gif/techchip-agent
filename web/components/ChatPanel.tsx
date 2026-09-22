"use client";

import { useEffect, useRef, useState } from "react";
import { MatrixEditor } from "@/components/MatrixEditor";
import { ResultView } from "@/components/ResultView";
import { N_MAX, N_MIN } from "@/lib/modelos";
import type { ChatMessage, Metodo, ResolverResult } from "@/lib/types";

const ORDENES = [
  { etiqueta: "Modelo base", texto: "modelo base" },
  { etiqueta: "Escasez", texto: "escasez" },
  { etiqueta: "Degenerado", texto: "degenerado" },
  { etiqueta: "Estrés", texto: "estrés" },
];

const METODOS: { id: Exclude<Metodo, "all">; label: string }[] = [
  { id: "gauss", label: "Gauss" },
  { id: "gauss-jordan", label: "Gauss-Jordan" },
  { id: "inversa", label: "Inversa" },
];

type Props = {
  mensajes: ChatMessage[];
  pending: boolean;
  resultado: ResolverResult | null;
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
  onChangeVariables: (variables: string[]) => void;
  onChangeRecursos: (recursos: string[]) => void;
  onOrden: (n: number) => void;
  onResolverJson: (texto: string, metodo: Exclude<Metodo, "all">) => Promise<void>;
  onResolverMatriz: (metodo: Exclude<Metodo, "all">) => Promise<void>;
  onOrdenTexto: (texto: string) => Promise<void>;
  onLlenarEnunciado: (texto: string) => Promise<void>;
};

function BotonesMetodo({
  disabled,
  onMetodo,
}: {
  disabled: boolean;
  onMetodo: (metodo: Exclude<Metodo, "all">) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {METODOS.map((metodo) => (
        <button
          key={metodo.id}
          type="button"
          disabled={disabled}
          onClick={() => onMetodo(metodo.id)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-foreground disabled:opacity-40"
        >
          {metodo.label}
        </button>
      ))}
    </div>
  );
}

export function ChatPanel({
  mensajes,
  pending,
  resultado,
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
  onOrdenTexto,
  onLlenarEnunciado,
}: Props) {
  const [jsonTexto, setJsonTexto] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [avisoEnunciado, setAvisoEnunciado] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"json" | "matriz">("json");
  const listaRef = useRef<HTMLDivElement>(null);
  const corridaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pending]);

  useEffect(() => {
    corridaRef.current?.scrollTo({ top: 0 });
  }, [resultado]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Agente</p>
        <h2 className="text-[15px] font-semibold tracking-tight">Chat de planta</h2>
      </div>
      <div ref={listaRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${
              msg.role === "user"
                ? "ml-auto bg-accent text-background"
                : "bg-card text-foreground"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {pending ? <p className="text-xs text-muted">Trabajando…</p> : null}
      </div>
      {resultado ? (
        <section
          ref={corridaRef}
          className="max-h-[45%] shrink-0 space-y-3 overflow-y-auto border-t border-line px-4 py-4"
        >
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Corrida activa
          </h2>
          <ResultView resultado={resultado} />
        </section>
      ) : null}
      <div className="border-t border-line bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {ORDENES.map((orden) => (
            <button
              key={orden.texto}
              type="button"
              disabled={pending}
              onClick={() => void onOrdenTexto(orden.texto)}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-foreground hover:text-foreground disabled:opacity-40"
            >
              {orden.etiqueta}
            </button>
          ))}
        </div>
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => setPestana("json")}
            className={`rounded-full px-3 py-1 text-xs ${
              pestana === "json" ? "bg-accent text-background" : "text-muted"
            }`}
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => setPestana("matriz")}
            className={`rounded-full px-3 py-1 text-xs ${
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
              className="max-h-40 w-full resize-none rounded-2xl border border-line bg-background px-3 py-2 font-mono text-xs outline-none"
            />
            <BotonesMetodo
              disabled={pending || !jsonTexto.trim()}
              onMetodo={(metodo) => void onResolverJson(jsonTexto, metodo)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1 text-xs">
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
            <div className="space-y-2">
              <textarea
                value={enunciado}
                onChange={(e) => setEnunciado(e.target.value)}
                rows={3}
                placeholder="Pega el enunciado. El asistente solo llena A y B; no resuelve."
                className="max-h-32 w-full resize-none rounded-2xl border border-line bg-background px-3 py-2 text-xs outline-none"
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
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-background disabled:opacity-40"
              >
                Llenar matriz
              </button>
              {avisoEnunciado ? <p className="text-xs text-danger">{avisoEnunciado}</p> : null}
            </div>
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
            <BotonesMetodo disabled={pending} onMetodo={(metodo) => void onResolverMatriz(metodo)} />
          </div>
        )}
      </div>
    </div>
  );
}
