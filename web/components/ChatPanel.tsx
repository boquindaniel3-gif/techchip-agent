"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MatrixEditor } from "@/components/MatrixEditor";
import { ResultView } from "@/components/ResultView";
import { interpretarMensaje } from "@/lib/intents";
import { N_MAX, N_MIN } from "@/lib/modelos";
import type { ResolverResult } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function obtenerReconocimiento(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as Window & { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

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
  onEnviar: (texto: string) => Promise<void>;
  onResolverJson: (texto: string, etiqueta?: string) => Promise<void>;
  onResolverMatriz: (etiqueta?: string) => Promise<void>;
};

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
  onEnviar,
  onResolverJson,
  onResolverMatriz,
}: Props) {
  const [texto, setTexto] = useState("");
  const [jsonTexto, setJsonTexto] = useState("");
  const [pestana, setPestana] = useState<"json" | "matriz">("json");
  const [escuchando, setEscuchando] = useState(false);
  const [vozOk, setVozOk] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    setVozOk(obtenerReconocimiento() !== null);
  }, []);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pending, resultado]);

  async function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio || pending) return;
    setTexto("");
    const intent = interpretarMensaje(limpio);
    if (intent.type === "resolver") {
      if (pestana === "json") await onResolverJson(jsonTexto, limpio);
      else await onResolverMatriz(limpio);
      return;
    }
    await onEnviar(limpio);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void enviar(texto);
  }

  function toggleMic() {
    if (escuchando) {
      recRef.current?.stop();
      setEscuchando(false);
      return;
    }
    const rec = obtenerReconocimiento();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = "es-CR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) void enviar(transcript);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try {
      rec.start();
      setEscuchando(true);
    } catch {
      rec.lang = "es-ES";
      try {
        rec.start();
        setEscuchando(true);
      } catch {
        setEscuchando(false);
      }
    }
  }

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
        {resultado ? <ResultView resultado={resultado} /> : null}
        {pending ? <p className="text-xs text-muted">Trabajando…</p> : null}
      </div>
      <div className="border-t border-line bg-card p-3">
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
            <button
              type="button"
              disabled={pending || !jsonTexto.trim()}
              onClick={() => void onResolverJson(jsonTexto)}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-background disabled:opacity-40"
            >
              Resolver JSON
            </button>
            <form onSubmit={onSubmit}>
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-background px-2 py-2">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void enviar(texto);
                    }
                  }}
                  rows={2}
                  placeholder="Orden o «resuelve» (usa solo el JSON de arriba)…"
                  className="max-h-24 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1 text-[13px] outline-none"
                />
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!vozOk || pending}
                  title={vozOk ? "Dictar" : "El reconocimiento de voz no está disponible en este navegador"}
                  aria-label={escuchando ? "Detener micrófono" : "Dictar"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                    escuchando
                      ? "border-foreground bg-foreground text-background"
                      : "border-line text-foreground disabled:opacity-40"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M12 18v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={pending || !texto.trim()}
                  className="h-9 rounded-full bg-accent px-3 text-[13px] font-medium text-background disabled:opacity-40"
                >
                  Enviar
                </button>
              </div>
            </form>
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
            <button
              type="button"
              disabled={pending}
              onClick={() => void onResolverMatriz()}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-background disabled:opacity-40"
            >
              Resolver matriz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
