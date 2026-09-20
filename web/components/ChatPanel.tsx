"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  onEnviar: (texto: string) => Promise<void>;
};

export function ChatPanel({ mensajes, pending, onEnviar }: Props) {
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [vozOk, setVozOk] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    setVozOk(obtenerReconocimiento() !== null);
  }, []);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pending]);

  async function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio || pending) return;
    setTexto("");
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
    <div className="flex h-full min-h-0 flex-col border-line bg-card lg:border-r">
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
                : "bg-background text-foreground"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {pending ? <p className="text-xs text-muted">Trabajando…</p> : null}
      </div>
      <form onSubmit={onSubmit} className="border-t border-line p-3">
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
            placeholder="Orden, JSON {A,B} o dicta por micrófono…"
            className="max-h-32 min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1 text-[13px] outline-none"
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
              <path
                d="M5 11a7 7 0 0 0 14 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
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
        {!vozOk ? (
          <p className="mt-2 text-[11px] text-muted">
            Micrófono no disponible. Usa Chrome o Edge en HTTPS, o pega JSON.
          </p>
        ) : null}
      </form>
    </div>
  );
}
