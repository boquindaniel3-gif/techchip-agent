"use client";

import { useEffect, useRef, useState } from "react";
import { ChatBubble } from "@/components/ChatBubble";
import { ControlsArea } from "@/components/ControlsArea";
import { ResultView } from "@/components/ResultView";
import type { ChatMessage, Metodo, ResolverResult } from "@/lib/types";

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
  onResolverJson: (texto: string, metodo: Metodo) => Promise<void>;
  onResolverMatriz: (metodo: Metodo) => Promise<void>;
  onLlenarEnunciado: (texto: string) => Promise<void>;
  onOrdenTexto: (texto: string) => Promise<void>;
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
  onResolverJson,
  onResolverMatriz,
  onLlenarEnunciado,
  onOrdenTexto,
}: Props) {
  const [tema, setTema] = useState<"claro" | "oscuro">("claro");
  const listaRef = useRef<HTMLDivElement>(null);
  const corridaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const guardado =
      window.localStorage.getItem("resolx-tema") ?? window.localStorage.getItem("techchip-tema");
    if (guardado === "oscuro" || guardado === "claro") setTema(guardado);
  }, []);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pending]);

  useEffect(() => {
    corridaRef.current?.scrollTo({ top: 0 });
  }, [resultado]);

  return (
    <div className={`flex h-full min-h-0 flex-col bg-background ${tema === "oscuro" ? "dark" : ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Resolx Agent</p>
          <h2 className="text-[15px] font-semibold tracking-tight">Chat de planta</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            const siguiente = tema === "claro" ? "oscuro" : "claro";
            setTema(siguiente);
            window.localStorage.setItem("resolx-tema", siguiente);
          }}
          className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-foreground"
        >
          {tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>
      <div ref={listaRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {mensajes.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.variant === "user" ? "user" : "system"}
            tone={msg.variant === "success" || msg.variant === "error" ? msg.variant : "neutral"}
          >
            {msg.text}
          </ChatBubble>
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
      <ControlsArea
        pending={pending}
        A={A}
        B={B}
        variables={variables}
        recursos={recursos}
        onChangeA={onChangeA}
        onChangeB={onChangeB}
        onChangeVariables={onChangeVariables}
        onChangeRecursos={onChangeRecursos}
        onOrden={onOrden}
        onResolverJson={onResolverJson}
        onResolverMatriz={onResolverMatriz}
        onLlenarEnunciado={onLlenarEnunciado}
        onOrdenTexto={onOrdenTexto}
      />
    </div>
  );
}
